import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import './i18n'
import './styles.css'
import RouterView from './routes'
import { type UiLanguage, useUiStore } from './store'

function LanguageSwitch() {
  const { i18n, t } = useTranslation()
  const language = useUiStore((state) => state.language)
  const setLanguage = useUiStore((state) => state.setLanguage)

  useEffect(() => {
    void i18n.changeLanguage(language)
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
  }, [i18n, language])

  const chooseLanguage = (nextLanguage: UiLanguage) => {
    setLanguage(nextLanguage)
  }

  return (
    <div aria-label={t('app.language')} className="language-switch" role="group">
      <button
        aria-pressed={language === 'zh'}
        onClick={() => chooseLanguage('zh')}
        type="button"
      >
        中文
      </button>
      <button
        aria-pressed={language === 'en'}
        onClick={() => chooseLanguage('en')}
        type="button"
      >
        EN
      </button>
    </div>
  )
}

export default function App() {
  const { t } = useTranslation()
  const language = useUiStore((state) => state.language)

  useEffect(() => {
    document.title =
      language === 'zh'
        ? '格物机械志 — 中国古代机械数字博物馆'
        : 'Mechanica — A digital museum of Chinese machines'
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        language === 'zh'
          ? '以可验证的数据、三维结构与交互仿真，重访中国机械史。'
          : 'Revisit Chinese mechanical history through sourced data, 3D structure, and interactive simulation.',
      )
  }, [language])

  return (
    <div className="app-shell">
      <header className="museum-header">
        <a className="brand-link" href="#/">
          <span className="brand-mark">{t('app.brand')}</span>
          <span className="brand-subtitle">{t('app.subtitle')}</span>
        </a>
        <LanguageSwitch />
      </header>
      <RouterView />
    </div>
  )
}
