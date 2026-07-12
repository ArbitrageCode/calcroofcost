// Single Organization entity reused across every page's JSON-LD (Article.author
// + the standalone Organization node) and about.astro, so the publisher
// identity stays consistent site-wide instead of being redefined per page.
export const ORGANIZATION = {
  name: 'CalcRoofCost',
  description:
    'CalcRoofCost builds free, transparent roofing and home-improvement cost calculators, backed by researched, sourced cost data and a published methodology.',
  path: '/',
};
