import Link from "next/link";

type SiteLogoProps = {
  className?: string;
  variant?: "header" | "compact" | "icon";
};

export function SiteLogo({ className = "", variant = "header" }: SiteLogoProps) {
  const src =
    variant === "icon"
      ? "/brand/zvg-de-icon.svg"
      : variant === "compact"
        ? "/brand/zvg-de-logo-compact.svg"
        : "/brand/zvg-de-logo-header.svg";

  return (
    <Link href="/" className={`site-logo-zvgde ${className}`.trim()} aria-label="ZVG-DE Startseite">
      <img src={src} alt="ZVG-DE" />
    </Link>
  );
}
