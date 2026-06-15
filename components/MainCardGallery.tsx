"use client";

import { MouseEvent, useMemo, useState } from "react";
import { filterUsablePropertyImages, mediaUrl } from "@/lib/media-selection";

type ImageLike = {
  url?: string | null;
  src?: string | null;
  imageUrl?: string | null;
  path?: string | null;
  href?: string | null;
  fileUrl?: string | null;
};

type MainCardGalleryProps = {
  images?: ImageLike[] | string[] | null;
  fallbackSrc?: string | null;
  alt?: string;
};

function getUrl(item: ImageLike | string | null | undefined): string | null {
  if (!item) return null;
  if (typeof item === "string") return item;
  return item.url || item.src || item.imageUrl || item.path || item.href || item.fileUrl || null;
}

export function MainCardGallery({ images, fallbackSrc, alt = "" }: MainCardGalleryProps) {
  const urls = useMemo(() => {
    const list = Array.isArray(images) ? (images.map(getUrl).filter(Boolean) as string[]) : [];
    if (fallbackSrc && !list.includes(fallbackSrc)) list.unshift(fallbackSrc);
    return Array.from(new Set(list.filter(Boolean)));
  }, [images, fallbackSrc]);

  const [index, setIndex] = useState(0);
  const src = urls[index] || fallbackSrc || "";

  function move(delta: number, event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!urls.length) return;
    setIndex((current) => (current + delta + urls.length) % urls.length);
  }

  if (!src) {
    return <div className="main-card-gallery-v77 main-card-gallery-empty-v77" aria-label={alt} />;
  }

  return (
    <div className="main-card-gallery-v77">
      <img src={src} alt={alt} className="main-card-gallery-img-v77" loading="lazy" />

      {urls.length > 1 ? (
        <>
          <button type="button" className="main-card-gallery-nav-v77 main-card-gallery-prev-v77" aria-label="Previous photo" onClick={(event) => move(-1, event)}>
            ‹
          </button>
          <button type="button" className="main-card-gallery-nav-v77 main-card-gallery-next-v77" aria-label="Next photo" onClick={(event) => move(1, event)}>
            ›
          </button>
          <span className="main-card-gallery-count-v77">{index + 1}/{urls.length}</span>
        </>
      ) : null}
    </div>
  );
}

export default MainCardGallery;
