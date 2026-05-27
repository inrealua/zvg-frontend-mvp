"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteFavoriteButton({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function remove() {
    if (isLoading) return;
    setIsLoading(true);
    const response = await fetch(`/api/favorites/${propertyId}`, { method: "DELETE" });
    if (response.ok) router.refresh();
    setIsLoading(false);
  }

  return <button type="button" className="btn btn-soft danger" onClick={remove} disabled={isLoading}>{isLoading ? "Удаляю..." : "Удалить"}</button>;
}
