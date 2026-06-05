import { prisma } from "@/lib/prisma";

export async function resolvePostalCodeCenter(input: string) {
  const query = input.trim();
  if (!query) return null;

  const exact = query.match(/^\d{5}$/);
  const prefix = query.match(/^\d{2,4}$/);

  const postalCode = await prisma.postalCode.findFirst({
    where: exact
      ? { code: query }
      : prefix
        ? { code: { startsWith: query } }
        : { city: { contains: query } },
    orderBy: [{ code: "asc" }],
  });

  if (!postalCode) return null;

  return {
    latitude: postalCode.latitude,
    longitude: postalCode.longitude,
    label: `${postalCode.code} ${postalCode.city}`,
  };
}
