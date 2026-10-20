/**
 * Compiling a draw before it is seen, for every way the frame may draw it (P02e).
 *
 * three builds a material's shader for one set of lights and one pass. A draw is drawn in up to two
 * passes (the depth-and-normals pass and the scene pass when the tier has occlusion, engine/post.ts)
 * and under two sets of lights (the lamps in and the lamps out, world/lamps.ts). Each combination
 * met for the first time on a frame is built there and then, which is the stall at dusk and the
 * long steps while a zone streams in.
 *
 * So each draw is compiled ahead for each combination through `renderer.compileAsync`, which builds
 * in steps and yields between them. How that is made to hold, in three 0.185:
 *   - three keeps one set of lights per scene, shared by every camera, and it reads that set while a
 *     build is under way, not when it starts. Compiling the other set inside the real scene would
 *     have the next frame put its own lights back under a build still running. So each set of lights
 *     is compiled in a stand-in scene of its own. For the moment of each call, the real light objects
 *     (sun, sky fill, lamps) are lent to it in the order the real scene holds them, and given back
 *     before anything else runs. three's build cache is keyed by material, the lights' ids and
 *     order, environment, fog and context, not by scene, so the real frame finds the build waiting
 *     when the lamps come in. (The uniforms of such a build read the frame's own scene and lights
 *     each frame, so it draws the real scene's values.)
 *   - The renderer's state for a pass (where it draws, its outputs, its context, and how deeply it is
 *     nested in other draws, which three keeps a separate render context for) is set around the call
 *     and put back straight after. compileAsync reads all of it before its first yield for the first
 *     object it meets, so it is called for one object at a time, with its children hidden.
 *   - A compiled pipeline is not finished until it has drawn once: the graphics driver on the office
 *     laptop completes its part on the first draw, and the lamps' first frame took 1.4 s for it after
 *     everything had been compiled. So each compiled object is also drawn once, one a frame after the
 *     frame itself is drawn (`warm`): into one scissored pixel of the same target, which keeps what
 *     is there, with every shadow map held so the draw does not redraw them.
 */
import * as THREE from "three/webgpu";
import { lamps } from "../world/lamps";
import type { PassState } from "./post";

type RenderContexts = {
  get: (target: THREE.RenderTarget | null, mrt?: THREE.MRTNode | null, depth?: number) => unknown;
};
type Renderer = THREE.WebGPURenderer & {
  contextNode: THREE.ContextNode<THREE.Node>;
  _renderContexts: RenderContexts;
  _callDepth: number;
};

/** An object compiled for a set of lights and a pass, waiting for its first draw. */
type Warm = {
  drawable: THREE.Object3D;
  set: LightSet;
  state: PassState;
  /** The lamps' and the passes' versions it was compiled for: if either has moved on, it is not drawn. */
  version: number;
  passes: number;
  /** False once the object is gone (a zone unloaded while it waited). */
  alive: () => boolean;
  done: () => void;
};
const warmQueue: Warm[] = [];
type LightSet = "lit" | "dark";

/** The passes of the frame now: null entries are passes whose state is not known yet. Set by the engine. */
let currentPasses: () => (PassState | null)[] = () => [{ target: null, mrt: null, context: null, depth: 0, lighting: true }];
/** Raised whenever the passes change (a new tier), so a sweep knows to compile again. */
let passVersion = 0;
const listeners = new Set<() => void>();
/** What each drawable has been compiled for ("set:lamp version:pass version"), so a sweep skips it. */
const compiledFor = new WeakMap<THREE.Object3D, Set<string>>();

/**
 * The stand-in scenes, one per set of lights, made again whenever the set of lamps changes (a
 * build still running for the old set keeps reading the old scene's lights, never the new).
 */
let standIns: {
  version: number;
  scenes: Record<LightSet, THREE.Scene>;
} | null = null;
function standInFor(set: LightSet, real: THREE.Scene): THREE.Scene {
  const version = lamps.version();
  if (!standIns || standIns.version !== version) {
    standIns = {
      version,
      scenes: { lit: new THREE.Scene(), dark: new THREE.Scene() },
    };
    standIns.scenes.lit.name = "precompile:lit";
    standIns.scenes.dark.name = "precompile:dark";
  }
  const scene = standIns.scenes[set];
  // what the build cache reads of a scene beside its lights
  scene.environment = real.environment;
  scene.fog = real.fog;
  scene.fogNode = real.fogNode;
  return scene;
}

