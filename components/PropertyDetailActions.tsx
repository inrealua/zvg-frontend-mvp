"use client";

import { useState } from "react";

type PropertyDetailActionsProps = {
  title: string;
};

export function PropertyDetailActions({ title }: PropertyDetailActionsProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareObject() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }

    await copyLink();
  }

  return (
    <div className="detail-actions">
      <button type="button" className="action-button" onClick={copyLink}>{copied ? "Ссылка скопирована" : "Скопировать ссылку"}</button>
      <button type="button" className="action-button" onClick={shareObject}>Поделиться</button>
      <button type="button" className="action-button" onClick={() => window.print()}>Печать / PDF</button>
    </div>
  );
}
