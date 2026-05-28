"use client";

export function GoogleLoginButton({ next = "/cabinet" }: { next?: string }) {
  const href = `/api/auth/google?next=${encodeURIComponent(next)}`;

  return (
    <a className="google-login-button" href={href}>
      <span className="google-login-icon">G</span>
      <span>Mit Google anmelden</span>
    </a>
  );
}
