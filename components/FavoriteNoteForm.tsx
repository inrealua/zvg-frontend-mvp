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
        setMessage("Nicht gespeichert");
        return;
      }

      setMessage("Gespeichert");
      window.setTimeout(() => setMessage(""), 1600);
    });
  }

  return (
    <div className="favorite-note-v39">
      <label htmlFor={`favorite-note-${propertyId}`}>Meine Notiz</label>
      <textarea
        id={`favorite-note-${propertyId}`}
        value={note}
        maxLength={2000}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Ihre persönliche Notiz zu diesem Objekt..."
        rows={2}
      />
      <div className="favorite-note-actions-v39">
        <button type="button" className="btn btn-soft compact-btn-v39" onClick={saveNote} disabled={isPending}>
          {isPending ? "Speichern..." : "Speichern"}
        </button>
        {message ? <span className="save-message">{message}</span> : null}
      </div>
    </div>
  );
}
