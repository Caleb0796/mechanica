import { useTranslation } from 'react-i18next'

import type { IKinematicGraph, MachineModule } from '../../sim/types'

interface SchemeSwitcherProps {
  graph: IKinematicGraph
  module: MachineModule
  onChange: (schemeId: string | undefined) => void
  schemeId?: string
}

export default function SchemeSwitcher({
  graph,
  module,
  onChange,
  schemeId,
}: SchemeSwitcherProps) {
  const { i18n, t } = useTranslation()
  const language = i18n.resolvedLanguage === 'en' ? 'en' : 'zh'
  const schemes = Object.values(module.schemes ?? {})

  if (schemes.length === 0) return null

  const chooseScheme = (nextId: string) => {
    const nextScheme = module.schemes?.[nextId]
    graph.setScheme(nextScheme)
    onChange(nextId || undefined)
  }

  const selected = schemeId ? module.schemes?.[schemeId] : undefined

  return (
    <section className="panel">
      <h2>{t('viewer.scheme')}</h2>
      <select
        aria-label={t('viewer.scheme')}
        className="scheme-select"
        onChange={(event) => chooseScheme(event.currentTarget.value)}
        value={schemeId ?? ''}
      >
        <option value="">—</option>
        {schemes.map((scheme) => (
          <option key={scheme.id} value={scheme.id}>
            {scheme.scholar[language]} · {scheme.year}
          </option>
        ))}
      </select>
      <p className="panel-copy">
        {selected?.summary[language] ?? t('viewer.schemeDiff')}
      </p>
    </section>
  )
}
