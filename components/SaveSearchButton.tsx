"use client";

import { useState } from "react";

export function SaveSearchButton({ filtersUrl, summary }: { filtersUrl: string; summary: string }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "exists" | "error">("idle");

  async function saveSearch() {
    if (state === "saving") return;
    setState("saving");

    const response = await fetch("/api/saved-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  }

  const label = state === "saving" ? "Сохраняю..." : state === "saved" ? "Поиск сохранён" : state === "exists" ? "Уже сохранён" : state === "error" ? "Ошибка" : "Сохранить поиск";

  return (
    <button type="button" className="btn btn-primary save-search-button" onClick={saveSearch} disabled={state === "saving" || state === "saved" || state === "exists"}>
      {label}
    </button>
  );
}
