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

const CMS_IMAGE_STEPS = [480, 768, 1200, 1600];

function decodeAttr(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function isCmsImage(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith('microcms-assets.io');
  } catch {
    return false;
  }
}

/** microCMSの画像をWebP・表示幅に合わせて取り直す */
export function cmsImageUrl(url: string, width: number): string {
  if (!isCmsImage(url)) return url;
  const parsed = new URL(url);
  parsed.searchParams.set('fm', 'webp');
  parsed.searchParams.set('q', '75');
  parsed.searchParams.set('w', String(width));
  return parsed.toString();
}

export function cmsResponsiveImage(
  image: NewsEyecatch,
  sizes: string,
  maxWidth = 1600,
): { src: string; srcset?: string; sizes?: string; width?: number; height?: number } {
  const cap = Math.min(maxWidth, image.width && image.width > 0 ? image.width : maxWidth);
  const steps = CMS_IMAGE_STEPS.filter((step) => step < cap);
  const widths = [...steps, cap];
  return {
    src: cmsImageUrl(image.url, widths[widths.length - 1]),
    ...(isCmsImage(image.url)
      ? {
          srcset: widths.map((step) => `${cmsImageUrl(image.url, step)} ${step}w`).join(', '),
          sizes,
        }
      : {}),
    ...(image.width ? { width: image.width } : {}),
    ...(image.height ? { height: image.height } : {}),
  };
}

function readAttr(attrs: string, name: string): string | undefined {
  const match = attrs.match(new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match ? decodeAttr(match[2]) : undefined;
}

function upsertAttr(attrs: string, name: string, value: string): string {
  const escaped = escapeAttr(value);
  const pattern = new RegExp(`\\s${name}\\s*=\\s*(["']).*?\\1`, 'i');
  if (pattern.test(attrs)) return attrs.replace(pattern, ` ${name}="${escaped}"`);
  return `${attrs} ${name}="${escaped}"`;
}

/** 本文中の画像に遅延読み込み・寸法の維持・WebP配信を足す */
export function optimizeNewsHtml(html: string): string {
  return html.replace(/<img\b([^>]*?)>/gi, (full, rawAttrs: string) => {
    const src = readAttr(rawAttrs, 'src');
    if (!src) return full;

    let attrs = rawAttrs;
    if (isCmsImage(src)) {
      const declared = Number(readAttr(rawAttrs, 'width'));
      const cap = Math.min(1600, Number.isFinite(declared) && declared > 0 ? declared : 1600);
      const steps = CMS_IMAGE_STEPS.filter((step) => step < cap);
      const widths = [...steps, cap];
      attrs = upsertAttr(attrs, 'src', cmsImageUrl(src, widths[widths.length - 1]));
      if (!readAttr(rawAttrs, 'srcset')) {
        attrs = upsertAttr(
          attrs,
          'srcset',
          widths.map((step) => `${cmsImageUrl(src, step)} ${step}w`).join(', '),
        );
        attrs = upsertAttr(attrs, 'sizes', '(min-width: 48rem) 48rem, 100vw');
      }
    }

    if (!readAttr(rawAttrs, 'loading')) attrs = upsertAttr(attrs, 'loading', 'lazy');
    if (!readAttr(rawAttrs, 'decoding')) attrs = upsertAttr(attrs, 'decoding', 'async');
    return `<img${attrs}>`;
  });
}

export function newsExcerpt(html: string, length = 120): string {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= length) return text;
  return `${text.slice(0, length)}…`;
}
