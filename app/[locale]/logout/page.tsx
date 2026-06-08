import { notFound } from "next/navigation";
import { LogoutPageStage104 } from "@/components/LogoutPageStage104";

type Locale = "de" | "ru" | "en";

export default async function LocaleLogoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (locale !== "de" && locale !== "ru" && locale !== "en") {
    notFound();
  }

  return <LogoutPageStage104 locale={locale as Locale} />;
}
