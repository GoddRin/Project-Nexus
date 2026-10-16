/**
 * Small life at the camp gate (P02f): the cheap, moving details that make a place feel lived in, each
 * a single instanced draw of a few dozen quads or tiny meshes, worked out on the CPU:
 *   - dust kicked up behind the pickup on a dry day;
 *   - drips from the booth's roof edge while it is wet;
 *   - moths round the flood lamp at night;
 *   - a few birds in the acacias by day, perching and flitting from tree to tree.
 * P12 builds the site's full effects on the same pattern.
 *
 * No React here. `startSmallLife` returns the function that removes everything.
 */
import * as THREE from "three/webgpu";
import { attribute, float, cos, positionLocal, sin, time, uv, vec3 } from "three/tsl";
import layout from "../data/sources/camp-gate-layout.json";
import zone from "../data/zones/powerhouse.camp-gate.json";
import { loop } from "../engine/loop";
import { groundY } from "../engine/picking";
import { precompile } from "../engine/precompile";
import { twinStore } from "../state/store";
import { air } from "../world/air";

export type SmallLifeContext = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGPURenderer;
  /** Where dust rises behind the pickup now (its rear wheels' contact points) and its speed, or null when it is not on the road. */
  dust: () => { points: THREE.Vector3[]; speed: number } | null;
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** One instanced draw of `count` quads or meshes, each with its own fade (0 hides it). */
function swarm(geometry: THREE.BufferGeometry, material: THREE.Material, count: number, name: string) {
  const fade = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  fade.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("fade", fade);
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = name;
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.count = count;
  const m = new THREE.Matrix4();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < count; i++) mesh.setMatrixAt(i, zero);
  return {
    mesh,
    fade,
    set(i: number, p: THREE.Vector3, q: THREE.Quaternion, s: THREE.Vector3, f: number) {
      mesh.setMatrixAt(i, m.compose(p, q, s));
      fade.setX(i, f);
    },
    hide(i: number) {
      mesh.setMatrixAt(i, zero);
      fade.setX(i, 0);
    },
    commit() {
      mesh.instanceMatrix.needsUpdate = true;
      fade.needsUpdate = true;
    },
  };
}

/**
 * Soft quads, round puffs or streaks, in one unlit draw: each quad's colour and shape are its own
 * (per-copy `tint` and `round`), its alpha the shape times its fade. Dust, drips and moths share it,
 * so the three cost one draw and one set of shaders (P02f: pipelines are counted per location).
 */
function softMaterial() {
  const material = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  const centred = uv().sub(0.5).mul(2);
  const puff = float(1).sub(centred.length()).max(0).pow(1.6);
  const streak = float(1).sub(centred.x.abs()).max(0).mul(float(1).sub(centred.y.abs().pow(4)));
  const round = attribute("round", "float") as unknown as THREE.Node<"float">;
  material.colorNode = attribute("tint", "vec3");
  material.opacityNode = streak.mix(puff, round).mul(attribute("fade", "float"));
  return material;
}

/** A run of `count` copies of a swarm, from `offset`, with its own colour and shape. */
function slice(base: ReturnType<typeof swarm>, offset: number, count: number, tint: THREE.Color, round: number) {
  const tints = base.mesh.geometry.getAttribute("tint") as THREE.InstancedBufferAttribute;
  const rounds = base.mesh.geometry.getAttribute("round") as THREE.InstancedBufferAttribute;
  for (let i = 0; i < count; i++) {
    tints.setXYZ(offset + i, tint.r, tint.g, tint.b);
    rounds.setX(offset + i, round);
  }
  let lastShade = 1;
  return {
    set: (i: number, p: THREE.Vector3, q: THREE.Quaternion, s: THREE.Vector3, f: number) => base.set(offset + i, p, q, s, f),
    hide: (i: number) => base.hide(offset + i),
    /** Darken the run's colour (it is unlit: dust at night must not glow). */
    shade(k: number) {
      if (Math.abs(k - lastShade) < 0.01) return;
      lastShade = k;
      for (let i = 0; i < count; i++) tints.setXYZ(offset + i, tint.r * k, tint.g * k, tint.b * k);
      tints.needsUpdate = true;
    },
  };
}

