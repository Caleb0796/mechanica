import { useTranslation } from 'react-i18next'

import { useUiStore } from '../store'

export default function ExplodedControl() {
  const { t } = useTranslation()
  const explode = useUiStore((state) => state.explode)
  const setExplode = useUiStore((state) => state.setExplode)

  return (
    <label className="range-control">
      <span>{t('viewer.explode')}</span>
      <input
        aria-label={t('viewer.explode')}
        data-testid="explode-slider"
        max="1"
        min="0"
        onChange={(event) => setExplode(Number(event.currentTarget.value))}
        step="0.01"
        type="range"
        value={explode}
      />
    </label>
  )
}
