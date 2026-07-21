import { Component, type ReactNode, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import './i18n'
import './styles.css'
import RouterView from './routes'
import { type UiLanguage, useUiStore } from './store'

interface LazyRouteErrorBoundaryProps {
  children: ReactNode
  message: string
  reloadLabel: string
}

interface LazyRouteErrorBoundaryState {
  failed: boolean
}

export class LazyRouteErrorBoundary extends Component<
  LazyRouteErrorBoundaryProps,
  LazyRouteErrorBoundaryState
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="error-page" role="alert">
          <h1>{this.props.message}</h1>
          <button
            className="gold-button"
            onClick={() => window.location.reload()}
            type="button"
          >
            {this.props.reloadLabel}
          </button>
        </main>
      )
    }

    return this.props.children
  }
}

function LanguageSwitch() {
  const { i18n, t } = useTranslation()
  const language = useUiStore((state) => state.language)
  const setLanguage = useUiStore((state) => state.setLanguage)

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
  }, [language])

  const chooseLanguage = (nextLanguage: UiLanguage) => {
    void i18n.changeLanguage(nextLanguage)
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
    document.title = t('app.pageTitle')
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t('app.metaDescription'))
  }, [language, t])

  return (
    <div className="app-shell">
      <header className="museum-header">
        <a className="brand-link" href="#/">
          <span className="brand-mark">{t('app.brand')}</span>
          <span className="brand-subtitle">{t('app.subtitle')}</span>
        </a>
        <LanguageSwitch />
      </header>
      <LazyRouteErrorBoundary
        key={language}
        message={t('app.versionPublished')}
        reloadLabel={t('app.reload')}
      >
        <RouterView />
      </LazyRouteErrorBoundary>
    </div>
  )
}
