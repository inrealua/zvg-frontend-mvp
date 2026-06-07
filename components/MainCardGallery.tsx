"use client";

import Image from "next/image";
import { MouseEvent, useMemo, useState } from "react";

type ImageLike = {
  url?: string | null;
  src?: string | null;
  imageUrl?: string | null;
  alt?: string | null;
};

type MainCardGalleryProps = {
  images?: ImageLike[] | string[] | null;
  fallbackSrc?: string | null;
  alt?: string;
  priority?: boolean;
};

function readUrl(item: ImageLike | string | null | undefined): string | null {
  if (!item) return null;
  if (typeof item === "string") return item;
  return item.url || item.src || item.imageUrl || null;
}

export function MainCardGallery({
  images,
  fallbackSrc,
  alt = "",
  priority = false,
}: MainCardGalleryProps) {
  const urls = useMemo(() => {
    const list = Array.isArray(images) ? images.map(readUrl).filter(Boolean) as string[] : [];
    if (fallbackSrc && !list.includes(fallbackSrc)) list.unshift(fallbackSrc);
    return Array.from(new Set(list.filter(Boolean)));
  }, [images, fallbackSrc]);

  const [index, setIndex] = useState(0);
  const src = urls[index] || fallbackSrc || "/placeholder-property.jpg";
  const canSlide = urls.length > 1;

  function move(delta: number, event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIndex((current) => (current + delta + urls.length) % urls.length);
  }

  return (
    <div className="main-card-gallery-v75b">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 900px) 100vw, 33vw"
        priority={priority}
        className="main-card-gallery-image-v75b"
      />

      {canSlide ? (
        <>
          <button type="button" className="main-card-gallery-nav-v75b main-card-gallery-prev-v75b" aria-label="Previous photo" onClick={(event) => move(-1, event)}>
            ‹
          </button>
          <button type="button" className="main-card-gallery-nav-v75b main-card-gallery-next-v75b" aria-label="Next photo" onClick={(event) => move(1, event)}>
            ›
          </button>
          <span className="main-card-gallery-count-v75b">{index + 1}/{urls.length}</span>
        </>
      ) : null}
    </div>
  );
}

export default MainCardGallery;
