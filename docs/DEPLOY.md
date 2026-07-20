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