/** The lights the real scene would draw with now, in the order its draw would meet them. */
function lightsOf(scene: THREE.Scene, camera: THREE.Camera): THREE.Light[] {
  const list: THREE.Light[] = [];
  const walk = (o: THREE.Object3D) => {
    if (!o.visible) return;
    const light = o as THREE.Light;
    if (light.isLight && o.layers.test(camera.layers)) list.push(light);
    for (const child of o.children) walk(child);
  };
  walk(scene);
  return list;
}

/** Lend `objects` to `standIn`, in order; returns the function that gives each back where it was. Synchronous. */
function lend(objects: THREE.Object3D[], standIn: THREE.Scene): () => void {
  const moved: {
    object: THREE.Object3D;
    parent: THREE.Object3D;
    index: number;
  }[] = [];
  const loose: THREE.Object3D[] = [];
  for (const object of objects) {
    const parent = object.parent;
    standIn.children.push(object);
    // (a draw not yet in the scene has no parent: it is only visited, and left without one)
    if (!parent) {
      loose.push(object);
      object.parent = standIn;
      continue;
    }
    const index = parent.children.indexOf(object);
    parent.children.splice(index, 1);
    moved.push({ object, parent, index });
    object.parent = standIn;
  }
  return () => {
    standIn.children.length = 0;
    for (const object of loose) object.parent = null;
    for (let i = moved.length - 1; i >= 0; i--) {
      const { object, parent, index } = moved[i];
      parent.children.splice(index, 0, object);
      object.parent = parent;
    }
  };
}

/**
 * Every shadow the lights would draw (the sun's cascades included), held still; returns the function
 * that lets them go. A lamp's shadow is drawn instead, with the one object in it: each kind of caster
 * (plain, instanced, skinned) needs a shadow pipeline of its own, and while the lamps are out of the
 * real scene what its map holds does not show.
 */
function holdShadows(lights: THREE.Light[]): () => void {
  const held: { shadow: THREE.LightShadow; auto: boolean; needs: boolean }[] = [];
  const hold = (shadow: THREE.LightShadow | undefined) => {
    if (!shadow) return;
    held.push({ shadow, auto: shadow.autoUpdate, needs: shadow.needsUpdate });
    shadow.autoUpdate = false;
    shadow.needsUpdate = false;
  };
  for (const light of lights) {
    if (!light.castShadow) continue;
    const shadow = (light as THREE.DirectionalLight).shadow;
    // (only while the lamps are out of the real scene: a lit lamp's map is on show)
    if (light.name.startsWith("lamp:") && !lamps.live()) {
      held.push({ shadow, auto: shadow.autoUpdate, needs: shadow.needsUpdate });
      shadow.autoUpdate = false;
      shadow.needsUpdate = true;
      continue;
    }
    hold(shadow);
    // (the sun's cascaded shadow keeps a light of its own for each cascade)
    const cascades = (
      shadow as unknown as {
        shadowNode?: { lights?: { shadow: THREE.LightShadow }[] };
      }
    ).shadowNode?.lights;
    for (const cascade of cascades ?? []) hold(cascade.shadow);
  }
  return () => {
    for (const { shadow, auto, needs } of held) {
      shadow.autoUpdate = auto;
      shadow.needsUpdate = needs;
    }
  };
}

