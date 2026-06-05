import { prisma } from "@/lib/prisma";

function normalizePostalCode(input: string): string {
  return input.trim().replace(/\D/g, "").slice(0, 5);
}

export async function resolvePostalCodeCenter(input: string) {
  const raw = input.trim();
  if (!raw) return null;

  const code = normalizePostalCode(raw);

  if (code.length >= 2) {
    const exact = code.length === 5
      ? await prisma.postalCode.findUnique({ where: { code } })
      : null;

    if (exact) {
      return {
        latitude: exact.latitude,
        longitude: exact.longitude,
        label: `${exact.code} ${exact.city}`,
      };
    }

    const rows = await prisma.postalCode.findMany({
      where: { code: { startsWith: code } },
      take: 100,
      orderBy: [{ code: "asc" }],
    });

    if (rows.length > 0) {
      const latitude = rows.reduce((sum, row) => sum + row.latitude, 0) / rows.length;
      const longitude = rows.reduce((sum, row) => sum + row.longitude, 0) / rows.length;
      const first = rows[0];
      return { latitude, longitude, label: `${code}* ${first.city}` };
    }
  }

  const byCity = await prisma.postalCode.findMany({
    where: { city: { contains: raw } },
    take: 100,
    orderBy: [{ code: "asc" }],
  });

  if (byCity.length > 0) {
    const latitude = byCity.reduce((sum, row) => sum + row.latitude, 0) / byCity.length;
    const longitude = byCity.reduce((sum, row) => sum + row.longitude, 0) / byCity.length;
    return { latitude, longitude, label: byCity[0].city };
  }

  return null;
}
