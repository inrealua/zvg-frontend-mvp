"use client";

import { useState, useTransition } from "react";

type SavedSearchNameFormProps = {
  searchId: string;
  initialName: string;
  fallbackName: string;
};

export function SavedSearchNameForm({ searchId, initialName, fallbackName }: SavedSearchNameFormProps) {
  const [name, setName] = useState(initialName || fallbackName || "Gespeicherte Suche");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function saveName() {
    startTransition(async () => {
      setMessage("");

      const response = await fetch(`/api/saved-searches/${searchId}`, {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        setMessage("Name konnte nicht gespeichert werden.");
        return;
      }

      setMessage("Gespeichert");
      window.setTimeout(() => setMessage(""), 1800);
    });
  }

  return (
    <div className="saved-search-name-form">
      <label htmlFor={`saved-search-name-${searchId}`}>Suchname</label>
      <div className="saved-search-name-row">
        <input
          id={`saved-search-name-${searchId}`}
          value={name}
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
        />
        <button type="button" className="btn btn-soft" onClick={saveName} disabled={isPending}>
          {isPending ? "..." : "Speichern"}
        </button>
      </div>
      {message ? <span className="save-message">{message}</span> : null}
    </div>
  );
}
