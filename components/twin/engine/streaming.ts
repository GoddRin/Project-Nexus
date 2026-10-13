/**
 * Zone streaming: loads a zone when the camera comes within its `streamIn` distance and unloads it
 * beyond `streamOut` (data/zones/index.json), at most two zones loading at once. Until a zone is
 * in, its `shell` stand-in is shown if it has one.
 *
 * Nothing here may hold a frame up: files are fetched and decoded off the frame, and the work that
 * must happen on it (uploading a texture, compiling a pipeline, adding a draw) is queued as small
 * tasks, of which each frame runs only as many as fit in a few milliseconds.
 *
 * Not handled yet: a placement's `stage` (every placement is shown; P05f wires stages to
 * structures) and `pick` (P09d).
 */
import * as THREE from "three/webgpu";
import { ZONE_INDEX } from "../data/site";
import type { Placement, Zone, ZoneIndexEntry } from "../data/types";
import { twinStore } from "../state/store";
import { registerGroundPatch } from "../world/ground";
import { lamps } from "../world/lamps";
import { SHADOW_FAR } from "../world/SkyLight";
import { assets, type LoadedAsset } from "./assets";
import { createInstanceSet, setDrawCount, type InstanceSet } from "./instances";
import { lodScale } from "./lod";
import { loop } from "./loop";
import { isProbing, tierSettings } from "./tiers";

/** Zones loading at the same time. */
const MAX_LOADING = 2;
/** Milliseconds of queued work started per frame; one task may run past it, so tasks are kept small. */
const SLICE_MS = 4;
/** How often zone distances are looked at, seconds. */
const CHECK_EVERY = 0.25;
/** A zone that failed to load is not tried again for this long, milliseconds. */
const RETRY_AFTER_MS = 30_000;

/** A small piece of on-frame work. `kind` names it in the stats so a slow one can be found. */
type Task = { kind: string; run: () => void | Promise<unknown> };

type ZoneRun = {
  entry: ZoneIndexEntry;
  box: THREE.Box3;
  state: "out" | "loading" | "in";
  /** Raised whenever the zone is unloaded, so work queued for an earlier load does nothing. */
  token: number;
  group: THREE.Group | null;
  sets: InstanceSet[];
  held: string[];
  /** Things to undo on unload beside the draws: the ground patch's part in picking, the zone's lamps. */
  cleanup: (() => void)[];
  shell: { id: string; group: THREE.Group } | null;
  /** After a failed load: the time (performance.now) before which it is not tried again. */
  retryAt: number;
};

export type StreamingContext = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGPURenderer;
  /** Height of the view in CSS pixels. */
  viewHeight: () => number;
  /** Also stream zones marked `test` (`?testzone=1`). */
  testZones: boolean;
};

const queue: Task[] = [];
let waiting = false;
let longestTaskMs = 0;
let longestTaskKind = "";
/** The last tasks run, newest last: what each was and how long it held the frame (for the checks). */
const taskLog: { kind: string; ms: number }[] = [];
let runs: ZoneRun[] = [];
let loading = 0;

/** Run queued tasks until the slice is used up. A task that returns a promise holds the queue until it settles. */
function pump() {
  if (waiting) return;
  const start = performance.now();
  let ran = 0;
  while (queue.length > 0) {
    const t0 = performance.now();
    if (t0 - start >= SLICE_MS) break;
    // A pipeline task starts a shader build inside three.js whose first step cannot be cut smaller
    // (4 to 5 ms in Chrome, 10 to 12 ms in the Firefox and WebKit test browsers): it gets a frame to
    // itself instead of being stacked on top of texture uploads.
    if (queue[0].kind === "pipeline" && ran > 0) break;
    const task = queue.shift()!;
    ran++;
    let result: void | Promise<unknown>;
    try {
      result = task.run();
    } catch (error) {
      console.error("[twin] streaming task failed", error);
      continue;
    }
    const took = performance.now() - t0;
    taskLog.push({ kind: task.kind, ms: Math.round(took * 10) / 10 });
    if (taskLog.length > 200) taskLog.shift();
    if (took > longestTaskMs) {
      longestTaskMs = took;
      longestTaskKind = task.kind;
    }
    if (result) {
      waiting = true;
      result.catch((error) => console.error("[twin] streaming task failed", error)).finally(() => (waiting = false));
      break;
    }
  }
}

function groupByAsset(placements: Placement[]): Map<string, Placement[]> {
  const byAsset = new Map<string, Placement[]>();
  for (const place of placements) {
    const list = byAsset.get(place.asset);
    if (list) list.push(place);
    else byAsset.set(place.asset, [place]);
  }
  return byAsset;
}

