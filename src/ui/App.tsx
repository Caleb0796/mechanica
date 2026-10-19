// Explanation: Import the base hook for the protected Chinese and English controls.
// Reason: Temporary translation must never change the original language buttons.
import { useTranslation as useBaseTranslation } from "react-i18next";
// Explanation: Import the explicit temporary translation controls and reset operation.
// Reason: The dropdown and translation lifecycle are independent of the source-language setting.
import TranslationControls from "./i18n/TranslationControls";
// Explanation: Subscribe to the requested target and cancel it from the source-language switch.
// Reason: Chinese and English have the highest priority over every in-flight translation.
import { clearTranslation, getTranslationState, subscribeTranslation } from "../localization/session";
// Explanation: Observe temporary translation changes in the app shell.
// Reason: Document language must follow accepted display content without changing source language.
import { useSyncExternalStore } from "react";
import { Component, type ReactNode, useEffect } from 'react'
// Explanation: Use the translation-aware React hook and original-text resolvers.
// Reason: Apply the explicitly requested target without changing English or Chinese source catalogs.
// import { useTranslation } from 'react-i18next'
// Explanation: Use the translation-aware React hook and original-text resolvers.
// Reason: Apply the explicitly requested target without changing English or Chinese source catalogs.
// Explanation: Import only the translation operations used by this component.
// Reason: Unused helper imports are unnecessary; their previous declarations remain commented out.
// import { useTranslation, localize, localizeSingle } from "./i18n/requestedTranslation";
// Explanation: Import only the translation operations used by this component.
// Reason: Unused helper imports are unnecessary; their previous declarations remain commented out.
import { useTranslation } from "./i18n/requestedTranslation";

import './i18n'
import './styles.css'
import CoverPage from './CoverPage'
import RouterView, { COVER_PATH, useCurrentPath } from './routes'
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
// Explanation: Keep source-language controls on the original i18next hook.
// Reason: Their behavior and labels must take priority over temporary translation.
//   const { i18n, t } = useTranslation()
// Explanation: Keep source-language controls on the original i18next hook.
// Reason: Their behavior and labels must take priority over temporary translation.
  const { i18n, t } = useBaseTranslation()
  const language = useUiStore((state) => state.language)
  const setLanguage = useUiStore((state) => state.setLanguage)

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
  }, [language])

  const chooseLanguage = (nextLanguage: UiLanguage) => {
// Explanation: Cancel every translation and reset the selector before applying Chinese or English.
// Reason: Clicking either original language button overrides all temporary work.
    clearTranslation()
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
  const path = useCurrentPath()
// Explanation: Read the memory-only translation session in the application shell.
// Reason: Language and layout direction must update on every route, including the cover.
  const translation = useSyncExternalStore(subscribeTranslation, getTranslationState, getTranslationState)
// Explanation: Apply the requested target direction independently from the source catalogs.
// Reason: Right-to-left languages require explicit document direction.
  useEffect(() => {
// Explanation: Use the temporary target when present, otherwise the selected original language.
// Reason: Canceling translation must restore the original document language.
    document.documentElement.lang = translation.target || (language === "zh" ? "zh-CN" : "en")
// Explanation: Set document direction for the requested writing system.
// Reason: A language tag alone does not establish right-to-left layout.
    document.documentElement.dir = /^(ar|he|fa|ur|ps|sd|ug|yi|dv)$/.test(translation.target) ? "rtl" : "ltr"
// Explanation: Reapply the document state whenever the active target or original language changes.
// Reason: Source-language selection must reset temporary layout immediately.
  }, [translation.target, language])

  useEffect(() => {
    document.title = t('app.pageTitle')
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t('app.metaDescription'))
  }, [language, t])

// Explanation: Include the language controls on the cover route.
// Reason: The whole program must support the explicit translation request.
//   if (path === COVER_PATH) return <CoverPage />
// Explanation: Include the language controls on the cover route.
// Reason: The whole program must support the explicit translation request.
  if (path === COVER_PATH) return <>
{/* Explanation: Make source-language controls available before entering the museum. */}
{/* Reason: They must override temporary translation on the cover route too. */}
    <div className="cover-language-controls"><LanguageSwitch /><TranslationControls /></div>
{/* Explanation: Preserve the existing cover beneath the shared language controls. */}
{/* Reason: Translation must not remove the original entry page. */}
    <CoverPage />
{/* Explanation: Complete the cover-route layout. */}
{/* Reason: The controls and original cover are returned together. */}
  </>

  return (
    <div className="app-shell">
      <header className="museum-header">
        <a className="brand-link" href="#/museum">
          <span className="brand-mark">{t('app.brand')}</span>
          <span className="brand-subtitle">{t('app.subtitle')}</span>
        </a>
{/* Explanation: Preserve the original source-language control placement. */}
{/* Reason: The controls are now grouped with the temporary language picker. */}
{/* <LanguageSwitch /> */}
{/* Explanation: Retain the protected source-language buttons next to temporary translation controls. */}
{/* Reason: Chinese and English must always remain available and unchanged. */}
        <div className="museum-language-controls"><LanguageSwitch /><TranslationControls /></div>
      </header>
      <LazyRouteErrorBoundary
        key={language}
        message={t('app.versionPublished')}
        reloadLabel={t('app.reload')}
      >
        <RouterView path={path} />
      </LazyRouteErrorBoundary>
    </div>
  )
}
