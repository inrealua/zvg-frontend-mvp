"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string | null;
  updatedAt: string | null;
  _count: {
    favorites: number;
    savedSearches: number;
  };
};

type ApiResponse =
  | {
      ok: true;
      users: AdminUser[];
    }
  | {
      ok: false;
      error: string;
    };

function formatDate(value: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

export function AdminUsersPageClientStage110() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const response = await fetch("/api/admin/users", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const json = (await response.json()) as ApiResponse;

        if (!cancelled) {
          setData(json);
        }
      } catch {
        if (!cancelled) {
          setData({
            ok: false,
            error: "LOAD_FAILED",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const users = useMemo(() => (data?.ok ? data.users : []), [data]);

  if (loading) {
    return (
      <main className="admin-users-page-stage109">
        <section className="admin-users-card-stage109 admin-users-message-stage110">
          <h1>Пользователи</h1>
          <p>Загрузка...</p>
        </section>
      </main>
    );
  }

  if (!data?.ok) {
    const isUnauthorized = data?.error === "UNAUTHORIZED";
    const isForbidden = data?.error === "FORBIDDEN";

    return (
      <main className="admin-users-page-stage109">
        <section className="admin-users-card-stage109 admin-users-message-stage110">
          <h1>Нет доступа</h1>
          <p>
            {isUnauthorized
              ? "Войдите в аккаунт администратора."
              : isForbidden
                ? "Эта страница доступна только пользователю с ролью ADMIN."
                : "Не удалось загрузить список пользователей."}
          </p>

          <div className="admin-users-actions-stage110">
            <Link href="/login" className="admin-back-link-stage109">
              Login
            </Link>
            <Link href="/" className="admin-back-link-stage109">
              На главную
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-users-page-stage109">
      <section className="admin-users-header-stage109">
        <div>
          <p className="admin-eyebrow-stage109">Admin</p>
          <h1>Пользователи</h1>
          <p>Список зарегистрированных пользователей, их роли и активность.</p>
        </div>

        <Link href="/admin" className="admin-back-link-stage109">
          ← Admin
        </Link>
      </section>

      <section className="admin-users-card-stage109">
        <div className="admin-users-summary-stage109">
          <strong>{users.length}</strong>
          <span>пользователей всего</span>
        </div>

        <div className="admin-users-table-wrap-stage109">
          <table className="admin-users-table-stage109">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Favorites</th>
                <th>Saved searches</th>
                <th>Created</th>
                <th>Updated</th>
              </tr>
            </thead>

            <tbody>
              {users.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="admin-user-email-stage109">{item.email}</span>
                    <small>{item.id}</small>
                  </td>
                  <td>{item.name || "—"}</td>
                  <td>
                    <span className={item.role === "ADMIN" ? "admin-role-admin-stage109" : "admin-role-user-stage109"}>
                      {item.role}
                    </span>
                  </td>
                  <td>{item._count.favorites}</td>
                  <td>{item._count.savedSearches}</td>
                  <td>{formatDate(item.createdAt)}</td>
                  <td>{formatDate(item.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
