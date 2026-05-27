import { PrismaClient, OccupancyStatus, PropertyStatus, PropertyTypeGroup, DocumentType } from "@prisma/client";

const prisma = new PrismaClient();

type CitySeed = {
  city: string;
  state: string;
  postalCode: string;
  court: string;
  lat: number;
  lon: number;
};

const cities: CitySeed[] = [
  { city: "Chemnitz", state: "Sachsen", postalCode: "09111", court: "Amtsgericht Chemnitz", lat: 50.8323, lon: 12.9253 },
  { city: "Dresden", state: "Sachsen", postalCode: "01067", court: "Amtsgericht Dresden", lat: 51.0504, lon: 13.7373 },
  { city: "Leipzig", state: "Sachsen", postalCode: "04109", court: "Amtsgericht Leipzig", lat: 51.3397, lon: 12.3731 },
  { city: "Zwickau", state: "Sachsen", postalCode: "08056", court: "Amtsgericht Zwickau", lat: 50.7189, lon: 12.4961 },
  { city: "Glauchau", state: "Sachsen", postalCode: "08371", court: "Amtsgericht Zwickau", lat: 50.8199, lon: 12.5449 },
  { city: "Gera", state: "Thüringen", postalCode: "07545", court: "Amtsgericht Gera", lat: 50.8772, lon: 12.0796 },
  { city: "Jena", state: "Thüringen", postalCode: "07743", court: "Amtsgericht Jena", lat: 50.9271, lon: 11.5892 },
  { city: "Erfurt", state: "Thüringen", postalCode: "99084", court: "Amtsgericht Erfurt", lat: 50.9848, lon: 11.0299 },
  { city: "Halle", state: "Sachsen-Anhalt", postalCode: "06108", court: "Amtsgericht Halle", lat: 51.4828, lon: 11.9699 },
  { city: "Magdeburg", state: "Sachsen-Anhalt", postalCode: "39104", court: "Amtsgericht Magdeburg", lat: 52.1205, lon: 11.6276 },
  { city: "Cottbus", state: "Brandenburg", postalCode: "03046", court: "Amtsgericht Cottbus", lat: 51.7563, lon: 14.3329 },
  { city: "Potsdam", state: "Brandenburg", postalCode: "14467", court: "Amtsgericht Potsdam", lat: 52.3906, lon: 13.0645 },
  { city: "Berlin", state: "Berlin", postalCode: "10115", court: "Amtsgericht Mitte", lat: 52.5200, lon: 13.4050 },
  { city: "Nürnberg", state: "Bayern", postalCode: "90402", court: "Amtsgericht Nürnberg", lat: 49.4521, lon: 11.0767 },
  { city: "Kassel", state: "Hessen", postalCode: "34117", court: "Amtsgericht Kassel", lat: 51.3127, lon: 9.4797 }
];

const types = [
  { group: PropertyTypeGroup.WOHNHAEUSER, type: "Einfamilienhaus", title: "Einfamilienhaus mit Grundstück" },
  { group: PropertyTypeGroup.WOHNHAEUSER, type: "Doppelhaushälfte", title: "Doppelhaushälfte in Wohnlage" },
  { group: PropertyTypeGroup.WOHNHAEUSER, type: "Mehrfamilienhaus", title: "Mehrfamilienhaus mit Sanierungsbedarf" },
  { group: PropertyTypeGroup.WOHNUNGEN, type: "Eigentumswohnung", title: "Eigentumswohnung im Mehrfamilienhaus" },
  { group: PropertyTypeGroup.WOHNUNGEN, type: "Eigentumswohnung 3 Zimmer", title: "3-Zimmer-Eigentumswohnung" },
  { group: PropertyTypeGroup.GEWERBE, type: "Wohn- und Geschäftshaus", title: "Wohn- und Geschäftshaus" },
  { group: PropertyTypeGroup.GEWERBE, type: "Lagerhalle", title: "Gewerbeobjekt mit Lagerfläche" },
  { group: PropertyTypeGroup.GRUNDSTUECKE, type: "unbebautes Grundstück", title: "Unbebautes Grundstück" },
  { group: PropertyTypeGroup.LAND_WALD, type: "Waldfläche", title: "Wald- und Landwirtschaftsfläche" },
  { group: PropertyTypeGroup.GARAGEN, type: "Garage", title: "Garage / Stellplatz" },
  { group: PropertyTypeGroup.SONSTIGE, type: "Teileigentum", title: "Teileigentum / Sonderobjekt" }
];

const streets = [
  "Hauptstraße", "Bahnhofstraße", "Schulstraße", "Gartenweg", "Dorfstraße", "Lindenstraße", "Bergstraße", "Parkstraße", "Mühlenweg", "August-Bebel-Straße"
];

