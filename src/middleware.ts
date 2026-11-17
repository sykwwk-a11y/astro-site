import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware((context, next) => {
  // Cloudflareから渡される国コードを取得
  const runtime = (context.locals as typeof context.locals & {
    runtime?: { cf?: { country?: string } };
  }).runtime;
  const country = runtime?.cf?.country;

  // 日本（JP）以外からのアクセスを拒否（アクセス制限）
  if (country && country !== 'JP') {
    return new Response('Access Denied: Japan only', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  return next();
});