"use client";

import { useState, useTransition } from "react";

type FavoriteNoteFormProps = {
  propertyId: string;
  initialNote: string;
};

export function FavoriteNoteForm({ propertyId, initialNote }: FavoriteNoteFormProps) {
  const [note, setNote] = useState(initialNote);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function saveNote() {
    startTransition(async () => {
      setMessage("");

      const response = await fetch(`/api/favorites/${propertyId}`, {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note }),
      });

      if (!response.ok) {
        setMessage("Notiz konnte nicht gespeichert werden.");
        return;
      }

      setMessage("Gespeichert");
      window.setTimeout(() => setMessage(""), 1800);
    });
  }

  return (
    <div className="favorite-note">
      <label htmlFor={`favorite-note-${propertyId}`}>Meine Notiz</label>
      <textarea
        id={`favorite-note-${propertyId}`}
        value={note}
        maxLength={2000}
        onChange={(event) => setNote(event.target.value)}
        placeholder="z. B. Gutachten prüfen, maximaler Kaufpreis, Termin mit Handwerker..."
        rows={3}
      />
      <div className="favorite-note-actions">
        <button type="button" className="btn btn-soft" onClick={saveNote} disabled={isPending}>
          {isPending ? "Speichern..." : "Notiz speichern"}
        </button>
        {message ? <span className="save-message">{message}</span> : null}
      </div>
    </div>
  );
}
