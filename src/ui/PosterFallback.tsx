import { useTranslation } from "react-i18next";

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
