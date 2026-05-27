import {
  OCCUPANCY_OPTIONS,
  PROPERTY_GROUP_OPTIONS,
  PROPERTY_STATUS_OPTIONS,
  dateInputValue
} from "@/lib/admin-property-form";

type AdminImage = {
  url: string;
};

type AdminDocument = {
  url: string;
  filename: string;
  documentType: string;
};

type AdminPropertyFormValue = {
  aktenzeichen: string;
  court: string;
  state: string;
  city: string;
  postalCode: string;
  street: string;
  houseNumber: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  title: string;
  propertyType: string;
  propertyTypeGroup: string;
  status: string;
  occupancyStatus: string;
  auctionDate: Date | null;
  auctionTime: string | null;
  auctionLocation: string | null;
  marketValue: number | null;
  livingArea: number | null;
  usableArea: number | null;
  totalArea: number | null;
  plotArea: number | null;
  yearBuilt: number | null;
  hasDenkmalschutz: boolean;
  wertgrenzenWeggefallen: boolean;
  auctionAttempt: number;
  description: string;
  locationDescription: string | null;
  cancellationText: string | null;
  source: string;
  sourceUrl: string | null;
  images: AdminImage[];
  documents?: AdminDocument[];
};

type Props = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  property?: AdminPropertyFormValue | null;
};

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80"
].join("\n");

function documentTextareaValue(documents: AdminDocument[] | undefined, documentType: string) {
  return (documents ?? [])
    .filter((document) => document.documentType === documentType)
    .map((document) => `${document.url} | ${document.filename}`)
    .join("\n");
}