/** Compile an instanced draw's pipeline before it is shown, so its first frame does not stall. */
async function precompile(ctx: StreamingContext, mesh: THREE.Mesh) {
  const geometry = mesh.geometry as THREE.InstancedBufferGeometry;
  const count = geometry.instanceCount;
  // (an invisible draw, or one with no copies, would be skipped by the compile)
  setDrawCount(mesh, 1);
  try {
    await ctx.renderer.compileAsync(mesh, ctx.camera, ctx.scene);
  } catch (error) {
    console.warn("[twin] pipeline was not precompiled", error);
  } finally {
    // (copies may have been assigned while it compiled: only undo the stand-in count)
    if (geometry.instanceCount === 1) setDrawCount(mesh, count);
  }
}

function unload(run: ZoneRun) {
  if (run.state === "loading") loading--;
  run.token++;
  run.state = "out";
  for (const set of run.sets) set.dispose();
  run.sets = [];
  for (const undo of run.cleanup) undo();
  run.cleanup = [];
  run.group?.removeFromParent();
  run.group = null;
  for (const id of run.held) assets.release(id);
  run.held = [];
  if (run.shell) run.shell.group.visible = true;
}

async function loadZone(ctx: StreamingContext, run: ZoneRun) {
  const token = ++run.token;
  const live = () => run.token === token;
  run.state = "loading";
  loading++;
  try {
    const zone = (await import(`../data/zones/${run.entry.id}.json`)).default as unknown as Zone;
    if (!live()) return;
    const byAsset = groupByAsset(zone.placements);
    const ids = [...byAsset.keys()];
    run.held = ids.slice();
    const loaded = await Promise.all(ids.map((id) => assets.acquire(id)));
    if (!live()) return; // (unload has already released what was held)

    const group = new THREE.Group();
    group.name = `zone:${run.entry.id}`;
    ctx.scene.add(group);
    run.group = group;
    // the zone's lamps go in before its draws are compiled, so the shaders are built for them
    if (zone.lights.length) {
      lamps.set(run.entry.id, zone.lights);
      run.cleanup.push(() => lamps.clear(run.entry.id));
    }

    loaded.forEach((asset: LoadedAsset, i) => {
      for (const texture of asset.textures) {
        queue.push({ kind: "texture", run: () => void (live() && ctx.renderer.initTexture(texture)) });
      }
      queue.push({
        kind: "instances",
        run: () => {
          if (!live()) return;
          const set = createInstanceSet(asset, byAsset.get(ids[i])!);
          run.sets.push(set);
          if (asset.kind === "ground") {
            const part = asset.lods[0]![0];
            for (const place of byAsset.get(ids[i])!) run.cleanup.push(registerGroundPatch(part.geometry, part.matrix, place));
          }
          // one draw per task, compiled first, so no frame takes more than one upload
          for (const draw of set.draws.slice().reverse()) {
            queue.unshift({
              kind: "pipeline",
              run: () => (live() ? precompile(ctx, draw.mesh).then(() => void (live() && group.add(draw.mesh))) : undefined),
            });
          }
        },
      });
    });
    queue.push({
      kind: "done",
      run: () => {
        if (!live()) return;
        run.state = "in";
        loading--;
        if (run.shell) run.shell.group.visible = false;
      },
    });
  } catch (error) {
    console.error(`[twin] zone ${run.entry.id} did not load`, error);
    if (live()) {
      unload(run);
      run.retryAt = performance.now() + RETRY_AFTER_MS;
    }
  }
}

/** The low-detail stand-in for a zone, shown whenever the zone itself is not in. */
async function loadShell(ctx: StreamingContext, run: ZoneRun, shellId: string) {
  const group = new THREE.Group();
  group.name = `shell:${run.entry.id}`;
  run.shell = { id: shellId, group };
  try {
    const asset = await assets.acquire(shellId);
    if (run.shell?.group !== group) return;
    for (const part of asset.lods[0] ?? []) {
      const mesh = new THREE.Mesh(part.geometry, part.material);
      mesh.applyMatrix4(part.matrix);
      group.add(mesh);
    }
    group.visible = run.state !== "in";
    ctx.scene.add(group);
  } catch (error) {
    console.error(`[twin] shell ${shellId} did not load`, error);
  }
}

function dropShell(run: ZoneRun) {
  if (!run.shell) return;
  run.shell.group.removeFromParent();
  assets.release(run.shell.id);
  run.shell = null;
}

