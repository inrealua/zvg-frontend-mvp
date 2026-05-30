import Link from "next/link";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {};
  const error = getParam(params, "error");
  const next = getParam(params, "next") || "/cabinet";

  return (
    <main className="auth-page" style={{ minHeight: "calc(100vh - 90px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px", background: "#f3f7f5" }}>
      <section className="auth-card" style={{ width: "100%", maxWidth: "520px", border: "1px solid #cddbd4", borderRadius: "28px", background: "#fff", padding: "32px", boxShadow: "0 24px 80px rgba(24, 59, 47, 0.10)" }}>
        <p style={{ margin: "0 0 12px", color: "#245e4e", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: "13px" }}>
          ZVG DE Konto
        </p>

        <h1 style={{ margin: "0 0 12px", fontSize: "36px", lineHeight: 1.1, color: "#10251f" }}>
          Anmeldung
        </h1>

        <p style={{ margin: "0 0 24px", color: "#64786f", lineHeight: 1.55 }}>
          Melden Sie sich an, um Favoriten und Suchaufträge zu speichern.
        </p>

        {error ? (
          <div style={{ marginBottom: "18px", padding: "12px 14px", borderRadius: "14px", background: "#fff4f1", border: "1px solid #f2c7bd", color: "#8a2d1a", fontWeight: 700 }}>
            E-Mail oder Passwort ist nicht korrekt.
          </div>
        ) : null}

        <GoogleAuthButton href={`/api/auth/google?next=${encodeURIComponent(next)}`} label="Mit Google anmelden" />

        <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "22px 0", color: "#6b7d75", fontSize: "14px" }}>
          <div style={{ flex: 1, height: "1px", background: "#dce6e0" }} />
          <span>oder mit E-Mail</span>
          <div style={{ flex: 1, height: "1px", background: "#dce6e0" }} />
        </div>

        <form action="/api/auth/login" method="post" style={{ display: "grid", gap: "14px" }}>
          <input type="hidden" name="next" value={next} />

          <label style={{ display: "grid", gap: "8px", color: "#17372e", fontWeight: 800 }}>
            E-Mail
            <input name="email" type="email" required autoComplete="email" style={{ minHeight: "52px", borderRadius: "16px", border: "1px solid #cddbd4", padding: "0 16px", fontSize: "16px", background: "#f8fbf9" }} />
          </label>

          <label style={{ display: "grid", gap: "8px", color: "#17372e", fontWeight: 800 }}>
            Passwort
            <input name="password" type="password" required autoComplete="current-password" style={{ minHeight: "52px", borderRadius: "16px", border: "1px solid #cddbd4", padding: "0 16px", fontSize: "16px", background: "#f8fbf9" }} />
          </label>

          <button type="submit" style={{ marginTop: "4px", minHeight: "54px", border: 0, borderRadius: "16px", background: "#245e4e", color: "#fff", fontWeight: 900, fontSize: "17px", cursor: "pointer", boxShadow: "0 12px 26px rgba(36, 94, 78, 0.22)" }}>
            Anmelden
          </button>
        </form>

        <p style={{ margin: "22px 0 0", color: "#64786f" }}>
          Noch kein Konto?{" "}
          <Link href={`/register?next=${encodeURIComponent(next)}`} style={{ color: "#245e4e", fontWeight: 900, textDecoration: "none" }}>
            Registrieren
          </Link>
        </p>
      </section>
    </main>
  );
}
