"use client";

import { useEffect } from "react";

function normalizeMarkerText(raw: string) {
  const text = String(raw || "").trim();

  const explicitNumber = text.match(/\d+/)?.[0];
  if (explicitNumber) {
    const count = Number(explicitNumber);
    if (Number.isFinite(count) && count > 0) {
      return `${count} ${count === 1 ? "Termin" : "Termine"}`;
    }
  }

  if (text.length > 0) return "1 Termin";
  return "1 Termin";
}

function fixCalendarMarkers() {
  const calendars = document.querySelectorAll(".auction-calendar");

  calendars.forEach((calendar) => {
    const days = calendar.querySelectorAll<HTMLElement>(".auction-calendar-day");

    days.forEach((day) => {
      const single = day.querySelector<HTMLElement>(".day-event-single");
      const count = day.querySelector<HTMLElement>(".day-event-count");
      const marker = count || single;

      if (!marker) {
        day.removeAttribute("data-stage168i-has-events");
        return;
      }

      const next = normalizeMarkerText(marker.textContent || "");
      marker.textContent = next;
      marker.setAttribute("aria-label", next);
      marker.setAttribute("title", next);
      marker.classList.add("stage168i-calendar-marker");
      day.setAttribute("data-stage168i-has-events", "true");
    });
  });
}

export function Stage168iCalendarTermCountFix() {
  useEffect(() => {
    let raf = 0;

    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fixCalendarMarkers);
    };

    run();

    const observer = new MutationObserver(run);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    window.addEventListener("resize", run);
    window.addEventListener("focus", run);
    window.addEventListener("popstate", run);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", run);
      window.removeEventListener("focus", run);
      window.removeEventListener("popstate", run);
    };
  }, []);

  return null;
}

export default Stage168iCalendarTermCountFix;
