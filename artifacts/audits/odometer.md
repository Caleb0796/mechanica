# odometer provisional Codex audit

- Model: Codex GPT-5.6-sol
- Provisional: true
- Replacement: `pnpm run audit`

## Verdict

| Item | Text derivation | Implementation/report | Verdict | Evidence |
|---|---|---|---|---|
| Carriage identity and decorated body | The machine is 記裏鼓車, also 大章車: red, painted with flowers and birds on four sides, with a double platform, balustrade, and carved arches. | `chassis-base` is labeled red and `platform`/`canopy-roof` suggest a raised structure, but no alternate name, four painted faces, balustrade, or carved arches are represented or checked. | inconsistent | Exact quote: “記裏鼓車，一名大章車。赤質，四面畫花鳥，重台，勾闌，鏤拱。” |
| Drawbar and team | One drawbar has a phoenix head and the carriage is drawn by four horses. | One beam `drawbar` exists and is named phoenix-headed, but it has no phoenix-head geometry and there are no horse parts. | inconsistent | Exact quote: “一轅，鳳首，駕四馬。” |
| Signal cadence and instruments | Every 1 li a figure beats a drum; every 10 li a figure strikes a 鐲. Both quotes agree on distances and instruments. | `emitCrossedStrikes` emits `drum` on each `zhongpinglun` revolution and `chime` on each `shangpinglun` revolution; declared ratios make these 1-li and 10-li events. Trigger and ratio checks pass. | consistent | Exact quotes: “行一里，則上層木人擊鼓；十里，則次層木人擊鐲” and “其中平輪轉一周，車行一里……上平輪轉一周，車行十里”. |
| Tier-assignment variant | Quote A assigns the 1-li drum to the upper tier and 10-li 鐲 to the next tier; quote B assigns the 1-li drum to the lower tier and 10-li 鐲 to the upper tier. The quotes conflict. | The implementation silently chooses quote B (`lower-figure` drum, `upper-figure` chime), while both figures share Y = 4.82 m, so the physical tier distinction and alternate reading are not represented. The report does not flag the ambiguity. | inconsistent | Exact quotes: “上層木人擊鼓……次層木人擊鐲” versus “下一層木人擊鼓……上一層木人擊鐲”. |
| Road-wheel count and dimensions | Each of two road wheels has diameter 6 chi and stated circumference 1 zhang 8 chi. | `zulun` and `right-zulun` both use 0.936 m radius and preserve “徑六尺，圍一丈八尺” in dimension notes; provenance checks pass. | consistent | Exact quote: “足輪各徑六尺，圍一丈八尺。” |
| Distance calibration | One wheel turn travels 3 bu; 1 bu = 6 chi and 1 li = 300 bu. Therefore 1 li = 100 road-wheel turns and 10 li = 1,000 turns. | `ROAD_TURNS_PER_LI = 100`, full cycle is 1,000 turns, and `advance` applies 100 turns per requested li. | consistent | Exact quote: “足輪一周，而行地三步。以古法六尺為步，三百步為裏”. |
| 18-tooth vertical wheel | One vertical wheel attached to the left road wheel has diameter 1 chi 3 cun 8 fen and 18 teeth. | `lilun` is fixed to `road-axle`, has 18 teeth, and records 0.431 m / “徑一尺三寸八分”; report checks pass. | consistent | Exact quote: “立輪一，附於左足，徑一尺三寸八分……出齒十八”. |
| 54-tooth lower wheel | One lower horizontal wheel has diameter 4 chi 1 cun 4 fen and 54 teeth. | `xiapinglun` has 54 teeth and records 1.292 m / “徑四尺一寸四分”; report checks pass. | consistent | Exact quote: “下平輪一，其徑四尺一寸四分……出齒五十四”. |
| Three-tooth whirlwind wheel | A vertical through-shaft carries one copper whirlwind wheel with 3 teeth. | Bronze `xuanfenglun` has 3 teeth and is lockstepped to `xiapinglun`; report checks pass. | consistent | Exact quote: “立貫心軸一，其上設銅旋風輪一，出齒三”. |
| 100-tooth middle wheel | One middle wheel has diameter 4 chi and 100 teeth. | `zhongpinglun` has 100 teeth and records 1.248 m / “徑四尺”; report checks pass. | consistent | Exact quote: “中立平輪一，其徑四尺……出齒百”. |
| Small and upper wheels | The next small wheel has 10 teeth; the upper wheel has 100 teeth. | `xiaopinglun` has 10 teeth and `shangpinglun` has 100; report checks pass. | consistent | Exact quote: “次安小平輪一……出齒十……上平輪一……出齒百”. |
| Total wheel and tooth counts | Eight large/small wheels total 285 teeth. The arithmetic is 18 + 54 + 3 + 100 + 10 + 100 = 285; the two road wheels bring the wheel count to eight. | `parts.json` has two road wheels plus six gears, and the six gear tooth counts sum to 285. | consistent | Exact quote: “凡用大小輪八，合二百八十五齒”. |
| Sequential gear relation | The wheels engage successively with dog-tooth restraint and repeat cyclically. | Constraints encode road wheel/18 lockstep, 18↔54 mesh, 54/3 lockstep, 3↔100 mesh, 100/10 lockstep, and 10↔100 mesh. | consistent | Exact quote: “遞相鉤鎖，犬牙相製，周而復始。” |
| First reduction | From the quoted teeth, 18:54 followed by 3:100 gives magnitude `(18/54) × (3/100) = 1/100`, matching one middle-wheel turn per 100 road-wheel turns = 1 li. | `expectedRatios` declares `zulun → zhongpinglun = 1/100`; both base and scheme ratio checks pass. | consistent | Exact quote: “出齒十八……出齒五十四……出齒三……出齒百” and “其中平輪轉一周，車行一里”. |
| Second reduction and 10-li cadence | The 10:100 stage adds 1:10, so the upper wheel turns once per 1,000 road-wheel turns = 10 li. | `expectedRatios` declares magnitude `1/1000`, and the scheme note states 1,000 road-wheel turns per chime; ratio checks pass. | consistent | Exact quote: “出齒十……上平輪一……出齒百” and “上平輪轉一周，車行十里”. |
| Rotation signs | The quotes determine ratio magnitudes but do not state signed angular directions. | The implementation declares `+1/100` for the middle wheel and `-1/1000` for the upper wheel; report checks only confirm these declared signs. | no textual basis | No supplied `sources[].quote` states rotation direction or signed ratios. |
| Undimensioned gear modules and profiles | The 3-, 10-, and upper 100-tooth wheels have no quoted diameters; no quote gives thickness or tooth profile. | Their modules, thicknesses, and trapezoid profiles are implementation choices labeled `tuice`. | no textual basis | The exact quote supplies only “出齒三”, “出齒十”, and “出齒百” for these wheels. |
| Display and strike geometry | The quotes give no chassis/axle/platform/drawbar/post dimensions, road-wheel spoke count/width, figure size or 0.28-radian arc, drum/chime dimensions, or 0.28 m/0.08 cam lift/dwell. | These values are present and generally labeled `tuice`; range/provenance checks pass but do not make them textual facts. | no textual basis | No supplied `sources[].quote` states these reconstruction dimensions or cam parameters. |
| Scheme attribution | The literal quotes do not state the scheme scholar or year. | `ludaolong.json` assigns Lu Daolong and 1027. | no textual basis | No supplied `sources[].quote` contains “盧道隆/卢道隆” or “1027”. |

## Load-bearing conflicts

- The two source quotes reverse the tier assignment of the 1-li drum and 10-li 鐲; the implementation silently selects the lower-drum/upper-chime reading, places both figures at the same elevation, and the report does not preserve or flag the alternative.
- The quoted four-sided decoration, balustrade, carved arches, phoenix-head form, and four-horse team are absent from the explicit implementation.

## Limitations

This is provisional Codex test evidence and must be replaced by the keyed `pnpm run audit` script. Review was limited to literal `sources[].quote` strings, the final odometer parts/build/scheme, and the deterministic validation report; no extraction artifact was read, and no tests or builds were run. The report contains 260 passes, 0 failures, and 0 warnings, but its snapshot, provenance, range, and declared-ratio checks do not resolve the tier-reading ambiguity.

Counts: 12 consistent, 3 inconsistent, 4 no textual basis. Conflicts: two load-bearing groups listed above; no release claim is made.
