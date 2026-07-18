import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type Group,
  type Material,
  MeshStandardMaterial,
  Vector3,
} from 'three'

import { standardMaterial } from '../../core/materials'
import { buildPartGeometry } from '../../core/primitives'
import { KinematicGraph } from '../../sim/graph'
import type {
  IKinematicGraph,
  MachineModule,
  PartDef,
  SolveResult,
} from '../../sim/types'
import GalleryPanel from '../panels/GalleryPanel'
import PartInspector from '../panels/PartInspector'
import SchemeSwitcher from '../panels/SchemeSwitcher'
import { useUiStore } from '../store'
import DriveHandle from './DriveHandle'
import ExplodedControl from './ExplodedControl'

declare global {
  interface Window {
    __mech?: {
      graph: IKinematicGraph
      module: MachineModule
      spec: MachineModule['spec']
    }
    __mechExplodeSpread?: () => number
    __mechSelect?: (partId: string) => void
  }
}

export interface MachineViewerProps {
  module: MachineModule
  schemeId?: string
}

interface PartNodeProps {
  assemblyProgress: number
  childrenByParent: Map<string, PartDef[]>
  explode: number
  graph: IKinematicGraph
  maxAssemblyStep: number
  module: MachineModule
  onDraggingChange: (dragging: boolean) => void
  onDrive: (result: SolveResult) => void
  part: PartDef
  schemeId?: string
  spotlightActive: boolean
  spotlightPartIds: string[]
}

const spotlightCameraPosition = new Vector3(0.58, 0.62, 1.05)

function SpotlightRig({ active, runId }: { active: boolean; runId: number }) {
  const camera = useThree((state) => state.camera)
  const startedAt = useRef(0)
  const startPosition = useRef(new Vector3())

  useEffect(() => {
    if (!active) return
    startedAt.current = performance.now()
    startPosition.current.copy(camera.position)
  }, [active, camera, runId])

  useFrame(() => {
    if (!active) return
    const progress = Math.min(1, (performance.now() - startedAt.current) / 1800)
    const eased = 1 - (1 - progress) ** 3
    camera.position.lerpVectors(startPosition.current, spotlightCameraPosition, eased)
    camera.lookAt(0, 0, 0)
  })

  return null
}

function radialExplodeVector(part: PartDef) {
  if (part.explodeVector) return new Vector3(...part.explodeVector)
  const radial = new Vector3(...part.position)
  if (radial.lengthSq() < 0.0001) radial.set(0, 1, 0)
  return radial.normalize().multiplyScalar(0.25)
}

