import { PrismaClient, Locale } from "@prisma/client";

const prisma = new PrismaClient();

const typeRu = {
  WOHNHAEUSER: "Жилой дом",
  WOHNUNGEN: "Квартира",
  GEWERBE: "Коммерческая недвижимость",
  GRUNDSTUECKE: "Земельный участок",
  LAND_WALD: "Земля / лес",
  GARAGEN: "Гараж / парковка",
  SONSTIGE: "Прочий объект",
};

const typeEn = {
  WOHNHAEUSER: "Residential house",
  WOHNUNGEN: "Apartment",
  GEWERBE: "Commercial property",
  GRUNDSTUECKE: "Land plot",
  LAND_WALD: "Agricultural / forest land",
  GARAGEN: "Garage / parking",
  SONSTIGE: "Other property",
};

const typeDe = {
  WOHNHAEUSER: "Wohnhaus",
  WOHNUNGEN: "Wohnung",
  GEWERBE: "Gewerbeobjekt",
  GRUNDSTUECKE: "Grundstück",
  LAND_WALD: "Land- / Waldfläche",
  GARAGEN: "Garage / Stellplatz",
  SONSTIGE: "Sonstiges Objekt",
};

function formatEuro(value) {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function ruTitle(property) {
  const base = typeRu[property.propertyTypeGroup] || "Объект недвижимости";
  return `${base} в ${property.city}`;
}

function enTitle(property) {
  const base = typeEn[property.propertyTypeGroup] || "Property";
  return `${base} in ${property.city}`;
}

function deTitle(property) {
  return clean(property.title) || `${typeDe[property.propertyTypeGroup] || "Objekt"} in ${property.city}`;
}

function deDescription(property) {
  const parts = [
    clean(property.description) || `Gerichtliche Immobilienauktion in ${property.city}.`,
    `Adresse: ${property.address}.`,
    property.court ? `Gericht: ${property.court}.` : "",
    property.marketValue ? `Verkehrswert: ${formatEuro(property.marketValue)}.` : "",
    property.livingArea ? `Wohnfläche ca. ${property.livingArea} m².` : "",
    property.plotArea ? `Grundstück ca. ${property.plotArea} m².` : "",
  ];

  return parts.filter(Boolean).join(" ");
}

function ruDescription(property) {
  const parts = [
    `Судебный аукцион недвижимости в городе ${property.city}.`,
    `Адрес: ${property.address}.`,
    property.court ? `Суд: ${property.court}.` : "",
    property.marketValue ? `Оценочная стоимость: ${formatEuro(property.marketValue)}.` : "",
    property.livingArea ? `Жилая площадь около ${property.livingArea} м².` : "",
    property.plotArea ? `Площадь участка около ${property.plotArea} м².` : "",
    clean(property.description) ? `Исходное описание: ${clean(property.description)}` : "",
  ];

  return parts.filter(Boolean).join(" ");
}

function enDescription(property) {
  const parts = [
    `Judicial real estate auction in ${property.city}.`,
    `Address: ${property.address}.`,
    property.court ? `Court: ${property.court}.` : "",
    property.marketValue ? `Market value: ${formatEuro(property.marketValue)}.` : "",
    property.livingArea ? `Living area approx. ${property.livingArea} m².` : "",
    property.plotArea ? `Plot size approx. ${property.plotArea} m².` : "",
    clean(property.description) ? `Original description: ${clean(property.description)}` : "",
  ];

  return parts.filter(Boolean).join(" ");
}

function locationRu(property) {
  const parts = [
    `${property.city} расположен(а) в федеральной земле ${property.state}.`,
    property.postalCode ? `Почтовый индекс: ${property.postalCode}.` : "",
    clean(property.locationDescription) || "",
  ];
  return parts.filter(Boolean).join(" ");
}

function locationEn(property) {
  const parts = [
    `${property.city} is located in the federal state of ${property.state}.`,
    property.postalCode ? `Postal code: ${property.postalCode}.` : "",
    clean(property.locationDescription) || "",
  ];
  return parts.filter(Boolean).join(" ");
}

function locationDe(property) {
  return clean(property.locationDescription) || `${property.city}, ${property.state}.`;
}

async function upsertTranslation(property, locale, data) {
  await prisma.propertyTranslation.upsert({
    where: {
      propertyId_locale: {
        propertyId: property.id,
        locale,
      },
    },
    update: data,
    create: {
      propertyId: property.id,
      locale,
      ...data,
    },
  });
}

async function main() {
  const properties = await prisma.property.findMany({
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${properties.length} properties.`);

  let count = 0;

  for (const property of properties) {
    await upsertTranslation(property, Locale.DE, {
      title: deTitle(property),
      propertyType: typeDe[property.propertyTypeGroup] || property.propertyType || null,
      description: deDescription(property),
      locationDescription: locationDe(property),
    });

    await upsertTranslation(property, Locale.RU, {
      title: ruTitle(property),
      propertyType: typeRu[property.propertyTypeGroup] || "Объект недвижимости",
      description: ruDescription(property),
      locationDescription: locationRu(property),
    });

    await upsertTranslation(property, Locale.EN, {
      title: enTitle(property),
      propertyType: typeEn[property.propertyTypeGroup] || "Property",
      description: enDescription(property),
      locationDescription: locationEn(property),
    });

    count += 3;
  }

  console.log(`Created/updated ${count} translations.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
