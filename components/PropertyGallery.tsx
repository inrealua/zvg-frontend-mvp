"use client";

import { useEffect, useMemo, useState } from "react";
import { filterUsablePropertyImages, mediaUrl } from "@/lib/media-selection";

type GalleryImage = {
  id: string;
  url: string;
  alt: string | null;
};

type PropertyGalleryProps = {
  images: GalleryImage[];
  title: string;
};

export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const sortedImages = useMemo(() => images.filter((image) => Boolean(image.url)), [images]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const activeImage = sortedImages[activeIndex];

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
      if (event.key === "ArrowLeft") previousImage();
      if (event.key === "ArrowRight") nextImage();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, activeIndex, sortedImages.length]);

  function previousImage() {
    if (sortedImages.length === 0) return;
    setActiveIndex((current) => (current === 0 ? sortedImages.length - 1 : current - 1));
  }

  function nextImage() {
    if (sortedImages.length === 0) return;
    setActiveIndex((current) => (current + 1) % sortedImages.length);
  }

  if (sortedImages.length === 0) {
    return (
      <div className="gallery-stage">
        <div className="gallery-main gallery-empty">Нет фотографий объекта</div>
      </div>
    );
  }

  return (
    <div className="gallery-stage" id="gallery">
      <div className="gallery-main">
        <img src={activeImage.url} alt={activeImage.alt ?? title} />
        <button type="button" aria-label="Открыть фото" onClick={() => setIsOpen(true)} />
        <span className="gallery-counter">{activeIndex + 1} / {sortedImages.length}</span>
      </div>

      {sortedImages.length > 1 ? (
        <div className="gallery-thumbs" aria-label="Галерея фотографий">
          {sortedImages.map((image, index) => (
            <button
              key={image.id}
              type="button"
              className={index === activeIndex ? "gallery-thumb active" : "gallery-thumb"}
              onClick={() => setActiveIndex(index)}
              aria-label={`Показать фото ${index + 1}`}
            >
              <img src={image.url} alt={image.alt ?? title} />
            </button>
          ))}
        </div>
      ) : null}

      {isOpen ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Просмотр фото">
          <button className="lightbox-close" type="button" onClick={() => setIsOpen(false)} aria-label="Закрыть">×</button>
          {sortedImages.length > 1 ? <button className="lightbox-prev" type="button" onClick={previousImage} aria-label="Предыдущее фото">‹</button> : null}
          <img src={activeImage.url} alt={activeImage.alt ?? title} />
          {sortedImages.length > 1 ? <button className="lightbox-next" type="button" onClick={nextImage} aria-label="Следующее фото">›</button> : null}
        </div>
      ) : null}
    </div>
  );
}
