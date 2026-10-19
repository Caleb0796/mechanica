import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
// Explanation: Use the translation-aware React hook and original-text resolvers.
// Reason: Apply the explicitly requested target without changing English or Chinese source catalogs.
// import { useTranslation } from "react-i18next";
// Explanation: Use the translation-aware React hook and original-text resolvers.
// Reason: Apply the explicitly requested target without changing English or Chinese source catalogs.
import { useTranslation, localize, localizeSingle } from "../i18n/requestedTranslation";

import { reconstructionRenderAssets } from "../../data/reconstructionRenders";
import type { ExhibitData, MachineData } from "../../sim/types";

interface GalleryPanelProps {
  data: ExhibitData;
}

type DataGalleryImage = MachineData["images"][number];
type GalleryImage = Omit<DataGalleryImage, "license"> & {
  license: DataGalleryImage["license"] | "MIT";
// Explanation: Carry existing bilingual labels alongside generated render metadata.
// Reason: Display translation must not lose the original source pair or translate a translation again.
  textSources?: { title: { en: string; zh: string }; angle: { en: string; zh: string } };
};
type GalleryLayer = "reconstruction" | "classical" | "museum" | "collection";

const GALLERY_LAYERS: GalleryLayer[] = [
  "reconstruction",
  "classical",
  "museum",
  "collection",
];

interface GalleryCopy {
  authorUnavailable: string;
  classical: string;
  classicalDescription: string;
  close: string;
  collection: string;
  collectionDescription: string;
  deadLink: string;
  imageUnavailable: string;
  lightbox: string;
  linkUnavailable: string;
  museum: string;
  museumDescription: string;
  original: string;
  reconstruction: string;
  reconstructionDescription: string;
  source: string;
  viaWikimedia: string;
  viewImage: string;
}

function localImageUrl(image: GalleryImage): string | undefined {
  const value = image.file ?? image.hotlink;
  return value?.startsWith("public/")
    ? `${import.meta.env.BASE_URL}${value.slice("public/".length)}`
    : value;
}

function reconstructionRenders(
  data: ExhibitData,
  language: "en" | "zh",
): GalleryImage[] {
  return reconstructionRenderAssets(data.slug).map((render) => ({
    // Explanation: Keep render metadata in its original language until display.
// Reason: Gallery classification and source attribution must not operate on generated text.
// angle: render.label[language],
// Explanation: Keep render metadata in its original language until display.
// Reason: Gallery classification and source attribution must not operate on generated text.
angle: render.label[language],
// Explanation: Retain both original render labels and exhibit names.
// Reason: The display resolver needs bilingual evidence before accepting translated metadata.
    textSources: { title: data.names, angle: render.label },
    attributionText: render.attributionText,
    author: render.author,
    file: render.file,
    license: render.license,
    licenseUrl: render.licenseUrl,
    sourceUrl: `${import.meta.env.BASE_URL}#/m/${data.slug}`,
    // Explanation: Keep the original exhibit title in gallery metadata.
// Reason: Translate only at display so accepted results are not treated as new originals.
// title: data.names[language],
// Explanation: Keep the original exhibit title in gallery metadata.
// Reason: Translate only at display so accepted results are not treated as new originals.
title: data.names[language],
  }));
}

