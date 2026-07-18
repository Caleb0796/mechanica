import { useTranslation } from 'react-i18next'

import type { MachineModule, Quantity } from '../../sim/types'
import { useUiStore } from '../store'

interface PartInspectorProps {
  module: MachineModule
}

function metricLabel(quantity: Quantity) {
  if (quantity.unit === 'm') return `${quantity.value.toFixed(3)} m`
  if (quantity.unit === 'rad') return `${quantity.value.toFixed(3)} rad`
  return `${quantity.value} ${quantity.unit}`
}

export default function PartInspector({ module }: PartInspectorProps) {
  const { i18n, t } = useTranslation()
  const language = i18n.resolvedLanguage === 'en' ? 'en' : 'zh'
  const selectedPartId = useUiStore((state) => state.selectedPartId)
  const part = module.spec.parts.find((candidate) => candidate.id === selectedPartId)

  if (!part) {
    return (
      <section className="panel" data-testid="part-inspector">
        <h2>{t('inspector.title')}</h2>
        <p className="panel-empty">{t('inspector.empty')}</p>
      </section>
    )
  }

  const source = module.data.sources.find((candidate) => candidate.id === part.provenance.ref)
  const sourceRefs = new Set([
    part.provenance.ref,
    ...Object.values(part.dimensionProvenance).map((provenance) => provenance.ref),
    ...(part.dimensionNotes ?? []).map((quantity) => quantity.provenance.ref),
  ])
  const controversies = module.data.controversies.filter((controversy) =>
    controversy.sourceIds.some((sourceId) => sourceRefs.has(sourceId)),
  )

  return (
    <section className="panel" data-testid="part-inspector">
      <h2>{t('inspector.title')}</h2>
      <h3 className="part-name">
        {part.name[language]}
        <small>{part.name[language === 'zh' ? 'en' : 'zh']}</small>
      </h3>
      <span className="provenance-badge">
        {t(`inspector.${part.provenance.kind}`)} · {part.provenance.ref}
      </span>

      {part.dimensionNotes && part.dimensionNotes.length > 0 ? (
        <dl className="record-list">
          {part.dimensionNotes.map((quantity, index) => (
            <div key={`${quantity.provenance.ref}-${index}`}>
              <dt>{t('inspector.dimensions')}</dt>
              <dd>
                {quantity.ancient ? `${quantity.ancient} · ` : ''}
                {metricLabel(quantity)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {source ? (
        <div>
          <h2>{t('inspector.source')}</h2>
          <p className="panel-copy">{source.quote}</p>
          <a
            className="panel-link"
            href={source.url}
            rel="noreferrer"
            target="_blank"
          >
            {t('inspector.openSource')}
          </a>
        </div>
      ) : null}

      <div>
        <h2>{t('inspector.controversies')}</h2>
        {controversies.length > 0 ? (
          controversies.map((controversy) => (
            <div className="panel-copy" key={controversy.topic.en}>
              <strong>{controversy.topic[language]}</strong>
              <p>{controversy.detail[language]}</p>
            </div>
          ))
        ) : (
          <p className="panel-empty">{t('inspector.noControversies')}</p>
        )}
      </div>
    </section>
  )
}
