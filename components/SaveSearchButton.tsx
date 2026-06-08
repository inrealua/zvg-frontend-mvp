"use client";

import { useState, type ReactNode } from "react";

type Locale = "de" | "ru" | "en";

type SaveSearchButtonProps = {
  filtersUrl?: string;
  currentFiltersUrl?: string;
  url?: string;
  summary?: string;
  humanReadableSummary?: string;
  name?: string;
  locale?: Locale;
  className?: string;
  children?: ReactNode;
};

const text = {
  de: {
    save: "Suche speichern",
    saving: "Speichern...",
    saved: "Gespeichert",
    already: "Bereits gespeichert",
    login: "Bitte anmelden",
    error: "Speichern fehlgeschlagen",
  },
  ru: {
    save: "Сохранить поиск",
    saving: "Сохранение...",
    saved: "Сохранено",
    already: "Уже сохранено",
    login: "Войдите в аккаунт",
    error: "Не удалось сохранить",
  },
  en: {
    save: "Save search",
    saving: "Saving...",
    saved: "Saved",
    already: "Already saved",
    login: "Please sign in",
    error: "Could not save",
  },
} as const;

function normalizeLocale(locale?: string): Locale {
  if (locale === "ru" || locale === "en" || locale === "de") return locale;
  if (typeof window !== "undefined") {
    const first = window.location.pathname.split("/").filter(Boolean)[0];
    if (first === "ru" || first === "en" || first === "de") return first;
  }
  return "de";
}

function normalizeFiltersUrl(raw?: string) {
  if (raw && raw.startsWith("/")) return raw.slice(0, 2000);
  if (typeof window !== "undefined") {
    const path = window.location.pathname || "/";
    const query = window.location.search || "";
    return (path + query).slice(0, 2000);
  }
  return "/";
}

export function SaveSearchButton({
  filtersUrl,
  currentFiltersUrl,
  url,
  summary,
  humanReadableSummary,
  name,
  locale,
  className,
  children,
}: SaveSearchButtonProps) {
  const loc = normalizeLocale(locale);
  const t = text[loc];
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "already" | "login" | "error">("idle");

  async function save() {
    if (status === "saving") return;

    setStatus("saving");

    const finalUrl = normalizeFiltersUrl(filtersUrl || currentFiltersUrl || url);
    const finalSummary = (summary || humanReadableSummary || "").trim() || "Alle Objekte";

    try {
      const response = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          filtersUrl: finalUrl,
          summary: finalSummary,
          name: name || undefined,
        }),
      });

      if (response.status === 401) {
        setStatus("login");
        return;
      }

      if (response.status === 409) {
        setStatus("already");
        return;
      }

      if (!response.ok) {
        setStatus("error");
        return;
      }

      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  const label =
    status === "saving" ? t.saving :
    status === "saved" ? t.saved :
    status === "already" ? t.already :
    status === "login" ? t.login :
    status === "error" ? t.error :
    children || t.save;

  return (
    <button
      type="button"
      className={className || "btn btn-primary save-search-button"}
      onClick={save}
      disabled={status === "saving" || status === "saved"}
      aria-live="polite"
    >
      {label}
    </button>
  );
}

export default SaveSearchButton;
