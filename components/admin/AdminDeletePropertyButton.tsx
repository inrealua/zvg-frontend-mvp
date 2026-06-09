"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminDeletePropertyButtonProps = {
  propertyId: string;
  className?: string;
};

export function AdminDeletePropertyButton({
  propertyId,
  className = "",
}: AdminDeletePropertyButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (loading) return;

    const confirmed = window.confirm("Objekt wirklich löschen?");
    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/admin/properties/${propertyId}`, {
        method: "DELETE",
        cache: "no-store",
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Delete failed");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Objekt konnte nicht gelöscht werden.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className={
        className ||
        "rounded-xl border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {loading ? "Löschen..." : "Löschen"}
    </button>
  );
}
