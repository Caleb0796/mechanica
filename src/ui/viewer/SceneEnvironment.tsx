import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import {
  PMREMGenerator,
  type Scene,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const roomEnvironment = new RoomEnvironment();
const rendererEnvironments = new WeakMap<
  WebGLRenderer,
  { refs: number; renderTarget: WebGLRenderTarget }
>();
const preparedSceneEnvironments = new WeakMap<
  Scene,
  { gl: WebGLRenderer; release: () => void }
>();

function acquireEnvironment(gl: WebGLRenderer) {
  const cached = rendererEnvironments.get(gl);
  if (cached) {
    cached.refs += 1;
    return cached;
  }

  const generator = new PMREMGenerator(gl);
  const environment = {
    refs: 1,
    renderTarget: generator.fromScene(roomEnvironment, 0.04, 0.1, 100, {
      size: 64,
    }),
  };
  generator.dispose();
  rendererEnvironments.set(gl, environment);
  return environment;
}

function releaseEnvironment(
  gl: WebGLRenderer,
  environment: { refs: number; renderTarget: WebGLRenderTarget },
) {
  environment.refs -= 1;
  if (environment.refs > 0) return;
  environment.renderTarget.dispose();
  rendererEnvironments.delete(gl);
}

function attachSceneEnvironment(gl: WebGLRenderer, scene: Scene) {
  const environment = acquireEnvironment(gl);
  const previousEnvironment = scene.environment;
  const previousIntensity = scene.environmentIntensity;
  scene.environment = environment.renderTarget.texture;
  scene.environmentIntensity = 0.9;

  return () => {
    if (scene.environment === environment.renderTarget.texture) {
      scene.environment = previousEnvironment;
      scene.environmentIntensity = previousIntensity;
    }
    releaseEnvironment(gl, environment);
  };
}

export function prepareSceneEnvironment({
  gl,
  scene,
}: {
  gl: WebGLRenderer;
  scene: Scene;
}) {
  const prepared = preparedSceneEnvironments.get(scene);
  if (prepared?.gl === gl) return;
  prepared?.release();
  preparedSceneEnvironments.set(scene, {
    gl,
    release: attachSceneEnvironment(gl, scene),
  });
}

export function mountSceneEnvironment(gl: WebGLRenderer, scene: Scene) {
  const prepared = preparedSceneEnvironments.get(scene);
  if (prepared?.gl === gl) {
    preparedSceneEnvironments.delete(scene);
    return prepared.release;
  }
  return attachSceneEnvironment(gl, scene);
}

export default function SceneEnvironment({ onReady }: { onReady?: () => void }) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useLayoutEffect(() => {
    const release = mountSceneEnvironment(gl, scene);
    let cancelled = false;
    let warmupFrame: number | undefined;
    if (onReadyRef.current) {
      warmupFrame = requestAnimationFrame(() => {
        warmupFrame = requestAnimationFrame(() => {
          void gl.compileAsync(scene, camera).then(() => {
            if (!cancelled) onReadyRef.current?.();
          });
        });
      });
    }
    return () => {
      cancelled = true;
      if (warmupFrame !== undefined) cancelAnimationFrame(warmupFrame);
      release();
    };
  }, [camera, gl, scene]);

  return null;
}