/** Start streaming zones around the camera. Returns the function that unloads everything and stops. */
export function startStreaming(ctx: StreamingContext): () => void {
  assets.configure(ctx.renderer);
  const mine: ZoneRun[] = ZONE_INDEX.filter((z) => ctx.testZones || !z.test).map((entry) => ({
    entry,
    box: new THREE.Box3(new THREE.Vector3(...entry.bounds.min), new THREE.Vector3(...entry.bounds.max)),
    state: "out" as const,
    token: 0,
    group: null,
    sets: [],
    held: [],
    cleanup: [],
    shell: null,
    retryAt: 0,
  }));
  runs = mine;

  let sinceCheck = CHECK_EVERY;
  const decide = () => {
    const location = twinStore.getState().location;
    const eye = ctx.camera.position;
    for (const run of mine) {
      const here = run.entry.location === location;
      if (!here) {
        if (run.state !== "out") unload(run);
        dropShell(run);
        continue;
      }
      if (run.entry.shell && !run.shell) void loadShell(ctx, run, run.entry.shell);
      const distance = run.box.distanceToPoint(eye);
      if (run.state === "out" && distance < run.entry.streamIn && loading < MAX_LOADING && performance.now() >= run.retryAt) void loadZone(ctx, run);
      else if (run.state !== "out" && distance > run.entry.streamOut) unload(run);
    }
  };

  const stopSim = loop.add("sim", (dt) => {
    if (isProbing()) return; // the start-up probe is timing the graphics card: keep the frame clear
    sinceCheck += dt;
    if (sinceCheck >= CHECK_EVERY) {
      sinceCheck = 0;
      decide();
    }
    pump();
  });

  const frustum = new THREE.Frustum();
  const view = new THREE.Matrix4();
  // (registered after the camera rig's callback, so levels are chosen for this frame's camera)
  const stopLods = loop.add("camera", () => {
    const camera = ctx.camera;
    camera.updateMatrixWorld(); // (also refreshes matrixWorldInverse)
    view.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(view, camera.coordinateSystem, (camera as unknown as { reversedDepth?: boolean }).reversedDepth ?? false);
    const tier = tierSettings();
    const k = lodScale(camera.fov, ctx.viewHeight(), tier.lodBias);
    // (a caster this close may shade something in view even when it is not in view itself)
    const shadowReach = Math.min(SHADOW_FAR * 0.5, 70);
    for (const run of mine) {
      for (const set of run.sets) set.update(camera, frustum, k, tier.drawDistance, shadowReach);
    }
  });

  return () => {
    stopSim();
    stopLods();
    for (const run of mine) {
      if (run.state !== "out") unload(run);
      dropShell(run);
    }
    if (runs === mine) {
      runs = [];
      queue.length = 0;
    }
  };
}

export const streaming = {
  stats() {
    const lod: [number, number, number] = [0, 0, 0];
    let instances = 0;
    let hidden = 0;
    let draws = 0;
    for (const run of runs) {
      for (const set of run.sets) {
        const tally = set.tally();
        instances += set.count;
        hidden += tally.hidden;
        for (let i = 0; i < 3; i++) lod[i] += tally.lod[i];
        draws += set.draws.filter((d) => d.mesh.visible && d.mesh.parent).length;
      }
    }
    return {
      zonesLoaded: runs.filter((r) => r.state === "in").length,
      zonesLoading: runs.filter((r) => r.state === "loading").length,
      instances,
      lod,
      hidden,
      /** Instanced draw calls the loaded zones are costing this frame. */
      draws,
      tasksQueued: queue.length + (waiting ? 1 : 0),
      longestTaskMs,
      longestTaskKind,
    };
  },
  zones: () => runs.map((r) => ({ id: r.entry.id, state: r.state })),
  /** The placed copies of an asset in a loaded zone, or null while the zone is not in (to move one: `InstanceSet.move`). */
  instancesOf(zoneId: string, assetId: string): InstanceSet | null {
    const run = runs.find((r) => r.entry.id === zoneId);
    return run?.sets.find((s) => s.assetId === assetId) ?? null;
  },
  resetLongestTask() {
    longestTaskMs = 0;
    longestTaskKind = "";
    taskLog.length = 0;
  },
  taskLog: () => taskLog.slice(),
  /** For the checks: give a zone a stand-in asset, or take it away (null). */
  setShell(zoneId: string, assetId: string | null) {
    const run = runs.find((r) => r.entry.id === zoneId);
    if (!run) return;
    dropShell(run);
    run.entry = { ...run.entry, shell: assetId };
  },
};
