import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  ConeGeometry,
  CylinderGeometry,
  type Intersection,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  ShaderMaterial,
  TorusGeometry,
  Vector3,
  type Group,
  type Raycaster,
} from "three";

interface DriveGizmoProps {
  active: boolean;
  axis: [number, number, number];
  coachTarget?: boolean;
  dragging: boolean;
  radius: number;
  testId: string;
}

interface DriveGizmoTestState {
  active: boolean;
  dragX: number;
  dragY: number;
  dragging: boolean;
  points: DriveGizmoTestPoint[];
  x: number;
  y: number;
}

interface DriveGizmoTestPoint {
  dragX: number;
  dragY: number;
  x: number;
  y: number;
}

declare global {
  interface Window {
    __mechDriveGizmos?: Record<string, DriveGizmoTestState>;
  }
}

const sharedClock = { value: 0 };
const ringGeometry = new TorusGeometry(1, 0.035, 12, 64);
const arrowGeometry = new ConeGeometry(0.075, 0.22, 16);
const colliderGeometry = new CylinderGeometry(1, 1, 1, 16, 1, false);
const colliderMaterial = new MeshBasicMaterial({ visible: false });
const ignoreRaycast = () => undefined;
const testPointAngles = Array.from(
  { length: 8 },
  (_, index) => (index * Math.PI) / 4,
);

function raycastDriveRing(
  this: Mesh,
  raycaster: Raycaster,
  intersections: Intersection[],
) {
  const firstRingIntersection = intersections.length;
  Mesh.prototype.raycast.call(this, raycaster, intersections);
  for (
    let index = firstRingIntersection;
    index < intersections.length;
    index += 1
  ) {
    intersections[index].distance = this.scale.x * 1e-9;
  }
}

function raycastDriveCollider(
  this: Mesh,
  raycaster: Raycaster,
  intersections: Intersection[],
) {
  const firstColliderIntersection = intersections.length;
  Mesh.prototype.raycast.call(this, raycaster, intersections);
  for (
    let index = firstColliderIntersection;
    index < intersections.length;
    index += 1
  ) {
    intersections[index].distance = this.scale.x * 1e-6;
  }
}

const vertexShader = `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = `
  uniform float uActive;
  uniform float uTime;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - abs(dot(normalize(vWorldNormal), viewDirection)), 1.7);
    float phase = mod(uTime, 6.0);
    float pulse = smoothstep(0.0, 0.3, phase) * (1.0 - smoothstep(1.0, 1.8, phase));
    float restAlpha = pulse * (0.04 + fresnel * 0.18);
    float activeAlpha = 0.36 + fresnel * 0.58;
    float alpha = mix(restAlpha, activeAlpha, uActive);
    vec3 bronze = mix(vec3(0.69, 0.55, 0.34), vec3(1.0, 0.86, 0.45), fresnel);
    float emissive = mix(0.08 * pulse, 1.25, uActive);
    gl_FragColor = vec4(bronze * emissive, alpha);
  }
