"use client";

/**
 * Sun, moon, sky and the light they give (P02a; temporary in the sense that P03b takes it further,
 * but physically based): the sun and moon stand where they really are for the clock time and the
 * location (suncalc), the sky is three's analytic sky model, the sky also lights the scene as an
 * environment map, and the sun casts cascaded shadows. Weather dims the sun, closes the cloud,
 * thickens the air, wets every surface and raises the wind (world/air.ts).
 *
 * Look targets: docs/twin-v2/QUALITY-BAR.md section 7.
 */
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { mix, positionLocal, smoothstep, uniform } from "three/tsl";
import { CSMShadowNode } from "three/examples/jsm/csm/CSMShadowNode.js";
import { SkyMesh } from "three/examples/jsm/objects/SkyMesh.js";
import { getMoonIllumination, getMoonPosition, getPosition } from "suncalc";
import { getLocation } from "../data/site";
import type { Location } from "../data/types";
import { loop } from "../engine/loop";
import { tierSettings } from "../engine/tiers";
import { clock } from "../sim/clock";
import { twinStore } from "../state/store";
import { WEATHER_LOOK, air, type WeatherLook } from "./air";

/**
 * The balance of the picture by day, set by eye against the site photographs: the sun's strength, how
 * much of the sky's own light is kept (the sky model is far brighter than its share of daylight), and
 * the exposure. Sunlit ground comes out about four times as bright as ground in shade at noon.
 */
const SUN = 12;
const SKY = 0.34;
const EXPOSURE = 0.47;

/** Metres from the camera that sun shadows reach. */
export const SHADOW_FAR = 110;
const SKY_SIZE = 5200;

/** Unit vector towards the sun (or the moon) in the location's frame, and its altitude in radians. */
function skyBody(body: "sun" | "moon", when: Date, location: Location, out: THREE.Vector3): number {
  const { lat, lon } = location.origin;
  const p = body === "sun" ? getPosition(when, lat, lon) : getMoonPosition(when, lat, lon);
  // suncalc 2 answers in degrees, azimuth clockwise from north (version 1 used radians from south,
  // which the shell's first sun assumed: its sun stood in the wrong place until P02a);
  // the frame's -Z axis bears yawToGridNorth from north
  const altitude = THREE.MathUtils.degToRad(p.altitude);
  const bearing = THREE.MathUtils.degToRad(p.azimuth) - location.yawToGridNorth;
  const flat = Math.cos(altitude);
  out.set(flat * Math.sin(bearing), Math.sin(altitude), -flat * Math.cos(bearing));
  return altitude;
}

/** Colour of a black body at `kelvin`, linear RGB with the brightest channel at 1 (Tanner Helland's fit). */
export function kelvin(kelvinValue: number, out: THREE.Color): THREE.Color {
  const t = kelvinValue / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const clamp = (v: number) => Math.min(255, Math.max(0, v)) / 255;
  return out.setRGB(clamp(r), clamp(g), clamp(b), THREE.SRGBColorSpace);
}

const smooth = THREE.MathUtils.smoothstep;
const lerp = THREE.MathUtils.lerp;

