import type { StoryStep } from "../../ui/story/types";

const story: StoryStep[] = [
  {
    id: "bronze-vessel",
    title: { zh: "陽嘉元年，復造候風地動儀", en: "The record begins" },
    body: {
      zh: "陽嘉元年，復造候風地動儀。以精銅鑄成，員徑八尺，合蓋隆起，形似酒尊，飾以篆文山龜鳥獸之形。八尺折合1.848米。",
      en: "In 132 CE Zhang Heng cast a bronze vessel 1.848 m across, domed like a wine jar and patterned with animals.",
    },
    camera: { position: [3.4, 2.4, 4.5], target: [0, 0.1, 0] },
    highlight: ["vessel"],
    sourceId: "houfeng-196",
  },
  {
    id: "vessel-half-section",
    title: { zh: "尊中八道", en: "Eight paths within" },
    body: {
      zh: "中有都柱，傍行八道，施關發機。外有八龍，首銜銅丸，下有蟾蜍，張口承之。",
      en: "Inside, one central duzhu feeds eight paths; outside, eight dragons hold balls over eight open-mouthed toads.",
    },
    camera: { position: [2.8, 1.3, 2.6], target: [0, 0.15, 0] },
    cutaway: { opacity: 0.18, partIds: ["vessel"] },
    explode: 0.38,
    highlight: ["vessel", "duzhu"],
    sourceId: "houfeng-196",
  },
  {
    id: "wang-standing-column",
    title: { zh: "王振鐸：直立都柱", en: "Wang's standing column" },
    body: {
      zh: "其牙機巧制，皆隱在尊中，覆蓋周密無際。王振鐸據此以直立都柱作倒立擺復原。",
      en: "The hidden mechanism is seamless. Wang Zhenduo's 1951 reconstruction makes the duzhu a standing inverted pendulum.",
    },
    camera: { position: [1.5, 0.8, 1.4], target: [0, 0.2, -0.1] },
    cutaway: { opacity: 0.14, partIds: ["vessel"] },
    explode: 0.22,
    schemeId: "wangzhenduo",
    highlight: ["duzhu", "wang-chute-0", "wang-chute-6"],
    sourceId: "houfeng-196",
  },
  {
    id: "wang-sensitivity-flaw",
    title: { zh: "靈敏度難題", en: "The sensitivity flaw" },
    body: {
      zh: "如有地動，尊則振龍機發吐丸，而蟾蜍銜之。振聲激揚，伺者因此覺知。但地震學家判定直立都柱靈敏度不足。",
      en: "A quake should make one dragon release its ball, but seismologists judged Wang's standing column too insensitive.",
    },
    camera: { position: [1, 1, 1.7], target: [0, 0.2, -0.1] },
    cutaway: { opacity: 0.14, partIds: ["vessel"] },
    schemeId: "wangzhenduo",
    driveTo: { node: "duzhu", seconds: 1.2, value: 0.02 },
    highlight: ["duzhu"],
    sourceId: "houfeng-196",
  },
  {
    id: "feng-suspended-pendulum",
    title: { zh: "馮銳：懸垂都柱", en: "Feng's suspended pendulum" },
    body: {
      zh: "雖一龍發機，而七首不動，尋其方面，乃知震之所在。馮銳改用懸垂都柱與八條滾珠軌道。",
      en: "One dragon fires while seven remain still. Feng Rui instead suspends the duzhu above eight ball tracks.",
    },
    camera: { position: [1.4, 0.9, 1.5], target: [0, 0.15, -0.1] },
    cutaway: { opacity: 0.14, partIds: ["vessel"] },
    explode: 0.12,
    schemeId: "fengrui",
    highlight: ["duzhu", "feng-track-0", "feng-track-6"],
    sourceId: "houfeng-196",
  },
  {
    id: "longxi-pulse",
    title: { zh: "隴西脈衝", en: "A Longxi pulse" },
    body: {
      zh: "嘗一龍機發而地不覺動，京師學者咸怪其無征，後數日驛至，果地震隴西，於是皆服其妙。此處注入d=6（西）的方位脈衝；d取0至7。",
      en: "The capital felt nothing; a courier confirmed a Longxi quake. Inject d=6, west within the bearing range d=0..7.",
    },
    camera: { position: [3.4, 2.4, 4.5], target: [0, 0.1, 0] },
    cutaway: { opacity: 0.16, partIds: ["vessel"] },
    explode: 0.28,
    schemeId: "fengrui",
    driveTo: { node: "duzhu", seconds: 1.6, value: 0.14 },
    highlight: ["duzhu", "feng-track-6", "dragon-6"],
    sourceId: "houfeng-196",
  },
  {
    id: "west-dragon-interlock",
    title: {
      zh: "一龍發機，七首不動",
      en: "One dragon fires; seven stay still",
    },
    body: {
      zh: "自此以後，乃令史官記地動所從方起。西龍吐丸，其餘七路由首發單穩態互鎖保持不動。",
      en: "One ball falls west while the other seven stay locked: the first-event monostable interlock at work.",
    },
    camera: { position: [-3.2, 0.9, 1.6], target: [-1.25, -0.1, 0] },
    schemeId: "fengrui",
    highlight: ["dragon-6", "ball-6", "toad-6"],
    spotlight: true,
    sourceId: "houfeng-196",
  },
  {
    id: "matched-like-the-divine",
    title: {
      zh: "驗之以事，合契若神",
      en: "Matched as if divine",
    },
    body: {
      zh: "驗之以事，合契若神。自書典所記，未之有也。",
      en: "Tested against events, it matched as if divine; nothing like it had appeared in the written record.",
    },
    camera: { position: [3.4, 2.4, 4.5], target: [0, 0.1, 0] },
    schemeId: "fengrui",
    highlight: ["vessel", "dragon-6", "toad-6"],
    sourceId: "houfeng-196",
  },
];

export default story;