function normalizeAktenzeichen(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pick<T>(items: T[], index: number): T {
  return items[index % items.length];
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function main() {
  console.log("Deleting old seed data...");
  await prisma.propertyDocument.deleteMany();
  await prisma.propertyImage.deleteMany();
  await prisma.property.deleteMany();

  console.log("Creating 50 test properties...");
  const today = new Date();

  for (let i = 1; i <= 50; i++) {
    const city = pick(cities, i - 1);
    const type = pick(types, i - 1);
    const street = pick(streets, i - 1);
    const houseNumber = String((i * 3) % 90 + 1);
    const aktenzeichen = `${String((i * 7) % 900).padStart(4, "0")} K ${String(2024 + (i % 3)).padStart(4, "0")}/${2024 + (i % 3)}`;
    const isCancelled = i % 9 === 0;
    const marketValue = 15000 + ((i * 37000) % 585000);
    const livingArea = type.group === PropertyTypeGroup.GRUNDSTUECKE || type.group === PropertyTypeGroup.LAND_WALD || type.group === PropertyTypeGroup.GARAGEN ? null : 45 + ((i * 13) % 280);
    const plotArea = type.group === PropertyTypeGroup.WOHNUNGEN ? null : 120 + ((i * 97) % 4800);

    const property = await prisma.property.create({
      data: {
        aktenzeichen,
        normalizedAktenzeichen: normalizeAktenzeichen(aktenzeichen),
        court: city.court,
        state: city.state,
        city: city.city,
        postalCode: city.postalCode,
        street,
        houseNumber,
        address: `${street} ${houseNumber}, ${city.postalCode} ${city.city}`,
        latitude: city.lat + ((i % 5) - 2) * 0.025,
        longitude: city.lon + ((i % 7) - 3) * 0.025,
        title: `${type.title} in ${city.city}`,
        propertyType: type.type,
        propertyTypeGroup: type.group,
        status: isCancelled ? PropertyStatus.CANCELLED : i % 17 === 0 ? PropertyStatus.ARCHIVED : PropertyStatus.ACTIVE,
        occupancyStatus: pick([OccupancyStatus.VACANT, OccupancyStatus.RENTED, OccupancyStatus.OWNER_OCCUPIED, OccupancyStatus.UNKNOWN], i),
        auctionDate: addDays(today, 10 + i * 4),
        auctionTime: `${9 + (i % 7)}:${i % 2 === 0 ? "00" : "30"}`,
        auctionLocation: `${city.court}, Sitzungssaal ${1 + (i % 5)}`,
        marketValue,
        livingArea,
        usableArea: livingArea ? Math.round(livingArea * 0.35) : null,
        totalArea: livingArea ? Math.round(livingArea * 1.25) : plotArea,
        plotArea,
        yearBuilt: 1900 + ((i * 3) % 120),
        hasDenkmalschutz: i % 8 === 0,
        wertgrenzenWeggefallen: i % 4 === 0,
        auctionAttempt: 1 + (i % 3),
        description: `Testobjekt Nummer ${i}. Diese Daten sind frei erfunden und dienen nur zum Testen der Filter, Kartenpunkte und Objektkarten. Das Objekt hat unterschiedliche Eigenschaften wie Status, Nutzung, Verkehrswert und Flächenangaben.`,
        locationDescription: `${city.city} liegt in ${city.state}. Die Lagebeschreibung ist ein Testtext für die spätere Anzeige echter Gutachten- und Exposé-Daten.`,
        cancellationText: isCancelled ? `Der Termin für dieses Testobjekt wurde aufgehoben. Dies ist ein frei erfundener Testtext.` : null,
        source: "TEST_SEED",
        sourceUrl: "https://example.com/test-object",
        lastSourceUpdate: new Date(),
        images: {
          create: [1, 2, 3].map((imageIndex) => ({
            url: `https://picsum.photos/seed/zvg-${i}-${imageIndex}/900/620`,
            alt: `${type.title} ${city.city} Bild ${imageIndex}`,
            isMain: imageIndex === 1,
            sortOrder: imageIndex
          }))
        },
        documents: {
          create: [
            {
              url: "https://example.com/gutachten.pdf",
              filename: "Gutachten_Test.pdf",
              documentType: DocumentType.GUTACHTEN,
              sourceUrl: "https://example.com/gutachten.pdf"
            },
            {
              url: "https://example.com/bekanntmachung.pdf",
              filename: "Bekanntmachung_Test.pdf",
              documentType: DocumentType.BEKANNTMACHUNG,
              sourceUrl: "https://example.com/bekanntmachung.pdf"
            }
          ]
        }
      }
    });

    console.log(`Created ${i}/50: ${property.title}`);
  }

  console.log("Seed completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
