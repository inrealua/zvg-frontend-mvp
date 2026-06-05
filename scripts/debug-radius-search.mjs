import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const input = process.argv[2] || "09111";
const radiusKm = Number(process.argv[3] || "1000");
const state = process.argv[4] || "";

function normalizePostalCode(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 5);
}

function distanceKm(a, b) {
  const earthRadiusKm = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(x));
}

async function resolveCenter(raw) {
  const code = normalizePostalCode(raw);

  if (code.length === 5) {
    const exact = await prisma.postalCode.findUnique({ where: { code } });
    if (exact) return exact;
  }

  if (code.length >= 2) {
    const rows = await prisma.postalCode.findMany({
      where: { code: { startsWith: code } },
      take: 250,
    });

    if (rows.length) {
      return {
        code: `${code}*`,
        city: rows[0].city,
        latitude: rows.reduce((sum, row) => sum + row.latitude, 0) / rows.length,
        longitude: rows.reduce((sum, row) => sum + row.longitude, 0) / rows.length,
      };
    }
  }

  return null;
}

const count = await prisma.postalCode.count();
console.log("PostalCode count:", count);

const center = await resolveCenter(input);
console.log("Center:", center);

if (center) {
  const props = await prisma.property.findMany({
    where: state ? { state } : {},
    select: {
      id: true,
      title: true,
      city: true,
      postalCode: true,
      state: true,
      latitude: true,
      longitude: true,
    },
    take: 5000,
  });

  const found = props
    .filter((p) => typeof p.latitude === "number" && typeof p.longitude === "number")
    .map((p) => ({
      ...p,
      distanceKm: distanceKm(center, { latitude: p.latitude, longitude: p.longitude }),
    }))
    .filter((p) => p.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  console.log(`Properties in radius ${radiusKm} km${state ? ` and state ${state}` : ""}:`, found.length);
  console.table(found.slice(0, 20).map((p) => ({
    id: p.id,
    city: p.city,
    plz: p.postalCode,
    state: p.state,
    km: Math.round(p.distanceKm),
    title: p.title,
  })));
}

await prisma.$disconnect();
