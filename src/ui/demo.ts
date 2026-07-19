import { BoxGeometry, DoubleSide, TorusGeometry } from 'three'

import type { MachineModule } from '../sim/types'

const source = {
  kind: 'tuice' as const,
  ref: 'demo-geometry',
  note: 'Purpose-built interaction specimen; not a historical reconstruction.',
}

const demoModule: MachineModule = {
  spec: {
    slug: 'demo',
    parts: [
      {
        id: 'small-gear',
        name: { zh: '主动小齿轮', en: 'Small driving gear' },
        geometry: {
          type: 'gear',
          module: 0.01,
          teeth: 20,
          thickness: 0.04,
          toothStyle: 'involute',
          pressureAngleDeg: 20,
        },
        material: 'bronze',
        position: [-0.2, 0, 0],
        joint: { kind: 'revolute', axis: [0, 1, 0] },
        provenance: source,
        dimensionProvenance: {
          module: source,
          teeth: source,
          thickness: source,
          position: source,
        },
        dimensionNotes: [
          {
            value: 0.2,
            unit: 'm',
            ancient: '演示直径二十厘米',
            provenance: source,
          },
        ],
        explodeVector: [-0.18, 0, 0],
        assemblyStep: 1,
        interactive: true,
      },
      {
        id: 'large-gear',
        name: { zh: '从动大齿轮', en: 'Large driven gear' },
        geometry: {
          type: 'gear',
          module: 0.01,
          teeth: 40,
          thickness: 0.04,
          toothStyle: 'involute',
          pressureAngleDeg: 20,
        },
        material: 'wood',
        position: [0.1, 0, 0],
        joint: { kind: 'revolute', axis: [0, 1, 0] },
        provenance: source,
        dimensionProvenance: {
          module: source,
          teeth: source,
          thickness: source,
          position: source,
        },
        dimensionNotes: [
          {
            value: 0.4,
            unit: 'm',
            ancient: '演示直径四十厘米',
            provenance: source,
          },
        ],
        explodeVector: [0.18, 0, 0],
        assemblyStep: 2,
        interactive: true,
      },
      {
        id: 'axle-small',
        name: { zh: '小齿轮轴', en: 'Small gear axle' },
        geometry: { type: 'shaft', radius: 0.018, length: 0.16 },
        material: 'iron',
        position: [-0.2, 0, 0],
        joint: { kind: 'fixed', axis: [0, 1, 0] },
        provenance: source,
        dimensionProvenance: { radius: source, length: source, position: source },
        explodeVector: [-0.18, 0, 0],
        assemblyStep: 0,
      },
      {
        id: 'axle-large',
        name: { zh: '大齿轮轴', en: 'Large gear axle' },
        geometry: { type: 'shaft', radius: 0.022, length: 0.16 },
        material: 'iron',
        position: [0.1, 0, 0],
        joint: { kind: 'fixed', axis: [0, 1, 0] },
        provenance: source,
        dimensionProvenance: { radius: source, length: source, position: source },
        explodeVector: [0.18, 0, 0],
        assemblyStep: 0,
      },
      {
        id: 'composite-fixture-shell',
        name: { zh: '复合材质标本', en: 'Composite material fixture' },
        geometry: {
          type: 'custom',
          builder: 'compositeFixture',
          params: { width: 0.18, height: 0.08, depth: 0.12 },
        },
        material: 'wood',
        position: [0.48, 0, 0],
        joint: { kind: 'fixed', axis: [0, 1, 0] },
        provenance: source,
        dimensionProvenance: { '@rest': source, position: source },
        explodeVector: [0.18, 0, 0],
        assemblyStep: 0,
      },
    ],
    constraints: [{ type: 'mesh', a: 'small-gear', b: 'large-gear' }],
    driveNodes: ['small-gear', 'large-gear'],
    primaryDrive: 'small-gear',
    cycleRad: Math.PI * 2,
    expectedRatios: [
      {
        from: 'small-gear',
        to: 'large-gear',
        ratio: -0.5,
        sourceRef: 'demo-geometry',
      },
    ],
  },
  customBuilders: {
    compositeFixture: ({ width, height, depth }) => {
      const body = new BoxGeometry(width, height, depth)
      body.userData.mechanicaMaterial = {
        alphaTest: 0.61,
        color: '#8d4f2a',
        roughness: 0.78,
        textureVariant: 'none',
      }
      const rim = new TorusGeometry(width * 0.32, height * 0.2, 8, 24)
      rim.rotateX(Math.PI / 2)
      rim.translate(0, height * 0.58, 0)
      rim.userData.mechanicaMaterial = {
        alphaTest: 0.73,
        color: '#d6b26e',
        metalness: 0.82,
        roughness: 0.24,
        side: DoubleSide,
        textureVariant: 'none',
      }
      return [body, rim]
    },
  },
  data: {
    slug: 'gimbal',
    names: { zh: '齿轮传动演示', en: 'Gear train demonstration' },
    era: { zh: '交互标本', en: 'Interactive specimen' },
    inventors: [{ zh: '格物机械志团队', en: 'Mechanica team' }],
    oneLiner: {
      zh: '二十齿主动轮驱动四十齿从动轮。',
      en: 'A 20-tooth driver turns a 40-tooth driven gear.',
    },
    principle: {
      zh: '外啮合齿轮反向转动；从动轮角位移为主动轮的负二分之一。',
      en: 'External gears counter-rotate; the driven angle is negative one half of the driver angle.',
    },
    sources: [
      {
        id: 'demo-geometry',
        book: 'Mechanica interaction specification',
        chapter: 'Phase 1 demo',
        quote: 'The demo uses 20- and 40-tooth external gears to expose a −0.5 ratio.',
        translation: {
          zh: '演示以二十齿与四十齿外啮合齿轮呈现负二分之一传动比。',
          en: 'The demo uses 20- and 40-tooth external gears to expose a −0.5 ratio.',
        },
        url: 'https://example.com/mechanica-demo',
      },
    ],
    dimensions: [
      {
        label: { zh: '小齿轮节圆直径', en: 'Small gear pitch diameter' },
        ancient: '演示尺寸',
        meters: 0.2,
        basis: '20 teeth × 0.01 m module',
        sourceId: 'demo-geometry',
        confidence: 'tuice',
      },
      {
        label: { zh: '大齿轮节圆直径', en: 'Large gear pitch diameter' },
        ancient: '演示尺寸',
        meters: 0.4,
        basis: '40 teeth × 0.01 m module',
        sourceId: 'demo-geometry',
        confidence: 'tuice',
      },
    ],
    schemes: [],
    controversies: [
      {
        topic: { zh: '演示性质', en: 'Demonstration status' },
        detail: {
          zh: '此模型用于验证交互与求解器，并非历史器物复原。',
          en: 'This model validates interaction and the solver; it is not a historical reconstruction.',
        },
        sourceIds: ['demo-geometry'],
      },
    ],
    museums: [],
    images: [],
    ingenuity: {
      hook: {
        zh: '转动小轮，为什么大轮会反向慢一半？',
        en: 'Why does the large gear turn backward at half speed?',
      },
      demo: {
        zh: '小轮前进六十度，大轮反向三十度。',
        en: 'The small gear advances 60° while the large gear reverses 30°.',
      },
      echo: {
        zh: '齿数之比把方向与速度同时编码进啮合。',
        en: 'Tooth counts encode both direction and speed in the mesh.',
      },
    },
  },
  mechanism: {
    triggers: [
      {
        id: 'turn-small',
        label: { zh: '小轮前进 20°', en: 'Advance small gear 20°' },
        run: (graph, emit) => {
          emit('gear:drive', 'small-gear')
          graph.drive('small-gear', Math.PI / 9)
          emit('gear:meshed', 'large-gear')
        },
      },
      {
        id: 'spotlight',
        label: { zh: '播放齿比巧思', en: 'Play ratio spotlight' },
        run: (graph, emit) => {
          emit('spotlight:start', 'small-gear')
          emit('spotlight:camera', 'small-gear')
          emit('spotlight:highlight', 'small-gear')
          graph.drive('small-gear', Math.PI / 3)
          emit('spotlight:drive', 'small-gear')
          emit('spotlight:highlight', 'large-gear')
          emit('spotlight:done', 'large-gear')
        },
      },
    ],
  },
}

export default demoModule