export function startSmallLife(ctx: SmallLifeContext): () => void {
  const undo: (() => void)[] = [];
  const camQ = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);

  // ---- the booth's frame (as in sim/gate-scene.ts) --------------------------------------------------
  const yaw = layout.booth.yaw;
  const across = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const inward = new THREE.Vector3(layout.gate.inbound[0], 0, layout.gate.inbound[2]).normalize();
  const booth = new THREE.Vector3(...(layout.booth.p as [number, number, number]));
  const boothPoint = (x: number, y: number, z: number) => booth.clone().addScaledVector(across, x).addScaledVector(inward, y).addScaledVector(up, z);

  // ---- one draw of soft quads for the dust, the drips and the moths ------------------------------------
  const DUST = 48;
  const DRIPS = 36;
  const MOTHS = 9;
  const quad = new THREE.PlaneGeometry(1, 1);
  quad.setAttribute("tint", new THREE.InstancedBufferAttribute(new Float32Array((DUST + DRIPS + MOTHS) * 3), 3));
  quad.setAttribute("round", new THREE.InstancedBufferAttribute(new Float32Array(DUST + DRIPS + MOTHS), 1));
  const soft = swarm(quad, softMaterial(), DUST + DRIPS + MOTHS, "fx:soft");

  // ---- dust behind the pickup -------------------------------------------------------------------------
  const dustOpacity = { value: 0.5 };
  const dust = slice(soft, 0, DUST, new THREE.Color(0.66, 0.52, 0.42), 1);
  const puffs = Array.from({ length: DUST }, () => ({ age: -1, life: 2.6, at: new THREE.Vector3(), v: new THREE.Vector3(), size: 0.4, grow: 1.6, spin: 0 }));
  let nextPuff = 0;
  let spawnClock = 0;

  // ---- drips from the roof's edge while it is wet ------------------------------------------------------
  // (the eave runs round three sides; the back has the gutter. Roof level rises 0.105 m a metre towards the road)
  const eaveAt = (x: number) => 2.56 + 0.105 * x - 0.15;
  const eaves: [THREE.Vector3, THREE.Vector3][] = [
    [boothPoint(1.95, -2.08, eaveAt(1.95)), boothPoint(1.95, 2.08, eaveAt(1.95))],
    [boothPoint(-1.8, -2.13, eaveAt(-1.8)), boothPoint(1.9, -2.13, eaveAt(1.9))],
    [boothPoint(-1.8, 2.13, eaveAt(-1.8)), boothPoint(1.9, 2.13, eaveAt(1.9))],
  ];
  const DRIP_OPACITY = 0.55;
  const drips = slice(soft, DUST, DRIPS, new THREE.Color(0.78, 0.83, 0.88), 0);
  const drops = Array.from({ length: DRIPS }, () => ({ alive: false, at: new THREE.Vector3(), v: 0, floor: 0 }));
  let dripClock = 0;

  // ---- moths at the flood lamp -------------------------------------------------------------------------
  const flood = (zone.lights as { kind: string; p: number[] }[]).find((l) => l.kind === "flood");
  const lampAt = flood ? new THREE.Vector3(flood.p[0], flood.p[1] - 0.12, flood.p[2]) : null;
  const MOTH_OPACITY = 0.95;
  const moths = slice(soft, DUST + DRIPS, MOTHS, new THREE.Color(0.95, 0.9, 0.78), 1);
  const flutter = Array.from({ length: MOTHS }, () => ({ r: rand(0.18, 0.7), w: rand(1.2, 3.2) * (Math.random() < 0.5 ? -1 : 1), h: rand(-0.35, 0.25), ph: rand(0, 6.28), j: rand(4, 9) }));

  // ---- birds in the acacias -------------------------------------------------------------------------------
  // a small dark bird: a body of two tapered triangles and two wings that beat in the vertex stage
  const bird = new THREE.BufferGeometry();
  // prettier-ignore
  const bp = [
    0, 0, 0.09, 0.022, 0, -0.02, -0.022, 0, -0.02, // body, top
    0, 0, 0.09, -0.022, 0, -0.02, 0, -0.025, 0.0, // body, belly (two faces)
    0.022, 0, -0.02, 0, -0.025, 0.0, 0, 0, -0.08, // tail side
    0.012, 0.004, 0.03, 0.13, 0.0, -0.01, 0.012, 0.004, -0.03, // left wing
    -0.012, 0.004, 0.03, -0.012, 0.004, -0.03, -0.13, 0.0, -0.01, // right wing
  ];
  const wing = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0];
  bird.setAttribute("position", new THREE.Float32BufferAttribute(bp, 3));
  bird.setAttribute("wing", new THREE.Float32BufferAttribute(wing, 1));
  bird.computeVertexNormals();
  // (unlit: a bird is a few pixels against the sky or the canopy, and a lit material is a shader per set of lights)
  const birdMaterial = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0.07, 0.06, 0.05), side: THREE.DoubleSide });
  {
    // wing beats: a wing tip swings about the body's long axis; `fade` here is how hard it beats (0 perched)
    const w = attribute("wing", "float") as unknown as THREE.Node<"float">;
    const strength = attribute("fade", "float") as unknown as THREE.Node<"float">;
    const beat = sin(time.mul(26).add(strength.mul(40))).mul(0.9).mul(strength.min(1));
    // (each wing turns about the body's long axis, Z; the two mirror each other; the body has w = 0)
    const angle = beat.mul(w);
    const c = cos(angle);
    const sn = sin(angle);
    birdMaterial.positionNode = vec3(positionLocal.x.mul(c).sub(positionLocal.y.mul(sn)), positionLocal.x.mul(sn).add(positionLocal.y.mul(c)), positionLocal.z);
  }
  const BIRDS = 5;
  const birds = swarm(bird, birdMaterial, BIRDS, "fx:birds");
  const perches: THREE.Vector3[] = [];
  for (const place of zone.placements as { asset: string; p: number[]; s: number }[]) {
    if (place.asset !== "flora.acacia.a") continue;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + place.p[0];
      const r = rand(2.2, 4.5) * place.s;
      perches.push(new THREE.Vector3(place.p[0] + Math.cos(a) * r, place.p[1] + rand(6.0, 9.5) * place.s, place.p[2] + Math.sin(a) * r));
    }
  }
  type Bird = { state: "perch" | "fly"; until: number; from: THREE.Vector3; to: THREE.Vector3; t: number; heading: number; hop: number };
  const flock: Bird[] = Array.from({ length: BIRDS }, () => {
    const at = perches[Math.floor(Math.random() * perches.length)] ?? new THREE.Vector3();
    return { state: "perch", until: rand(1, 8), from: at.clone(), to: at.clone(), t: 0, heading: rand(0, 6.28), hop: 0 };
  });
  let elapsed = 0;

  const all = [soft, birds];
  for (const one of all) ctx.scene.add(one.mesh);
  undo.push(() => {
    for (const one of all) {
      one.mesh.removeFromParent();
      one.mesh.geometry.dispose();
      (one.mesh.material as THREE.Material).dispose();
      one.mesh.dispose();
    }
  });
  // (built for every pass and both light sets before it is ever seen: engine/precompile.ts)
  for (const one of all) precompile.object(ctx.renderer, ctx.scene, ctx.camera, one.mesh).catch((error) => console.warn("[twin] small life was not precompiled", error));

  const stop = loop.add("animation", (dt) => {
    if (twinStore.getState().ui.reducedMotion) dt = 0;
    elapsed += dt;
    ctx.camera.getWorldQuaternion(camQ);
    const night = air.lamps.value;
    const wet = air.wetness.value;
    const rain = air.rain.value;
    const day = 1 - night;

    // dust: only on a dry road, a puff from each rear wheel every few hundredths of a second at speed
    const source = ctx.dust();
    spawnClock += dt;
    if (source && source.speed > 0.8 && wet < 0.25) {
      const every = THREE.MathUtils.clamp(0.16 / source.speed, 0.035, 0.12);
      while (spawnClock > every) {
        spawnClock -= every;
        for (const at of source.points) {
          const puff = puffs[nextPuff];
          nextPuff = (nextPuff + 1) % DUST;
          puff.age = 0;
          puff.life = rand(2.0, 3.2);
          puff.at.copy(at).add(p.set(rand(-0.15, 0.15), 0.12, rand(-0.15, 0.15)));
          puff.v.set(rand(-0.25, 0.25) + air.windDir.value.x * 0.35, rand(0.25, 0.5), rand(-0.25, 0.25) + air.windDir.value.y * 0.35);
          puff.size = rand(0.35, 0.55) * Math.min(1.4, 0.6 + source.speed * 0.15);
          puff.grow = rand(1.2, 2.0);
          puff.spin = rand(0, 6.28);
        }
      }
    } else spawnClock = 0;
    dustOpacity.value = 0.42 * (0.35 + 0.65 * day);
    // (lit only by the sky: at night the pickup's lamps catch a little of it)
    dust.shade(0.12 + 0.88 * day);
    drips.shade(0.3 + 0.7 * day);
    puffs.forEach((puff, i) => {
      if (puff.age < 0) return dust.hide(i);
      puff.age += dt;
      if (puff.age > puff.life) {
        puff.age = -1;
        return dust.hide(i);
      }
      const k = puff.age / puff.life;
      puff.at.addScaledVector(puff.v, dt);
      puff.v.multiplyScalar(Math.exp(-dt * 0.9));
      const size = puff.size * (1 + puff.grow * Math.sqrt(k));
      q.setFromAxisAngle(p.set(0, 0, 1), puff.spin + k * 0.6).premultiply(camQ);
      dust.set(i, puff.at, q, s.set(size, size, size), Math.min(1, k * 8) * (1 - k) * (1 - k) * dustOpacity.value);
    });

    // drips: while the roof is wet; heavier in rain
    dripClock += dt;
    const rate = wet > 0.3 ? (rain > 0.2 ? 26 : 8 * wet) : 0;
    while (rate > 0 && dripClock > 1 / rate) {
      dripClock -= 1 / rate;
      const drop = drops.find((d) => !d.alive);
      if (!drop) break;
      const [a, b] = eaves[Math.floor(Math.random() * eaves.length)];
      drop.at.copy(a).lerp(b, Math.random());
      drop.v = 0;
      drop.floor = groundY(drop.at.x, drop.at.z);
      drop.alive = true;
    }
    if (rate === 0) dripClock = 0;
    const camAt = ctx.camera.position;
    drops.forEach((drop, i) => {
      if (!drop.alive) return drips.hide(i);
      drop.v += 9.8 * dt;
      drop.at.y -= drop.v * dt;
      if (drop.at.y < drop.floor) {
        drop.alive = false;
        return drips.hide(i);
      }
      // a streak as long as the drop travels in a sixtieth of a second, turned about the vertical to face the eye
      const len = 0.03 + drop.v * 0.016;
      q.setFromAxisAngle(up, Math.atan2(camAt.x - drop.at.x, camAt.z - drop.at.z));
      drips.set(i, drop.at, q, s.set(0.007, len, 1), DRIP_OPACITY);
    });

    // moths: only while the flood lamp is lit
    flutter.forEach((m, i) => {
      if (!lampAt || night < 0.5) return moths.hide(i);
      const a = m.ph + elapsed * m.w;
      p.set(Math.cos(a) * m.r + Math.sin(elapsed * m.j + i) * 0.06, m.h + Math.sin(elapsed * m.j * 0.7 + m.ph) * 0.12, Math.sin(a) * m.r + Math.cos(elapsed * m.j * 1.3) * 0.06).add(lampAt);
      const size = 0.028 * (0.75 + 0.25 * Math.abs(Math.sin(elapsed * 30 + i)));
      moths.set(i, p, camQ, s.set(size, size, size), night * MOTH_OPACITY);
    });
    soft.commit();

    // birds: by day and out of the rain; they perch, turn, hop, and now and then fly to another tree
    const out = day > 0.6 && rain < 0.3 && perches.length > 1;
    flock.forEach((b, i) => {
      if (!out) return birds.hide(i);
      b.until -= dt;
      if (b.state === "perch") {
        if (b.until < 0) {
          b.state = "fly";
          b.from.copy(b.to);
          b.to.copy(perches[Math.floor(Math.random() * perches.length)]);
          b.t = 0;
          b.until = b.from.distanceTo(b.to) / rand(5, 7);
        } else if (Math.random() < dt * 0.4) {
          b.heading += rand(-1.5, 1.5);
          b.hop = 0.25;
        }
        b.hop = Math.max(0, b.hop - dt);
        p.copy(b.to);
        p.y += Math.sin((b.hop / 0.25) * Math.PI) * 0.06;
        q.setFromAxisAngle(up, b.heading);
        birds.set(i, p, q, s.set(1, 1, 1), b.hop > 0 ? 0.6 : 0);
      } else {
        const total = Math.max(0.3, b.from.distanceTo(b.to) / 6);
        b.t = Math.min(1, b.t + dt / total);
        p.copy(b.from).lerp(b.to, b.t);
        p.y += Math.sin(b.t * Math.PI) * 1.2;
        b.heading = Math.atan2(b.to.x - b.from.x, b.to.z - b.from.z);
        q.setFromAxisAngle(up, b.heading);
        birds.set(i, p, q, s.set(1, 1, 1), b.t < 0.85 ? 1 : 0.5);
        if (b.t >= 1) {
          b.state = "perch";
          b.until = rand(3, 14);
        }
      }
    });
    birds.commit();
  });
  undo.push(stop);

  return () => {
    for (const fn of undo.reverse()) fn();
  };
}
