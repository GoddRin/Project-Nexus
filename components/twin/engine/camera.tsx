"use client";

/**
 * The camera rig: drei's CameraControls class, driven from the loop's camera stage.
 *
 * Free navigation comes first (MASTER-BRIEF rule 8). A fly-to is an ease this file runs itself,
 * so one variable holds it and any pointer, wheel, touch or movement key clears that variable on
 * the spot. Escape always returns to the location overview.
 *
 *   drag            orbit            right-drag / two fingers   pan
 *   wheel / pinch   zoom towards the point under the cursor
 *   double-click    focus on the clicked point
 *   WASD / arrows   move             Q / E   lower / raise      Shift   faster
 */
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { CameraControlsImpl } from "@react-three/drei";
import * as THREE from "three/webgpu";
import { CAMERA_PLACES_LOCATION, getCameraPlace, getLocation } from "../data/site";
import type { Vec3 } from "../data/types";
import { twinActions, twinStore } from "../state/store";
import { loop } from "./loop";
import { groundY, pickAt } from "./picking";

CameraControlsImpl.install({
  THREE: {
    Vector2: THREE.Vector2,
    Vector3: THREE.Vector3,
    Vector4: THREE.Vector4,
    Quaternion: THREE.Quaternion,
    Matrix4: THREE.Matrix4,
    Spherical: THREE.Spherical,
    Box3: THREE.Box3,
    Sphere: THREE.Sphere,
    Raycaster: THREE.Raycaster,
  },
});

/** Lowest the camera may sit above the ground, metres. */
const CLEARANCE = 1.2;
/** Wheel zoom never brings the camera closer than this to the surface under the cursor, metres. */
const MIN_ZOOM_DISTANCE = 2;
/** Fraction of the distance to the cursor point kept per wheel notch. */
const ZOOM_KEEP = 0.82;
const MOVE_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyQ", "KeyE"]);

export type CameraPose = { pos: Vec3; target: Vec3 };

type Fly = { p0: THREE.Vector3; t0: THREE.Vector3; p1: THREE.Vector3; t1: THREE.Vector3; seconds: number; t: number; arc: number };

type Rig = {
  controls: CameraControlsImpl;
  startFly: (pos: Vec3, target: Vec3, seconds?: number) => void;
  overviewPose: () => CameraPose;
};

let rig: Rig | null = null;
let fly: Fly | null = null;
/** The place the camera is at or flying to; cleared the moment the user moves the camera. */
let currentPlace: string | null = null;
/** Kept across a renderer rebuild so the view comes back where it was. */
let lastPose: CameraPose | null = null;
/** How many times a rig has been built on this page (1, plus 1 per renderer rebuild, is healthy). */
let rigBuilds = 0;

/** Any user input: the running fly-to stops here, and the view no longer counts as a named place. */
function userInput() {
  fly = null;
  if (currentPlace !== null) {
    currentPlace = null;
    twinActions.setPlace(null);
  }
}

function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export const cameraApi = {
  /** Ease to a named place from data/cameras.json. False if the place is unknown at this location. */
  flyTo(placeId: string): boolean {
    const place = getCameraPlace(placeId, twinStore.getState().location);
    if (!place || !rig) return false;
    currentPlace = place.id;
    twinActions.setPlace(place.id);
    rig.startFly(place.pos, place.target);
    return true;
  },
  /** Ease to any pose. */
  flyToPose(pos: Vec3, target: Vec3, seconds?: number) {
    if (!rig) return;
    currentPlace = null;
    twinActions.setPlace(null);
    rig.startFly(pos, target, seconds);
  },
  /** Ease to the overview of the current location. */
  overview() {
    if (!rig) return;
    const pose = rig.overviewPose();
    currentPlace = null;
    twinActions.setPlace(null);
    rig.startFly(pose.pos, pose.target);
  },
  /** Stop a running fly-to where it is. */
  cancel() {
    fly = null;
  },
  isFlying(): boolean {
    return fly !== null;
  },
  pose(): CameraPose | null {
    return lastPose;
  },
  builds(): number {
    return rigBuilds;
  },
};

/** Forget the remembered view (the twin was closed, so the next visit starts from the URL). */
export function forgetCameraPose() {
  lastPose = null;
  currentPlace = null;
}

