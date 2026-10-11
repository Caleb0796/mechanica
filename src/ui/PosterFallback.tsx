// Explanation: Use the translation-aware React hook and original-text resolvers.
// Reason: Apply the explicitly requested target without changing English or Chinese source catalogs.
// import { useTranslation } from "react-i18next";
// Explanation: Use the translation-aware React hook and original-text resolvers.
// Reason: Apply the explicitly requested target without changing English or Chinese source catalogs.
// Explanation: Import only the translation operations used by this component.
// Reason: Unused helper imports are unnecessary; their previous declarations remain commented out.
// import { useTranslation, localize, localizeSingle } from "./i18n/requestedTranslation";
// Explanation: Import only the translation operations used by this component.
// Reason: Unused helper imports are unnecessary; their previous declarations remain commented out.
import { useTranslation } from "./i18n/requestedTranslation";

export default function PosterFallback({ slug }: { slug: string }) {
  const { t } = useTranslation();
  return (
    <div
      aria-hidden
      className="poster-fallback"
      data-testid={`poster-${slug}`}
    >
      <img alt="" src={`/assets/renders/${slug}/overall.jpg`} />
      <span>{t("app.loading")}</span>
    </div>
  );
}
