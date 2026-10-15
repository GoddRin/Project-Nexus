/**
 * The camp gate's staged loop (P02b): a pickup drives up and stops at the barrier; the guard walks
 * out to the driver, checks, goes to the barrier and bears down on its counterweight; the barrier
 * rises, he waves the pickup through, lowers the barrier and goes back to his post. The camp dog
 * gets up from the shade, barks and trots over to look, then goes back to lie down. On the verge an
 * engineer with a tablet talks a labourer through a drain he is digging. About a minute, then again.
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
import { acquireActorModel, createActor, releaseActorModel, type Actor, type ActorModel } from "../engine/actors";
import { assets } from "../engine/assets";
import { lodScale } from "../engine/lod";
import { loop } from "../engine/loop";
import { groundY } from "../engine/picking";
import { precompile } from "../engine/precompile";
import { streaming } from "../engine/streaming";
import { tierSettings } from "../engine/tiers";
import { twinStore } from "../state/store";
import { air } from "../world/air";
import { lamps } from "../world/lamps";
import walkMeta from "../data/zones/powerhouse.camp-gate.walk.json";
import { curvesFrom, planBeats, poseAt, walkSeconds as plannedWalk, type Beat, type Walker } from "./walk-plan";
import { DOG as DOG_BODY, PERSON, Polyline, WalkMap, type WalkMeta } from "./walkmap";

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
const GUARD = "char.guard.a";
const ENGINEER = "char.engineer.a";
const LABOURER = "char.labourer.a";

/** The pickup: metres a second on the approach, and how hard it speeds up and brakes. */
const CRUISE = 4.2;
const ACCEL = 1.3;
/** Its bumper stops this far short of the barrier. */
const STOP_SHORT = 2.6;
/** Seconds the guard spends at the driver's window. */
const CHECK_SECONDS = 4.4;
const BOOM_SECONDS = 2.2;
/** The people's walk: the speed the clip was recorded at, and the speed they walk at here (metres a second). */
const WALK = { clip: "walk", made: 1.38, speed: 1.3 };
/** The guard's `barrier` and `barrierDown` clips: seconds in all, and seconds into them at which the arm starts to move. */
const BARRIER_CLIP = { seconds: 4.5, push: 1.1 };
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

/** Where a dog's front and hind paws are from its middle, metres (its body follows the ground under both). */
const DOG_HALF_LENGTH = 0.27;

