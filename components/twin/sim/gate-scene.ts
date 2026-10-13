/**
 * The camp gate's staged loop (P02b): a pickup drives up and stops at the barrier, the camp dog
 * gets up from the shade, barks and trots over to look, the barrier rises, the pickup drives in,
 * the barrier comes down and the dog goes back to lie down. About a minute, then again.
 *
 * It is a script for the slice, not the simulation (that is P09): everything is worked out from
 * one number, the time into the loop, so any moment can be shown again for a capture
 * (`window.__TWIN__.gate.seek(seconds)`, `.hold(true)`). The actors themselves are the real
 * runtime (engine/actors.ts) and carry forward.
 *
 * No React here. `startGateScene` returns the function that removes everything.
 */
import * as THREE from "three/webgpu";
import layout from "../data/sources/camp-gate-layout.json";
import { ASSETS } from "../data/site";
import { acquireActorModel, createActor, releaseActorModel, type Actor } from "../engine/actors";
import { assets } from "../engine/assets";
import { lodScale } from "../engine/lod";
import { loop } from "../engine/loop";
import { groundY } from "../engine/picking";
import { streaming } from "../engine/streaming";
import { tierSettings } from "../engine/tiers";
import { twinStore } from "../state/store";
import { air } from "../world/air";

export type GateSceneContext = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGPURenderer;
  /** Height of the view in CSS pixels. */
  viewHeight: () => number;
};

const ZONE = "powerhouse.camp-gate";
const PICKUP = "veh.pickup.a";
const DOG = "fauna.aspin.a";
const BOOM = "kit.boom-arm";

/** The pickup: metres a second on the approach, and how hard it speeds up and brakes. */
const CRUISE = 4.2;
const ACCEL = 1.3;
/** Its bumper stops this far short of the barrier. */
const STOP_SHORT = 2.6;
/** Seconds at the barrier before it lifts (the guard's check, once there is a guard). */
const CHECK_SECONDS = 6;
const BOOM_SECONDS = 3;
const BOOM_UP = THREE.MathUtils.degToRad(82);
/** Speeds the dog's clips were made for, metres a second (scripts/blender/twin/build_gate_dog.py). */
const DOG_WALK = { clip: "walk", made: 0.36, speed: 0.55 };
const DOG_TROT = { clip: "trot", made: 1.34, speed: 1.34 };
/** Where the dog rests and where it watches from, in the booth's own frame: metres towards the road, metres into the camp. */
const DOG_REST = { across: 0.8, inward: 3.4, facing: 2.2 };
const DOG_WATCH = { across: 2.0, inward: -4.2 };

const ease = (t: number) => {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
};

/** Distance covered `t` seconds into a move of `distance` metres from rest to rest; and the speed then. */
function travel(distance: number, t: number): { s: number; v: number; seconds: number } {
  const ramp = CRUISE / ACCEL;
  const rampDistance = 0.5 * ACCEL * ramp * ramp;
  // (a move too short to reach cruising speed speeds up half-way and brakes the rest)
  const peak = distance >= 2 * rampDistance ? CRUISE : Math.sqrt(distance * ACCEL);
  const up = peak / ACCEL;
  const flat = Math.max(0, (distance - peak * up) / peak);
  const seconds = 2 * up + flat;
  if (t <= 0) return { s: 0, v: 0, seconds };
  if (t >= seconds) return { s: distance, v: 0, seconds };
  if (t < up) return { s: 0.5 * ACCEL * t * t, v: ACCEL * t, seconds };
  if (t < up + flat) return { s: 0.5 * peak * up + peak * (t - up), v: peak, seconds };
  const left = seconds - t;
  return { s: distance - 0.5 * ACCEL * left * left, v: ACCEL * left, seconds };
}

const turnTowards = (from: number, to: number, most: number) => {
  const d = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + Math.sign(d) * Math.min(Math.abs(d), most);
};

type Status = { seconds: number; length: number; phase: string; actors: number; held: boolean };
let status: Status = { seconds: 0, length: 0, phase: "loading", actors: 0, held: false };
let seekTo: number | null = null;
let held = false;

/** For captures and checks (`window.__TWIN__.gate`). */
export const gateScene = {
  status: () => ({ ...status }),
  /** Jump to a moment of the loop, seconds. */
  seek(seconds: number) {
    seekTo = seconds;
  },
  /** Stop the loop's clock (the actors keep breathing) or let it run. */
  hold(on: boolean) {
    held = on;
  },
};

