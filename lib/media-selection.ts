type ImageLike = {
  url?: string | null;
  src?: string | null;
  imageUrl?: string | null;
  path?: string | null;
  href?: string | null;
  fileUrl?: string | null;
  alt?: string | null;
};

export function mediaUrl(item: ImageLike | string | null | undefined): string | null {
  if (!item) return null;
  if (typeof item === "string") return item;
  return item.url || item.src || item.imageUrl || item.path || item.href || item.fileUrl || null;
}

export function imageDimensionsFromUrl(url: string | null | undefined) {
  const text = String(url || "");
  const match = text.match(/_(\d{2,5})x(\d{2,5})\.(?:jpe?g|png|webp)(?:\?|$)/i);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { width, height, ratio: width / height };
}

export function isLikelyPdfPageScreenshot(url: string | null | undefined) {
  const dims = imageDimensionsFromUrl(url);
  const text = String(url || "").toLowerCase();

  if (text.includes("1169x1653")) return true;
  if (text.includes("1653x1169")) return false;

  if (!dims) return false;

  // A4 portrait page screenshots from PDF extraction are usually tall,
  // very close to 0.70 ratio and large.
  if (dims.width >= 900 && dims.height >= 1200 && dims.ratio < 0.82) return true;

  return false;
}

export function isLikelyLogoOrServiceGraphic(url: string | null | undefined) {
  const dims = imageDimensionsFromUrl(url);
  const text = String(url || "").toLowerCase();

  if (text.includes("logo") || text.includes("wappen") || text.includes("justiz")) return true;
  if (!dims) return false;

  // Very wide and low images from first PDF page are often headers/logos/maps, not object photos.
  if (dims.width >= 750 && dims.height <= 450 && dims.ratio > 1.75) return true;
  if (dims.width <= 430 && dims.height <= 230) return true;

  return false;
}

export function filterUsablePropertyImages<T extends ImageLike | string>(images: T[] | null | undefined): T[] {
  const list = Array.isArray(images) ? images.filter(Boolean) : [];
  if (list.length <= 1) return list;

  const nonPdfPages = list.filter((item) => !isLikelyPdfPageScreenshot(mediaUrl(item)));
  const source = nonPdfPages.length > 0 ? nonPdfPages : list;

  const withoutGraphics = source.filter((item) => !isLikelyLogoOrServiceGraphic(mediaUrl(item)));

  // If all images look bad, return empty and let caller use placeholder.
  if (withoutGraphics.length === 0 && nonPdfPages.length === 0) return [];
  return withoutGraphics.length > 0 ? withoutGraphics : nonPdfPages;
}

export function selectBestPropertyImage<T extends ImageLike | string>(images: T[] | null | undefined): T | null {
  const usable = filterUsablePropertyImages(images);
  return usable[0] || null;
}
