// Explanation: Use the session-aware hook for temporary cover text.
// Reason: The cover contains original English prose outside the immutable catalogs.
import { useTranslation, localizeSingle } from "./i18n/requestedTranslation";
// Explanation: Read the active target without changing the original cover source.
// Reason: The fixed English attribute must not mislabel a requested target language.
import { getTranslationState } from "../localization/session";
const MACHINE_NAMES = ["Astronomical Clock", "Seismoscope", "Odometer", "Loom"];

export default function CoverPage() {
// Explanation: Subscribe the cover to temporary translation progress.
// Reason: Completed validation must refresh its text without changing any source file.
  useTranslation();
  return (
    <div className="cover-page" data-testid="cover-page" lang={(
// Explanation: Set the cover language from the active temporary session.
// Reason: The original English cover must not override the requested document language.
// "en"
// Explanation: Set the cover language from the active temporary session.
// Reason: The original English cover must not override the requested document language.
getTranslationState().target || "en"
)}>
      <svg
        aria-hidden="true"
        className="cover-astrolabe"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 200 200"
      >
        <circle cx="100" cy="100" r="92" strokeWidth="0.4" />
        <circle cx="100" cy="100" r="78" strokeDasharray="2 2.2" strokeWidth="0.4" />
        <circle cx="100" cy="100" r="60" strokeWidth="0.3" />
        <circle cx="100" cy="100" r="22" strokeWidth="0.4" />
        <circle cx="100" cy="100" r="4" strokeWidth="0.4" />
        <path
          d="M100 8 V192 M8 100 H192 M35 35 L165 165 M165 35 L35 165"
          strokeWidth="0.2"
        />
        <circle cx="146" cy="54" r="14" strokeDasharray="1.4 1.4" strokeWidth="0.35" />
      </svg>

      <header className="cover-header">
        <span className="cover-brand">Mechanica</span>
        <span className="cover-pill">{(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// "Archived"
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localizeSingle("Archived", "en")
)}</span>
      </header>

      <main className="cover-main">
        <p className="cover-eyebrow">{(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// "Thank you"
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localizeSingle("Thank you", "en")
)}</p>
        <h1 className="cover-title">
          {/* Explanation: Preserve the original English cover title. */}
{/* Reason: No authoritative Chinese counterpart exists for bilingual validation. */}
{/* Thank you, OpenAI, <br className="cover-break" />
          and everyone who liked Mechanica. */}
{/* Explanation: Route the complete title through the temporary uncertainty policy. */}
{/* Reason: Fragmented translation would lose the sentence context. */}
          {getTranslationState().target ? localizeSingle("Thank you, OpenAI, and everyone who liked Mechanica.", "en") : <>Thank you, OpenAI, <br className="cover-break" />and everyone who liked Mechanica.</>}
        </h1>

        <div className="cover-columns">
          <section>
            <h2 className="cover-label">{(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// "Demo video"
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localizeSingle("Demo video", "en")
)}</h2>
            <p>
              {/* Explanation: Preserve the original cover paragraph. */}
{/* Reason: Existing source wording must remain available unchanged. */}
{/* Thanks to <span className="cover-name">Yunkun</span>,{" "}
              <span className="cover-name">Olive</span>, and{" "}
              <span className="cover-name">Ian</span> for helping me record
              the demo video and for their notes on it. */}
{/* Explanation: Resolve the complete paragraph through temporary localization. */}
{/* Reason: Missing source pairs must be disclosed instead of invented. */}
              {getTranslationState().target ? localizeSingle("Thanks to Yunkun, Olive, and Ian for helping me record the demo video and for their notes on it.", "en") : <>Thanks to <span className="cover-name">Yunkun</span>, <span className="cover-name">Olive</span>, and <span className="cover-name">Ian</span> for helping me record the demo video and for their notes on it.</>}
            </p>
          </section>
          <section>
            <h2 className="cover-label">{(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// "Status"
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localizeSingle("Status", "en")
)}</h2>
            <p>
              {/* Explanation: Preserve the original cover paragraph. */}
{/* Reason: Existing source wording must remain available unchanged. */}
{/* I've stopped working on Mechanica. The site stays up, and the
              machines still run. */}
{/* Explanation: Resolve the complete paragraph through temporary localization. */}
{/* Reason: Missing source pairs must be disclosed instead of invented. */}
              {localizeSingle("I've stopped working on Mechanica. The site stays up, and the machines still run.", "en")}
            </p>
          </section>
        </div>

        <p className="cover-signature">— Caleb Wei</p>

        <div className="cover-actions">
          <a className="cover-enter" data-testid="cover-enter" href="#/museum">
            {(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// "Enter the museum"
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localizeSingle("Enter the museum", "en")
)}
            <svg
              aria-hidden="true"
              fill="none"
              height="18"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="18"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
          <span className="cover-machines">{(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// MACHINE_NAMES.join(" · ")
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localizeSingle(MACHINE_NAMES.join(" · "), "en")
)}</span>
        </div>
      </main>

      <footer className="cover-footer">
        <span>{(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// "Ancient Machines Reborn"
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localizeSingle("Ancient Machines Reborn", "en")
)}</span>
        <span>2026</span>
      </footer>
    </div>
  );
}
