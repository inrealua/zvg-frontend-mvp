"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SaveSearchButton({ filtersUrl, summary }: { filtersUrl: string; summary: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "exists" | "error">("idle");

  async function saveSearch() {
    if (state === "saving") return;
    setState("saving");

    try {
      const response = await fetch("/api/saved-searches", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
        },
        body: JSON.stringify({ filtersUrl, summary })
      });

      if (response.status === 401) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?next=${next}`;
        return;
      }

      if (response.status === 409) {
        setState("exists");
        return;
      }

      setState(response.ok ? "saved" : "error");
      if (response.ok) router.refresh();
    } catch {
      setState("error");
    }
  }

  const label =
    state === "saving"
      ? "Сохраняю..."
      : state === "saved"
        ? "Поиск сохранён"
        : state === "exists"
          ? "Уже сохранён"
          : state === "error"
            ? "Ошибка"
            : "Сохранить поиск";

  return (
    <button type="button" className="btn btn-primary save-search-button" onClick={saveSearch} disabled={state === "saving" || state === "saved" || state === "exists"}>
      {label}
    </button>
  );
}
