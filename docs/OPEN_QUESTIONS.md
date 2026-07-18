# Open Questions and Source Revisions

## Snapshot-driven revisions

- **Astroclock:** corrected the placement of the `七十二`/`三十六` variant-reading annotations in `xyxfy-shulun` and removed the editorial `（受水）` prefix from `xyxfy-action` so the quotations match the fetched *Xinyi Xiangfa Yao* text. No numeric interpretation changed.
- **Chain pump:** changed `施於橋西` to the fetched reading `旋於橋西` in `hhs-bilan` and removed the editorial subject `（馬鈞）` from `sgz-majun-fanche`.
- **Pattern loom:** replaced the English research digest in `kaogu-laoguanshan` with the museum page's Chinese description and measurements. The existing dimension values were unchanged.
- **Gimbal:** replaced the classical-text provenance attached to artifact measurements with three institutional catalog sources. The holding museum records the Hejiacun outer diameter as 4.5 cm rather than the card's 4.6 cm, so the internal value changed from `0.046` m to `0.045` m. The catalog also marks the object as not currently displayed; the exhibit record now says so.

## Unresolved evidence

- **Wooden-ox schemes:** the data card names the wheelbarrow and walker reconstructions but gives no publication years. `MachineData.schemes[].year` is required, so no year has been invented and the scheme metadata remains incomplete pending a citable publication record.
