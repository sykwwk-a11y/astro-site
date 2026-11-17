import { createClient, type MicroCMSImage } from 'microcms-js-sdk';

export type NewsEyecatch = {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
};

export type News = {
  id: string;
  title: string;
  content: string;
  category: string[];
  cover?: NewsEyecatch;
  eyecatch?: NewsEyecatch;
  publishedAt?: string;
};

type NewsFields = {
  title?: string;
  content?: string;
  category?: string | string[];
  cover?: MicroCMSImage | string | null;
  eyecatch?: MicroCMSImage | null;
};

const ENDPOINT = 'news';
const PAGE_SIZE = 100;

function requireEnv(name: 'MICROCMS_SERVICE_DOMAIN' | 'MICROCMS_API_KEY'): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`${name} を .env に設定してください。`);
  }
  return value;
}

const client = createClient({
  serviceDomain: requireEnv('MICROCMS_SERVICE_DOMAIN'),
  apiKey: requireEnv('MICROCMS_API_KEY'),
});

function normalizeCategory(category: NewsFields['category']): string[] {
  if (!category) return [];
  const values = Array.isArray(category) ? category : [category];
  return values.map((value) => value.trim()).filter(Boolean);
}

function normalizeImage(image: MicroCMSImage | string | null | undefined): NewsEyecatch | undefined {
  if (!image) return undefined;
  if (typeof image === 'string') {
    return image ? { url: image } : undefined;
  }
  if (!image.url) return undefined;
  return {
    url: image.url,
    width: image.width,
    height: image.height,
    alt: image.alt,
  };
}

function toNews(item: NewsFields & { id: string; publishedAt?: string }): News {
  return {
    id: item.id,
    title: item.title?.trim() || '無題',
    content: item.content ?? '',
    category: normalizeCategory(item.category),
    cover: normalizeImage(item.cover),
    eyecatch: normalizeImage(item.eyecatch),
    publishedAt: item.publishedAt,
  };
}

export async function getNewsList(): Promise<News[]> {
  const items: News[] = [];
  let offset = 0;
  let totalCount = Number.POSITIVE_INFINITY;

  while (offset < totalCount) {
    const response = await client.getList<NewsFields>({
      endpoint: ENDPOINT,
      queries: {
        orders: '-publishedAt',
        limit: PAGE_SIZE,
        offset,
      },
    });

    totalCount = response.totalCount;
    items.push(...response.contents.map(toNews));
    offset += PAGE_SIZE;

    if (response.contents.length === 0) break;
  }

  return items;
}

export async function getNewsDetail(contentId: string): Promise<News> {
  const item = await client.getListDetail<NewsFields>({
    endpoint: ENDPOINT,
    contentId,
  });
  return toNews(item);
}

export function formatNewsDate(iso?: string): string {
  if (!iso) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('year')}/${pick('month')}/${pick('day')} ${pick('hour')}:${pick('minute')}`;
}

export function newsYear(iso?: string): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
  }).format(new Date(iso));
}

export function newsExcerpt(html: string, length = 120): string {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= length) return text;
  return `${text.slice(0, length)}…`;
}
