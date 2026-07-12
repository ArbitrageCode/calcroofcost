import { AUTHOR } from '../data/author';

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

function abs(site: URL | string, path: string): string {
  return new URL(path, site).toString();
}

export function personNode(site: URL | string) {
  return {
    '@type': 'Person',
    '@id': abs(site, `${AUTHOR.path}#person`),
    name: AUTHOR.name,
    jobTitle: AUTHOR.jobTitle,
    description: AUTHOR.description,
    url: abs(site, AUTHOR.path),
  };
}

export function articleNode(
  site: URL | string,
  opts: {
    path: string;
    headline: string;
    description: string;
    datePublished: string;
    dateModified?: string;
  }
) {
  return {
    '@type': 'Article',
    '@id': abs(site, `${opts.path}#article`),
    headline: opts.headline,
    description: opts.description,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    mainEntityOfPage: abs(site, opts.path),
    author: { '@id': abs(site, `${AUTHOR.path}#person`) },
    publisher: {
      '@type': 'Organization',
      name: 'CalcRoofCost.com',
      url: typeof site === 'string' ? site : site.toString(),
    },
  };
}

export function faqNode(faqs: FaqItem[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export function breadcrumbNode(site: URL | string, items: BreadcrumbItem[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: abs(site, item.path),
    })),
  };
}

export function buildGraph(nodes: object[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes,
  };
}
