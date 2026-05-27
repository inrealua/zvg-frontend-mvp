"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type UserPayload = {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  } | null;
};

export function AuthNav() {
  const [user, setUser] = useState<UserPayload["user"] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-store"
          }
        });

        if (!response.ok) {
          if (!cancelled) {
            setUser(null);
            setLoaded(true);
          }
          return;
        }

        const data = (await response.json()) as UserPayload;
        if (!cancelled) {
          setUser(data.user ?? null);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setLoaded(true);
        }
      }
    }

    loadUser();

    function onFocus() {
      loadUser();
    }

    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (!loaded) {
    return <span className="nav-muted">...</span>;
  }

  if (user) {
    return (
      <>
        <Link href="/cabinet">Кабинет</Link>
        <Link href="/logout">Выйти</Link>
      </>
    );
  }

  return (
    <>
      <Link href="/login">Войти</Link>
      <Link href="/register">Регистрация</Link>
    </>
  );
}
