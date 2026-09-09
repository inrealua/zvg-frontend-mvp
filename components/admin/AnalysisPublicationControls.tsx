"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type PublicationStatus = "IMPORTED" | "REVIEW" | "READY" | "PUBLISHED" | "ARCHIVED";

const statuses: Array<{ value: PublicationStatus; label: string }> = [
  { value: "REVIEW", label: "На проверку" },
  { value: "READY", label: "Готов" },
  { value: "PUBLISHED", label: "Опубликовать" },
  { value: "ARCHIVED", label: "Архив" },
];

export function AnalysisPublicationControls({ propertyId, currentStatus }: { propertyId: string; currentStatus: PublicationStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function changeStatus(status: PublicationStatus) {
    if (status === currentStatus) return;
    if (status === "PUBLISHED" && !window.confirm("Опубликовать этот AI-объект на публичном сайте?")) return;
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/analysis/${propertyId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publicationStatus: status }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.error || "Не удалось изменить статус публикации");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="analysis-admin-controls">
      <div className="analysis-admin-button-row">
        {statuses.map((item) => (
          <button
            type="button"
            key={item.value}
            className={`btn btn-soft ${currentStatus === item.value ? "is-active" : ""}`}
            disabled={pending || currentStatus === item.value}
            onClick={() => changeStatus(item.value)}
          >
            {pending ? "…" : item.label}
          </button>
        ))}
      </div>
      {error ? <small className="analysis-admin-error">{error}</small> : null}
    </div>
  );
}
