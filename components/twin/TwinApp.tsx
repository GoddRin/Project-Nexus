"use client";

/**
 * Twin v2, top-level client component. Mounted by the digital-twin route for `?v=2` (dynamic
 * import, no server rendering).
 *
 * P01b: the scene shell. A full-bleed canvas on the chosen renderer, the frame loop, the store
 * with URL state, the camera rig and the site clock, over v1's terrain in plain grey.
 * P01c: quality tiers with a start-up probe and dynamic resolution, and zones of placed assets
 * streamed in around the camera.
 */
import { Profiler, memo, useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { CameraRig, forgetCameraPose } from "./engine/camera";
import { Engine, ZoneStreamer, countReactCommit } from "./engine/Engine";
import { createRenderer, graphicsSupport, type RendererBackend } from "./engine/renderer";
import { pixelRatioNow } from "./engine/tiers";
import { twinActions, twinStore } from "./state/store";
import { readUrlIntoStore, startUrlSync } from "./state/url";
import { ShellHud } from "./ui/ShellHud";
import { TwinErrorBoundary, TwinLoading, TwinMessage } from "./ui/TwinMessage";
import { TempWorld } from "./world/TempWorld";

/** How many times a lost device or context is rebuilt before the twin gives up and says so. */
const MAX_REBUILDS = 3;

type TwinCanvasProps = {
  onLost: (message: string) => void;
  onError: (message: string) => void;
  onFirstFrame: (backend: RendererBackend) => void;
};

/**
 * The canvas and everything drawn in it.
 *
 * React Three Fiber configures a canvas again whenever it re-renders, and with an async renderer
 * factory a second pass can start while the first is still waiting. The second pass works from a
 * stale snapshot, so it makes its own renderer, camera and scene and swaps them in: the view then
 * shows sky and no ground (seen in 3 of 40 loads). So this component is memoised with stable
 * props, and the renderer (engine/renderer.ts), the camera and the scene are objects made here,
 * which every pass is handed alike. For the same reason the pixel ratio is handed over once: a
 * change of tier or of dynamic resolution is applied by the engine (engine/Engine.tsx), not by
 * re-rendering this component.
 */
const TwinCanvas = memo(function TwinCanvas({ onLost, onError, onFirstFrame }: TwinCanvasProps) {
  const [dpr] = useState(() => pixelRatioNow());
  const [camera] = useState(() => new THREE.PerspectiveCamera(45, 1, 0.3, 6000));
  const [scene] = useState(() => new THREE.Scene());
  const gl = useCallback(
    (props: { canvas: unknown }) =>
      createRenderer(props.canvas as HTMLCanvasElement, {
        tier: twinStore.getState().quality.tier,
        forceWebGL: new URLSearchParams(window.location.search).get("force") === "webgl",
        onLost,
        onError,
      }),
    [onLost, onError],
  );
  return (
    <Canvas dpr={dpr} camera={camera} scene={scene} gl={gl}>
      <Engine onFirstFrame={onFirstFrame} />
      <CameraRig />
      <TempWorld />
      <ZoneStreamer />
    </Canvas>
  );
});

export default function TwinApp() {
  // The URL is read once, before anything that depends on the store is mounted.
  const [support] = useState(() => {
    readUrlIntoStore();
    return graphicsSupport();
  });
  const [build, setBuild] = useState(0);
  const [backend, setBackend] = useState<RendererBackend | null>(null);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const rebuilds = useRef(0);
  const readyRef = useRef(false);

  useEffect(() => {
    const stopUrl = startUrlSync();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => twinActions.setReducedMotion(motion.matches);
    onMotion();
    motion.addEventListener("change", onMotion);
    return () => {
      stopUrl();
      motion.removeEventListener("change", onMotion);
      forgetCameraPose();
    };
  }, []);

  /** Mount a fresh canvas and renderer; the camera comes back where it was. */
  const rebuild = useCallback((why: string) => {
    if (rebuilds.current >= MAX_REBUILDS) {
      setFailure(why);
      return;
    }
    rebuilds.current++;
    readyRef.current = false;
    setReady(false);
    setBackend(null);
    setBuild((n) => n + 1);
  }, []);

  const retry = useCallback(() => {
    rebuilds.current = 0;
    setFailure(null);
    rebuild("retry");
  }, [rebuild]);

  const onFirstFrame = useCallback((drawnWith: RendererBackend) => {
    readyRef.current = true;
    setBackend(drawnWith);
    setReady(true);
  }, []);

  // an uncaptured GPU error before the first frame is the black-start case: start again
  const onError = useCallback(
    (message: string) => {
      if (!readyRef.current) rebuild(message);
    },
    [rebuild],
  );

  if (support === "none") {
    return (
      <TwinMessage title="This browser cannot show the 3D view">
        The digital twin needs WebGPU or WebGL2, and this browser offers neither. A current version of Chrome, Edge, Firefox or
        Safari will work.
      </TwinMessage>
    );
  }
  if (failure) {
    return (
      <TwinMessage title="The 3D view could not start" onRetry={retry}>
        The graphics device stopped responding and did not come back. Closing other heavy tabs can help.
      </TwinMessage>
    );
  }

  return (
    <TwinErrorBoundary onRetry={retry}>
      <Profiler id="twin" onRender={countReactCommit}>
        <div className="absolute inset-0 bg-[var(--bg-base,#0B1013)]">
          <TwinCanvas key={build} onLost={rebuild} onError={onError} onFirstFrame={onFirstFrame} />
          {ready ? <ShellHud backend={backend} /> : <TwinLoading slowStart={support === "webgl2"} />}
        </div>
      </Profiler>
    </TwinErrorBoundary>
  );
}