export function SkyLight() {
  const get = useThree((s) => s.get);

  useEffect(() => {
    const scene = get().scene as unknown as THREE.Scene;
    const renderer = get().gl as unknown as THREE.WebGPURenderer;
    const root = new THREE.Group();
    root.name = "sky-light";
    scene.add(root);

    // --- sky dome (and a second one in a scene of its own, to make the environment light from)
    const sky = new SkyMesh();
    sky.scale.setScalar(SKY_SIZE);
    sky.name = "sky";
    sky.frustumCulled = false;
    (sky.material as THREE.NodeMaterial).fog = false; // (the sky is the far side of the haze, not something in it)
    root.add(sky);
    const envScene = new THREE.Scene();
    const envSky = new SkyMesh();
    envSky.scale.setScalar(1000);
    envSky.showSunDisc.value = 0; // (the sun itself is the directional light; in the reflection it would double it)
    envScene.add(envSky);
    // Twilight. The sky model is black once the sun is 2 degrees under the horizon, where a real sky
    // glows for another half hour: below that the model's sun is held just under the horizon and the
    // whole dome is dimmed by this instead.
    const skyDim = uniform(1);
    for (const dome of [sky, envSky]) {
      const material = dome.material as THREE.NodeMaterial;
      if (material.colorNode) material.colorNode = (material.colorNode as THREE.Node<"vec4">).mul(skyDim);
    }
    const skySun = new THREE.Vector3();
    // --- overcast: a grey lid drawn inside the sky dome, as thick as the cloud cover. The sky model
    // has broken cloud but no closed cloud deck, and a wet day on site is a flat bright grey.
    const lidLow = uniform(new THREE.Color(0.9, 0.92, 0.95));
    const lidHigh = uniform(new THREE.Color(0.6, 0.63, 0.68));
    const lidCover = uniform(0);
    const lidMaterial = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false });
    lidMaterial.fog = false;
    lidMaterial.colorNode = mix(lidLow, lidHigh, smoothstep(-0.05, 0.75, positionLocal.y));
    lidMaterial.opacityNode = lidCover;
    const lidGeometry = new THREE.SphereGeometry(1, 32, 16);
    const lid = new THREE.Mesh(lidGeometry, lidMaterial);
    lid.name = "overcast";
    lid.scale.setScalar(SKY_SIZE * 0.45);
    lid.frustumCulled = false;
    lid.renderOrder = -1; // (with the sky: before anything that blends over it)
    root.add(lid);
    const envLid = new THREE.Mesh(lidGeometry, lidMaterial);
    envLid.scale.setScalar(400);
    envScene.add(envLid);

    const pmrem = new THREE.PMREMGenerator(renderer);
    let envTarget: THREE.RenderTarget | null = null;
    const hadBackground = scene.background;
    scene.background = null;

    // --- key light: the sun by day, the moon by night, with cascaded shadows
    const sun = new THREE.DirectionalLight(0xffffff, 3);
    sun.name = "sun";
    sun.castShadow = true;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 700;
    sun.shadow.bias = -0.00035;
    sun.shadow.normalBias = 0.06;
    root.add(sun, sun.target);
    // a little light from the sky that needs no environment map (also what is left when a tier has none)
    const fill = new THREE.HemisphereLight(0xbfd8ff, 0x4a4034, 0.25);
    root.add(fill);
    const fog = new THREE.Fog(0x9fb4c4, 60, 2600);
    scene.fog = fog;

    let csm: CSMShadowNode | null = null;
    let cascadesFor = "";
    // `?shadows=0` (a test switch): no sun shadows, to tell their cost and their faults from the rest
    const noShadows = new URLSearchParams(window.location.search).get("shadows") === "0";
    if (noShadows) sun.castShadow = false;
    const setUpShadows = () => {
      if (noShadows) return;
      const tier = tierSettings();
      const key = `${tier.shadowCascades}:${tier.shadowMapSize}`;
      if (key === cascadesFor) return;
      cascadesFor = key;
      csm?.dispose();
      sun.shadow.mapSize.set(tier.shadowMapSize, tier.shadowMapSize);
      csm = new CSMShadowNode(sun, { cascades: tier.shadowCascades, maxFar: SHADOW_FAR, mode: "practical", lightMargin: 160 });
      // (blending one cascade into the next reads two shadow maps along every boundary)
      csm.fade = tier.shadowCascades > 1 && tier.shadowMapSize >= 2048;
      (sun.shadow as unknown as { shadowNode: unknown }).shadowNode = csm;
      // (the renderer's shadow switch is set by the canvas: TwinApp.tsx and engine/renderer.ts)
    };
    setUpShadows();
    const stopTier = twinStore.subscribe((s) => s.quality.tier, setUpShadows);

    // --- per-frame state
    const toSun = new THREE.Vector3();
    const toMoon = new THREE.Vector3();
    const colour = new THREE.Color();
    const horizon = new THREE.Color();
    const DAY_HAZE = new THREE.Color(0xa9bccb);
    const DUSK_HAZE = new THREE.Color(0xc79a7a);
    const NIGHT_HAZE = new THREE.Color(0x05080d);
    const RAIN_HAZE = new THREE.Color(0x8d969b);
    const MOONLIGHT = new THREE.Color(0x8fa9dc);
    const now: WeatherLook = { ...WEATHER_LOOK[twinStore.getState().weather.state] };
    let litFor = NaN;
    let lookFor = "";
    let envAt = { x: 9, y: 9, z: 9, cloud: -1, sun: -1, dim: -1 };
    let envDue = 0;
    let lastAspect = 0;
    let frame = 0;

    const stopLoop = loop.add("sim", (dt, elapsed) => {
      const state = twinStore.getState();
      const camera = get().camera as unknown as THREE.PerspectiveCamera;

      // weather eases towards its target, so rain arrives and clears rather than switching
      const want = WEATHER_LOOK[state.weather.state];
      const first = lookFor === "";
      const k = first ? 1 : 1 - Math.exp(-dt / 2.5);
      let moving = false;
      for (const key of Object.keys(want) as (keyof WeatherLook)[]) {
        const before = now[key];
        now[key] = lerp(before, want[key], k);
        if (Math.abs(now[key] - want[key]) > 1e-3) moving = true;
        else now[key] = want[key];
      }
      lookFor = state.weather.state;
      air.wetness.value = now.wet;
      air.rain.value = now.rain;
      air.windStrength.value = state.ui.reducedMotion ? 0.05 : now.wind;
      air.windTime.value += dt * (0.7 + now.wind * 1.3);

      // The far cascades are redrawn less often than the near one (the second every other frame, the
      // third every third): each covers so much ground that being a frame or two behind the camera
      // does not show, and drawing the casters into them is most of the cost of shadows.
      if (csm) {
        frame++;
        const cascades = (csm as unknown as { lights: { shadow: THREE.LightShadow }[] }).lights;
        for (let i = 1; i < cascades.length; i++) {
          cascades[i].shadow.autoUpdate = false;
          if (frame % (i + 1) === i % 2) cascades[i].shadow.needsUpdate = true;
        }
      }

      // the sky dome and the shadow volume follow the camera
      sky.position.copy(camera.position);
      lid.position.copy(camera.position);
      if (csm && Math.abs(camera.aspect - lastAspect) > 1e-4 && (csm as unknown as { camera: unknown }).camera) {
        lastAspect = camera.aspect;
        csm.updateFrustums();
      }

      const minutes = clock.minutes();
      if (!moving && !first && Math.abs(minutes - litFor) < 0.05) return;
      litFor = minutes;
      const location = getLocation(state.location);
      const when = clock.date();
      const altitude = skyBody("sun", when, location, toSun);
      const moonAltitude = skyBody("moon", when, location, toMoon);
      const degrees = THREE.MathUtils.radToDeg(altitude);

      // day: 0 once the sun is 12 degrees under the horizon (the end of nautical twilight), 1 from 3 degrees above it
      const day = Math.pow(smooth(degrees, -12, 3), 1.6);
      const direct = smooth(degrees, -1.5, 9) * now.sun;
      const high = smooth(degrees, 4, 45);

      // sky
      const held = Math.sin(THREE.MathUtils.degToRad(-1.2));
      skySun.copy(toSun);
      if (skySun.y < held) skySun.set(toSun.x, 0, toSun.z).normalize().multiplyScalar(Math.sqrt(1 - held * held)).setY(held);
      sky.sunPosition.value.copy(skySun);
      // (the model's dome is dim with the sun on the horizon, dimmer than a real twilight sky looks to
      // an eye that has adjusted to it: it is lifted there, then fades out through nautical twilight)
      skyDim.value = Math.pow(smooth(degrees, -13, -1.2), 1.8) * (1 + 2.6 * (1 - smooth(degrees, -1.2, 9)));
      sky.turbidity.value = now.turbidity + (1 - high) * 2.2;
      sky.rayleigh.value = lerp(2.4, 1.1, high) * lerp(1, 0.55, now.cloud * now.cloud);
      sky.mieCoefficient.value = 0.004 + now.cloud * 0.012;
      sky.mieDirectionalG.value = 0.8;
      sky.cloudCoverage.value = now.cloud;
      sky.cloudDensity.value = 0.35 + now.cloud * 0.5;
      sky.cloudElevation.value = lerp(0.5, 0.25, now.rain);
      sky.showSunDisc.value = direct > 0.02 && now.cloud < 0.8 ? 1 : 0;
      // the lid closes from about two thirds cover; its brightness is daylight's, dimmed by rain
      lidCover.value = smooth(now.cloud, 0.6, 0.98);
      const grey = (0.05 + 2.1 * day) * lerp(1, 0.62, now.rain);
      lidLow.value.setRGB(0.9 * grey, 0.92 * grey, 0.95 * grey);
      lidHigh.value.setRGB(0.62 * grey, 0.65 * grey, 0.7 * grey);

      // key light: colour temperature climbs with the sun; the moon takes over when the sun is gone
      if (direct > 0.004 || day > 0.5) {
        kelvin(lerp(2300, 6300, Math.pow(smooth(degrees, -2, 40), 0.6)), colour);
        sun.color.copy(colour);
        sun.intensity = SUN * direct;
        sun.position.copy(toSun).multiplyScalar(400).add(camera.position);
      } else {
        const moon = getMoonIllumination(when).fraction;
        const up = smooth(THREE.MathUtils.radToDeg(moonAltitude), -2, 12);
        if (toMoon.y < 0.12) toMoon.set(toMoon.x, 0.12, toMoon.z).normalize();
        sun.color.copy(MOONLIGHT);
        sun.intensity = (0.22 + 0.3 * moon * up) * lerp(1, 0.35, now.cloud);
        sun.position.copy(toMoon).multiplyScalar(400).add(camera.position);
      }
      sun.target.position.copy(camera.position);
      sun.target.updateMatrixWorld();

      // fill, haze and exposure
      // (the floor is what a dark-adapted eye still sees by starlight: away from the lamps the site is dark, not black)
      fill.intensity = lerp(0.42, 0.23, day) * lerp(1, 1.5, now.cloud);
      horizon.copy(NIGHT_HAZE).lerp(DUSK_HAZE, Math.pow(smooth(degrees, -11, 1), 2) * (1 - high)).lerp(DAY_HAZE, smooth(degrees, 0, 14)).lerp(RAIN_HAZE, smooth(now.cloud, 0.5, 1) * day * 0.9);
      horizon.multiplyScalar(lerp(1, 0.62, now.rain * day));
      fog.color.copy(horizon);
      fog.near = lerp(260, 45, now.rain);
      fog.far = now.fogFar * lerp(1, 0.7, 1 - day);
      // (the environment map is made from the dimmed dome, so it goes dark with it by itself)
      scene.environmentIntensity = SKY * lerp(1, 1.15, now.cloud);
      // (the eye opens up at night: lamps then read as bright pools, as they do on site)
      renderer.toneMappingExposure = lerp(1.35, EXPOSURE, smooth(degrees, -5, 14)) * lerp(1, 1.2, now.cloud * day);

      // lamp surfaces
      air.windDir.value.set(0.86, 0.5);

      // environment light: re-made when the sun or the cloud has moved enough to show
      const moved = Math.hypot(toSun.x - envAt.x, toSun.y - envAt.y, toSun.z - envAt.z);
      if (elapsed >= envDue && (moved > 0.035 || Math.abs(skyDim.value - envAt.dim) > 0.03 || Math.abs(now.cloud - envAt.cloud) > 0.02 || Math.abs(now.sun - envAt.sun) > 0.03)) {
        envDue = elapsed + 0.5;
        envAt = { x: toSun.x, y: toSun.y, z: toSun.z, cloud: now.cloud, sun: now.sun, dim: skyDim.value };
        for (const name of ["turbidity", "rayleigh", "mieCoefficient", "mieDirectionalG", "cloudCoverage", "cloudDensity", "cloudElevation"] as const) envSky[name].value = sky[name].value;
        envSky.sunPosition.value.copy(skySun);
        const old = envTarget;
        envTarget = pmrem.fromScene(envScene as unknown as THREE.Scene, 0, 1, 2000);
        scene.environment = envTarget.texture;
        old?.dispose();
      }
    });

    return () => {
      stopLoop();
      stopTier();
      scene.remove(root);
      if (scene.fog === fog) scene.fog = null;
      scene.environment = null;
      scene.background = hadBackground;
      envTarget?.dispose();
      pmrem.dispose();
      csm?.dispose();
      (sun.shadow as unknown as { shadowNode: unknown }).shadowNode = null;
      sun.dispose();
      fill.dispose();
      lidGeometry.dispose();
      lidMaterial.dispose();
      sky.geometry.dispose();
      (sky.material as THREE.Material).dispose();
      envSky.geometry.dispose();
      (envSky.material as THREE.Material).dispose();
    };
  }, [get]);

  return null;
}
