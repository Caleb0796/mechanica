import type { StoryStep } from "../../ui/story";

const stepRad = (Math.PI * 2) / 36;

export const astroclockStory = [
  {
    id: "exterior",
    title: { zh: "一座盛放宇宙的钟塔", en: "A clock tower holding the cosmos" },
    body: {
      zh: "苏颂与韩公廉在北宋建成水运仪象台，把观天、计时与报时置于同一座塔中。",
      en: "Su Song and Han Gonglian joined observing, timekeeping, and reporting in one Northern Song tower.",
    },
    camera: { position: [22, 15, 24], target: [0, 6, 1] },
    highlight: ["tower-shell", "base-platform", "armillary-sphere"],
    sourceId: "xyxfy-taiti",
  },
  {
    id: "half-section",
    title: { zh: "剖开外壳", en: "Open the half-section" },
    body: {
      zh: "半剖外壳显出三条相连的路径：供水、天文传动，以及五层报时木阁。",
      en: "The cutaway reveals three linked paths: water supply, celestial transmission, and the five-tier chime pagoda.",
    },
    camera: { position: [16, 10, 14], target: [0, 6, 0] },
    explode: 0.3,
    highlight: ["tower-shell", "shulun", "celestial-column", "chime-tier-3"],
    sourceId: "xyxfy-taiti",
  },
  {
    id: "water-circuit",
    title: {
      zh: "稳定水头，逐壶受水",
      en: "A steady head, one scoop at a time",
    },
    body: {
      zh: "天池把水送入平水壶，再注入三十六只受水壶；回水由水轮提升，重新进入循环。",
      en: "The reservoir feeds a constant-level tank, then 36 scoops; lift wheels return the drained water to the circuit.",
    },
    camera: { position: [15, 5, 10], target: [5.5, 2.5, 0] },
    explode: 0.16,
    highlight: [
      "water-reservoir",
      "constant-level-tank",
      "water-trough",
      "water-lift-wheel",
      "scoop-01",
    ],
    schemeId: "fixed-scoop",
    sourceId: "xyxfy-water",
  },
  {
    id: "escapement-beat",
    title: { zh: "停—放—再停", en: "Stop, release, stop again" },
    body: {
      zh: "壶满后压下格叉，关舌开启，枢轮前进一格，左右天锁随即锁住下一壶。",
      en: "A full scoop yields the fork, opens the tongue, advances one cell, and lets the celestial locks catch the next.",
    },
    camera: { position: [7, 6.5, 8], target: [0, 4.5, 1] },
    driveTo: { node: "shulun", seconds: 2, value: stepRad },
    highlight: [
      "scoop-01",
      "gecha",
      "guanshe",
      "shulun",
      "tiansuo-l",
      "tiansuo-r",
    ],
    sourceId: "xyxfy-action",
  },
  {
    id: "celestial-column",
    title: { zh: "从节拍到天柱", en: "From beat to celestial column" },
    body: {
      zh: "枢轮的离散节拍进入传动系；至时轮与昼夜轮的记录比均为三十六比一百。",
      en: "Discrete wheel beats enter the train; the recorded scoop-wheel ratio to both time wheels is 36 to 100.",
    },
    camera: { position: [13, 9, 11], target: [3, 7, 0] },
    driveTo: { node: "shulun", seconds: 2, value: stepRad * 2 },
    highlight: [
      "shulun",
      "hour-drum-wheel",
      "day-night-wheel",
      "celestial-column",
    ],
    sourceId: "xyxfy-baoshi",
  },
  {
    id: "celestial-globe",
    title: { zh: "天球同步", en: "The celestial globe in sync" },
    body: {
      zh: "天梯下轮与浑象采用示意的一比一传动，让天球与塔内均匀节拍保持同步。",
      en: "An illustrative 1:1 celestial ladder keeps the globe synchronized with the tower's measured beat.",
    },
    camera: { position: [11, 12, 12], target: [0, 9.5, 0] },
    highlight: [
      "celestial-ladder-lower",
      "celestial-globe",
      "armillary-sphere",
    ],
    sourceId: "xyxfy-baoshi",
  },
  {
    id: "chime-jacks",
    title: { zh: "时间登上舞台", en: "Time takes the stage" },
    body: {
      zh: "五层木阁中的人偶击钟、鼓与钲，并举牌报告时刻与夜更，把内部节拍变成公共信号。",
      en: "Jacks ring bells, beat a drum, strike a chime, and raise placards, turning hidden beats into public signals.",
    },
    camera: { position: [10, 7, 16], target: [0, 5, 5] },
    explode: 0.08,
    highlight: [
      "chime-tier-1",
      "chime-tier-2",
      "chime-tier-3",
      "chime-tier-4",
      "chime-tier-5",
      "jack-01",
      "jack-05",
      "jack-10",
    ],
    sourceId: "xyxfy-baoshi",
  },
  {
    id: "feedback",
    title: {
      zh: "巧思：水流被数字化",
      en: "Ingenuity: water becomes discrete",
    },
    body: {
      zh: "受水壶与格叉形成负反馈：重量达到阈值才放行，放行后立刻复锁，把连续流变成等节拍。",
      en: "Scoop and fork form negative feedback: release at a threshold, then re-lock, dividing continuous flow into beats.",
    },
    camera: { position: [8, 6, 9], target: [0, 4.5, 1.5] },
    driveTo: { node: "shulun", seconds: 2, value: stepRad * 3 },
    highlight: ["scoop-01", "gecha", "guanshe", "shulun", "tiansuo-r"],
    sourceId: "xyxfy-tianheng",
    spotlight: true,
  },
  {
    id: "clock-ancestor",
    title: { zh: "机械钟的祖先", en: "An ancestor of the mechanical clock" },
    body: {
      zh: "它不是后世钟表，却已用擒纵器制造“滴答”：一次释放一个等份，再把同一节拍送往天空与人间。",
      en: "It is not a later clock, yet its escapement makes a tick-tock: one equal release shared by heavens and people.",
    },
    camera: { position: [24, 16, 26], target: [0, 6, 1] },
    highlight: ["tower-shell", "shulun", "celestial-globe", "chime-tier-5"],
    sourceId: "xyxfy-action",
  },
] satisfies readonly StoryStep[];

export default astroclockStory;