/** Whether `o` is still part of a scene (a zone's group taken out of the scene keeps its children). */
function inScene(o: THREE.Object3D): boolean {
  let top = o;
  while (top.parent) top = top.parent;
  return top !== o && (top as THREE.Scene).isScene === true && !top.name.startsWith("precompile:");
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function isDrawable(o: THREE.Object3D): boolean {
  const d = o as unknown as {
    isMesh?: boolean;
    isPoints?: boolean;
    isLine?: boolean;
    isSprite?: boolean;
  };
  return !!(d.isMesh || d.isPoints || d.isLine || d.isSprite);
}

/** Compile one drawable (not its children) for one pass, with `standIn`'s lights. Synchronous up to the returned promise. */
function compileOne(renderer: Renderer, object: THREE.Object3D, camera: THREE.Camera, standIn: THREE.Scene, state: PassState): Promise<void> {
  const target = renderer.getRenderTarget();
  const mrt = renderer.getMRT();
  const context = renderer.contextNode;
  const wasVisible = object.visible;
  const wasCulled = object.frustumCulled;
  const hidden: THREE.Object3D[] = [];
  for (const child of object.children) {
    if (child.visible) {
      child.visible = false;
      hidden.push(child);
    }
  }
  object.visible = true;
  object.frustumCulled = false;
  // (compileAsync asks for the render context of depth 0; the pass's own draw is nested deeper)
  const contexts = renderer._renderContexts;
  const getContext = contexts.get;
  contexts.get = (t, m = null) => getContext.call(contexts, t, m, state.depth);
  const lighting = renderer.lighting.enabled;
  renderer.lighting.enabled = state.lighting;
  try {
    renderer.setRenderTarget(state.target);
    renderer.setMRT(state.mrt);
    if (state.context) renderer.contextNode = state.context;
    return renderer.compileAsync(object, camera, standIn);
  } finally {
    renderer.lighting.enabled = lighting;
    contexts.get = getContext;
    renderer.setRenderTarget(target);
    renderer.setMRT(mrt);
    renderer.contextNode = context;
    object.visible = wasVisible;
    object.frustumCulled = wasCulled;
    for (const child of hidden) child.visible = true;
  }
}

export const precompile = {
  /** The engine hands over the passes of the current tier (and again whenever they change). */
  /** The passes are being replaced (a new tier): nothing is compiled or drawn for the old ones from now on. */
  dropPasses() {
    currentPasses = () => [];
    passVersion++;
  },
  setPasses(fn: () => (PassState | null)[]) {
    currentPasses = fn;
    passVersion++;
    for (const listener of listeners) listener();
  },
  passVersion: () => passVersion,
  /** Called whenever the passes change. */
  onPasses(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /**
   * Compile `root` and every drawable under it for each set of lights and each pass. One drawable
   * at a time; resolves when all are built. Errors are reported, not thrown: a draw that was not
   * compiled ahead is still built when it is first drawn.
   */
  async object(renderer: THREE.WebGPURenderer, scene: THREE.Scene, camera: THREE.Camera, root: THREE.Object3D): Promise<void> {
    const drawables: THREE.Object3D[] = [];
    root.traverse((o) => {
      if (isDrawable(o)) drawables.push(o);
    });
    // (an actor is shown only once every part has also drawn once out of sight)
    const drawn: Promise<void>[] = [];
    for (const drawable of drawables) {
      // (not yet in the scene: the caller adds it once this resolves)
      await precompile.drawable(renderer, scene, camera, drawable, () => true, (onDrawn) => drawn.push(new Promise((r) => onDrawn(r))));
    }
    await Promise.all(drawn);
  },

  /**
   * Compile one drawable (not its children) for each set of lights and each pass, then queue its draws
   * out of sight. Resolves once compiled; `whenDrawn` is handed a way to hear when those draws are done
   * too (a draw is best shown only then). `alive` says whether it is still wanted (by default: whether
   * it is still part of a scene, not only of a group taken out of one); a draw not yet added passes its own.
   */
  async drawable(
    renderer: THREE.WebGPURenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    drawable: THREE.Object3D,
    alive: () => boolean = () => inScene(drawable),
    whenDrawn?: (onDrawn: (done: () => void) => void) => void,
    /** Only the set of lights the scene is drawn with now (the other is left to a sweep). */
    onlyNow = false,
  ): Promise<void> {
    const passes = currentPasses();
    const passesAt = passVersion;
    const versionAt = lamps.version();
    const done = compiledFor.get(drawable) ?? new Set<string>();
    const keyOf = (set: LightSet) => `${set}:${versionAt}:${passesAt}`;
    const sets = ((lamps.any() ? ["dark", "lit"] : ["dark"]) as LightSet[]).filter((set) => (!onlyNow || set === (lamps.live() ? "lit" : "dark")) && !done.has(keyOf(set)));
    if (!sets.length) {
      whenDrawn?.((finish) => finish());
      return;
    }
    const work: Promise<void>[] = [];
    let spent = 0;
    for (const set of sets) {
      for (const state of passes) {
        // (a pass drawn without lights is the same for either set)
        if (!state || (!state.lighting && set === "lit")) continue;
        // (one a frame: each starts with a piece of shader setup that cannot be split)
        // (a build already cached costs nothing; only one that did work gives the frame back)
        if (spent > 2) await nextFrame();
        // (gone, or the tier changed under it: a sweep compiles everything again for the new passes)
        if (!alive() || passVersion !== passesAt) {
          whenDrawn?.((done) => done());
          return;
        }
        const standIn = standInFor(set, scene);
        const t0 = performance.now();
        lamps.within(set === "lit", () => {
          const giveBack = lend(lightsOf(scene, camera), standIn);
          try {
            work.push(compileOne(renderer as Renderer, drawable, camera, standIn, state));
          } finally {
            giveBack();
          }
        });
        spent = performance.now() - t0;
      }
    }
    const results = await Promise.allSettled(work);
    for (const r of results) if (r.status === "rejected") console.warn("[twin] a draw was not precompiled", r.reason);
    const version = lamps.version();
    if (version === versionAt && passVersion === passesAt) {
      for (const set of sets) done.add(keyOf(set));
      compiledFor.set(drawable, done);
    }
    const drawn: Promise<void>[] = [];
    for (const set of sets) {
      for (const state of passes) {
        if (state && (state.lighting || set === "dark")) drawn.push(new Promise<void>((done) => warmQueue.push({ drawable, set, state, version, passes: passesAt, alive, done })));
      }
    }
    whenDrawn?.((done) => void Promise.all(drawn).then(done));
  },

  /** Objects compiled but not yet drawn once. */
  warming: () => warmQueue.length,

  /**
   * Draw the next compiled object once, so the driver finishes its pipeline now and not on the frame
   * it is needed. Called by the engine after the frame has been drawn.
   */
  warm(renderer: THREE.WebGPURenderer, scene: THREE.Scene, camera: THREE.Camera) {
    // (a few a frame: each is one small draw for the page; the driver's work happens beside it)
    for (let n = 0; n < WARM_PER_FRAME; n++) warmOne(renderer, scene, camera);
  },

  /** Every drawable in the scene now, for a sweep after the lamps or the passes change. */
  drawables(scene: THREE.Scene): THREE.Object3D[] {
    const list: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (isDrawable(o) && !/^cost:/.test(o.parent?.name ?? "")) list.push(o);
    });
    return list;
  },
};

