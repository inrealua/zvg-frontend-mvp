import Link from "next/link";

type SiteLogoProps = {
  className?: string;
  variant?: "header" | "compact" | "stacked" | "icon";
};

export function SiteLogo({ className = "", variant = "header" }: SiteLogoProps) {
  const src =
    variant === "icon"
      ? "/brand/zvg-de-icon.svg"
      : variant === "stacked"
        ? "/brand/zvg-de-logo-stacked.svg"
        : variant === "compact"
          ? "/brand/zvg-de-logo-compact.svg"
          : "/brand/zvg-de-logo-header.svg";

  return (
    <Link href="/" className={`site-logo-zvgde ${className}`.trim()} aria-label="ZVG-DE Startseite">
      <img src={src} alt="ZVG-DE" />
    </Link>
  );
}
