"use client";

import { useState } from "react";

export function FavoriteButton({ propertyId, initialIsFavorite = false, compact = false }: { propertyId: string; initialIsFavorite?: boolean; compact?: boolean }) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function toggleFavorite() {
    if (isLoading) return;
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/favorites/${propertyId}`, {
        method: isFavorite ? "DELETE" : "POST",
        credentials: "same-origin",
        cache: "no-store"
      });

      if (response.status === 401) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?next=${next}`;
        return;
      }

      if (response.ok) {
        setIsFavorite(!isFavorite);
      } else {
        setMessage("Не удалось сохранить избранное");
      }
    } catch {
      setMessage("Ошибка соединения");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <span className="favorite-wrap">
      <button
        type="button"
        className={compact ? "favorite-pill compact" : "favorite-pill"}
        onClick={toggleFavorite}
        disabled={isLoading}
        aria-pressed={isFavorite}
      >
        <span>{isFavorite ? "♥" : "♡"}</span>
        {compact ? null : <b>{isFavorite ? "В избранном" : "В избранное"}</b>}
      </button>
      {message ? <small className="favorite-message">{message}</small> : null}
    </span>
  );
}