const WARM_PER_FRAME = 3;

/** Draw the next object waiting to be warmed, if any (see `precompile.warm`). */
function warmOne(renderer: THREE.WebGPURenderer, scene: THREE.Scene, camera: THREE.Camera) {
  let item: Warm | undefined;
  while ((item = warmQueue.shift()) && (!item.alive() || item.version !== lamps.version() || item.passes !== passVersion)) item.done();
  if (!item) return;
  const { drawable, set, state } = item;
  const r = renderer as Renderer;
  const standIn = standInFor(set, scene);
  lamps.within(set === "lit", () => {
    const lights = lightsOf(scene, camera);
    const letShadowsGo = holdShadows(lights);
    const giveBack = lend([...lights, drawable], standIn);
    const hidden: THREE.Object3D[] = [];
    for (const child of drawable.children) {
      if (child.visible) {
        child.visible = false;
        hidden.push(child);
      }
    }
    const wasVisible = drawable.visible;
    const wasCulled = drawable.frustumCulled;
    drawable.visible = true;
    drawable.frustumCulled = false;
    // (an instanced draw with no copies in view would be skipped)
    const instanced = (drawable as THREE.Mesh).geometry as THREE.InstancedBufferGeometry | undefined;
    const copies = instanced?.isInstancedBufferGeometry ? instanced.instanceCount : -1;
    if (copies === 0) instanced!.instanceCount = 1;
    const target = r.getRenderTarget();
    const mrt = r.getMRT();
    const context = r.contextNode;
    const depth = r._callDepth;
    const autoClear = r.autoClear;
    const lighting = r.lighting.enabled;
    const into = state.target;
    const scissor = into ? { test: into.scissorTest, rect: into.scissor.clone() } : { test: r.getScissorTest(), rect: r.getScissor(new THREE.Vector4()) };
    standIn.matrixWorldAutoUpdate = false; // (the object keeps where the real scene put it)
    try {
      r.setRenderTarget(into);
      r.setMRT(state.mrt);
      if (state.context) r.contextNode = state.context;
      r._callDepth = state.depth - 1; // (render() steps in one level)
      r.lighting.enabled = state.lighting;
      r.autoClear = false;
      if (into) {
        into.scissorTest = true;
        into.scissor.set(0, 0, 1, 1);
      } else {
        r.setScissorTest(true);
        r.setScissor(0, 0, 1, 1);
      }
      r.render(standIn, camera);
    } catch (error) {
      console.warn("[twin] a draw was not warmed", error);
    } finally {
      if (into) {
        into.scissorTest = scissor.test;
        into.scissor.copy(scissor.rect);
      } else {
        r.setScissorTest(scissor.test);
        r.setScissor(scissor.rect);
      }
      r.autoClear = autoClear;
      r.lighting.enabled = lighting;
      r._callDepth = depth;
      r.contextNode = context;
      r.setMRT(mrt);
      r.setRenderTarget(target);
      drawable.visible = wasVisible;
      drawable.frustumCulled = wasCulled;
      if (copies === 0 && instanced!.instanceCount === 1) instanced!.instanceCount = 0;
      for (const child of hidden) child.visible = true;
      giveBack();
      letShadowsGo();
    }
  });
  item.done();
}
