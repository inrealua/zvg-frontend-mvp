"use client";

export function LogoutButton() {
  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } finally {
      window.location.href = "/?logout=" + Date.now();
    }
  }

  return (
    <button type="button" className="nav-link" onClick={handleLogout}>
      Abmelden
    </button>
  );
}
