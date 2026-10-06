const MACHINE_NAMES = ["Astronomical Clock", "Seismoscope", "Odometer", "Loom"];

export default function CoverPage() {
  return (
    <div className="cover-page" data-testid="cover-page" lang="en">
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
        <span className="cover-pill">Archived</span>
      </header>

      <main className="cover-main">
        <p className="cover-eyebrow">Thank you</p>
        <h1 className="cover-title">
          Thank you, OpenAI, <br className="cover-break" />
          and everyone who liked Mechanica.
        </h1>

        <div className="cover-columns">
          <section>
            <h2 className="cover-label">Demo video</h2>
            <p>
              Thanks to <span className="cover-name">Yunkun</span>,{" "}
              <span className="cover-name">Olive</span>, and{" "}
              <span className="cover-name">Ian</span> for helping me record
              the demo video and for their notes on it.
            </p>
          </section>
          <section>
            <h2 className="cover-label">Status</h2>
            <p>
              I've stopped working on Mechanica. The site stays up, and the
              machines still run.
            </p>
          </section>
        </div>

        <p className="cover-signature">— Caleb Wei</p>

        <div className="cover-actions">
          <a className="cover-enter" data-testid="cover-enter" href="#/museum">
            Enter the museum
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
          <span className="cover-machines">{MACHINE_NAMES.join(" · ")}</span>
        </div>
      </main>

      <footer className="cover-footer">
        <span>Ancient Machines Reborn</span>
        <span>2026</span>
      </footer>
    </div>
  );
}
