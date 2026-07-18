import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useTranslation } from "react-i18next";

import { reconstructionRenderAssets } from "../../data/reconstructionRenders";
import type { MachineData } from "../../sim/types";

interface GalleryPanelProps {
  data: MachineData;
}

type DataGalleryImage = MachineData["images"][number];
type GalleryImage = Omit<DataGalleryImage, "license"> & {
  license: DataGalleryImage["license"] | "MIT";
};
type GalleryLayer = "reconstruction" | "classical" | "museum" | "collection";

const GALLERY_LAYERS: GalleryLayer[] = [
  "reconstruction",
  "classical",
  "museum",
  "collection",
];

const COPY = {
  en: {
    authorUnavailable: "Author not supplied in the exhibit data",
    classical: "Classical plates",
    classicalDescription: "Public-domain woodcuts and historical plates.",
    close: "Close lightbox",
    collection: "Collection links",
    collectionDescription: "Museum collection records and related text links.",
    deadLink:
      "If this page is offline or has moved, search the museum collection for the exhibit title shown above.",
    imageUnavailable:
      "The local image is unavailable; use the source link below.",
    lightbox: "Expanded gallery image",
    linkUnavailable:
      "No stable collection URL is available. Search the named museum for this exhibit.",
    museum: "Museum photos",
    museumDescription: "Downloaded museum and reconstruction photographs.",
    original: "Original artifact",
    reconstruction: "Reconstruction renders",
    reconstructionDescription:
      "Project screenshots and generated reconstruction renders.",
    source: "Source",
    viaWikimedia: "via Wikimedia Commons",
    viewImage: "Open image in lightbox",
  },
  zh: {
    authorUnavailable: "展品资料未提供作者",
    classical: "古籍图版",
    classicalDescription: "公版木刻与历史图版。",
    close: "关闭大图",
    collection: "馆藏链接",
    collectionDescription: "博物馆馆藏记录与相关文本链接。",
    deadLink: "如页面离线或已迁移，请在该博物馆馆藏中搜索上方展品名称。",
    imageUnavailable: "本地图像不可用，请使用下方来源链接。",
    lightbox: "画廊大图",
    linkUnavailable: "暂无稳定馆藏网址，请按展品名称在该博物馆检索。",
    museum: "博物馆照片",
    museumDescription: "已下载的博物馆藏品与复原照片。",
    original: "原始文物",
    reconstruction: "复原渲染",
    reconstructionDescription: "项目截图与生成的复原渲染图。",
    source: "来源",
    viaWikimedia: "经 Wikimedia Commons",
    viewImage: "在大图中打开",
  },
} as const;

function localImageUrl(image: GalleryImage): string | undefined {
  const value = image.file ?? image.hotlink;
  return value?.startsWith("public/")
    ? `${import.meta.env.BASE_URL}${value.slice("public/".length)}`
    : value;
}

function reconstructionRenders(
  data: MachineData,
  language: "en" | "zh",
): GalleryImage[] {
  return reconstructionRenderAssets(data.slug).map((render) => ({
    angle: render.label[language],
    attributionText: render.attributionText,
    author: render.author,
    file: render.file,
    license: render.license,
    licenseUrl: render.licenseUrl,
    sourceUrl: `${import.meta.env.BASE_URL}#/m/${data.slug}`,
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

function ImageCaption({
  copy,
  image,
  licenseLabel,
  openLabel,
}: {
  copy: (typeof COPY)[keyof typeof COPY];
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
        <strong>{image.title}</strong> · {image.angle}
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
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage?.startsWith("zh") ? "zh" : "en";
  const copy = COPY[language];
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
  }, [data, language]);

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
  const activeImages = activeLayer === "collection" ? [] : layers[activeLayer];

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

      <div
        aria-labelledby={`gallery-tab-${activeLayer}`}
        data-gallery-panel={activeLayer}
        id={`gallery-panel-${activeLayer}`}
        role="tabpanel"
        tabIndex={0}
      >
        <p className="gallery-layer-description">{descriptions[activeLayer]}</p>

        {activeLayer === "collection" ? (
          layerCounts.collection === 0 ? (
            <p className="panel-empty">{t("gallery.empty")}</p>
          ) : (
            <div className="gallery-grid gallery-collection-grid">
              {data.museums.map((museum) => {
                const name = museum.name[language];
                const exhibit = museum.exhibit[language];
                const city = museum.city[language];
                return (
                  <article
                    className="gallery-item gallery-collection-card"
                    data-collection-status={museum.url ? "linked" : "fallback"}
                    key={`${name}-${exhibit}`}
                  >
                    <h3>{name}</h3>
                    <p>
                      {city} · {exhibit}
                      {museum.isOriginalArtifact ? ` · ${copy.original}` : ""}
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
                        <p className="gallery-link-fallback">{copy.deadLink}</p>
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
                  key={`${image.title}-${image.angle}`}
                >
                  <h3>{image.title}</h3>
                  <p>{image.angle}</p>
                  <a
                    className="panel-link"
                    href={image.sourceUrl}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    {image.title} — {image.angle}
                  </a>
                  <p className="gallery-link-fallback">{copy.deadLink}</p>
                </article>
              ))}
            </div>
          )
        ) : activeImages.length === 0 ? (
          <p className="panel-empty">{t("gallery.empty")}</p>
        ) : (
          <div className="gallery-grid">
            {activeImages.map((image) => {
              const imageUrl = localImageUrl(image);
              return (
                <article
                  className="gallery-item"
                  data-gallery-license={image.license}
                  data-testid="image-credit"
                  key={`${image.title}-${image.angle}`}
                >
                  {imageUrl ? (
                    <button
                      aria-label={`${copy.viewImage}: ${image.title}`}
                      className="gallery-image-button"
                      onClick={() => openLightbox(image)}
                      type="button"
                    >
                      <img alt={image.title} loading="lazy" src={imageUrl} />
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
          style={{
            alignItems: "center",
            background: "rgba(10, 10, 10, 0.88)",
            display: "flex",
            inset: 0,
            justifyContent: "center",
            padding: "2rem",
            position: "fixed",
            zIndex: 1000,
          }}
        >
          <div
            className="gallery-lightbox-content"
            ref={lightboxContent}
            style={{
              maxHeight: "100%",
              maxWidth: "min(92vw, 1100px)",
              overflow: "auto",
            }}
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
              alt={lightboxImage.title}
              src={localImageUrl(lightboxImage)}
              style={{
                maxHeight: "70vh",
                maxWidth: "100%",
                objectFit: "contain",
              }}
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
