import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/user-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

async function makeRequestFromHeaders() {
  const h = new Headers();
  const incomingHeaders = await headers();

  for (const [key, value] of incomingHeaders.entries()) {
    h.set(key, value);
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  if (cookieHeader) {
    h.set("cookie", cookieHeader);
  }

  return new Request("https://zvg-de.com/admin/users", {
    headers: h,
  });
}

function formatDate(value: Date | string | null | undefined) {
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

export default async function AdminUsersPage() {
  const user = await getCurrentUserFromRequest((await makeRequestFromHeaders()) as never);

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/");
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