function PartNode({
  assemblyProgress,
  childrenByParent,
  explode,
  graph,
  maxAssemblyStep,
  module,
  onDraggingChange,
  onDrive,
  part,
  schemeId,
  spotlightActive,
  spotlightPartIds,
}: PartNodeProps) {
  const group = useRef<Group>(null)
  const setSelectedPartId = useUiStore((state) => state.setSelectedPartId)
  const geometry = useMemo(
    () => buildPartGeometry(part.geometry, module.customBuilders),
    [module.customBuilders, part.geometry],
  )
  const material = useMemo<Material>(() => {
    const nextMaterial = standardMaterial(part.material)
    const schemeHighlighted = part.schemeTags?.includes(schemeId ?? '')
    const spotlightHighlighted =
      spotlightActive && spotlightPartIds.includes(part.id)
    const highlighted = schemeHighlighted || spotlightHighlighted
    if (highlighted && nextMaterial instanceof MeshStandardMaterial) {
      nextMaterial.emissive.set('#6e4e18')
      nextMaterial.emissiveIntensity = spotlightHighlighted ? 1.4 : 0.65
    }
    return nextMaterial
  }, [part.id, part.material, part.schemeTags, schemeId, spotlightActive, spotlightPartIds])
  const explodeVector = useMemo(() => radialExplodeVector(part), [part])
  const axis = useMemo(
    () => new Vector3(...(part.joint?.axis ?? [0, 0, 1])).normalize(),
    [part.joint?.axis],
  )
  const basePosition = useMemo(() => new Vector3(...part.position), [part.position])
  const baseRotation = part.rotationEuler ?? [0, 0, 0]
  const assemblyStep = part.assemblyStep ?? 0
  const visibleStep = Math.floor(assemblyProgress * Math.max(maxAssemblyStep, 1))
  const visible = assemblyStep <= visibleStep
  const childParts = childrenByParent.get(part.id) ?? []

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  useFrame(() => {
    if (!group.current) return
    const value = graph.state()[part.id] ?? 0
    group.current.position.copy(basePosition).addScaledVector(explodeVector, explode)
    group.current.rotation.set(...baseRotation)

    if (part.joint?.kind === 'revolute') {
      group.current.rotateOnAxis(axis, value)
    } else if (part.joint?.kind === 'prismatic') {
      group.current.position.addScaledVector(axis, value)
    }
  })

  if (!visible) return null

  const content = (
    <>
      <mesh
        castShadow
        geometry={geometry}
        material={material}
        onPointerDown={
          part.interactive
            ? undefined
            : (event) => {
                event.stopPropagation()
                setSelectedPartId(part.id)
              }
        }
        receiveShadow
      />
      {childParts.map((child) => (
        <PartNode
          assemblyProgress={assemblyProgress}
          childrenByParent={childrenByParent}
          explode={explode}
          graph={graph}
          key={child.id}
          maxAssemblyStep={maxAssemblyStep}
          module={module}
          onDraggingChange={onDraggingChange}
          onDrive={onDrive}
          part={child}
          schemeId={schemeId}
          spotlightActive={spotlightActive}
          spotlightPartIds={spotlightPartIds}
        />
      ))}
    </>
  )

  return (
    <group ref={group} visible={visible}>
      {part.interactive ? (
        <DriveHandle
          graph={graph}
          onDraggingChange={onDraggingChange}
          onDrive={onDrive}
          onSelect={() => setSelectedPartId(part.id)}
          part={part}
        >
          {content}
        </DriveHandle>
      ) : (
        content
      )}
    </group>
  )
}

interface MachineSceneProps {
  assemblyProgress: number
  explode: number
  graph: IKinematicGraph
  module: MachineModule
  onDrive: (result: SolveResult) => void
  paused: boolean
  schemeId?: string
  spotlightActive: boolean
  spotlightPartIds: string[]
  spotlightRunId: number
}

function MachineScene({
  assemblyProgress,
  explode,
  graph,
  module,
  onDrive,
  paused,
  schemeId,
  spotlightActive,
  spotlightPartIds,
  spotlightRunId,
}: MachineSceneProps) {
  const dragging = useRef(false)
  const partIds = useMemo(() => new Set(module.spec.parts.map((part) => part.id)), [module])
  const rootParts = useMemo(
    () => module.spec.parts.filter((part) => !part.parent || !partIds.has(part.parent)),
    [module, partIds],
  )
  const childrenByParent = useMemo(() => {
    const children = new Map<string, PartDef[]>()
    for (const part of module.spec.parts) {
      if (!part.parent) continue
      const siblings = children.get(part.parent) ?? []
      siblings.push(part)
      children.set(part.parent, siblings)
    }
    return children
  }, [module])
  const maxAssemblyStep = useMemo(
    () => Math.max(1, ...module.spec.parts.map((part) => part.assemblyStep ?? 0)),
    [module],
  )

  useFrame((_, delta) => {
    if (!paused && !dragging.current) {
      onDrive(graph.drive(module.spec.primaryDrive, delta * 0.12))
    }
  })

  return (
    <>
      <color args={['#090a0a']} attach="background" />
      <ambientLight intensity={0.8} />
      <directionalLight castShadow intensity={3.2} position={[1.5, 2.5, 3]} />
      <directionalLight color="#b88a42" intensity={1.2} position={[-2, -1, 2]} />
      {rootParts.map((part) => (
        <PartNode
          assemblyProgress={assemblyProgress}
          childrenByParent={childrenByParent}
          explode={explode}
          graph={graph}
          key={part.id}
          maxAssemblyStep={maxAssemblyStep}
          module={module}
          onDraggingChange={(nextDragging) => {
            dragging.current = nextDragging
          }}
          onDrive={onDrive}
          part={part}
          schemeId={schemeId}
          spotlightActive={spotlightActive}
          spotlightPartIds={spotlightPartIds}
        />
      ))}
      <ContactShadows
        blur={2.5}
        far={3}
        opacity={0.38}
        position={[0, -0.45, 0]}
        scale={2}
      />
      <SpotlightRig active={spotlightActive} runId={spotlightRunId} />
      <OrbitControls enableDamping enabled={!spotlightActive} makeDefault />
    </>
  )
}