export function AdminPropertyForm({ action, submitLabel, property }: Props) {
  const imageUrls = property?.images.map((image) => image.url).join("\n") ?? DEFAULT_IMAGES;
  const gutachtenUrls = documentTextareaValue(property?.documents, "GUTACHTEN");
  const bekanntmachungUrls = documentTextareaValue(property?.documents, "BEKANNTMACHUNG");
  const exposeUrls = documentTextareaValue(property?.documents, "EXPOSE");
  const otherDocumentUrls = documentTextareaValue(property?.documents, "OTHER");

  return (
    <form action={action} className="admin-form">
      <section className="admin-form-section">
        <h2>Основные данные</h2>
        <div className="admin-form-grid">
          <label>
            Название объекта *
            <input name="title" required defaultValue={property?.title ?? ""} />
          </label>
          <label>
            Aktenzeichen *
            <input name="aktenzeichen" required defaultValue={property?.aktenzeichen ?? ""} />
          </label>
          <label>
            Amtsgericht *
            <input name="court" required defaultValue={property?.court ?? ""} />
          </label>
          <label>
            Bundesland *
            <input name="state" required defaultValue={property?.state ?? "Sachsen"} />
          </label>
          <label>
            Тип объекта *
            <input name="propertyType" required defaultValue={property?.propertyType ?? "Einfamilienhaus"} />
          </label>
          <label>
            Группа объекта
            <select name="propertyTypeGroup" defaultValue={property?.propertyTypeGroup ?? "WOHNHAEUSER"}>
              {PROPERTY_GROUP_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Статус
            <select name="status" defaultValue={property?.status ?? "ACTIVE"}>
              {PROPERTY_STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Использование
            <select name="occupancyStatus" defaultValue={property?.occupancyStatus ?? "UNKNOWN"}>
              {OCCUPANCY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="admin-form-section">
        <h2>Адрес и координаты</h2>
        <div className="admin-form-grid">
          <label>
            Город *
            <input name="city" required defaultValue={property?.city ?? ""} />
          </label>
          <label>
            PLZ *
            <input name="postalCode" required defaultValue={property?.postalCode ?? ""} />
          </label>
          <label>
            Улица *
            <input name="street" required defaultValue={property?.street ?? ""} />
          </label>
          <label>
            Дом
            <input name="houseNumber" defaultValue={property?.houseNumber ?? ""} />
          </label>
          <label className="admin-wide">
            Полный адрес
            <input name="address" defaultValue={property?.address ?? ""} />
          </label>
          <label>
            Latitude
            <input name="latitude" inputMode="decimal" defaultValue={property?.latitude ?? ""} />
          </label>
          <label>
            Longitude
            <input name="longitude" inputMode="decimal" defaultValue={property?.longitude ?? ""} />
          </label>
        </div>
      </section>

      <section className="admin-form-section">
        <h2>Торги и параметры</h2>
        <div className="admin-form-grid">
          <label>
            Дата торгов
            <input type="date" name="auctionDate" defaultValue={dateInputValue(property?.auctionDate)} />
          </label>
          <label>
            Время торгов
            <input name="auctionTime" placeholder="10:30" defaultValue={property?.auctionTime ?? ""} />
          </label>
          <label>
            Verkehrswert, €
            <input name="marketValue" inputMode="numeric" defaultValue={property?.marketValue ?? ""} />
          </label>
          <label>
            Термин №
            <input name="auctionAttempt" inputMode="numeric" defaultValue={property?.auctionAttempt ?? 1} />
          </label>
          <label>
            Wohnfläche, м²
            <input name="livingArea" inputMode="decimal" defaultValue={property?.livingArea ?? ""} />
          </label>
          <label>
            Nutzfläche, м²
            <input name="usableArea" inputMode="decimal" defaultValue={property?.usableArea ?? ""} />
          </label>
          <label>
            Gesamtfläche, м²
            <input name="totalArea" inputMode="decimal" defaultValue={property?.totalArea ?? ""} />
          </label>
          <label>
            Grundstück, м²
            <input name="plotArea" inputMode="decimal" defaultValue={property?.plotArea ?? ""} />
          </label>
          <label>
            Baujahr
            <input name="yearBuilt" inputMode="numeric" defaultValue={property?.yearBuilt ?? ""} />
          </label>
          <label className="admin-wide">
            Место торгов
            <input name="auctionLocation" defaultValue={property?.auctionLocation ?? ""} />
          </label>
        </div>
        <div className="admin-checks">
          <label><input type="checkbox" name="hasDenkmalschutz" defaultChecked={property?.hasDenkmalschutz ?? false} /> Denkmalschutz</label>
          <label><input type="checkbox" name="wertgrenzenWeggefallen" defaultChecked={property?.wertgrenzenWeggefallen ?? false} /> Wertgrenzen weggefallen</label>
        </div>
      </section>

      <section className="admin-form-section">
        <h2>Описание, источник и фото</h2>
        <div className="admin-form-grid">
          <label className="admin-wide">
            Описание *
            <textarea name="description" required rows={6} defaultValue={property?.description ?? ""} />
          </label>
          <label className="admin-wide">
            Описание локации
            <textarea name="locationDescription" rows={4} defaultValue={property?.locationDescription ?? ""} />
          </label>
          <label className="admin-wide">
            Текст отмены торгов, если есть
            <textarea name="cancellationText" rows={3} defaultValue={property?.cancellationText ?? ""} />
          </label>
          <label>
            Источник
            <input name="source" defaultValue={property?.source ?? "MANUAL_ADMIN"} />
          </label>
          <label>
            URL источника
            <input name="sourceUrl" defaultValue={property?.sourceUrl ?? ""} />
          </label>
          <label className="admin-wide">
            Фото, по одному URL в строке. Первое фото станет главным.
            <textarea name="imageUrls" rows={5} defaultValue={imageUrls} />
          </label>
        </div>
      </section>

      <section className="admin-form-section">
        <h2>Документы объекта</h2>
        <p className="admin-help-text">
          Один документ — одна строка. Можно писать просто URL или формат: <code>URL | название_файла.pdf</code>.
        </p>
        <div className="admin-form-grid">
          <label className="admin-wide">
            Gutachten / Verkehrswertgutachten
            <textarea name="gutachtenUrls" rows={4} defaultValue={gutachtenUrls} placeholder="https://example.com/gutachten.pdf | Gutachten.pdf" />
          </label>
          <label className="admin-wide">
            Amtliche Bekanntmachung
            <textarea name="bekanntmachungUrls" rows={4} defaultValue={bekanntmachungUrls} placeholder="https://example.com/bekanntmachung.pdf | Bekanntmachung.pdf" />
          </label>
          <label className="admin-wide">
            Exposé
            <textarea name="exposeUrls" rows={3} defaultValue={exposeUrls} />
          </label>
          <label className="admin-wide">
            Прочие документы
            <textarea name="otherDocumentUrls" rows={3} defaultValue={otherDocumentUrls} />
          </label>
        </div>
      </section>

      <div className="admin-form-actions">
        <a className="btn" href="/admin">Отмена</a>
        <button className="btn btn-primary" type="submit">{submitLabel}</button>
      </div>
    </form>
  );
}
