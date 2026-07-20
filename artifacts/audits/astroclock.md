# astroclock provisional Codex audit

- Model: Codex GPT-5.6-sol
- Provisional: true
- Replacement: `pnpm run audit`

## Verdict

| Item | Text derivation | Implementation/report | Verdict | Evidence |
|---|---|---|---|---|
| Tower plan and taper | Square plan; upper part narrower than lower part. | `tower-shell` has equal X/Z half-widths and tapers from 3.5 m below to 2.4 m above; `base-platform` is 7 m square. | consistent | Exact quote: “其制為臺四方而再重，上狹下廣”. |
| Two-stage tower and upper instrument partition | The tower is double-stage, with the armillary instrument on the upper partition. | A tapered shell and high armillary part exist, but there is no second stage or upper partition in `parts.json`/`build.ts`; the report has no check for either relation. | inconsistent | Exact quote: “其制為臺四方而再重，上狹下廣……渾儀置上隔”. |
| Armillary count | The instrument has three layers/assemblies. | `astroclockArmillary` merges exactly three torus geometries. | consistent | Exact quote: “儀有三重”. |
| Armillary identities | The three assemblies are 六合儀, 三辰儀, and 四游儀. | One generic `armillary-sphere` with three perpendicular rings is modeled; none of the three named assemblies is represented or checked. | inconsistent | Exact quote: “曰六合儀、曰三辰儀、曰四游儀”. |
| Scoop-wheel diameter | Diameter is 一丈一尺. | `shulun` records 3.432 m diameter and 1.716 m radius, with the ancient value preserved; report provenance checks pass. | consistent | Exact quote: “樞輪直徑一丈一尺”. |
| Spoke readings | Main reading 72 spokes; variant 96. | `shulun.geometry.spokes` is 72 and the primary model uses that reading; the 96-spoke variant is not geometrically instantiated but is not contradicted. | consistent | Exact quote: “以七十二輻（一本云九十六）”. |
| Spoke-to-cell ratio and cell readings | Spokes are paired: 72 / 2 = 36 cells; variant 96 / 2 = 48 cells. | The model has 72 spokes and 36 scoops; a 48-scoop variant note is retained. | consistent | Exact quote: “雙植於一轂為三十六洪（一本云四十八）”. |
| Three wheel rims | The spoke assembly is bound by three rims. | `shulun` is only a generic wheel with radius, width, and spokes; no three-rim structure or report check exists. | inconsistent | Exact quote: “束以三輞”. |
| Scoop count and dimensions | One scoop per cell, 36 total; each is 1 chi long, 5 cun wide, 4 cun deep. | Exactly 36 `scoop-*` parts exist, all sized `[0.312, 0.156, 0.125]` m; the last value is the rounded 0.1248 m conversion. | consistent | Exact quote: “每洪夾持受水壺一，總三十六壺，每壺長一尺、闊五寸、深四寸”. |
| Balance assembly topology | One 天衡 over the wheel; 天關 at its head, 天權 at its tail, 天條 before it and joining 關舌; 樞衡 sits on 關舌, its head forms 格叉, and 樞權 hangs at its end. | Only `gecha`, `guanshe`, and `tianguan` are modeled. 天衡, 天權, 天條, 樞衡, and 樞權 are absent, so the quoted load path is incomplete although source-snapshot checks pass. | inconsistent | Exact quote: “天衡一置樞輪上，天關一置衡腦，天權一置衡尾，天條一在衡之前，天衡關舌一以天條綴之……樞衡一在天衡關舌上，衡腦為格叉以抵受水壺，以樞權掛其末”. |
| Left/right locks | There are two locks, one left and one right, mounted between the east/west columns and holding the wheel true. | `tiansuo-l` and `tiansuo-r` both exist and participate in the escapement script. Their exact architectural mounting is illustrative. | consistent | Exact quote: “左右天鎖二，分置東西天柱間梁上，所以持正樞輪也”. |
| Weight-triggered escapement | An empty scoop is held by the fork; a water-filled scoop outweighs it, the fork falls, and the side iron tooth opens the latch. | `runEscapementBeat` fills `scoop-01`, drops `gecha`, opens `guanshe`/`tianguan`, and advances the wheel; the report says the escapement trigger and drag integrity checks pass in all three configurations. | consistent | Exact quote: “壺虛即為格叉所格……水實即格叉不能勝壺，故格叉落，格叉落即壺側鐵撥擊（開關舌）”. |
| One-scoop advance, relock, and reverse stop | After one spoke passes, the left lock and 天關 open; after one scoop falls, the locks restrain the next; rightward rotation is protected from westward reversal by the right lock. | The script advances by `2π/36`, relocks both locks, and `drag-shulun` blocks negative motion on `tiansuo-r`. | consistent | Exact quote: “一輻過則左天鎖及天關開……一壺落則關鎖再拒次壺；激輪右回，故以右天鎖拒之使不能西也”. |
| Reporting pavilion floor count | The wooden reporting pavilion has five floors. | Five `chime-tier-*` parts, five cams, and five placards exist; the chime trigger iterates tiers 1 through 5. | consistent | Exact quote: “木閣五層”. |
| First-floor time signals | First floor: a left figure rings a bell at the hour's beginning, a drum is beaten at 刻至中, and a right figure strikes a bell at the exact hour. | Tier 1 has only two generic `jack-*` boxes and a placard; none of the bell/drum/bell actions is implemented or checked. | inconsistent | Exact quote: “第一層時初木人左搖鈴，刻至中擊鼓，時正右扣鐘”. |
| Fifth-floor night reporting | Fifth floor figures emerge to report the night clepsydra arrow. | Tier 5 has two generic jacks and a placard; no night-arrow reporting relation is implemented or checked. | inconsistent | Exact quote: “第五層分布木人出報夜漏箭”. |
| Eight-layer day/night train and first drive | The day/night gear train has eight layers; its first is 天輪, which drives the celestial globe's equatorial teeth. | Only one `day-night-wheel` is named, and it is not the driver of `celestial-globe`; the globe is driven through `celestial-ladder-lower`. No eight-layer train exists. | inconsistent | Exact quote: “晝夜機輪八重，第一重曰天輪以撥渾象之赤道牙”. |
| Recirculating water chain | Water flows 天池 → 平水壺 → receiving scoops → 退水壺 → lower lift wheel → upper lift vessel → 天河 → 天池. | Reservoir, constant-level tank, scoops, water-lift wheel, and a trough exist, but 退水壺 and the upper lift vessel are absent and no explicit flow edges encode the quoted closed sequence. `emitWaterCircuit` only emits three captions; the report's passing water-return check does not establish the full chain. | inconsistent | Exact quote: “平水壺受天池水注入受水壺以激樞輪；受水壺水落入退水壺……以昇水下輪運水入昇水上壺……運水入天河，天河復流入天池，周而復始”. |
| Overall tower dimensions | No literal supplied quote gives a 12 m height or 7 m base width. | The shell/base use 12 m and 7 m and correctly label them `tuice`; report provenance checks pass. | no textual basis | No supplied `sources[].quote` states either metric dimension. |
| Other claimed historical dimensions/counts | No literal supplied quote gives the celestial column as 6.084 m, the hour-drum wheel as 2.09 m/600 teeth, or the water-lift wheel as 1.747 m. | Those values are marked `wenxian` in `parts.json`, and the report passes their provenance declarations, but the permitted quotes do not support them. | no textual basis | No supplied `sources[].quote` states “一丈九尺五寸”, “六尺七寸”, “六百牙”, or “五尺六寸”. |
| Escapement timing and angular ranges | The quotes give no 24-second fill interval, 0.35 radian swing/limit, or one-tenth-step preload. | `escapement.fillSecondsPerScoop` is 24; build/schemes use ±0.35 rad and `stepRad/10`; sampled range checks pass. | no textual basis | No supplied `sources[].quote` states these timing or angular values. |
| Transmission ratios | The quotes support named connections but give no 0.36 or 1:1 angular ratios. | `expectedRatios` declares 0.36, 0.36, and 1; additional constraints use several 1:1 ratios. All ratio checks pass only against those declared values. | no textual basis | No supplied `sources[].quote` states “36/100”, “0.36”, or a 1:1 transmission ratio. |
| Fixed versus hinged scoop schemes | The quote specifies one scoop held per cell but does not resolve rigid versus hinged mounting, scholars, dates, hinge travel, or cam behavior. | `fixed-scoop` makes all 36 joints fixed; `combridge-hinged` makes all 36 revolute and adds a conjectural cam. The schemes label motion details as inferred. | no textual basis | Exact quote supports only “每洪夾持受水壺一”; it does not specify either reconstructed mounting scheme. |
| Chime cam phasing and placard motion | The quotes give five floors and named reporting actions, but no cam ratios, 0.08 m lifts, 0.2 dwell, or placard mechanism. | Tier ratios are 1, 1/2, 1/3, 1/4, 1/5; each placard cam has 0.08 m lift and 0.2 dwell, all marked `tuice`. | no textual basis | No supplied `sources[].quote` states these ratios, lifts, dwell values, or placards. |