export default function MachineViewer({ module, schemeId }: MachineViewerProps) {
  const { i18n, t } = useTranslation()
  const language = i18n.resolvedLanguage === 'en' ? 'en' : 'zh'
  const graph = useMemo(() => new KinematicGraph(module.spec), [module.spec])
  const [activeSchemeId, setActiveSchemeId] = useState(schemeId)
  const [caption, setCaption] = useState('')
  const [spotlightActive, setSpotlightActive] = useState(false)
  const [spotlightDone, setSpotlightDone] = useState(false)
  const [spotlightPartIds, setSpotlightPartIds] = useState<string[]>([])
  const [spotlightRunId, setSpotlightRunId] = useState(0)
  const [assemblyPlaying, setAssemblyPlaying] = useState(false)
  const animationFrame = useRef<number | null>(null)
  const spotlightTimer = useRef<number | null>(null)
  const assemblyProgress = useUiStore((state) => state.assemblyProgress)
  const explode = useUiStore((state) => state.explode)
  const paused = useUiStore((state) => state.paused)
  const setAssemblyProgress = useUiStore((state) => state.setAssemblyProgress)
  const setPaused = useUiStore((state) => state.setPaused)
  const setSelectedPartId = useUiStore((state) => state.setSelectedPartId)

  useEffect(() => {
    if (spotlightTimer.current !== null) {
      window.clearTimeout(spotlightTimer.current)
      spotlightTimer.current = null
    }
    setSpotlightActive(false)
    setSpotlightDone(false)
    setSpotlightPartIds([])
    setSelectedPartId(null)
    setActiveSchemeId(schemeId)
    graph.setScheme(schemeId ? module.schemes?.[schemeId] : undefined)
  }, [graph, module.schemes, schemeId, setSelectedPartId])

  useEffect(
    () => () => {
      if (spotlightTimer.current !== null) {
        window.clearTimeout(spotlightTimer.current)
      }
    },
    [],
  )

  useEffect(() => {
    if (!assemblyPlaying) return
    const startedAt = performance.now()
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 1600)
      setAssemblyProgress(progress)
      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animate)
      } else {
        setAssemblyPlaying(false)
      }
    }
    animationFrame.current = requestAnimationFrame(animate)
    return () => {
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current)
    }
  }, [assemblyPlaying, setAssemblyProgress])

  useLayoutEffect(() => {
    const hooksEnabled = import.meta.env.DEV || import.meta.env.VITE_E2E === '1'
    if (!hooksEnabled) return
    window.__mech = { graph, module, spec: module.spec }
    window.__mechSelect = (partId) => setSelectedPartId(partId)
    window.__mechExplodeSpread = () => {
      const currentExplode = useUiStore.getState().explode
      if (module.spec.parts.length === 0) return 0
      const total = module.spec.parts.reduce(
        (sum, part) => sum + radialExplodeVector(part).length() * currentExplode,
        0,
      )
      return total / module.spec.parts.length
    }

    return () => {
      if (window.__mech?.graph === graph) {
        delete window.__mech
        delete window.__mechSelect
        delete window.__mechExplodeSpread
      }
    }
  }, [graph, module, setSelectedPartId])

  const recordEvent = (type: string, part: string) => {
    setCaption(`${type} · ${part}`)
    if (type === 'spotlight:done') setSpotlightDone(true)
  }

  const handleSolve = (result: SolveResult) => {
    for (const event of result.events) recordEvent(event.type, event.part)
  }

  const runTrigger = (triggerId: string) => {
    const trigger = module.mechanism?.triggers.find((candidate) => candidate.id === triggerId)
    if (!trigger) return
    if (triggerId !== 'spotlight') {
      trigger.run(graph, recordEvent)
      return
    }

    if (spotlightTimer.current !== null) {
      window.clearTimeout(spotlightTimer.current)
    }
    setPaused(true)
    setSpotlightActive(true)
    setSpotlightDone(false)
    setSpotlightPartIds([module.spec.primaryDrive])
    setSpotlightRunId((current) => current + 1)

    let donePart = module.spec.primaryDrive
    trigger.run(graph, (type, part) => {
      if (type === 'spotlight:done') {
        donePart = part
        return
      }
      recordEvent(type, part)
      if (type.includes('drive') || type.includes('highlight')) {
        setSpotlightPartIds((current) =>
          current.includes(part) ? current : [...current, part],
        )
      }
    })

    spotlightTimer.current = window.setTimeout(() => {
      recordEvent('spotlight:done', donePart)
      setSpotlightActive(false)
      spotlightTimer.current = null
    }, 2400)
  }

  const spotlight = module.mechanism?.triggers.find((trigger) => trigger.id === 'spotlight')

  return (
    <main className="viewer-page">
      <section className="viewer-stage">
        <div className="viewer-title">
          <h1>{module.data.names[language]}</h1>
          <p>{module.data.oneLiner[language]} · {t('viewer.rotateHint')}</p>
        </div>
        <div
          className="viewer-canvas"
          data-spotlight-active={spotlightActive ? 'true' : 'false'}
        >
          <Canvas camera={{ fov: 36, position: [0.9, 1.1, 1.6] }} dpr={[1, 2]} shadows>
            <MachineScene
              assemblyProgress={assemblyProgress}
              explode={explode}
              graph={graph}
              module={module}
              onDrive={handleSolve}
              paused={paused}
              schemeId={activeSchemeId}
              spotlightActive={spotlightActive}
              spotlightPartIds={spotlightPartIds}
              spotlightRunId={spotlightRunId}
            />
          </Canvas>
        </div>
        <div className="viewer-toolbar">
          <button
            className="ghost-button"
            onClick={() => setPaused(!paused)}
            type="button"
          >
            {paused ? t('viewer.resume') : t('viewer.pause')}
          </button>
          <label className="range-control">
            <span>{t('viewer.assembly')}</span>
            <input
              aria-label={t('viewer.assembly')}
              max="1"
              min="0"
              onChange={(event) => {
                setAssemblyPlaying(false)
                setAssemblyProgress(Number(event.currentTarget.value))
              }}
              step="0.01"
              type="range"
              value={assemblyProgress}
            />
          </label>
          <button
            className="ghost-button"
            data-testid="assembly-play"
            onClick={() => {
              setAssemblyProgress(0)
              setAssemblyPlaying(true)
            }}
            type="button"
          >
            {t('viewer.assemblyPlay')}
          </button>
          <ExplodedControl />
        </div>
      </section>

      <aside className="viewer-sidebar">
        <PartInspector module={module} />
        <SchemeSwitcher
          graph={graph}
          module={module}
          onChange={setActiveSchemeId}
          schemeId={activeSchemeId}
        />
        <section className="panel">
          <h2>{t('viewer.mechanisms')}</h2>
          <div className="mechanism-list">
            {module.mechanism?.triggers.length ? (
              module.mechanism.triggers.map((trigger) => (
                <button
                  className="mechanism-button"
                  data-testid={`mech-trigger-${trigger.id}`}
                  key={trigger.id}
                  onClick={() => runTrigger(trigger.id)}
                  type="button"
                >
                  {trigger.label[language]}
                </button>
              ))
            ) : (
              <p className="panel-empty">{t('viewer.noMechanisms')}</p>
            )}
          </div>
          <p aria-live="polite" className="event-caption" data-testid="event-captions">
            {caption}
          </p>

          <article className="spotlight-card">
            <strong>{t('viewer.spotlight')}</strong>
            <p className="panel-copy">{module.data.ingenuity.hook[language]}</p>
            <button
              className="gold-button"
              data-testid="spotlight-play"
              disabled={!spotlight}
              onClick={() => spotlight && runTrigger(spotlight.id)}
              type="button"
            >
              {t('viewer.spotlightPlay')}
            </button>
            <p className="panel-copy">{module.data.ingenuity.echo[language]}</p>
            {spotlightDone ? (
              <span className="spotlight-done">{t('viewer.spotlightDone')}</span>
            ) : null}
          </article>
        </section>
        <GalleryPanel data={module.data} />
      </aside>
    </main>
  )
}
