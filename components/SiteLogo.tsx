import Link from "next/link";

type SiteLogoProps = {
  className?: string;
  variant?: "horizontal" | "compact";
};

export function SiteLogo({ className = "", variant = "compact" }: SiteLogoProps) {
  const src =
    variant === "horizontal"
      ? "/brand/zvg-de-logo-horizontal.svg"
      : "/brand/zvg-de-logo-compact.svg";

  return (
    <Link href="/" className={`site-logo-new ${className}`.trim()} aria-label="ZVG-DE Startseite">
      <img src={src} alt="ZVG-DE" />
    </Link>
  );
}
