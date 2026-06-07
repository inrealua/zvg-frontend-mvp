"use client";

import Image from "next/image";
import { MouseEvent, useMemo, useState } from "react";

type ImageLike = {
  url?: string | null;
  src?: string | null;
  imageUrl?: string | null;
  alt?: string | null;
};

type PropertyGalleryImageProps = {
  images?: ImageLike[] | string[] | null;
  fallbackSrc?: string | null;
  alt?: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
};

function getUrl(item: ImageLike | string | null | undefined): string | null {
  if (!item) return null;
  if (typeof item === "string") return item;
  return item.url || item.src || item.imageUrl || null;
}

export function PropertyGalleryImage({
  images,
  fallbackSrc,
  alt = "",
  className = "",
  imageClassName = "",
  sizes = "(max-width: 768px) 100vw, 33vw",
  fill = true,
  width,
  height,
  priority = false,
}: PropertyGalleryImageProps) {
  const urls = useMemo(() => {
    const list = Array.isArray(images) ? images.map(getUrl).filter(Boolean) as string[] : [];
    if (fallbackSrc && !list.includes(fallbackSrc)) list.unshift(fallbackSrc);
    return list.filter(Boolean);
  }, [images, fallbackSrc]);

  const [index, setIndex] = useState(0);
  const src = urls[index] || fallbackSrc || "/placeholder-property.jpg";
  const canSlide = urls.length > 1;

  function go(delta: number, event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIndex((current) => (current + delta + urls.length) % urls.length);
  }

  return (
    <div className={`property-gallery-image-v74 ${className}`}>
      {fill ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={imageClassName} />
      ) : (
        <Image src={src} alt={alt} width={width ?? 640} height={height ?? 420} priority={priority} className={imageClassName} />
      )}

      {canSlide ? (
        <>
          <button type="button" className="gallery-nav-v74 gallery-prev-v74" aria-label="Previous photo" onClick={(event) => go(-1, event)}>
            ‹
          </button>
          <button type="button" className="gallery-nav-v74 gallery-next-v74" aria-label="Next photo" onClick={(event) => go(1, event)}>
            ›
          </button>
          <span className="gallery-count-v74">{index + 1}/{urls.length}</span>
        </>
      ) : null}
    </div>
  );
}

export default PropertyGalleryImage;