## Load-bearing conflicts

- The double-stage tower and upper instrument partition are not represented.
- The three named armillary assemblies are reduced to three generic rings.
- The wheel's three rims are not represented.
- The quoted balance/fork load path omits 天衡, 天權, 天條, 樞衡, and 樞權.
- The first-floor bell/drum/bell sequence and fifth-floor night-arrow report are replaced by generic placards.
- The eight-layer day/night train and its first-wheel-to-equatorial-teeth relation are absent.
- The closed water circuit omits the return vessel and upper lift vessel and lacks explicit flow connections.
- Several values marked `wenxian` (6.084 m celestial column, 2.09 m/600-tooth hour-drum wheel, 1.747 m lift wheel, and declared 0.36/1:1 ratios) have no basis in the permitted literal quotes; passing report checks validate declarations and deterministic behavior, not those historical claims.

## Limitations

This is provisional Codex test evidence and must be replaced by the keyed `pnpm run audit` script. Review was limited to the supplied literal `sources[].quote` strings, the final astroclock parts/build/schemes, and the deterministic validation report; no extraction artifact was read, and no tests or builds were run. The report contains 1,567 passes, 0 failures, and 0 warnings, but its snapshot/provenance checks do not independently prove quote-level semantic support.

Counts: 10 consistent, 8 inconsistent, 6 no textual basis. Conflicts: eight load-bearing source/model or unsupported-authority groups listed above; no release claim is made.