type Status = { seconds: number; length: number; phase: string; actors: number; held: boolean };
let status: Status = { seconds: 0, length: 0, phase: "loading", actors: 0, held: false };
let seekTo: number | null = null;
/** Where each actor stands now, for checks: position, the ground there and the walk map's verdict. */
const where: Record<string, { x: number; y: number; z: number; ground: number; free: boolean }> = {};
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
  /** Where the people and the dog stand at this moment (checks of feet and routes). */
  where: () => ({ ...where }),
  /** The location's ground height at a point (checks). */
  ground: (x: number, z: number) => groundY(x, z),
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
    const wanted = [PICKUP, DOG, GUARD, ENGINEER, LABOURER].filter((id) => ASSETS.has(id));
    // The actors come after the zone they stand in (P02e): its ground, booth and trees are the first
    // view, and five files of people and vehicles downloading beside them held it back. Then the
    // nearest first, two at a time.
    while (!stopped && streaming.zones().find((z) => z.id === ZONE)?.state !== "in") await new Promise((r) => setTimeout(r, 250));
    if (stopped) return;
    const spotOf: Record<string, THREE.Vector3> = {
      [PICKUP]: onRoad(3, new THREE.Vector3()),
      [DOG]: boothPoint(DOG_REST.across, DOG_REST.inward),
      [GUARD]: boothPoint(1.55, -1.3),
      [ENGINEER]: gate.clone().addScaledVector(inward, -7.5).addScaledVector(across, -4.0),
      [LABOURER]: gate.clone().addScaledVector(inward, -8.7).addScaledVector(across, -5.0),
    };
    const eye = ctx.camera.position;
    const nearestFirst = wanted.slice().sort((a, b) => spotOf[a].distanceTo(eye) - spotOf[b].distanceTo(eye));
    const loading = new Map<string, Promise<ActorModel | null>>();
    let next = 0;
    const startNext = (): Promise<void> | undefined => {
      const id = nearestFirst[next++];
      if (!id) return undefined;
      const promise = acquireActorModel(id);
      loading.set(id, promise);
      return promise.then(() => startNext(), () => startNext());
    };
    const lanes = [startNext(), startNext()];
    const [models, walk] = await Promise.all([
      Promise.all(lanes).then(() => Promise.all(wanted.map((id) => loading.get(id)!))),
      WalkMap.load(walkMeta as unknown as WalkMeta).catch((error) => {
        console.warn("[twin] no walk map: people and the dog keep to straight lines on the ground", error);
        return null;
      }),
    ]);
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
        // (built before it is shown, for every pass and both sets of lights, so neither its first
        // frame nor the lamps coming on stall)
        await precompile.object(ctx.renderer, ctx.scene, ctx.camera, actor.object as unknown as THREE.Object3D);
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
    const guard = await make(GUARD);
    const engineer = await make(ENGINEER);
    const labourer = await make(LABOURER);
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

    // headlamps: one real light for the pair, on the tiers with lights to spare. It is a light only
    // while it shines, and joins the scene with the lamps (world/lamps.ts), whose shaders are built for it
    let headlampsWanted = false;
    if (pickup && tierSettings().lights > 4) {
      const heads = (pickup.data.twin_headlights as number[][] | undefined) ?? [[0, 0.85, nose]];
      const beam = new THREE.SpotLight(0xfff1d6, 0, 38, THREE.MathUtils.degToRad(34), 0.6, 1.6);
      beam.position.set(0, heads[0][1], heads[0][2]);
      beam.target.position.set(0, -0.4, heads[0][2] + 14);
      const drop = lamps.extra("lamp:pickup:headlamps", beam, pickup.object as unknown as THREE.Object3D, 55, () => headlampsWanted);
      undo.push(() => {
        drop();
        beam.dispose();
      });
    }

    // ---- the script's times ------------------------------------------------------------------------
    // distances along the road are of the rear axle
    const from = 3;
    const stopAt = gateAt - STOP_SHORT - (nose - rearZ);
    const leaveTo = length - 2 - wheelbase;
    const tGo = 1.5;
    const tStop = tGo + travel(stopAt - from, 0).seconds;

    // the guard's places: his post by the booth window, the driver's door, the barrier's counterweight
    const stopRear = onRoad(stopAt, new THREE.Vector3());
    const stopFront = onRoad(stopAt + wheelbase, new THREE.Vector3());
    const stopHeading = Math.atan2(stopFront.x - stopRear.x, stopFront.z - stopRear.z);
    const stopLeft = new THREE.Vector3(Math.cos(stopHeading), 0, -Math.sin(stopHeading));
    const cab = stopRear.clone().lerp(stopFront, 0.52);
    const door = cab.clone().addScaledVector(stopLeft, track * 0.5 + 0.95);
    const post = boothPoint(1.55, -1.3);
    const boomPlace = streaming.instancesOf(ZONE, BOOM)?.placements[0];
    const pivot = boomPlace ? new THREE.Vector3(boomPlace.p[0], 0, boomPlace.p[2]) : boothPoint(2.6, 0);
    const tail = pivot.clone().addScaledVector(across, -0.75);
    const atBarrier = tail.clone().addScaledVector(inward, -0.62);
    // a man's walk: turn to the way, set off, walk, stop, turn to face what is next (sim/walk-plan.ts),
    // on a route round the booth and whatever else is in the way (sim/walkmap.ts)
    const walkerOf = (actor: Actor | null): Walker => ({
      curves: curvesFrom(actor?.data),
      walk: WALK,
      route: walk ? (a, b) => walk.findPath(a, b, PERSON) : undefined,
    });
    const guardWalker = walkerOf(guard);
    const walkSeconds = (a: THREE.Vector3, b: THREE.Vector3, before: THREE.Vector3, after: THREE.Vector3) => plannedWalk(guardWalker, a, b, before, after);
    const gateSide = gate.clone().addScaledVector(inward, -1.5);
    const tOut = tStop - 0.9 - 2.4; // he sets off as the pickup slows
    const tDoor = tOut + walkSeconds(post, door, gateSide, cab);
    const tChecked = Math.max(tDoor, tStop + 0.6) + CHECK_SECONDS;
    const tAtBarrier = tChecked + walkSeconds(door, atBarrier, cab, tail);
    const tBoomUp = tAtBarrier + BARRIER_CLIP.push;
    const tLeave = tBoomUp + BOOM_SECONDS + 0.9;
    const tGone = tLeave + travel(leaveTo - stopAt, 0).seconds;
    const tBoomDown = tLeave + 6.5;
    const tLowered = tBoomDown - BARRIER_CLIP.push + BARRIER_CLIP.seconds;
    const tPost = tLowered + walkSeconds(atBarrier, post, tail, gateSide);
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

    const restWanted = boothPoint(DOG_REST.across, DOG_REST.inward);
    const watchWanted = boothPoint(DOG_WATCH.across, DOG_WATCH.inward);
    const rest = walk ? walk.nearestFree(restWanted, DOG_BODY) : restWanted;
    const watch = walk ? walk.nearestFree(watchWanted, DOG_BODY) : watchWanted;
    const runOut = new Polyline(walk ? walk.findPath(rest, watch, DOG_BODY) : [rest, watch]);
    const runBack = new Polyline(walk ? walk.findPath(watch, rest, DOG_BODY) : [watch, rest]);
    const tUp = tAlert + 1.4; // on its feet
    const tBark = tUp + 0.7;
    const tTrot = tBark + 1.6;
    const tWatch = tTrot + runOut.total / DOG_TROT.speed;
    const tStand = tLeave + 1.5;
    const tHome = tStand + 4;
    const tBack = tHome + runBack.total / DOG_WALK.speed;
    const tDown = tBack + 1.2; // turned round, starts to lie down
    const tLying = tDown + 1.6;
    const loopSeconds = Math.max(tGone + 5, tLying + 6, tPost + 4);

    // ---- the people's parts ---------------------------------------------------------------------------
    const guardBeats: Beat[] = [
      { until: tOut, clip: "idle", face: gateSide },
      { until: tDoor, clip: WALK.clip, to: door },
      { until: tChecked, clip: "talk", face: cab },
      { until: tAtBarrier, clip: WALK.clip, to: atBarrier },
      { until: tAtBarrier + BARRIER_CLIP.seconds, clip: "barrier", once: true, face: tail },
      { until: tAtBarrier + BARRIER_CLIP.seconds + 3.4, clip: "waveThrough", once: true, face: gateSide },
      { until: tBoomDown - BARRIER_CLIP.push, clip: "idleShift", face: gate.clone().addScaledVector(inward, 6) },
      { until: tLowered, clip: guard?.model.clips.has("barrierDown") ? "barrierDown" : "barrier", once: true, face: tail },
      { until: tPost, clip: WALK.clip, to: post },
      { until: Infinity, clip: "idle", face: gateSide },
    ];
    // on the verge outside the gate, on the booth's side of the road
    const engineerAt = gate.clone().addScaledVector(inward, -7.5).addScaledVector(across, -4.0);
    const labourerAt = gate.clone().addScaledVector(inward, -8.7).addScaledVector(across, -5.0);
    const digAt = labourerAt.clone().addScaledVector(inward, -0.9).addScaledVector(across, -0.5);
    const engineerBeats: Beat[] = [
      { until: 7.5, clip: "talk", face: labourerAt },
      { until: 15.5, clip: "tablet", once: true, face: labourerAt },
      { until: 19.4, clip: "listen", face: labourerAt },
      { until: 24.1, clip: "point", once: true, face: digAt },
      { until: 32, clip: "talk2", face: labourerAt },
      { until: 40, clip: "tablet", once: true, face: labourerAt },
      { until: Infinity, clip: "idleShift", face: labourerAt },
    ];
    const labourerBeats: Beat[] = [
      { until: 8, clip: "restShovel", face: digAt },
      { until: 17.6, clip: "shovel", face: digAt },
      { until: 33, clip: "restShovel", face: digAt },
      { until: 42.6, clip: "shovel", face: digAt },
      { until: Infinity, clip: "restShovel", face: digAt },
    ];
    const people = [
      { actor: guard, beats: guardBeats, home: post, phase: 0 },
      { actor: engineer, beats: engineerBeats, home: engineerAt, phase: 0.37 },
      { actor: labourer, beats: labourerBeats, home: labourerAt, phase: 0.71 },
    ].map((person) => {
      const walker = walkerOf(person.actor);
      const first = person.beats[0].face;
      const heading = first ? Math.atan2(first.x - person.home.x, first.z - person.home.z) : 0;
      return { ...person, walker, plan: planBeats(walker, person.beats, person.home, heading) };
    });
    const at3 = new THREE.Vector3();
    /** Where a person is, what he faces and what he plays, `t` seconds into the loop. */
    const act = (person: (typeof people)[number], t: number, dt: number, k: number, cull: number) => {
      const { actor, walker, plan } = person;
      if (!actor) return;
      const { heading, seg, clipTime } = poseAt(walker, plan, t, at3);
      if (seg.kind === "walk") {
        actor.play(seg.clip, { fade: 0.3, speed: WALK.speed / WALK.made, phase: person.phase });
      } else if (clipTime !== null) {
        // (a clip that moves him, or one played once: its time is the loop's, so any moment shows again)
        actor.play(seg.clip, { fade: seg.kind === "stand" ? 0.35 : 0.22, loop: false, speed: 0 });
        actor.setTime(clipTime);
      } else {
        actor.play(seg.clip, { fade: 0.35, loop: true, phase: person.phase });
      }
      // (standing on the highest walkable top under his feet: the booth's apron, a step)
      actor.object.position.set(at3.x, walk ? walk.standY(at3.x, at3.z, 0.13) : groundY(at3.x, at3.z), at3.z);
      actor.object.rotation.y = heading;
      actor.update(dt, ctx.camera.position, k, cull);
    };

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

    // heights from the walk map, which arrives long before the ground patch (and is right from the start)
    const surfaceY = (x: number, z: number) => (walk ? walk.heightAt(x, z) : groundY(x, z));

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
    status = { seconds: 0, length: loopSeconds, phase: "start", actors: [pickup, dog, guard, engineer, labourer].filter(Boolean).length, held };
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
        const yRear = surfaceY(rear.x, rear.z);
        const yFront = surfaceY(front.x, front.z);
        side.set(Math.cos(heading), 0, -Math.sin(heading)); // the pickup's left
        const mid = ahead.copy(rear).lerp(front, 0.5);
        const yLeft = surfaceY(mid.x + side.x * track * 0.5, mid.z + side.z * track * 0.5);
        const yRight = surfaceY(mid.x - side.x * track * 0.5, mid.z - side.z * track * 0.5);
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
        headlampsWanted = lampsOn > 0.5;
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
          const s = (t - tTrot) * DOG_TROT.speed;
          runOut.at(s, dogAt);
          want = runOut.heading(s);
          turn = 7;
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
          const s = (t - tHome) * DOG_WALK.speed;
          runBack.at(s, dogAt);
          want = runBack.heading(s);
          turn = 4;
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
        // front and hind paws each on what is under them: up a step, the body tilts and rises with it
        const fx = Math.sin(dogHeading) * DOG_HALF_LENGTH;
        const fz = Math.cos(dogHeading) * DOG_HALF_LENGTH;
        const yFront = walk ? walk.standY(dogAt.x + fx, dogAt.z + fz, 0.08) : groundY(dogAt.x + fx, dogAt.z + fz);
        const yHind = walk ? walk.standY(dogAt.x - fx, dogAt.z - fz, 0.08) : groundY(dogAt.x - fx, dogAt.z - fz);
        dog.object.position.set(dogAt.x, (yFront + yHind) / 2, dogAt.z);
        dog.object.rotation.set(-Math.atan2(yFront - yHind, 2 * DOG_HALF_LENGTH), dogHeading, 0, "YXZ");
        dog.update(dt, ctx.camera.position, k, tier.drawDistance);
      }
      for (const person of people) {
        if (person.actor) person.actor.object.visible = layers.people;
        act(person, t, dt, k, tier.drawDistance);
      }
      const note = (name: string, actor: Actor | null, body: typeof PERSON) => {
        if (!actor) return;
        const p = actor.object.position;
        where[name] = { x: p.x, y: p.y, z: p.z, ground: groundY(p.x, p.z), free: walk ? walk.nearestFree(p, body, 0).distanceTo(p) < 1e-6 : true };
      };
      note("guard", guard, PERSON);
      note("engineer", engineer, PERSON);
      note("labourer", labourer, PERSON);
      note("dog", dog, DOG_BODY);
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
