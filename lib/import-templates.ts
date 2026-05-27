export const IMPORT_FIELDS = [
  { name: "aktenzeichen", required: true, description: "Номер дела, например 0012 K 0034/2026" },
  { name: "court", required: true, description: "Amtsgericht, например Amtsgericht Chemnitz" },
  { name: "state", required: false, description: "Bundesland" },
  { name: "city", required: false, description: "Город" },
  { name: "postalCode", required: false, description: "PLZ" },
  { name: "street", required: false, description: "Улица" },
  { name: "houseNumber", required: false, description: "Номер дома" },
  { name: "address", required: true, description: "Полный адрес. Если пусто, собирается из street + houseNumber + postalCode + city" },
  { name: "latitude", required: false, description: "Широта" },
  { name: "longitude", required: false, description: "Долгота" },
  { name: "title", required: true, description: "Название объекта" },
  { name: "propertyType", required: false, description: "Тип объекта, например Einfamilienhaus" },
  { name: "propertyTypeGroup", required: false, description: "WOHNHAEUSER, WOHNUNGEN, GEWERBE, GRUNDSTUECKE, LAND_WALD, GARAGEN, SONSTIGE" },
  { name: "status", required: false, description: "ACTIVE, CANCELLED, ARCHIVED, SOLD, UNKNOWN" },
  { name: "occupancyStatus", required: false, description: "VACANT, RENTED, OWNER_OCCUPIED, UNKNOWN" },
  { name: "auctionDate", required: false, description: "Дата торгов в формате YYYY-MM-DD" },
  { name: "auctionTime", required: false, description: "Время торгов, например 10:30" },
  { name: "auctionLocation", required: false, description: "Место торгов" },
  { name: "marketValue", required: false, description: "Verkehrswert в евро, только число" },
  { name: "livingArea", required: false, description: "Wohnfläche" },
  { name: "usableArea", required: false, description: "Nutzfläche" },
  { name: "totalArea", required: false, description: "Gesamtfläche" },
  { name: "plotArea", required: false, description: "Grundstücksfläche" },
  { name: "yearBuilt", required: false, description: "Baujahr" },
  { name: "hasDenkmalschutz", required: false, description: "true/false или ja/nein" },
  { name: "wertgrenzenWeggefallen", required: false, description: "true/false или ja/nein" },
  { name: "auctionAttempt", required: false, description: "Номер термина" },
  { name: "description", required: false, description: "Описание объекта" },
  { name: "locationDescription", required: false, description: "Описание локации" },
  { name: "cancellationText", required: false, description: "Текст отмены торгов" },
  { name: "source", required: false, description: "Источник данных" },
  { name: "sourceUrl", required: false, description: "URL источника" },
  { name: "imageUrls", required: false, description: "URL фото, несколько значений можно разделить |" },
  { name: "documentUrls", required: false, description: "URL документов, несколько значений можно разделить |" }
] as const;

export const CSV_IMPORT_TEMPLATE = `${IMPORT_FIELDS.map((field) => field.name).join(";")}
0018 K 0001/2026;Amtsgericht Chemnitz;Sachsen;Chemnitz;09111;Musterstraße;10;Musterstraße 10, 09111 Chemnitz;50.8323;12.9253;Import Musterhaus Chemnitz;Einfamilienhaus;WOHNHAEUSER;ACTIVE;VACANT;2026-09-15;10:30;Saal 101, Amtsgericht Chemnitz;125000;120;35;155;640;1930;false;true;2;Testobjekt aus CSV Import;Gute Mikrolage nahe Zentrum;;ADMIN_TEMPLATE;https://example.com/source;https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1200|https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=1200;https://example.com/gutachten.pdf|https://example.com/bekanntmachung.pdf
0018 K 0002/2026;Amtsgericht Dresden;Sachsen;Dresden;01067;Beispielweg;4;Beispielweg 4, 01067 Dresden;51.0504;13.7373;Import Eigentumswohnung Dresden;Eigentumswohnung;WOHNUNGEN;ACTIVE;RENTED;2026-10-20;11:00;Amtsgericht Dresden;89000;72;0;72;0;1978;false;false;1;Testwohnung aus CSV Import;Städtische Lage;;ADMIN_TEMPLATE;https://example.com/source-2;https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200;https://example.com/expose.pdf`;

export const JSON_IMPORT_TEMPLATE = JSON.stringify(
  [
    {
      aktenzeichen: "0018 K 0003/2026",
      court: "Amtsgericht Leipzig",
      state: "Sachsen",
      city: "Leipzig",
      postalCode: "04109",
      street: "Importallee",
      houseNumber: "7",
      address: "Importallee 7, 04109 Leipzig",
      latitude: 51.3397,
      longitude: 12.3731,
      title: "Import Mehrfamilienhaus Leipzig",
      propertyType: "Mehrfamilienhaus",
      propertyTypeGroup: "WOHNHAEUSER",
      status: "ACTIVE",
      occupancyStatus: "RENTED",
      auctionDate: "2026-11-12",
      auctionTime: "09:30",
      auctionLocation: "Amtsgericht Leipzig, Saal 2",
      marketValue: 245000,
      livingArea: 310,
      usableArea: 60,
      totalArea: 370,
      plotArea: 980,
      yearBuilt: 1910,
      hasDenkmalschutz: false,
      wertgrenzenWeggefallen: true,
      auctionAttempt: 2,
      description: "Testobjekt aus JSON Import.",
      locationDescription: "Großstadtlage mit guter ÖPNV-Anbindung.",
      cancellationText: "",
      source: "ADMIN_TEMPLATE",
      sourceUrl: "https://example.com/json-source",
      imageUrls: [
        "https://images.unsplash.com/photo-1568605114967-8130f3a36994?q=80&w=1200",
        "https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=1200"
      ],
      documentUrls: [
        "https://example.com/gutachten-leipzig.pdf",
        "https://example.com/bekanntmachung-leipzig.pdf"
      ]
    }
  ],
  null,
  2
);
