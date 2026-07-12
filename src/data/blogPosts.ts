// Shared metadata for blog posts, used by the blog index and by each post's
// own frontmatter (schema, related-posts links) so titles/dates/descriptions
// stay in one place instead of being redefined on every page.
export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  datePublished: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'roof-replacement-cost-by-state',
    title: 'Roof Replacement Cost by State (2026)',
    description:
      'How regional labor rates, climate, and permitting shift roof replacement cost across the U.S., and how to use a regional multiplier to plan your budget.',
    datePublished: '2026-07-03',
  },
  {
    slug: 'metal-vs-asphalt-roof-cost-comparison',
    title: 'Metal vs. Asphalt Roof Cost Comparison (2026)',
    description:
      'A side-by-side cost, lifespan, and value comparison between metal and asphalt shingle roofing to help you decide which material fits your budget and timeline.',
    datePublished: '2026-07-03',
  },
  {
    slug: 'signs-you-need-roof-replacement',
    title: '9 Signs You Need a Roof Replacement, Not a Repair',
    description:
      'The warning signs that separate a simple roof repair from a full replacement, from granule loss to daylight through the decking.',
    datePublished: '2026-07-03',
  },
  {
    slug: 'roof-pitch-cost-impact',
    title: 'How Roof Pitch Affects Replacement Cost',
    description:
      'Why steep roofs cost more to replace than low-slope roofs of the same footprint, and how pitch factors into both material quantity and labor pricing.',
    datePublished: '2026-07-03',
  },
  {
    slug: 'roof-repair-vs-replacement',
    title: 'Roof Repair vs. Replacement: How to Decide',
    description:
      'A practical framework for deciding between patching your roof and replacing it, with real cost thresholds and the questions that matter most.',
    datePublished: '2026-07-03',
  },
];

export function getBlogPost(slug: string): BlogPost {
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) throw new Error(`Unknown blog post slug: ${slug}`);
  return post;
}