const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const dom = useThree((s) => s.gl.domElement) as HTMLCanvasElement;
  const get = useThree((s) => s.get);

  useEffect(() => {
    const controls = new CameraControlsImpl(camera as THREE.PerspectiveCamera);
    controls.connect(dom);
    controls.smoothTime = 0.12;
    controls.draggingSmoothTime = 0.08;
    controls.minDistance = 0.5;
    controls.maxDistance = 4000;
    controls.minPolarAngle = 0.0001;
    controls.maxPolarAngle = Math.PI * 0.58;
    controls.dollyToCursor = true; // pinch; the wheel is handled below against the real surface
    controls.mouseButtons.wheel = CameraControlsImpl.ACTION.NONE;

    const P = new THREE.Vector3();
    const T = new THREE.Vector3();
    const D = new THREE.Vector3();
    const keys = new Set<string>();

    const overviewPose = (): CameraPose => {
      const { overview } = getLocation(twinStore.getState().location);
      const { width, height } = get().size;
      if (width >= height && width >= 768) return overview;
      // a narrow or upright screen: stand further back and a little higher so the site is not cropped
      const aspect = Math.max(0.4, Math.min(1, width / Math.max(1, height)));
      const k = Math.max(1.35, Math.min(1.85, 0.75 / aspect));
      const [px, py, pz] = overview.pos;
      const [tx, ty, tz] = overview.target;
      return { pos: [tx + (px - tx) * k, ty + (py - ty) * k + 14, tz + (pz - tz) * k], target: overview.target };
    };

    const jump = (pos: Vec3, target: Vec3) => {
      fly = null;
      void controls.setLookAt(pos[0], pos[1], pos[2], target[0], target[1], target[2], false);
    };

    const startFly = (pos: Vec3, target: Vec3, seconds?: number) => {
      if (twinStore.getState().ui.reducedMotion) return jump(pos, target);
      const p0 = controls.getPosition(new THREE.Vector3(), false);
      const t0 = controls.getTarget(new THREE.Vector3(), false);
      const p1 = new THREE.Vector3(...pos);
      const t1 = new THREE.Vector3(...target);
      const travel = p0.distanceTo(p1);
      fly = {
        p0,
        t0,
        p1,
        t1,
        seconds: seconds ?? Math.max(0.7, Math.min(2.4, 0.7 + (travel + t0.distanceTo(t1)) / 260)),
        t: 0,
        // a long move rises a little on the way so it reads as a flight, not a slide
        arc: travel > 30 ? Math.min(travel * 0.12, 40) : 0,
      };
    };

    rig = { controls, startFly, overviewPose };
    rigBuilds++;

    // Starting view: where the camera was before a rebuild, else the place in the URL, else the overview.
    const state = twinStore.getState();
    const place = getCameraPlace(state.camera.place, state.location);
    if (state.camera.place && !place) twinActions.setPlace(null);
    currentPlace = place?.id ?? null;
    const start = lastPose ?? place ?? overviewPose();
    jump(start.pos, start.target);
    controls.update(0);

    // ---- input ---------------------------------------------------------------------------------

    const onPointerDown = () => userInput();

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      userInput();
      let notches = (e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 800 : 1)) / 100;
      if (e.ctrlKey) notches *= 8; // a trackpad pinch arrives as small ctrl+wheel steps
      notches = Math.max(-3, Math.min(3, notches));
      if (notches === 0) return;

      const hit = pickAt(e.clientX, e.clientY, dom, camera);
      if (hit) D.copy(hit.point).sub(camera.position).normalize();
      else camera.getWorldDirection(D);
      controls.getPosition(P, true);
      controls.getTarget(T, true);
      const reach = hit ? hit.distance : P.distanceTo(T);

      let move: number;
      if (notches < 0) {
        move = reach * (1 - Math.pow(ZOOM_KEEP, -notches));
        if (hit) move = Math.min(move, Math.max(0, reach - MIN_ZOOM_DISTANCE));
      } else {
        const limit = Math.max(2000, getLocation(twinStore.getState().location).halfExtent * 5);
        if (P.length() > limit) return;
        move = -Math.max(reach, 10) * (Math.pow(ZOOM_KEEP, -notches) - 1);
      }
      // camera and orbit centre move together along the ray, so the point under the cursor stays under it
      P.addScaledVector(D, move);
      T.addScaledVector(D, move);
      void controls.setLookAt(P.x, P.y, P.z, T.x, T.y, T.z, !twinStore.getState().ui.reducedMotion);
    };

    const onDoubleClick = (e: MouseEvent) => {
      const hit = pickAt(e.clientX, e.clientY, dom, camera);
      if (!hit) return;
      controls.getPosition(P, false);
      controls.getTarget(T, false);
      D.copy(P).sub(T);
      const distance = D.length();
      if (distance > 75) D.setLength(38);
      else if (distance < 5) D.setLength(8);
      P.copy(hit.point).add(D);
      if (P.y < hit.point.y + 2) P.y = hit.point.y + 4;
      userInput();
      startFly([P.x, P.y, P.z], [hit.point.x, hit.point.y, hit.point.z], 0.6);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        if (e.defaultPrevented) return;
        if (isTyping()) (document.activeElement as HTMLElement).blur();
        twinActions.clearSelection();
        twinActions.setFollowing(null);
        cameraApi.overview();
        return;
      }
      if (isTyping() || e.ctrlKey || e.metaKey || e.altKey) return;
      if (MOVE_KEYS.has(e.code)) {
        keys.add(e.code);
        userInput();
        if (e.code.startsWith("Arrow")) e.preventDefault();
      } else if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        keys.add("Shift");
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code === "ShiftLeft" || e.code === "ShiftRight" ? "Shift" : e.code);
    };
    const onBlur = () => keys.clear();

    dom.addEventListener("pointerdown", onPointerDown, { passive: true });
    dom.addEventListener("touchstart", onPointerDown, { passive: true });
    dom.addEventListener("wheel", onWheel, { passive: false });
    dom.addEventListener("dblclick", onDoubleClick);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    // ---- store ---------------------------------------------------------------------------------

    // A place set from outside this file (URL, back/forward, a list in the interface).
    const stopPlace = twinStore.subscribe(
      (s) => s.camera.place,
      (placeId) => {
        if (placeId === currentPlace) return;
        const next = getCameraPlace(placeId, twinStore.getState().location);
        currentPlace = next?.id ?? null;
        if (next) startFly(next.pos, next.target);
        else if (placeId) twinActions.setPlace(null);
      },
    );
    // A change of location is a cut, never a flight across kilometres (CONTRACTS section 3).
    const stopLocation = twinStore.subscribe(
      (s) => s.location,
      () => {
        currentPlace = null;
        const pose = overviewPose();
        jump(pose.pos, pose.target);
      },
    );

    // ---- every frame ---------------------------------------------------------------------------

    const stopLoop = loop.add("camera", (dt) => {
      if (keys.size > 0) {
        const right = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
        const ahead = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
        const up = (keys.has("KeyE") ? 1 : 0) - (keys.has("KeyQ") ? 1 : 0);
        if (right !== 0 || ahead !== 0 || up !== 0) {
          userInput();
          // speed follows the viewing distance: quick across the site, gentle beside a wall
          const speed = Math.max(6, Math.min(55, controls.distance * 0.9)) * (keys.has("Shift") ? 2.2 : 1) * dt;
          if (right !== 0) void controls.truck(right * speed, 0, true);
          if (ahead !== 0) void controls.forward(ahead * speed, true);
          if (up !== 0) void controls.elevate(up * speed * 0.75, true);
        }
      }

      if (fly) {
        fly.t = Math.min(1, fly.t + dt / fly.seconds);
        const k = easeInOut(fly.t);
        P.lerpVectors(fly.p0, fly.p1, k);
        T.lerpVectors(fly.t0, fly.t1, k);
        P.y += Math.sin(Math.PI * k) * fly.arc;
        P.y = Math.max(P.y, groundY(P.x, P.z) + CLEARANCE);
        void controls.setLookAt(P.x, P.y, P.z, T.x, T.y, T.z, false);
        if (fly.t >= 1) fly = null;
      }

      controls.update(dt);

      // never below the ground
      const floor = groundY(camera.position.x, camera.position.z) + CLEARANCE;
      if (camera.position.y < floor) {
        controls.getTarget(T, false);
        void controls.setLookAt(camera.position.x, floor, camera.position.z, T.x, T.y, T.z, false);
        controls.update(0);
      }

      // (after a rebuild the old canvas lingers for half a second; only the live rig records the view)
      if (rig?.controls !== controls) return;
      controls.getTarget(T, false);
      lastPose ??= { pos: [0, 0, 0], target: [0, 0, 0] };
      camera.position.toArray(lastPose.pos);
      T.toArray(lastPose.target);
    });

    return () => {
      stopLoop();
      stopPlace();
      stopLocation();
      dom.removeEventListener("pointerdown", onPointerDown);
      dom.removeEventListener("touchstart", onPointerDown);
      dom.removeEventListener("wheel", onWheel);
      dom.removeEventListener("dblclick", onDoubleClick);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      controls.disconnect();
      controls.dispose();
      if (rig?.controls === controls) {
        fly = null;
        rig = null;
      }
    };
  }, [camera, dom, get]);

  return null;
}

/** True when named places exist for the location (v1's presets cover the powerhouse only). */
export function hasPlaces(location: string): boolean {
  return location === CAMERA_PLACES_LOCATION;
}
