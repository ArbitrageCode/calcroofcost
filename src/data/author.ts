// Single Person entity reused across every page's JSON-LD (Article.author +
// the standalone Person node) and about.astro, so the author is consistent
// site-wide instead of redefined per page.
export const AUTHOR = {
  name: 'Marcus Webb',
  jobTitle: 'Roofing Cost Analyst',
  description:
    'Marcus Webb researches residential construction and remodeling costs, with a focus on roofing material pricing and regional labor cost trends across the U.S.',
  path: '/about/',
};
