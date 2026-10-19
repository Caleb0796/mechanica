# Deployment

Mechanica builds to the static `dist/` directory and uses hash routes, so every
machine URL remains rooted at the deployed `index.html`. Run deployment commands
from the repository root after authenticating with the selected host. Do not put
access tokens or API keys in this repository or in a command argument.

## Vercel CLI

The first run may prompt you to sign in and link or create a Vercel project.
`vercel.json` runs the production build, publishes `dist/`, and retains a harmless
SPA fallback for non-hash URLs.

```sh
pnpm dlx vercel@latest --prod
```

Vercel also discovers `api/docent.ts`. The docent stays hidden when its server
environment is not configured. To enable it, set `OPENAI_API_KEY` and either a
supported shared KV/Upstash REST URL and token or the explicit approximate-limit
opt-in in Vercel project settings. Keep those values in the host's encrypted
environment settings, never in Git. See the
[Vercel CLI deploy reference](https://vercel.com/docs/cli/deploy).

## Netlify CLI

The first run may prompt you to sign in and link or create a Netlify site.
Current Netlify CLI releases build before deploying by default; `netlify.toml`
declares `pnpm build`, publishes `dist/`, and provides the SPA fallback.

```sh
pnpm dlx netlify-cli@latest deploy --prod
```

This is a static deployment; it does not deploy the Vercel-format docent
function. See the
[Netlify deploy command reference](https://cli.netlify.com/commands/deploy/).

## GitHub Pages

The command below builds locally, writes a `.nojekyll` file, and publishes
`dist/` to the `gh-pages` branch through the repository's `origin` remote.

```sh
pnpm build && pnpm dlx gh-pages@latest -d dist --nojekyll
```

After the first publish, set the repository's Pages source once to **Deploy from
a branch**, branch **gh-pages**, folder **/(root)**. Later publishes use the same
one-line command. GitHub Pages is static, so the docent must fail gracefully.
See [GitHub's publishing-source guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
and the [`gh-pages` CLI usage](https://github.com/tschaub/gh-pages#command-line-utility).

## Post-deploy smoke checklist

Replace `<SITE_URL>` with the production origin, without a trailing slash.

- [ ] Open `<SITE_URL>/#/m/astroclock`; confirm the astronomical clock heading
      and 3D canvas render.
- [ ] Open `<SITE_URL>/#/m/seismoscope`; confirm the seismoscope heading,
      bearing picker, and 3D canvas render.
- [ ] Open `<SITE_URL>/#/m/odometer`; confirm the odometer heading, localized
      distance readout, and 3D canvas render.
- [ ] Open `<SITE_URL>/#/m/loom`; confirm the pattern loom heading and 3D canvas
      render.
- [ ] On the odometer route, run **Spotlight: decimal distance**; confirm the
      readout advances and finishes at `1.00 li` (or `1.00 里`) with **Demo
      complete** visible.
- [ ] Click **Ask the docent**. With the Vercel backend configured, ask “What
      evidence supports this reconstruction?” and confirm a streamed answer with
      a source citation. On a static-only or unconfigured deployment, confirm the
      docent hides or reports unavailable without breaking the exhibit.
- [ ] During all checks, confirm there are no uncaught errors in the browser
      console and no failed requests for built assets.

<!-- Explanation: Document the temporary translation behavior and deployment configuration. -->
<!-- Reason: Operators need to preserve explicit requests, validation and non-persistence across hosting environments. -->

Temporary translation uses `api/translate.ts`. Configure `OPENAI_API_KEY` on the server; optionally set `TRANSLATION_MODEL` (otherwise `OPENAI_MODEL` or the existing project default) and `TRANSLATION_DAILY_BUDGET`. Vite serves the API locally using server environment settings; Vercel discovers the API route. No keys are exposed as client variables.

<!-- Explanation: Document the temporary translation behavior and deployment configuration. -->
<!-- Reason: Operators need to preserve explicit requests, validation and non-persistence across hosting environments. -->

The language dropdown starts empty. Select a target and press `translate`; selection alone does nothing. Repeating the active target shows `Already translated`. Applying an empty target clears translation. Either 中文 or EN cancels all translation and resets the dropdown immediately.

<!-- Explanation: Document the temporary translation behavior and deployment configuration. -->
<!-- Reason: Operators need to preserve explicit requests, validation and non-persistence across hosting environments. -->

Translation results and validation reports remain in memory only. Reload, a new applied target, an empty applied target, or 中文/EN clears them. API responses use `no-store`, and translation provider calls set `store: false`. No generated language catalogs, browser-storage entries, database translations, or output files are created. External provider retention is governed separately by the provider/account configuration.

<!-- Explanation: Document the temporary translation behavior and deployment configuration. -->
<!-- Reason: Operators need to preserve explicit requests, validation and non-persistence across hosting environments. -->

Every generated target translation receives separate post-generation English and Chinese fidelity checks. Uncertain results retain the original readings with the required uncertainty label. Existing fields with only one original are marked uncertain; the program never invents a second original. Author credits, original quotations, identifiers and licenses remain available unchanged.

<!-- Explanation: Document the temporary translation behavior and deployment configuration. -->
<!-- Reason: Operators need to preserve explicit requests, validation and non-persistence across hosting environments. -->

The request guards are in-memory and approximate across serverless instances. Set provider/project spending limits for deployment-wide cost control. Static hosts need a reachable translation backend; `VITE_TRANSLATION_API_URL` can point at a compatible endpoint when the hosting origin supplies routing/CORS. Do not generate language files as a substitute.

<!-- Explanation: Document the temporary translation behavior and deployment configuration. -->
<!-- Reason: Operators need to preserve explicit requests, validation and non-persistence across hosting environments. -->

Run `node --experimental-strip-types scripts/check-requested-translation.mjs` for dependency-free translation regression checks. Run the existing build and UI checks when project dependencies are installed.

<!-- Explanation: Document safe provider setup errors and their user-facing remedy. -->
<!-- Reason: Exhausted credit or invalid credentials must not be confused with cross-validation disagreement. -->

Translation reports actionable status for API credit, authentication, permissions, model availability and rate limits. Raw provider errors and credentials are never returned to the browser. After restoring provider access, clear the failed session with EN or 中文 before requesting the same target again.

<!-- Explanation: Document compatible source wording and bounded target correction. -->
<!-- Reason: Minor English and Chinese phrasing differences should be accepted without weakening factual checks. -->

Reviews accept minor wording differences when both originals' factual claims are compatible. Fixable target wording receives at most one correction in the selected language, followed by two fresh source reviews and the same protected-content checks. Genuine factual conflicts and unresolved corrections retain bilingual fallback; original catalogs are never rewritten.

### Translation fallback update

Minor source wording, emphasis and nonessential detail differences are acceptable. Failed paired translations receive one target-only correction with reviewer feedback and fresh English/Chinese checks. Unresolved items keep the selected original; the browser shows an accessible notice for 4.5 seconds. Docent fallback uses the same selected-source behavior and signals the notice through `X-Translation-Unavailable`. No runtime translation files are created.
