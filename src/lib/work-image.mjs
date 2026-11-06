// Keep uploaded originals intact; microCMS transforms PNG/JPEG only at delivery.
// Existing WebP assets keep their original encoding to avoid recompression.
export function workImageUrl(image, targetWidth) {
  const url = new URL(image.url);
  if (url.protocol !== 'https:' || url.hostname !== 'images.microcms-assets.io'
      || !/\.(?:png|jpe?g)$/i.test(url.pathname)) return image.url;
  if (!Number.isInteger(targetWidth) || targetWidth < 1) throw Error('Invalid image width');
  const width = Number.isInteger(image.width) && image.width > 0
    ? Math.min(targetWidth, image.width) : targetWidth;
  url.searchParams.set('fm', 'webp');
  url.searchParams.set('q', '85');
  url.searchParams.set('w', String(width));
  return url.href;
}
