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
 * On tiers without occlusion there is no pipeline at all: the scene is drawn straight to the canvas.
 */
import * as THREE from "three/webgpu";
import { builtinAOContext, mrt, normalView, packNormalToRGB, pass, sample, screenUV, unpackRGBToNormal } from "three/tsl";
import { ao } from "three/examples/jsm/tsl/display/GTAONode.js";
import { tierSettings } from "./tiers";

export type Post = {
  /** Draw the frame. */
  render: () => void;
  dispose: () => void;
};

/** The post pipeline for the current tier, or null when the tier has none. */
export function createPost(renderer: THREE.WebGPURenderer, scene: THREE.Scene, camera: THREE.Camera): Post | null {
  const mode = tierSettings().ambientOcclusion;
  if (mode === "off") return null;

  const pipeline = new THREE.RenderPipeline(renderer);

  // depth and normals only; glass and other see-through things do not occlude
  const prePass = pass(scene, camera, { samples: 0 });
  prePass.transparent = false;
  prePass.setMRT(mrt({ output: packNormalToRGB(normalView) }));
  const normal = sample((at) => unpackRGBToNormal(prePass.getTextureNode().sample(at)));
  const depth = prePass.getTextureNode("depth");

  const occlusion = ao(depth, normal, camera as THREE.PerspectiveCamera);
  occlusion.resolutionScale = mode === "full" ? 1 : 0.5;
  occlusion.samples.value = mode === "full" ? 16 : 8;
  occlusion.radius.value = 0.9;
  occlusion.thickness.value = 1.2;
  occlusion.distanceExponent.value = 1.4;
  occlusion.scale.value = 1.15;

  const scenePass = pass(scene, camera);
  scenePass.contextNode = builtinAOContext(occlusion.getTextureNode().sample(screenUV).r);
  pipeline.outputNode = scenePass;

  return {
    render: () => pipeline.render(),
    dispose: () => {
      pipeline.dispose();
      occlusion.dispose();
      prePass.dispose();
      scenePass.dispose();
    },
  };
}
