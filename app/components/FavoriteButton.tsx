"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type FavoriteButtonProps = {
  propertyId: string;
  initialIsFavorite?: boolean;
  isFavorite?: boolean;
  favorite?: boolean;
  className?: string;
  label?: string;
  showLabel?: boolean;
  [key: string]: unknown;
};

export function FavoriteButton(props: FavoriteButtonProps) {
  const {
    propertyId,
    className,
    label,
    showLabel,
  } = props;

  const initial =
    typeof props.initialIsFavorite === "boolean"
      ? props.initialIsFavorite
      : typeof props.isFavorite === "boolean"
        ? props.isFavorite
        : typeof props.favorite === "boolean"
          ? props.favorite
          : false;

  const [active, setActive] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggleFavorite() {
    const nextActive = !active;
    setActive(nextActive);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/favorites/${propertyId}`, {
          method: nextActive ? "POST" : "DELETE",
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401) {
          setActive(!nextActive);
          window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
          return;
        }

        if (!response.ok) {
          setActive(!nextActive);
          return;
        }

        // Не делаем полный router.refresh() сразу: так сердечко реагирует мгновенно.
        // Лёгкий refresh откладываем, чтобы обновились счётчики/кабинет, но UI не зависал.
        window.setTimeout(() => router.refresh(), 450);
      } catch {
        setActive(!nextActive);
      }
    });
  }

  return (
    <button
      type="button"
      className={[
        className || "favorite-button",
        active ? "is-active" : "",
        isPending ? "is-pending" : "",
      ].join(" ")}
      aria-pressed={active}
      aria-label={active ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
      onClick={toggleFavorite}
      disabled={isPending}
    >
      <span aria-hidden="true">{active ? "♥" : "♡"}</span>
      {showLabel ? <span>{label || (active ? "Favorit" : "Merken")}</span> : null}
    </button>
  );
}
