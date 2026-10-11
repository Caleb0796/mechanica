// Explanation: Use the translation-aware React hook and original-text resolvers.
// Reason: Apply the explicitly requested target without changing English or Chinese source catalogs.
// import { useTranslation } from 'react-i18next'
// Explanation: Use the translation-aware React hook and original-text resolvers.
// Reason: Apply the explicitly requested target without changing English or Chinese source catalogs.
// Explanation: Import only the translation operations used by this component.
// Reason: Unused helper imports are unnecessary; their previous declarations remain commented out.
// import { useTranslation, localize, localizeSingle } from "../i18n/requestedTranslation";
// Explanation: Import only the translation operations used by this component.
// Reason: Unused helper imports are unnecessary; their previous declarations remain commented out.
import { useTranslation } from "../i18n/requestedTranslation";

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
