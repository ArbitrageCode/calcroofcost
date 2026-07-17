# Project standing instructions

Simple tasks: no long planning, just do it.
Follow the pasted build spec exactly. Flag any deviation before doing it.
Never hardcode a domain string anywhere; the site URL comes only from
astro.config.mjs `site`, and canonicals derive from Astro.site.
Never use SoftwareApplication schema.
Always use Tailwind CSS v4 syntax and the v4 CSS-first config
(@import "tailwindcss", @theme). Never emit Tailwind v3 syntax or a
tailwind.config.js unless I ask.
Use the astro-docs MCP for current framework docs.
Use the web-design-guidelines and tailwind-4-docs skills whenever
building or reviewing UI or styles.
## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

---
## HARD GATES — these execute. Do not paraphrase or soften.

### Schema
Emit a @graph. NEVER Person, NEVER SoftwareApplication.
- Organization (sitewide, url from Astro.site.href)
- BreadcrumbList (sitewide, from real nav labels)
- Article (page-level, headline/description from real on-page text)
- FAQPage (page-level, from FAQs already visible on the page)
Omit datePublished/dateModified rather than invent a date.

### Canonical
canonical = new URL(Astro.url.pathname, Astro.site).href
Never a hardcoded string.

### Domain-leak gate — CRITICAL — run before EVERY deploy
  npx astro build
  grep -rhoiE "https?://[a-z0-9.-]+\.[a-z]{2,}" dist/ | sed -E 's|(https?://[^/]+).*|\1|' | sort -u
Every domain must be: this project's own domain, a schema/XML namespace,
an analytics endpoint, a font CDN, or a deliberate rate-source citation.
Anything else is a leak. STOP and fix. A hallucinated `site:` in
astro.config surfaces HERE and nowhere in source inspection.

### Deploy gate
This is a direct-upload Pages project (Git Provider: No). The deploy target is set by Cloudflare's deployment history, NOT by `git branch`. Verify with `npx wrangler pages deployment list --project-name=<project>` — use the branch marked Production. For calcroofcost that is `main`.
Pass --branch EXPLICITLY. This repo's production branch is: main
  npx wrangler pages deploy dist --project-name=<project> --branch=main
wrangler "Deployed successfully" is NOT proof. Confirm the live domain:
  curl -s "https://DOMAIN/?cb=$(date +%s)" | grep -c "<string unique to new build>"   # must be >=1

### Sitemap
Astro emits sitemap-index.xml, NOT sitemap.xml. Verify by curl before any GSC submit.
GSC domain property -> submit the full URL.

### curl / DNS verification
`curl -sI | head -1` is unreliable on Cloudflare (Early Hints 103 on line 1). Use:
  curl -sI https://DOMAIN/ | grep -iE "^HTTP/2 [23]"
The dashboard lies; dig and curl do not. Verify MX at the authoritative NS:
  NS=$(dig +short NS DOMAIN | head -1); dig +short MX DOMAIN @$NS
Content greps must use `curl -s --compressed` because Cloudflare serves gzip and plain `curl -s | grep` returns false-negative 0 on compressed bytes.

### Sourcing
A number in a search-result snippet is NOT sourced. Fetch the page and confirm
the figure exists before using it. Every rate constant: 2+ verified published
sources, blend method disclosed on-page, per-figure source-URL comment in the
constants file. Zero real sources -> do NOT invent. Wrong outputs kill lead-gen.

### Cloudflare platform gotchas (browser steps, but flag them)
- www + apex both added as Custom Domains do NOT auto-redirect; both serve 200.
  Needs a manual account-level Bulk Redirect (shared list www_to_apex, one entry
  per domain, 301, preserve path + query).
- AI crawler: Training stays "Block on pages with ads" (default), NEVER "Block"
  ("Block" can block Googlebot). Managed robots.txt OFF.
---
