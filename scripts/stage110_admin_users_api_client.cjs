const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function full(rel) {
  return path.join(root, rel);
}

function write(rel, content) {
  const target = full(rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  console.log("written", rel);
}

function exists(rel) {
  return fs.existsSync(full(rel));
}

function read(rel) {
  return fs.readFileSync(full(rel), "utf8");
}

function patch(rel, fn) {
  if (!exists(rel)) {
    console.log("skip missing", rel);
    return;
  }

  const before = read(rel);
  const after = fn(before);

  if (after !== before) {
    write(rel, after);
    console.log("patched", rel);
  } else {
    console.log("unchanged", rel);
  }
}

/**
 * Stage 110 — fix /admin/users server error.
 *
 * The server error is most likely caused by Stage109 trying to call
 * getCurrentUserFromRequest() from a Server Component with a manually created
 * Request object. That helper expects a real NextRequest with Next cookies.
 *
 * Fix architecture:
 * - /admin/users/page.tsx becomes a simple page rendering a client component.
 * - /api/admin/users checks ADMIN using the real NextRequest.
 * - The client page fetches /api/admin/users.
 *
 * This avoids fake Request objects in Server Components.
 */

/* -------------------------------------------------------------------------- */
/* 1. API route: /api/admin/users                                              */
/* -------------------------------------------------------------------------- */

write("app/api/admin/users/route.ts", `import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/user-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUserFromRequest(request);

  if (!currentUser) {
    return noStoreJson(
      {
        ok: false,
        error: "UNAUTHORIZED",
      },
      {
        status: 401,
      },
    );
  }

  if (currentUser.role !== "ADMIN") {
    return noStoreJson(
      {
        ok: false,
        error: "FORBIDDEN",
      },
      {
        status: 403,
      },
    );
  }

  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          favorites: true,
          savedSearches: true,
        },
      },
    },
  });

  return noStoreJson({
    ok: true,
    users: users.map((user) => ({
      ...user,
      createdAt: user.createdAt ? user.createdAt.toISOString() : null,
      updatedAt: user.updatedAt ? user.updatedAt.toISOString() : null,
    })),
  });
}
`);

/* -------------------------------------------------------------------------- */
/* 2. Client page component                                                    */
/* -------------------------------------------------------------------------- */

write("components/AdminUsersPageClientStage110.tsx", `"use client";

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
`);

/* -------------------------------------------------------------------------- */
/* 3. Replace /admin/users page with simple wrapper                            */
/* -------------------------------------------------------------------------- */

write("app/admin/users/page.tsx", `import { AdminUsersPageClientStage110 } from "@/components/AdminUsersPageClientStage110";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminUsersPage() {
  return <AdminUsersPageClientStage110 />;
}
`);

/* -------------------------------------------------------------------------- */
/* 4. CSS additions                                                            */
/* -------------------------------------------------------------------------- */

patch("app/globals.css", (s) => {
  if (s.includes("/* Stage 110 admin users client */")) return s;

  return s + `

/* Stage 110 admin users client */

.admin-users-message-stage110 {
  padding: 32px;
  text-align: center;
}

.admin-users-message-stage110 h1 {
  margin: 0 0 10px;
  color: #143d31;
}

.admin-users-message-stage110 p {
  margin: 0;
  color: #657085;
}

.admin-users-actions-stage110 {
  margin-top: 18px;
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}
`;
});

console.log("Stage 110 completed.");
