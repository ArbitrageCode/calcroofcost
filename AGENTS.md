# Project standing instructions

Simple tasks: no long planning, just do it.
Follow the pasted build spec exactly. Flag any deviation before doing it.
Never hardcode a domain string anywhere; the site URL comes only from
astro.config.mjs `site`, and canonicals derive from Astro.site.
Schema on pages is Article + FAQPage + BreadcrumbList + Person only.
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