`;

function gizmoMaterial(active: boolean) {
  return new ShaderMaterial({
    blending: AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    fragmentShader,
    transparent: true,
    uniforms: {
      uActive: { value: active ? 1 : 0 },
      uTime: sharedClock,
    },
    vertexShader,
  });
}

const activeMaterial = gizmoMaterial(true);
const restingMaterial = gizmoMaterial(false);

export default function DriveGizmo({
  active,
  axis,
  coachTarget = false,
  dragging,
  radius,
  testId,
}: DriveGizmoProps) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const group = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const projectedPoint = useRef(new Vector3());
  const projectedTangent = useRef(new Vector3());
  const worldPoint = useRef(new Vector3());
  const worldTangent = useRef(new Vector3());
  const hooksEnabled = import.meta.env.DEV || import.meta.env.VITE_E2E === "1";
  const axisVector = useMemo(() => new Vector3(...axis).normalize(), [axis]);
  const radial = useMemo(() => {
    const next = new Vector3(1, 0, 0).projectOnPlane(axisVector);
    if (next.lengthSq() < 0.001) {
      next.set(0, 1, 0).projectOnPlane(axisVector);
    }
    return next.normalize();
  }, [axisVector]);
  const tangent = useMemo(
    () => new Vector3().crossVectors(axisVector, radial).normalize(),
    [axisVector, radial],
  );
  const ringQuaternion = useMemo(
    () => new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), axisVector),
    [axisVector],
  );
  const arrowQuaternion = useMemo(
    () => new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), tangent),
    [tangent],
  );
  const colliderQuaternion = useMemo(
    () => new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), axisVector),
    [axisVector],
  );
  const arrowPosition = useMemo(
    () => radial.clone().multiplyScalar(radius),
    [radial, radius],
  );

  useEffect(
    () => () => {
      if (hooksEnabled && window.__mechDriveGizmos) {
        delete window.__mechDriveGizmos[testId];
      }
      if (coachTarget) {
        const container = gl.domElement.closest<HTMLElement>(".viewer-canvas");
        container?.style.removeProperty("--drive-coach-x");
        container?.style.removeProperty("--drive-coach-y");
      }
    },
    [coachTarget, gl, hooksEnabled, testId],
  );

  useFrame(({ clock }) => {
    sharedClock.value = clock.elapsedTime;
    if (!group.current || !ring.current || (!hooksEnabled && !coachTarget)) {
      return;
    }

    const rect = gl.domElement.getBoundingClientRect();
    const points = testPointAngles.map((angle) => {
      worldPoint.current.set(Math.cos(angle), Math.sin(angle), 0);
      ring.current?.localToWorld(worldPoint.current);
      projectedPoint.current.copy(worldPoint.current).project(camera);
      const x = rect.left + (projectedPoint.current.x + 1) * 0.5 * rect.width;
      const y = rect.top + (1 - projectedPoint.current.y) * 0.5 * rect.height;

      worldTangent.current.set(
        Math.cos(angle + 0.35),
        Math.sin(angle + 0.35),
        0,
      );
      ring.current?.localToWorld(worldTangent.current);
      projectedTangent.current.copy(worldTangent.current).project(camera);
      const tangentX =
        rect.left + (projectedTangent.current.x + 1) * 0.5 * rect.width - x;
      const tangentY =
        rect.top + (1 - projectedTangent.current.y) * 0.5 * rect.height - y;
      const tangentLength = Math.hypot(tangentX, tangentY) || 1;
      return {
        dragX: tangentX / tangentLength,
        dragY: tangentY / tangentLength,
        x,
        y,
      };
    });
    const coachPoint = points.reduce((leftmost, point) =>
      point.x < leftmost.x ? point : leftmost,
    );

    if (coachTarget) {
      const container = gl.domElement.closest<HTMLElement>(".viewer-canvas");
      container?.style.setProperty(
        "--drive-coach-x",
        `${coachPoint.x - rect.left}px`,
      );
      container?.style.setProperty(
        "--drive-coach-y",
        `${coachPoint.y - rect.top}px`,
      );
    }
    if (!hooksEnabled) return;

    window.__mechDriveGizmos ??= {};
    window.__mechDriveGizmos[testId] = {
      active,
      dragging,
      ...coachPoint,
      points,
    };
  });

  return (
    <group
      name={testId}
      ref={group}
      userData={{ mechanicaAffordance: true, testId }}
    >
      <mesh
        frustumCulled={false}
        quaternion={ringQuaternion}
        raycast={raycastDriveRing}
        ref={ring}
        renderOrder={20}
        scale={radius}
        userData={{ mechanicaAffordance: true }}
      >
        <primitive attach="geometry" object={ringGeometry} />
        <primitive
          attach="material"
          object={active ? activeMaterial : restingMaterial}
        />
      </mesh>
      <mesh
        frustumCulled={false}
        position={arrowPosition}
        quaternion={arrowQuaternion}
        renderOrder={21}
        scale={radius}
        userData={{ mechanicaAffordance: true }}
        visible={active}
      >
        <primitive attach="geometry" object={arrowGeometry} />
        <primitive attach="material" object={activeMaterial} />
      </mesh>
      <mesh
        quaternion={colliderQuaternion}
        raycast={active ? raycastDriveCollider : ignoreRaycast}
        scale={[radius * 1.5, Math.max(radius * 0.6, 0.08), radius * 1.5]}
        userData={{ mechanicaAffordance: true }}
      >
        <primitive attach="geometry" object={colliderGeometry} />
        <primitive attach="material" object={colliderMaterial} />
      </mesh>
    </group>
  );
}
