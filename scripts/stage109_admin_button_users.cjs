const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function full(rel) {
  return path.join(root, rel);
}
function exists(rel) {
  return fs.existsSync(full(rel));
}
function read(rel) {
  return fs.readFileSync(full(rel), "utf8");
}
function write(rel, content) {
  const target = full(rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  console.log("written", rel);
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
 * Stage 109 — Admin button in cabinet + admin users page.
 *
 * Adds:
 * 1) Admin button in cabinet, visible only for role ADMIN.
 * 2) /admin/users page with list of registered users.
 * 3) Link "Benutzer / Пользователи / Users" in admin dashboard if possible.
 *
 * Security:
 * - /admin/users checks current user via getCurrentUserFromRequest()
 * - only ADMIN can view it
 * - non-admin redirected to /login
 */

/* -------------------------------------------------------------------------- */
/* 1. Admin users page                                                         */
/* -------------------------------------------------------------------------- */

write("app/admin/users/page.tsx", `import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/user-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

function makeRequestFromHeaders() {
  /*
    getCurrentUserFromRequest expects NextRequest-like object.
    In a Server Component we do not have the original request instance,
    so we create a minimal Request with current headers/cookies.
  */
  const h = new Headers();
  const incomingHeaders = headers();

  for (const [key, value] of incomingHeaders.entries()) {
    h.set(key, value);
  }

  const cookieStore = cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => \`\${cookie.name}=\${cookie.value}\`)
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
  const user = await getCurrentUserFromRequest(makeRequestFromHeaders() as never);

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
`);

/* -------------------------------------------------------------------------- */
/* 2. Add admin button to cabinet page                                         */
/* -------------------------------------------------------------------------- */

