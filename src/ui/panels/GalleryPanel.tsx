import { useTranslation } from 'react-i18next'

import type { MachineData } from '../../sim/types'

interface GalleryPanelProps {
  data: MachineData
}

export default function GalleryPanel({ data }: GalleryPanelProps) {
  const { t } = useTranslation()

  return (
    <section className="panel">
      <h2>{t('gallery.title')}</h2>
      {data.images.length === 0 ? (
        <p className="panel-empty">{t('gallery.empty')}</p>
      ) : (
        <div className="gallery-grid">
          {data.images.map((image) => {
            const imageUrl = image.file ?? image.hotlink
            return (
              <article className="gallery-item" key={`${image.title}-${image.angle}`}>
                {imageUrl ? <img alt={image.title} loading="lazy" src={imageUrl} /> : null}
                <p>
                  {image.title} · {image.angle}
                  <br />
                  {t('gallery.license')}:{' '}
                  {image.licenseUrl ? (
                    <a href={image.licenseUrl} rel="noreferrer" target="_blank">
                      {image.license}
                    </a>
                  ) : (
                    image.license
                  )}
                  {image.attributionText ? ` · ${image.attributionText}` : ''}
                </p>
                <a
                  className="panel-link"
                  href={image.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {t('gallery.open')}
                </a>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
