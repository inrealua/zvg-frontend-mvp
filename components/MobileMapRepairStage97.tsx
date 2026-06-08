"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function repairLeaflet() {
  document.querySelectorAll<HTMLElement>(".leaflet-container").forEach((container) => {
    // Restore tile image sizing in case global CSS touched it.
    container.querySelectorAll<HTMLImageElement>("img.leaflet-tile").forEach((img) => {
      img.style.maxWidth = "none";
      img.style.maxHeight = "none";
      img.style.width = "256px";
      img.style.height = "256px";
    });

    // Trigger Leaflet resize listeners.
    window.dispatchEvent(new Event("resize"));
  });
}

export function MobileMapRepairStage97() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const timers = [100, 300, 700, 1200, 2000].map((ms) => window.setTimeout(repairLeaflet, ms));
    window.addEventListener("orientationchange", repairLeaflet);
    window.addEventListener("resize", repairLeaflet);

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      window.removeEventListener("orientationchange", repairLeaflet);
      window.removeEventListener("resize", repairLeaflet);
    };
  }, [pathname, searchParams?.toString()]);

  return null;
}
