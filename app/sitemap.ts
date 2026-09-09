import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/ueber-uns`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/impressum`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/datenschutz`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 }
  ];

  const properties = await prisma.property.findMany({
    select: { id: true, updatedAt: true, status: true },
    where: { publicationStatus: "PUBLISHED", status: { not: "ARCHIVED" } },
    orderBy: { updatedAt: "desc" },
    take: 5000
  });

  const propertyRoutes: MetadataRoute.Sitemap = properties.map((property) => ({
    url: `${siteUrl}/properties/${property.id}`,
    lastModified: property.updatedAt,
    changeFrequency: property.status === "ACTIVE" ? "daily" : "weekly",
    priority: property.status === "ACTIVE" ? 0.8 : 0.4
  }));

  return [...staticRoutes, ...propertyRoutes];
}
