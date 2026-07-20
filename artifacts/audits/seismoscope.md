# seismoscope provisional Codex audit

- Model: Codex GPT-5.6-sol
- Provisional: true
- Replacement: `pnpm run audit`

## Verdicts

| Item | Text derivation | Implementation/report | Verdict | Evidence |
|---|---|---|---|---|
| Vessel material and diameter | The instrument is cast from refined bronze, round, with diameter 8 chi. | `vessel` is bronze with 0.924 m radius / 1.848 m diameter and preserves “八尺”; provenance checks pass. | consistent | Exact quote: “以精銅鑄成，員徑八尺”. |
| Vessel form, lid, decoration, and concealment | The lid bulges, the body resembles a wine vessel, bears seal-script and mountain/turtle/bird/beast designs, and tightly conceals the mechanism without a seam. | The model has one generic cutaway shell and no lid or decorative parts; its explicit cutaway does not represent the quoted sealed exterior. | inconsistent | Exact quote: “合蓋隆起，形似酒尊，飾以篆文山龜鳥獸之形” and “皆隱在尊中，覆蓋周密無際”. |
| Central duzhu and eight paths | One central duzhu is surrounded by eight paths with latch/trigger machinery. | Each scheme adds exactly one `duzhu` and eight directional tracks/chutes. | consistent | Exact quote: “中有都柱，傍行八道，施關發機。” |
| Duzhu-to-path-to-dragon load path | Motion should pass from the central duzhu through one of eight paths and its latch to the corresponding dragon mechanism. | Base constraints are empty and both schemes only add display parts. `respondToPulse` takes a caller-supplied bearing and directly sets the chosen ball; tracks/chutes never cause or constrain the release. | inconsistent | Exact quote: “中有都柱，傍行八道，施關發機……尊則振龍機發吐丸”. |
| Eight dragon-ball-toad sets | There are 8 external dragons; each head holds a bronze ball, with a mouth-open toad below to receive it. | Base parts contain 8 dragons, 8 bronze balls, and 8 toads in matching directional sets. | consistent | Exact quote: “外有八龍，首銜銅丸，下有蟾蜍，張口承之。” |
| Ball drop into corresponding toad | On activation one dragon releases its ball and the toad below receives it. | Each ball has a downward prismatic drop aligned with its corresponding toad; the Feng scheme releases the selected `ball-*`. | consistent | Exact quote: “龍機發吐丸，而蟾蜍銜之。” |
| Default Wang-scheme response | A quake must activate a dragon and release one ball. | `wangzhenduo` is the default scheme, but the presence of `wang-chute-0` makes every pulse set `duzhu` to 0.02, emit `inert`, and return before any ball release. The report nevertheless passes its scheme/latch check. | inconsistent | Exact quote: “如有地動，尊則振龍機發吐丸”. |
| Audible observer alert | The caught ball produces a loud ringing sound that alerts the observer. | No sound/impact/observer-alert event is emitted; only `releaseBall`, `locked`, or `inert` events exist. | inconsistent | Exact quote: “振聲激揚，伺者因此覺知。” |
| First-event lockout | Exactly one dragon triggers while the other 7 heads remain still. Once one ball has dropped, later bearing pulses must not release another until reset. | In the releasing Feng scheme, `droppedBearing` blocks all subsequent releases; spotlight also emits `locked` for the other 7 dragons. Report latch checks pass. | consistent | Exact quote: “雖一龍發機，而七首不動”. |
| Direction indication | The single activated direction identifies where the earthquake occurred. | Eight indexed bearings select the corresponding dragon/ball set; the spotlight demonstrates the west bearing. | consistent | Exact quote: “尋其方面，乃知震之所在。” |
| Duzhu reconstruction forms | The quote names a duzhu but does not say suspended pendulum or standing inverted pendulum, nor give length, radius, axis, or angular limits. | Feng uses a suspended 2 m duzhu with ±0.2 rad; Wang uses a standing 2 m duzhu with ±0.12 rad. Both correctly label these internals `tuice`. | no textual basis | Exact quote supplies only “中有都柱”. |
| Eight-path reconstruction geometry | The quote gives eight paths but no ball-track/chute form or dimensions. | Feng uses eight 0.38 m ball tracks; Wang uses eight 0.36 m chutes, with scheme-specific widths/heights and positions, all labeled `tuice`. | no textual basis | Exact quote supplies only “傍行八道”. |
| Direction spacing and display motion | The quote does not state cardinal/diagonal labels, equal 45-degree spacing, vessel rotation as input, 0.14/0.02 rad duzhu deflections, or a 0.65 m ball drop. | These values are hard-coded in build/parts and validated only as deterministic ranges/behavior. | no textual basis | No supplied `sources[].quote` states these angles or drop distance. |
| Scheme attributions and display sizes | The quote does not name Feng Rui/Wang Zhenduo or 2005/1951, and gives no dragon, toad, ball, track, or shaft display sizes. | Those attributions and dimensions are scheme/display metadata, generally labeled `tuice`. | no textual basis | No supplied `sources[].quote` states these modern attributions or sizes. |

## Load-bearing conflicts

- The default Wang scheme suppresses every quake response, so it never performs the quoted dragon-trigger/ball-release action despite a passing report check.
- Neither scheme implements the named duzhu → eight-path latch → dragon load path; ball selection is scripted directly from the input bearing.
- The audible ball/toad impact alert is absent.
- The sealed decorated lid/body described by the source is reduced to an undecorated cutaway shell.

## Limitations

This is provisional Codex test evidence and must be replaced by the keyed `pnpm run audit` script. Review was limited to literal `sources[].quote` strings, the final seismoscope parts/build/scheme files, and the deterministic validation report; no extraction artifact was read, and no tests or builds were run. The report contains 388 passes, 0 failures, and 0 warnings, but its snapshot, provenance, range, and scheme/latch checks do not prove the omitted load path or make conjectural scheme geometry textual fact.

Counts: 6 consistent, 4 inconsistent, 4 no textual basis. Conflicts: four load-bearing groups listed above; no release claim is made.
