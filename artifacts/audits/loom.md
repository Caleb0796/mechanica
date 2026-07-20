# loom provisional Codex audit

- Model: Codex GPT-5.6-sol
- Provisional: true
- Replacement: `pnpm run audit`

## Verdict

| Item | Text derivation | Implementation/report | Verdict | Evidence |
|---|---|---|---|---|
| Recorded brocade output | The passage records `24` bolts of grape brocade, `25` of scattered-flower damask, `60` days per bolt, and a value of `10,000` cash. | A representative woven panel and conjectural weft counter exist, but none of the four production quantities is represented or checked. | inconsistent | “蒲桃錦二十四匹、散花綾二十五匹……六十日成一匹，匹直萬錢。” |
| 120-selector loom | The Chen-family loom used exactly `120` 鑷/selectors. | The exhibit substitutes eight selector cams and eight representative heddles. The simplification is declared, but the quoted count and configuration are not preserved. | inconsistent | “機用一百二十鑷” |
| Ma Jun's old and improved arrangements | The old machines paired `50` heddles with `50` treadles or `60` heddles with `60` treadles; Ma Jun reduced either arrangement to `12` treadles. | `treadle-bank.params.count = 12` preserves the quoted improved treadle count. The earlier 50/50 and 60/60 arrangements are not claimed as the selected implementation. | consistent | “五十綜者五十躡，六十綜者六十躡……乃皆易以十二躡。” |
| Excavated model count and grouping | Four bamboo-and-wood models were excavated: one larger no. 186 and three smaller linkage models nos. 189, 190, and 191. | The two schemes preserve the quoted grouping: `sliding-frame` represents no. 186, while `linkage` represents nos. 189–191. | consistent | “出土四部织机模型……其中一部织机（编号186）略大……其他三部（189、190、191）连杆型略小” |
| No. 186 envelope | Model no. 186 measures `85 × 26 × 50 cm`. | The base/sliding frame uses `0.85 × 0.26 × 0.50 m`, with all three values marked `wenwu`; the report's provenance checks pass. | consistent | “编号186……长85、宽26、高50cm” |
| Linkage-model envelope | Models nos. 189–191 measure `63 × 19 × 37 cm`. | The linkage patch overrides the frame to `0.63 × 0.19 × 0.37 m`, with all three measurements marked `wenwu`; scheme checks pass. | consistent | “189、190、191连杆型略小：长63、宽19、高37cm” |
| Excavated materials and residues | The four models were made from bamboo and wood, with surviving silk thread and pigment. | Wood and silk are represented, but no bamboo component or pigment/dye residue is modeled or checked. | inconsistent | “由竹木构成……部件上残存有丝线和染料” |
| No. 186 sliding-frame and single-hook identification | The supplied archaeological quote distinguishes the larger no. 186 from three linkage models, but it does not call no. 186 a sliding-frame machine or mention a single-hook selector. | `selector-carriage` and `single-hook` are marked `wenwu` from `kaogu-laoguanshan`, and the report passes their references, although those identifications are absent from the permitted quote. | no textual basis | The quote says only that no. 186 is larger and nos. 189–191 are linkage-type. |
| Linkage selector load path | Nos. 189–191 are explicitly linkage-type machines, so the scheme-defining selector should operate through a linkage relation. | The patch adds `linkage-crank`, low bar, and high bar, but only the crank is lockstepped to the treadle; the high bar is driven directly by `selector-cam-0`, and the low bar has no joint or constraint. The named pieces do not form an encoded crank-to-linkage selector chain. | inconsistent | “其他三部（189、190、191）连杆型略小” |
| Stored eight-heddle programs | No quote gives an eight-heddle order, angular ratios, or a second reversed program. | Orders `1-3-5-7-2-4-6-8` and `8-6-4-2-7-5-3-1` become treadle-to-cam ratios `1…8`; they are correctly labeled `tuice`, and the report checks only constraint validity. | no textual basis | No supplied quote specifies either order or any treadle-to-cam ratio. |
| Exhibit kinematic dimensions | The quotes give no cam size, heddle lift, selector travel, shuttle travel, warp count, beat-up stroke, or weft-counter geometry. | These values are consistently marked `tuice`; range and collision passes establish internal behavior, not textual support. | no textual basis | No supplied quote contains those kinematic dimensions. |
| Classical angular ratios | The quotations provide counts and envelopes but no angular transmission ratio. | `expectedRatios` is empty, so the implementation does not misstate any conjectural program multiplier as a classical expected ratio. | consistent | No supplied quote states an angular ratio. |

## Load-bearing conflicts

- The quoted `120`-selector configuration is reduced to eight selector cams/heddles; the declared exhibit simplification does not preserve the exact source count.
- `single-hook` and the no. 186 sliding selector are marked `wenwu` from `kaogu-laoguanshan`, but neither identification appears in the supplied archaeological quote.
- The linkage scheme's crank and two named bars do not form an encoded linkage load path: the high bar is driven directly from a selector cam and the low bar is static.

## Limitations

This is provisional Codex test evidence and will be replaced by the keyed audit. It uses only the supplied `sources[].quote` text as textual authority and does not inspect the extraction artifact. The existing validation report records `609` passes, `0` failures, and `0` warnings at `0.5°` resolution across the base and both schemes, but it checks provenance-reference presence, ranges, collisions, and trigger execution rather than the three conflicts above. No tests, builds, package-manager commands, Git operations, or browsers were run, as required.

Counts: 5 `consistent`, 4 `inconsistent`, 3 `no textual basis`; 3 unresolved load-bearing conflicts. No release claim is made.
