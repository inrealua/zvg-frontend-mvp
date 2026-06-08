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
 * Stage 109B — fix cabinet adjacent JSX.
 *
 * Stage109 inserted:
 *
 * return (
 *   <div className="cabinet-admin-action-wrap-stage109">...</div>
 *   <main ...>
 *
 * JSX cannot return two adjacent root elements without a fragment.
 *
 * This patch wraps the cabinet return content into:
 *
 * return (
 *   <>
 *     <div ... />
 *     <main ...>
 *       ...
 *     </main>
 *   </>
 * );
 */

patch("app/cabinet/page.tsx", (s) => {
  if (!s.includes("cabinet-admin-action-wrap-stage109")) {
    console.log("No Stage109 cabinet admin block found.");
    return s;
  }

  if (s.includes("return (\n    <>") || s.includes("return (\r\n    <>")) {
    console.log("Cabinet return already appears to be wrapped in fragment.");
    return s;
  }

  // Match the exact broken shape: return ( <div className=...>...</div> <main
  const brokenReturnPattern =
    /return\s*\(\s*(<div\s+className=["']cabinet-admin-action-wrap-stage109["'][\s\S]*?<\/div>)\s*(<main\b)/m;

  if (brokenReturnPattern.test(s)) {
    s = s.replace(
      brokenReturnPattern,
      "return (\\n    <>\\n      $1\\n      $2"
    );

    // Close the fragment after </main> for this return block.
    // Prefer the normal page ending.
    s = s.replace(/(\n\s*<\/main>\s*)\n\s*\);/, "$1\\n    </>\\n  );");

    return s;
  }

  // Fallback: if the admin block was inserted immediately before <main without
  // being tied to `return`, still wrap the first return/main pair.
  const firstMain = s.indexOf('<main className="cabinet-page');
  const firstReturn = s.lastIndexOf("return (", firstMain);

  if (firstMain !== -1 && firstReturn !== -1) {
    const beforeReturn = s.slice(0, firstReturn);
    let afterReturn = s.slice(firstReturn);

    afterReturn = afterReturn.replace(/return\s*\(/, "return (\\n    <>");

    if (!afterReturn.includes("</>")) {
      afterReturn = afterReturn.replace(/(\n\s*<\/main>\s*)\n\s*\);/, "$1\\n    </>\\n  );");
    }

    return beforeReturn + afterReturn;
  }

  return s;
});

/**
 * Also make /admin/users page a bit safer for Next 16 async headers/cookies.
 * If this page was created by Stage109, rewrite it with cookies() / headers()
 * awaited. This avoids the next likely TypeScript issue after fixing cabinet JSX.
 */
if (exists("app/admin/users/page.tsx")) {
  const usersPage = `import Link from "next/link";
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
`;

  write("app/admin/users/page.tsx", usersPage);
}

console.log("Stage 109B completed.");
