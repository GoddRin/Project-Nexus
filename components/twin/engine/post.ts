/**
 * What is done to the picture beyond drawing the scene. For now: ambient occlusion, which seats
 * objects on the ground and darkens the corners light does not reach (P12a adds bloom, grading and
 * the rest to the same pipeline).
 *
 * Two passes. A light first pass draws only depth and surface normals, without multisampling,
 * and occlusion is worked out from it at the tier's resolution. The scene itself is then drawn
 * with the renderer's multisampling and is handed the occlusion as part of its lighting, so it
 * dims the light of the sky and not the sun's (occlusion multiplied over the finished picture
 * darkens sunlit ground too). Keeping multisampling on the main pass is what keeps cut-out
 * foliage from breaking up into dots: its edges are spread over the samples.
 *
 * The depth-and-normals pass is drawn with lighting switched off (P02e). It needs no light, and with
 * the lights in it three also redrew every shadow map for it (shadows update once per render call),
 * and built each material's pass once for each set of lights.
 *
 * On tiers without occlusion there is no pipeline at all: the scene is drawn straight to the canvas.
 */
import * as THREE from "three/webgpu";
import {
  builtinAOContext,
  context,
  mrt,
  normalView,
  packNormalToRGB,
  pass,
  sample,
  screenUV,
  unpackRGBToNormal,
} from "three/tsl";
import { ao } from "three/examples/jsm/tsl/display/GTAONode.js";
import { isDebugUrl } from "../state/url";
import { tierSettings, type TierSettings } from "./tiers";

/**
 * What a scene-drawing pass sets on the renderer while it draws: where it draws, which outputs, and
 * the context its materials are built in. A draw compiled ahead for the pass must be compiled with
 * the same (engine/precompile.ts), or it is built again on the frame it first appears.
 */
export type PassState = {
  target: THREE.RenderTarget | null;
  mrt: THREE.MRTNode | null;
  context: THREE.ContextNode<THREE.Node> | null;
  /** How deep inside other render calls the pass draws: three keeps a separate render context for each depth. */
  depth: number;
  /** Whether the pass draws with the scene's lights (the depth-and-normals pass does not). */
  lighting: boolean;
};

export type Post = {
  /** Draw the frame. */
  render: () => void;
  /** The scene-drawing passes, or null for any whose state is not known until it has drawn once. */
  passes: () => (PassState | null)[];
  dispose: () => void;
};

/**
 * For the occlusion trial (P02e, debug addresses only): `?ao=off|half|full&aosamples=4` sets the
 * occlusion of whatever tier is in use.
 */
function trialOcclusion(): Partial<TierSettings> {
  if (typeof window === "undefined" || !isDebugUrl()) return {};
  const query = new URLSearchParams(window.location.search);
  const out: Partial<TierSettings> = {};
  const mode = query.get("ao");
  if (mode === "off" || mode === "half" || mode === "full") out.ambientOcclusion = mode;
  if (query.get("aosamples")) out.aoSamples = Number(query.get("aosamples"));
  return out;
}

/** The context a pass draws in, once it has drawn (three keeps it on the pass after the first frame). */
function passContext(node: THREE.PassNode): THREE.ContextNode<THREE.Node> | null {
  return (node as unknown as { _contextNodeCache?: { context: THREE.ContextNode<THREE.Node> } | null })._contextNodeCache?.context ?? null;
}

/** The post pipeline for the current tier, or null when the tier has none. */
export function createPost(renderer: THREE.WebGPURenderer, scene: THREE.Scene, camera: THREE.Camera): Post | null {
  const settings = { ...tierSettings(), ...trialOcclusion() };
  const mode = settings.ambientOcclusion;
  if (mode === "off") return null;

  const pipeline = new THREE.RenderPipeline(renderer);

  // depth and normals only; glass and other see-through things do not occlude
  const prePass = pass(scene, camera, { samples: 0 });
  prePass.transparent = false;
  const normals = mrt({ output: packNormalToRGB(normalView) });
  prePass.setMRT(normals);
  // (a context of its own, so a material's depth-and-normals build is never mistaken for its
  // ordinary one: three keys a material's build by its context and lights, not by the outputs)
  prePass.contextNode = context({ twinPrePass: true });
  const normal = sample((at) => unpackRGBToNormal(prePass.getTextureNode().sample(at)));
  const depth = prePass.getTextureNode("depth");

  const occlusion = ao(depth, normal, camera as THREE.PerspectiveCamera);
  occlusion.resolutionScale = mode === "full" ? 1 : 0.5;
  occlusion.samples.value = settings.aoSamples;
  occlusion.radius.value = 0.9;
  occlusion.thickness.value = 1.2;
  occlusion.distanceExponent.value = 1.4;
  occlusion.scale.value = 1.15;

  const aoHere = occlusion.getTextureNode().sample(screenUV).r;

  const scenePass = pass(scene, camera);
  scenePass.contextNode = builtinAOContext(aoHere);
  pipeline.outputNode = scenePass;

  // the depth each pass draws at, seen as it draws (it is nested in the pipeline's own draw)
  const depthOf = new Map<THREE.PassNode, number>();
  for (const node of [prePass, scenePass]) {
    const run = node.updateBefore.bind(node);
    const lit = node !== prePass;
    node.updateBefore = (frame) => {
      depthOf.set(node, (renderer as unknown as { _callDepth: number })._callDepth + 1);
      const was = renderer.lighting.enabled;
      renderer.lighting.enabled = lit;
      try {
        return run(frame);
      } finally {
        renderer.lighting.enabled = was;
      }
    };
  }

  return {
    render: () => pipeline.render(),
    passes: () => {
      const pre = passContext(prePass);
      const main = passContext(scenePass);
      const preDepth = depthOf.get(prePass);
      const mainDepth = depthOf.get(scenePass);
      return [
        pre && preDepth !== undefined ? { target: prePass.renderTarget, mrt: normals, context: pre, depth: preDepth, lighting: false } : null,
        main && mainDepth !== undefined ? { target: scenePass.renderTarget, mrt: null, context: main, depth: mainDepth, lighting: true } : null,
      ];
    },
    dispose: () => {
      pipeline.dispose();
      occlusion.dispose();
      prePass.dispose();
      scenePass.dispose();
    },
  };
}
