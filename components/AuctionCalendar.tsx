"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type CalendarEvent = {
  id: string;
  title: string;
  city: string;
  address: string;
  auctionDate: string;
  auctionTime: string | null;
  marketValue: number | null;
  imageUrl: string | null;
  status: string;
};

type AuctionCalendarProps = {
  events: CalendarEvent[];
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonth(date: Date) {
  return date.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

function formatEuro(value: number | null) {
  if (value === null || value === undefined) return "k. A.";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function buildCalendarDays(month: Date) {
  const first = startOfMonth(month);
  const startWeekday = (first.getDay() + 6) % 7; // Montag = 0
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

export function AuctionCalendar({ events }: AuctionCalendarProps) {
  const initialMonth = useMemo(() => {
    const nextEvent = events
      .map((event) => new Date(event.auctionDate))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())[0];

    return startOfMonth(nextEvent || new Date());
  }, [events]);

  const [month, setMonth] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();

    for (const event of events) {
      const date = new Date(event.auctionDate);
      if (Number.isNaN(date.getTime())) continue;

      const key = dateKey(date);
      const list = grouped.get(key) || [];
      list.push(event);
      grouped.set(key, list);
    }

    for (const list of grouped.values()) {
      list.sort((a, b) => (a.auctionTime || "99:99").localeCompare(b.auctionTime || "99:99"));
    }

    return grouped;
  }, [events]);

  const days = buildCalendarDays(month);
  const selectedEvents = selectedDay ? eventsByDay.get(selectedDay) || [] : [];

  if (events.length === 0) {
    return <div className="empty-state compact">Noch keine favorisierten Auktionstermine vorhanden.</div>;
  }

  return (
    <div className="auction-calendar">
      <div className="auction-calendar-toolbar">
        <button type="button" className="btn btn-soft" onClick={() => setMonth(addMonths(month, -1))}>
          Zurück
        </button>
        <h3>{formatMonth(month)}</h3>
        <button type="button" className="btn btn-soft" onClick={() => setMonth(addMonths(month, 1))}>
          Weiter
        </button>
      </div>

      <div className="auction-calendar-grid">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((weekday) => (
          <div className="auction-calendar-weekday" key={weekday}>{weekday}</div>
        ))}

        {days.map((day) => {
          const key = dateKey(day);
          const dayEvents = eventsByDay.get(key) || [];
          const isCurrentMonth = day.getMonth() === month.getMonth();
          const isSelected = selectedDay === key;

          return (
            <button
              type="button"
              key={key}
              className={[
                "auction-calendar-day",
                isCurrentMonth ? "" : "muted",
                dayEvents.length ? "has-events" : "",
                isSelected ? "selected" : "",
              ].join(" ")}
              onClick={() => setSelectedDay(dayEvents.length ? key : null)}
            >
              <span className="day-number">{day.getDate()}</span>
              {dayEvents.length === 1 ? (
                <span className="day-event-single">{dayEvents[0].auctionTime || "Termin"}</span>
              ) : null}
              {dayEvents.length > 1 ? (
                <span className="day-event-count">{dayEvents.length} Auktionen</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="auction-calendar-details">
        {selectedDay && selectedEvents.length > 0 ? (
          <>
            <h3>
              {new Date(selectedDay).toLocaleDateString("de-DE", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </h3>

            <div className="auction-calendar-event-list">
              {selectedEvents.map((event) => (
                <article className="auction-calendar-event" key={event.id}>
                  <Link className="calendar-event-thumb" href={`/properties/${event.id}`}>
                    {event.imageUrl ? <img src={event.imageUrl} alt={event.title} /> : <span>Kein Foto</span>}
                  </Link>
                  <div>
                    <p className="eyebrow">{event.auctionTime || "Zeit k. A."} · {event.city}</p>
                    <h4><Link href={`/properties/${event.id}`}>{event.title}</Link></h4>
                    <p>{event.address}</p>
                    <div className="tag-row">
                      <span>{formatEuro(event.marketValue)}</span>
                      <span>{event.status}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state compact">Klicken Sie auf einen markierten Tag, um die Auktionen anzuzeigen.</div>
        )}
      </div>
    </div>
  );
}