export function startGateScene(ctx: GateSceneContext): () => void {
  let stopped = false;
  const undo: (() => void)[] = [];
  assets.configure(ctx.renderer);

  // ---- the road through the gate, by distance along it ------------------------------------------
  const road = new THREE.CatmullRomCurve3(layout.road.map(([x, , z]) => new THREE.Vector3(x, 0, z)));
  road.arcLengthDivisions = 400;
  const length = road.getLength();
  const gate = new THREE.Vector3(layout.gate.p[0], 0, layout.gate.p[2]);
  let gateAt = 0;
  for (let i = 0, best = Infinity; i <= 400; i++) {
    const d = road.getPointAt(i / 400).distanceTo(gate);
    if (d < best) {
      best = d;
      gateAt = (i / 400) * length;
    }
  }
  const onRoad = (s: number, out: THREE.Vector3) => road.getPointAt(Math.min(1, Math.max(0, s / length)), out);

  // the booth's frame: `across` towards the road, `inward` into the camp
  const yaw = layout.booth.yaw;
  const across = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const inward = new THREE.Vector3(layout.gate.inbound[0], 0, layout.gate.inbound[2]).normalize();
  const boothPoint = (a: number, b: number) => new THREE.Vector3(layout.booth.p[0], 0, layout.booth.p[2]).addScaledVector(across, a).addScaledVector(inward, b);

  const start = async () => {
    const wanted = [PICKUP, DOG].filter((id) => ASSETS.has(id));
    const models = await Promise.all(wanted.map((id) => acquireActorModel(id)));
    if (stopped) {
      for (const id of wanted) releaseActorModel(id);
      return;
    }
    undo.push(() => wanted.forEach(releaseActorModel));
    const make = async (id: string): Promise<Actor | null> => {
      const model = models[wanted.indexOf(id)];
      if (!model) return null;
      const actor = createActor(model);
      try {
        // (built before it is shown, so its first frame does not stall)
        await ctx.renderer.compileAsync(actor.object as unknown as THREE.Object3D, ctx.camera, ctx.scene);
      } catch (error) {
        console.warn("[twin] actor was not precompiled", error);
      }
      if (stopped) {
        actor.dispose();
        return null;
      }
      ctx.scene.add(actor.object);
      undo.push(() => actor.dispose());
      return actor;
    };
    const pickup = await make(PICKUP);
    const dog = await make(DOG);
    if (stopped) return;

    // ---- the pickup's measurements ---------------------------------------------------------------
    const wheel = (name: string) => pickup?.parts.get(name) ?? null;
    const frontZ = wheel("wheel-fl")?.steer.position.z ?? 1.9;
    const rearZ = wheel("wheel-rl")?.steer.position.z ?? -1.2;
    const wheelbase = frontZ - rearZ;
    const track = Math.abs((wheel("wheel-fl")?.steer.position.x ?? 0.8) - (wheel("wheel-fr")?.steer.position.x ?? -0.8));
    const radius = wheel("wheel-fl")?.radius || 0.38;
    const nose = pickup ? pickup.model.entry.bounds.max[2] : 2.8;
    pickup?.object.rotation.set(0, 0, 0, "YXZ");

    // headlamps: one real light for the pair, always in the scene (a light that comes and goes
    // rebuilds every shader), dark by day
    let beam: THREE.SpotLight | null = null;
    if (pickup && tierSettings().lights > 4) {
      const heads = (pickup.data.twin_headlights as number[][] | undefined) ?? [[0, 0.85, nose]];
      beam = new THREE.SpotLight(0xfff1d6, 0, 38, THREE.MathUtils.degToRad(34), 0.6, 1.6);
      beam.name = "lamp:pickup:headlamps";
      beam.position.set(0, heads[0][1], heads[0][2]);
      beam.target.position.set(0, -0.4, heads[0][2] + 14);
      pickup.object.add(beam, beam.target);
    }

    // ---- the script's times ------------------------------------------------------------------------
    // distances along the road are of the rear axle
    const from = 3;
    const stopAt = gateAt - STOP_SHORT - (nose - rearZ);
    const leaveTo = length - 2 - wheelbase;
    const tGo = 1.5;
    const tStop = tGo + travel(stopAt - from, 0).seconds;
    const tBoomUp = tStop + CHECK_SECONDS;
    const tLeave = tBoomUp + BOOM_SECONDS + 0.6;
    const tGone = tLeave + travel(leaveTo - stopAt, 0).seconds;
    const tBoomDown = tLeave + 6.5;
    const rearAxleAt = (t: number) => {
      if (t < tLeave) {
        const move = travel(stopAt - from, t - tGo);
        return { s: from + move.s, v: move.v };
      }
      const move = travel(leaveTo - stopAt, t - tLeave);
      return { s: stopAt + move.s, v: move.v };
    };
    // the dog notices the pickup when it is this close to the gate
    let tAlert = tGo;
    while (tAlert < tStop && rearAxleAt(tAlert).s < gateAt - 26) tAlert += 0.1;

    const rest = boothPoint(DOG_REST.across, DOG_REST.inward);
    const watch = boothPoint(DOG_WATCH.across, DOG_WATCH.inward);
    const dogRun = rest.distanceTo(watch);
    const tUp = tAlert + 1.4; // on its feet
    const tBark = tUp + 0.7;
    const tTrot = tBark + 1.6;
    const tWatch = tTrot + dogRun / DOG_TROT.speed;
    const tStand = tLeave + 1.5;
    const tHome = tStand + 4;
    const tBack = tHome + dogRun / DOG_WALK.speed;
    const tDown = tBack + 1.2; // turned round, starts to lie down
    const tLying = tDown + 1.6;
    const loopSeconds = Math.max(tGone + 5, tLying + 6);

    // ---- the barrier arm: one placed copy of the zone, moved ---------------------------------------
    const boom = { set: null as ReturnType<typeof streaming.instancesOf>, angle: -1 };
    const boomMatrix = new THREE.Matrix4();
    const lift = new THREE.Matrix4();
    const setBoom = (angle: number) => {
      const set = streaming.instancesOf(ZONE, BOOM);
      if (!set || (set === boom.set && Math.abs(angle - boom.angle) < 1e-4)) return;
      const place = set.placements[0];
      // the arm lies along its own +X from the pivot: turning about +Z lifts it
      boomMatrix.compose(new THREE.Vector3(...place.p), new THREE.Quaternion().setFromEuler(new THREE.Euler(place.r[0], place.r[1], place.r[2], "XYZ")), new THREE.Vector3(place.s, place.s, place.s));
      set.move(0, boomMatrix.multiply(lift.makeRotationZ(angle)));
      boom.set = set;
      boom.angle = angle;
    };
    undo.push(() => {
      boom.angle = -1;
      setBoom(0);
    });

    // ---- per frame -----------------------------------------------------------------------------------
    const rear = new THREE.Vector3();
    const front = new THREE.Vector3();
    const ahead = new THREE.Vector3();
    const side = new THREE.Vector3();
    const dogAt = new THREE.Vector3().copy(rest);
    let dogHeading = DOG_REST.facing;
    let pitch = 0;
    let roll = 0;
    let t = 0;
    status = { seconds: 0, length: loopSeconds, phase: "start", actors: (pickup ? 1 : 0) + (dog ? 1 : 0), held };
    dog?.play("lie", { fade: 0 });

    const stopLoop = loop.add("animation", (dt) => {
      if (seekTo !== null) {
        t = ((seekTo % loopSeconds) + loopSeconds) % loopSeconds;
        seekTo = null;
      } else if (!held && !twinStore.getState().ui.reducedMotion) {
        t = (t + dt) % loopSeconds;
      }
      const { layers } = twinStore.getState();
      const night = air.lamps.value;
      const tier = tierSettings();
      const k = lodScale(ctx.camera.fov, ctx.viewHeight(), tier.lodBias);
      let phase = t < tGo ? "waiting" : t < tStop ? "pickup arriving" : t < tBoomUp ? "at the barrier" : t < tLeave ? "barrier rising" : t < tGone ? "pickup driving in" : "quiet";

      // the barrier
      const up = t < tBoomDown ? ease((t - tBoomUp) / BOOM_SECONDS) : 1 - ease((t - tBoomDown) / BOOM_SECONDS);
      setBoom(up * BOOM_UP);

      // the pickup: both axles on the road line, the body following the ground under the wheels
      if (pickup) {
        const { s, v } = rearAxleAt(t);
        pickup.object.visible = layers.vehicles && t < tGone + 0.5;
        onRoad(s, rear);
        onRoad(s + wheelbase, front);
        const heading = Math.atan2(front.x - rear.x, front.z - rear.z);
        const yRear = groundY(rear.x, rear.z);
        const yFront = groundY(front.x, front.z);
        side.set(Math.cos(heading), 0, -Math.sin(heading)); // the pickup's left
        const mid = ahead.copy(rear).lerp(front, 0.5);
        const yLeft = groundY(mid.x + side.x * track * 0.5, mid.z + side.z * track * 0.5);
        const yRight = groundY(mid.x - side.x * track * 0.5, mid.z - side.z * track * 0.5);
        // (springs: the body takes a moment to follow the wheels)
        const follow = seekTo === null && dt > 0 ? 1 - Math.exp(-dt * 7) : 1;
        pitch += (Math.atan2(yFront - yRear, wheelbase) - pitch) * follow;
        roll += (Math.atan2(yLeft - yRight, track) - roll) * follow;
        const origin = -rearZ / wheelbase; // where the asset's origin lies between the axles
        pickup.object.position.set(rear.x + (front.x - rear.x) * origin, yRear + (yFront - yRear) * origin, rear.z + (front.z - rear.z) * origin);
        pickup.object.rotation.set(-pitch, heading, roll, "YXZ");
        // wheels roll with the distance covered; the front pair points where the road goes next
        onRoad(s + wheelbase + 1.5, ahead);
        const steer = THREE.MathUtils.clamp(Math.atan2(Math.sin(Math.atan2(ahead.x - front.x, ahead.z - front.z) - heading), Math.cos(Math.atan2(ahead.x - front.x, ahead.z - front.z) - heading)) * 1.6, -0.6, 0.6);
        for (const [name, part] of pickup.parts) {
          if (name === "steering") {
            if (part.axis) part.spin.quaternion.setFromAxisAngle(part.axis, -steer * 9);
            continue;
          }
          part.spin.rotation.x = (s - from) / (part.radius || radius);
          if (name === "wheel-fl" || name === "wheel-fr") part.steer.rotation.y = steer;
        }
        // lamps: on in the dark and in rain; brake lamps show while it slows or stands
        const lampsOn = Math.max(night, air.wetness.value > 0.6 ? 1 : 0);
        pickup.setGlow(lampsOn * 5 + (v < 0.2 || (t < tStop && t > tStop - CRUISE / ACCEL) ? 0.9 : 0));
        if (beam) beam.intensity = lampsOn * 55;
        pickup.update(dt, ctx.camera.position, k, tier.drawDistance);
      }

      // the dog
      if (dog) {
        dog.object.visible = layers.animals;
        const truckHeading = pickup ? Math.atan2(pickup.object.position.x - dogAt.x, pickup.object.position.z - dogAt.z) : dogHeading;
        let want = dogHeading;
        let turn = 2.4; // radians a second
        if (t < tAlert || t >= tLying) {
          dogAt.copy(rest);
          want = DOG_REST.facing;
          dog.play("lie", { fade: 0.4 });
        } else if (t < tUp) {
          dogAt.copy(rest);
          want = truckHeading;
          turn = 1.2;
          dog.play("getUp", { fade: 0.15, loop: false });
          phase += ", dog getting up";
        } else if (t < tBark) {
          dogAt.copy(rest);
          want = truckHeading;
          dog.play("idle", { fade: 0.3 });
        } else if (t < tTrot) {
          dogAt.copy(rest);
          want = truckHeading;
          dog.play("bark", { fade: 0.15, loop: false });
          phase += ", dog barking";
        } else if (t < tWatch) {
          dogAt.copy(rest).lerp(watch, (t - tTrot) / (tWatch - tTrot));
          want = Math.atan2(watch.x - rest.x, watch.z - rest.z);
          turn = 5;
          dog.play(DOG_TROT.clip, { fade: 0.2, speed: DOG_TROT.speed / DOG_TROT.made });
        } else if (t < tStand) {
          dogAt.copy(watch);
          want = truckHeading;
          dog.play("sit", { fade: 0.5 });
          phase += ", dog watching";
        } else if (t < tHome) {
          dogAt.copy(watch);
          want = truckHeading;
          dog.play("idle", { fade: 0.5 });
        } else if (t < tBack) {
          dogAt.copy(watch).lerp(rest, (t - tHome) / (tBack - tHome));
          want = Math.atan2(rest.x - watch.x, rest.z - watch.z);
          turn = 3;
          dog.play(DOG_WALK.clip, { fade: 0.3, speed: DOG_WALK.speed / DOG_WALK.made });
        } else if (t < tDown) {
          dogAt.copy(rest);
          want = DOG_REST.facing;
          dog.play("idle", { fade: 0.3 });
        } else {
          dogAt.copy(rest);
          want = DOG_REST.facing;
          dog.play("lieDown", { fade: 0.2, loop: false });
        }
        dogHeading = turnTowards(dogHeading, want, turn * Math.max(dt, 1 / 240));
        dog.object.position.set(dogAt.x, groundY(dogAt.x, dogAt.z), dogAt.z);
        dog.object.rotation.y = dogHeading;
        dog.update(dt, ctx.camera.position, k, tier.drawDistance);
      }
      status.seconds = t;
      status.phase = phase;
      status.held = held;
    });
    undo.push(stopLoop);
  };

  start().catch((error) => console.error("[twin] the gate scene did not start", error));

  return () => {
    stopped = true;
    for (const fn of undo.reverse()) fn();
    status = { seconds: 0, length: 0, phase: "stopped", actors: 0, held };
  };
}