patch("app/cabinet/page.tsx", (s) => {
  if (!s.includes("stage109AdminCabinetLabels")) {
    // Insert helper after dynamic export if possible.
    const helper = `
function stage109AdminCabinetLabels(locale: "de" | "ru" | "en") {
  const labels = {
    de: {
      admin: "Adminbereich",
    },
    ru: {
      admin: "Админка",
    },
    en: {
      admin: "Admin panel",
    },
  } as const;

  return labels[locale] || labels.de;
}
`;

    const dyn = 'export const dynamic = "force-dynamic";';
    if (s.includes(dyn)) {
      s = s.replace(dyn, dyn + "\n" + helper);
    } else {
      s = helper + "\n" + s;
    }
  }

  // Try to add button near existing cabinet header/actions.
  if (!s.includes("cabinet-admin-button-stage109")) {
    const button = `{user.role === "ADMIN" ? (
              <a className="cabinet-admin-button-stage109" href="/admin">
                {stage109AdminCabinetLabels(locale).admin}
              </a>
            ) : null}`;

    // Prefer insertion after a visible profile/account header block, before saved searches.
    if (s.includes("<section") && s.includes("savedSearches")) {
      const idx = s.indexOf("savedSearches");
      const beforeIdx = s.lastIndexOf("<section", idx);
      if (beforeIdx !== -1) {
        s = s.slice(0, beforeIdx) + `
        <div className="cabinet-admin-action-wrap-stage109">
          ${button}
        </div>

        ` + s.slice(beforeIdx);
      } else {
        s = s.replace(/return\s*\(/, `return (
        <div className="cabinet-admin-action-wrap-stage109">
          ${button}
        </div>
        `);
      }
    } else {
      s = s.replace(/return\s*\(/, `return (
        <div className="cabinet-admin-action-wrap-stage109">
          ${button}
        </div>
        `);
    }
  }

  return s;
});

/* -------------------------------------------------------------------------- */
/* 3. Add users link to admin dashboard/page if possible                       */
/* -------------------------------------------------------------------------- */

for (const rel of ["app/admin/page.tsx", "app/admin/dashboard/page.tsx"]) {
  patch(rel, (s) => {
    if (s.includes("/admin/users")) return s;

    if (!s.includes("Link")) {
      s = 'import Link from "next/link";\n' + s;
    }

    const card = `
      <Link href="/admin/users" className="admin-users-link-stage109">
        <strong>Пользователи</strong>
        <span>Просмотр зарегистрированных пользователей и ролей</span>
      </Link>
`;

    // Try adding inside first main/section.
    if (s.includes("</main>")) {
      s = s.replace("</main>", `${card}\n    </main>`);
    } else if (s.includes("</section>")) {
      s = s.replace("</section>", `${card}\n    </section>`);
    }

    return s;
  });
}

/* -------------------------------------------------------------------------- */
/* 4. CSS                                                                      */
/* -------------------------------------------------------------------------- */

patch("app/globals.css", (s) => {
  if (s.includes("/* Stage 109 admin users cabinet button */")) return s;

  return s + `

/* Stage 109 admin users cabinet button */

.cabinet-admin-action-wrap-stage109 {
  width: min(1280px, calc(100% - 48px));
  margin: 18px auto 0;
  display: flex;
  justify-content: flex-end;
}

.cabinet-admin-button-stage109,
.admin-users-link-stage109,
.admin-back-link-stage109 {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid rgba(47, 97, 79, .22);
  background: #2f654f;
  color: #fff;
  font-weight: 800;
  text-decoration: none;
  box-shadow: 0 10px 22px rgba(20,55,41,.12);
}

.cabinet-admin-button-stage109:hover,
.admin-back-link-stage109:hover {
  background: #255640;
}

.admin-users-page-stage109 {
  width: min(1280px, calc(100% - 48px));
  margin: 0 auto;
  padding: 34px 0 54px;
}

.admin-users-header-stage109 {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.admin-users-header-stage109 h1 {
  margin: 0;
  color: #143d31;
  font-size: clamp(30px, 5vw, 48px);
}

.admin-users-header-stage109 p {
  margin: 6px 0 0;
  color: #657085;
}

.admin-eyebrow-stage109 {
  margin: 0 0 6px !important;
  color: #2f654f !important;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.admin-users-card-stage109 {
  border: 1px solid rgba(47, 97, 79, .16);
  border-radius: 24px;
  background: rgba(255,255,255,.94);
  box-shadow: 0 18px 42px rgba(18,45,34,.10);
  overflow: hidden;
}

.admin-users-summary-stage109 {
  padding: 18px 20px;
  display: flex;
  align-items: baseline;
  gap: 10px;
  border-bottom: 1px solid rgba(47,97,79,.12);
}

.admin-users-summary-stage109 strong {
  color: #143d31;
  font-size: 28px;
}

.admin-users-summary-stage109 span {
  color: #657085;
  font-weight: 700;
}

.admin-users-table-wrap-stage109 {
  overflow-x: auto;
}

.admin-users-table-stage109 {
  width: 100%;
  border-collapse: collapse;
  min-width: 880px;
}

.admin-users-table-stage109 th,
.admin-users-table-stage109 td {
  padding: 13px 16px;
  border-bottom: 1px solid rgba(47,97,79,.10);
  text-align: left;
  vertical-align: top;
}

.admin-users-table-stage109 th {
  color: #526381;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: .06em;
}

.admin-users-table-stage109 td {
  color: #1f2937;
  font-weight: 650;
}

.admin-user-email-stage109 {
  display: block;
  font-weight: 900;
  color: #123c30;
}

.admin-users-table-stage109 small {
  display: block;
  margin-top: 4px;
  color: #8090a3;
  font-size: 11px;
}

.admin-role-admin-stage109,
.admin-role-user-stage109 {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
}

.admin-role-admin-stage109 {
  background: rgba(47,101,79,.14);
  color: #194d3a;
}

.admin-role-user-stage109 {
  background: rgba(99,112,133,.12);
  color: #526381;
}

.admin-users-link-stage109 {
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  border-radius: 20px;
  min-height: 82px;
  margin: 18px 0;
  padding: 18px 20px;
  background: rgba(47,101,79,.10);
  color: #123c30;
}

.admin-users-link-stage109 span {
  margin-top: 4px;
  color: #657085;
  font-weight: 650;
}

@media (max-width: 760px) {
  .cabinet-admin-action-wrap-stage109,
  .admin-users-page-stage109 {
    width: min(100% - 24px, 1280px);
  }

  .cabinet-admin-action-wrap-stage109 {
    justify-content: stretch;
  }

  .cabinet-admin-button-stage109 {
    width: 100%;
  }

  .admin-users-header-stage109 {
    display: grid;
  }

  .admin-back-link-stage109 {
    width: 100%;
  }
}
`;
});

console.log("Stage 109 completed.");
