/**
 * The address of a local picture resized by Next's image optimiser, for plain <img> tags that
 * cannot be next/image (animated wrappers, fallbacks set on error). A picture under /public is
 * returned at `width` pixels wide (one of the optimiser's sizes) as WebP; anything else, a
 * remote address or a data URI, is returned untouched, since the optimiser only serves hosts
 * named in next.config.
 */
const SIZES = [64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920] as const;

export function optimizedImage(src: string | null | undefined, width: number, quality = 75): string {
  if (!src) return "";
  if (!src.startsWith("/") || src.startsWith("//") || src.startsWith("/_next/") || /\.(svg|gif)(\?|$)/i.test(src)) return src;
  const w = SIZES.find((s) => s >= width) ?? SIZES[SIZES.length - 1];
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${quality}`;
}