function imageSearchText(image: GalleryImage): string {
  return [image.file, image.title, image.angle, image.attributionText]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isReconstructionRender(image: GalleryImage): boolean {
  return /(?:^|\/)assets\/renders\//.test(image.file ?? "");
}

function isClassicalPlate(image: GalleryImage): boolean {
  return /woodcut|plate|engraving|manuscript|classical|historical diagram|relief|rubbing|diagram|nong shu|農書|农书|木刻|古籍|圖版|图版|古圖|古图|画像石|拓片|示意图|结构图/.test(
    imageSearchText(image),
  );
}

function attributionAuthor(image: GalleryImage, unavailable: string): string {
  if (image.author?.trim()) return image.author.trim();
  const attribution = image.attributionText?.trim();
  if (!attribution) return unavailable;
  const markerIndexes = [
    attribution.indexOf(" · "),
    attribution.indexOf(", CC"),
    attribution.indexOf(", Public domain"),
    attribution.indexOf(" via Wikimedia"),
  ].filter((index) => index > 0);
  return markerIndexes.length > 0
    ? attribution.slice(0, Math.min(...markerIndexes)).trim()
    : attribution;
}

// Explanation: Resolve gallery display text without changing source metadata.
// Reason: Render labels have trusted pairs while external captions may have only one original.
function galleryText(image: GalleryImage, field: "title" | "angle"): string {
// Explanation: Prefer the original paired labels when they exist.
// Reason: Single-language metadata cannot satisfy two-source validation.
  return image.textSources ? localize(image.textSources[field], image[field] === image.textSources[field].zh ? "zh" : "en") : localizeSingle(image[field], /[\p{Script=Han}]/u.test(image[field]) ? "zh" : "en");
// Explanation: Complete the gallery display resolver.
// Reason: Attribution metadata remains unchanged outside the rendered text.
}

function ImageCaption({
  copy,
  image,
  licenseLabel,
  openLabel,
}: {
  copy: GalleryCopy;
  image: GalleryImage;
  licenseLabel: string;
  openLabel: string;
}) {
  const sourceIsWikimedia = /(?:commons\.)?wikimedia\.org/i.test(
    image.sourceUrl,
  );
  const author = attributionAuthor(image, copy.authorUnavailable);

  return (
    <div className="gallery-caption">
      <p>
        <strong>{(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// image.title
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
galleryText(image, "title")
)}</strong> · {(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// image.angle
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
galleryText(image, "angle")
)}
      </p>
      <p className="gallery-attribution">
        {author} · {licenseLabel}:{" "}
        {image.licenseUrl ? (
          <a href={image.licenseUrl} rel="noreferrer noopener" target="_blank">
            {image.license}
          </a>
        ) : (
          image.license
        )}{" "}
        ·{" "}
        <a href={image.sourceUrl} rel="noreferrer noopener" target="_blank">
          {sourceIsWikimedia ? copy.viaWikimedia : copy.source}
        </a>
      </p>
      {image.attributionText ? (
        <p className="gallery-attribution-text">{image.attributionText}</p>
      ) : null}
      <a
        className="panel-link"
        href={image.sourceUrl}
        rel="noreferrer noopener"
        target="_blank"
      >
        {openLabel}
      </a>
    </div>
  );
}

export default function GalleryPanel({ data }: GalleryPanelProps) {
// Explanation: Observe completion of temporary gallery translations.
// Reason: Memoized render metadata must refresh when validation results arrive.
//   const { i18n, t } = useTranslation();
// Explanation: Observe completion of temporary gallery translations.
// Reason: Memoized render metadata must refresh when validation results arrive.
  const { i18n, t, translationRevision } = useTranslation();
  const language = i18n.resolvedLanguage?.startsWith("zh") ? "zh" : "en";
  const copy: GalleryCopy = {
    authorUnavailable: t("gallery.authorUnavailable"),
    classical: t("gallery.classical"),
    classicalDescription: t("gallery.classicalDescription"),
    close: t("gallery.lightboxClose"),
    collection: t("gallery.collection"),
    collectionDescription: t("gallery.collectionDescription"),
    deadLink: t("gallery.deadLink"),
    imageUnavailable: t("gallery.imageUnavailable"),
    lightbox: t("gallery.lightboxTitle"),
    linkUnavailable: t("gallery.linkUnavailable"),
    museum: t("gallery.museum"),
    museumDescription: t("gallery.museumDescription"),
    original: t("gallery.originalArtifact"),
    reconstruction: t("gallery.reconstruction"),
    reconstructionDescription: t("gallery.reconstructionDescription"),
    source: t("gallery.source"),
    viaWikimedia: t("gallery.viaWikimedia"),
    viewImage: t("gallery.viewImage"),
  };
  const [activeLayer, setActiveLayer] =
    useState<GalleryLayer>("reconstruction");
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);
  const lightboxContent = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const previousFocus = useRef<HTMLElement | null>(null);

  const layers = useMemo(() => {
    const displayImages = data.images.filter(
      (image) => image.license !== "linkout",
    );
    const generatedRenders = reconstructionRenders(data, language);
    const generatedFiles = new Set(generatedRenders.map((image) => image.file));
    const reconstruction = [
      ...generatedRenders,
      ...displayImages.filter(
        (image) =>
          isReconstructionRender(image) && !generatedFiles.has(image.file),
      ),
    ];
    const remaining = displayImages.filter(
      (image) => !isReconstructionRender(image),
    );
    const classical = remaining.filter(isClassicalPlate);
    const museum = remaining.filter((image) => !isClassicalPlate(image));
    const linkouts = data.images.filter((image) => image.license === "linkout");

    return { classical, linkouts, museum, reconstruction };
// Explanation: Recompute gallery display metadata after translation validation.
// Reason: The source data identity and original language do not change during temporary translation.
//   }, [data, language]);
// Explanation: Recompute gallery display metadata after translation validation.
// Reason: The source data identity and original language do not change during temporary translation.
  }, [data, language, translationRevision]);

  const layerCounts: Record<GalleryLayer, number> = {
    reconstruction: layers.reconstruction.length,
    classical: layers.classical.length,
    museum: layers.museum.length,
    collection: data.museums.length + layers.linkouts.length,
  };

  useEffect(() => {
    if (!lightboxImage) return;
    const previousOverflow = document.body.style.overflow;
    const handleDialogKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxImage(null);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        lightboxContent.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleDialogKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleDialogKey);
      previousFocus.current?.focus();
    };
  }, [lightboxImage]);

  function openLightbox(image: GalleryImage): void {
    previousFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setLightboxImage(image);
  }

  function selectTab(index: number): void {
    const layer = GALLERY_LAYERS[index];
    setActiveLayer(layer);
    tabRefs.current[index]?.focus();
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % GALLERY_LAYERS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + GALLERY_LAYERS.length) % GALLERY_LAYERS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = GALLERY_LAYERS.length - 1;
    }
    if (nextIndex === undefined) return;
    event.preventDefault();
    selectTab(nextIndex);
  }

  const labels: Record<GalleryLayer, string> = {
    reconstruction: copy.reconstruction,
    classical: copy.classical,
    museum: copy.museum,
    collection: copy.collection,
  };
  const descriptions: Record<GalleryLayer, string> = {
    reconstruction: copy.reconstructionDescription,
    classical: copy.classicalDescription,
    museum: copy.museumDescription,
    collection: copy.collectionDescription,
  };
  return (
    <section className="panel">
      <h2>{t("gallery.title")}</h2>
      <div
        aria-label={t("gallery.title")}
        className="gallery-tabs"
        role="tablist"
      >
        {GALLERY_LAYERS.map((layer, index) => (
          <button
            aria-controls={`gallery-panel-${layer}`}
            aria-selected={activeLayer === layer}
            className="gallery-tab"
            data-gallery-layer={layer}
            data-testid={`tab-${layer}`}
            id={`gallery-tab-${layer}`}
            key={layer}
            onClick={() => setActiveLayer(layer)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            role="tab"
            tabIndex={activeLayer === layer ? 0 : -1}
            type="button"
          >
            {labels[layer]} ({layerCounts[layer]})
          </button>
        ))}
      </div>

      {GALLERY_LAYERS.map((layer) => {
        const images = layer === "collection" ? [] : layers[layer];
        return (
          <div
            aria-labelledby={`gallery-tab-${layer}`}
            data-gallery-panel={layer}
            hidden={activeLayer !== layer}
            id={`gallery-panel-${layer}`}
            key={layer}
            role="tabpanel"
            tabIndex={activeLayer === layer ? 0 : -1}
          >
            <p className="gallery-layer-description">{descriptions[layer]}</p>

            {layer === "collection" ? (
              layerCounts.collection === 0 ? (
                <p className="panel-empty">{t("gallery.empty")}</p>
              ) : (
                <div className="gallery-grid gallery-collection-grid">
                  {data.museums.map((museum) => {
                    const name = (
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// museum.name[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(museum.name, language)
);
                    const exhibit = (
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// museum.exhibit[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(museum.exhibit, language)
);
                    const city = (
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// museum.city[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(museum.city, language)
);
                    return (
                      <article
                        className="gallery-item gallery-collection-card"
                        data-collection-status={
                          museum.url ? "linked" : "fallback"
                        }
                        key={`${name}-${exhibit}`}
                      >
                        <h3>{name}</h3>
                        <p>
                          {city} · {exhibit}
                          {museum.isOriginalArtifact
                            ? ` · ${copy.original}`
                            : ""}
                        </p>
                        {museum.url ? (
                          <>
                            <a
                              className="panel-link"
                              href={museum.url}
                              rel="noreferrer noopener"
                              target="_blank"
                            >
                              {name} — {exhibit}
                            </a>
                            <p className="gallery-link-fallback">
                              {copy.deadLink}
                            </p>
                          </>
                        ) : (
                          <p className="gallery-link-fallback" role="status">
                            {copy.linkUnavailable}
                          </p>
                        )}
                      </article>
                    );
                  })}
                  {layers.linkouts.map((image) => (
                    <article
                      className="gallery-item gallery-collection-card"
                      data-collection-status="linked"
                      key={`${(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// image.title
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
galleryText(image, "title")
)}-${(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// image.angle
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
galleryText(image, "angle")
)}`}
                    >
                      <h3>{(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// image.title
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
galleryText(image, "title")
)}</h3>
                      <p>{(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// image.angle
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
galleryText(image, "angle")
)}</p>
                      <a
                        className="panel-link"
                        href={image.sourceUrl}
                        rel="noreferrer noopener"
                        target="_blank"
                      >
                        {(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// image.title
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
galleryText(image, "title")
)} — {(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// image.angle
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
galleryText(image, "angle")
)}
                      </a>
                      <p className="gallery-link-fallback">{copy.deadLink}</p>
                    </article>
                  ))}
                </div>
              )
            ) : images.length === 0 ? (
              <p className="panel-empty">{t("gallery.empty")}</p>
            ) : (
              <div className="gallery-grid">
                {images.map((image) => {
                  const imageUrl = localImageUrl(image);
                  return (
                    <article
                      className="gallery-item"
                      data-gallery-license={image.license}
                      data-testid="image-credit"
                      key={`${(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// image.title
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
galleryText(image, "title")
)}-${(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// image.angle
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
galleryText(image, "angle")
)}`}
                    >
                      {imageUrl ? (
                        <button
                          aria-label={`${copy.viewImage}: ${(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// image.title
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
galleryText(image, "title")
)}`}
                          className="gallery-image-button"
                          onClick={() => openLightbox(image)}
                          type="button"
                        >
                          <img
                            alt={(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// image.title
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
galleryText(image, "title")
)}
                            loading="lazy"
                            src={imageUrl}
                          />
                        </button>
                      ) : (
                        <p className="panel-empty">{copy.imageUnavailable}</p>
                      )}
                      <ImageCaption
                        copy={copy}
                        image={image}
                        licenseLabel={t("gallery.license")}
                        openLabel={t("gallery.open")}
                      />
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {lightboxImage && localImageUrl(lightboxImage) ? (
        <div
          aria-labelledby="gallery-lightbox-title"
          aria-modal="true"
          className="gallery-lightbox"
          data-testid="gallery-lightbox"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setLightboxImage(null);
          }}
          role="dialog"
        >
          <div
            className="gallery-lightbox-content"
            ref={lightboxContent}
          >
            <button
              aria-label={copy.close}
              autoFocus
              className="gallery-lightbox-close"
              data-testid="gallery-lightbox-close"
              onClick={() => setLightboxImage(null)}
              type="button"
            >
              ×
            </button>
            <h3 id="gallery-lightbox-title">{copy.lightbox}</h3>
            <img
              alt={(
// Explanation: Resolve the expanded image accessibility label through the same gallery text resolver.
// Reason: The lightbox must not retain an untranslated label when the gallery has accepted translated text.
// lightboxImage.title
// Explanation: Resolve the expanded image accessibility label through the same gallery text resolver.
// Reason: The lightbox must not retain an untranslated label when the gallery has accepted translated text.
galleryText(lightboxImage, "title")
)}
              className="gallery-lightbox-image"
              src={localImageUrl(lightboxImage)}
            />
            <ImageCaption
              copy={copy}
              image={lightboxImage}
              licenseLabel={t("gallery.license")}
              openLabel={t("gallery.open")}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
