import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const query = process.argv[2] || "";
const count = await prisma.postalCode.count();
console.log("PostalCode count:", count);
if (query) {
  const code = query.replace(/\D/g, "").slice(0, 5);
  const exact = code.length === 5 ? await prisma.postalCode.findUnique({ where: { code } }) : null;
  const prefix = code ? await prisma.postalCode.findMany({ where: { code: { startsWith: code } }, take: 10, orderBy: [{ code: "asc" }] }) : [];
  const city = await prisma.postalCode.findMany({ where: { city: { contains: query } }, take: 10, orderBy: [{ code: "asc" }] });
  console.log("Query:", query);
  console.log("Exact:", exact);
  console.log("Prefix:", prefix);
  console.log("City:", city);
}
await prisma.$disconnect();
