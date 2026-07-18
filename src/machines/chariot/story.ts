import type { StoryStep } from "../../ui/story/types";

const story: StoryStep[] = [
  {
    id: "ma-jun-trial",
    title: { zh: "马钧：以实试空谈", en: "Ma Jun: trial over argument" },
    body: {
      zh: "传说中的指南车被斥为虚构；马钧主张试造，并以成车使众人信服。",
      en: "When the legendary chariot was dismissed as fiction, Ma Jun answered argument with a working machine.",
    },
    camera: { position: [6.2, 3.8, 6], target: [0.3, 1.3, 0] },
    highlight: ["south-figure-body", "south-pointer"],
    sourceId: "sanguozhi-majun",
  },
  {
    id: "full-chariot",
    title: { zh: "完整指南车", en: "The complete chariot" },
    body: {
      zh: "直径1.872米的足轮承载车架，木人立于齿轮系之上，伸臂指南。",
      en: "Road wheels 1.872 m across carry the chassis; above the gear train, a wooden figure points south.",
    },
    camera: { position: [5.8, 4, 5.3], target: [0.4, 1.45, 0] },
    highlight: ["left-road-wheel", "right-road-wheel", "south-figure-body"],
    schemeId: "yansu-clutch",
    sourceId: "songshi-yansu",
  },
  {
    id: "gear-train",
    title: { zh: "车架内的齿轮系", en: "Gears inside the chassis" },
    body: {
      zh: "《宋史》记子轮24齿、小平轮12齿、中心大平轮48齿，组成转向补偿链。",
      en: "The Song account gives 24-tooth sub-wheels, 12-tooth small wheels, and a 48-tooth great wheel.",
    },
    camera: { position: [1.5, 4.1, 3.1], target: [0, 2.35, 0] },
    explode: 0.18,
    highlight: [
      "right-sub-wheel",
      "right-small-wheel",
      "great-wheel",
      "central-shaft",
    ],
    schemeId: "yansu-clutch",
    sourceId: "songshi-yansu",
  },
  {
    id: "straight-travel",
    title: { zh: "直行：离合脱开", en: "Straight: gears disengaged" },
    body: {
      zh: "直行时两足轮同速，侧选齿轮保持脱开；转向时相应一侧才落下啮合。",
      en: "In straight travel the road wheels match; a side-selecting gear drops into mesh only for a turn.",
    },
    camera: { position: [4.8, 2.5, 0.2], target: [0.35, 1.15, 0] },
    explode: 0,
    highlight: [
      "left-road-wheel",
      "right-road-wheel",
      "left-clutch-dog",
      "right-clutch-dog",
    ],
    schemeId: "yansu-clutch",
    sourceId: "songshi-wuderen",
  },
  {
    id: "right-angle-turn",
    title: { zh: "右转九十度", en: "A 90-degree right turn" },
    body: {
      zh: "右子轮前进12齿，小平轮转一周，大平轮反向四分之一周，抵消车身转向。",
      en: "The right sub-wheel advances 12 teeth; the great wheel counter-rotates one quarter-turn.",
    },
    camera: { position: [-4.6, 3.8, 5.3], target: [0, 1.7, 0] },
    driveTo: { node: "right-sub-wheel", seconds: 2, value: Math.PI },
    highlight: [
      "right-sub-wheel",
      "right-small-wheel",
      "great-wheel",
      "south-pointer",
    ],
    schemeId: "yansu-clutch",
    sourceId: "songshi-turn",
  },
  {
    id: "mechanical-subtraction",
    title: { zh: "妙处：机械减法", en: "Ingenuity: mechanical subtraction" },
    body: {
      zh: "齿轮把车身转角反向回馈给木人；世界方位变化小于1e-6弧度，全程不用磁石。",
      en: "Counter-feed cancels chassis yaw: the figure's world-heading change stays below 1e-6 rad, without magnetism.",
    },
    camera: { position: [2.2, 3.7, 2.2], target: [-0.22, 2.72, 0] },
    highlight: ["great-wheel", "figure-turntable", "south-pointer"],
    schemeId: "yansu-clutch",
    sourceId: "songshi-turn",
    spotlight: true,
  },
  {
    id: "lanchester-comparison",
    title: { zh: "兰彻斯特差速方案", en: "Lanchester differential" },
    body: {
      zh: "兰彻斯特以连续差速替代侧落离合；机械上优雅，却没有直接古文依据。",
      en: "Lanchester replaces the clutch with continuous differential compensation: elegant, but not textually attested.",
    },
    camera: { position: [-3.2, 2.2, 2.5], target: [-1.2, 0.95, 0] },
    highlight: [
      "differential-carrier",
      "differential-sun-left",
      "differential-sun-right",
    ],
    schemeId: "lanchester-diff",
  },
];

export default story;
