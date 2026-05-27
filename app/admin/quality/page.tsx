import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDate, formatEuro, formatNumber, translateStatus } from "@/lib/format";

export const dynamic = "force-dynamic";

type QualitySearchParams = Promise<Record<string, string | string[] | undefined>>;

type QualityIssue = {
  key: string;
  title: string;
  description: string;
  count: number;
  tone: "danger" | "warning" | "neutral";
};

type PropertyRow = {
  id: string;
  title: string;
  address: string;
  city: string;
  court: string;
  aktenzeichen: string;
  normalizedAktenzeichen: string;
  status: string;
  auctionDate: Date | null;
  auctionTime: string | null;
  marketValue: number | null;
  latitude: number | null;
  longitude: number | null;
  updatedAt: Date;
  _count: {
    images: number;
    documents: number;
  };
};

function issueHref(issue: string) {
  return `/admin/quality?issue=${encodeURIComponent(issue)}`;
}

function getIssueWhere(issue: string): Prisma.PropertyWhereInput {
  switch (issue) {
    case "missing-coordinates":
      return { OR: [{ latitude: null }, { longitude: null }] };
    case "missing-images":
      return { images: { none: {} } };
    case "missing-documents":
      return { documents: { none: {} } };
    case "missing-auction-date":
      return { auctionDate: null };
    case "missing-market-value":
      return { marketValue: null };
    case "cancelled-without-text":
      return { status: "CANCELLED", OR: [{ cancellationText: null }, { cancellationText: "" }] };
    default:
      return {};
  }
}

function getIssueLabel(issue: string) {
  const labels: Record<string, string> = {
    "missing-coordinates": "Без координат",
    "missing-images": "Без фото",
    "missing-documents": "Без документов",
    "missing-auction-date": "Без даты торгов",
    "missing-market-value": "Без Verkehrswert",
    "cancelled-without-text": "Отменённые без текста отмены",
    duplicates: "Возможные дубли"
  };
  return labels[issue] ?? "Все проверки";
}

function QualityPropertiesTable({ properties }: { properties: PropertyRow[] }) {
  if (properties.length === 0) {
    return <div className="empty-box">По выбранной проверке проблемные объекты не найдены.</div>;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table quality-table">
        <thead>
          <tr>
            <th>Объект</th>
            <th>Суд / дело</th>
            <th>Торги</th>
            <th>Цена</th>
            <th>Данные</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((property) => (
            <tr key={property.id}>
              <td>
                <strong>{property.title}</strong>
                <small>{property.address}</small>
                <small>{property.city}</small>
              </td>
              <td>
                <strong>{property.court}</strong>
                <small>{property.aktenzeichen}</small>
                <small>Norm: {property.normalizedAktenzeichen}</small>
              </td>
              <td>
                <strong>{formatDate(property.auctionDate)}</strong>
                <small>{property.auctionTime ?? "—"}</small>
              </td>
              <td>{formatEuro(property.marketValue)}</td>
              <td>
                <div className="quality-badges">
                  <span className={property.latitude && property.longitude ? "ok" : "bad"}>GPS</span>
                  <span className={property._count.images > 0 ? "ok" : "bad"}>{property._count.images} фото</span>
                  <span className={property._count.documents > 0 ? "ok" : "bad"}>{property._count.documents} док.</span>
                </div>
              </td>
              <td><span className={`admin-status ${property.status.toLowerCase()}`}>{translateStatus(property.status)}</span></td>
              <td>
                <div className="admin-row-actions">
                  <Link className="btn btn-soft" href={`/properties/${property.id}`}>Открыть</Link>
                  <Link className="btn" href={`/admin/properties/${property.id}/edit`}>Исправить</Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminQualityPage({ searchParams }: { searchParams: QualitySearchParams }) {
  const params = await searchParams;
  const selectedIssue = typeof params.issue === "string" ? params.issue : "missing-coordinates";

  const [
    total,
    missingCoordinates,
    missingImages,
    missingDocuments,
    missingAuctionDate,
    missingMarketValue,
    cancelledWithoutText,
    allForDuplicates
  ] = await Promise.all([
    prisma.property.count(),
    prisma.property.count({ where: getIssueWhere("missing-coordinates") }),
    prisma.property.count({ where: getIssueWhere("missing-images") }),
    prisma.property.count({ where: getIssueWhere("missing-documents") }),
    prisma.property.count({ where: getIssueWhere("missing-auction-date") }),
    prisma.property.count({ where: getIssueWhere("missing-market-value") }),
    prisma.property.count({ where: getIssueWhere("cancelled-without-text") }),
    prisma.property.findMany({
      select: {
        id: true,
        title: true,
        address: true,
        city: true,
        court: true,
        aktenzeichen: true,
        normalizedAktenzeichen: true,
        status: true,
        auctionDate: true,
        auctionTime: true,
        marketValue: true,
        latitude: true,
        longitude: true,
        updatedAt: true,
        _count: { select: { images: true, documents: true } }
      },
      orderBy: { updatedAt: "desc" }
    })
  ]);

  const duplicateGroups = new Map<string, PropertyRow[]>();
  for (const property of allForDuplicates as PropertyRow[]) {
    const key = `${property.court.trim().toLowerCase()}::${property.normalizedAktenzeichen.trim().toLowerCase()}`;
    if (!duplicateGroups.has(key)) duplicateGroups.set(key, []);
    duplicateGroups.get(key)!.push(property);
  }
  const duplicateProperties = Array.from(duplicateGroups.values())
    .filter((group) => group.length > 1)
    .flat()
    .sort((a, b) => a.court.localeCompare(b.court) || a.normalizedAktenzeichen.localeCompare(b.normalizedAktenzeichen));

  const issues: QualityIssue[] = [
    {
      key: "missing-coordinates",
      title: "Без координат",
      description: "Не будут корректно отображаться на карте и в поиске по радиусу.",
      count: missingCoordinates,
      tone: "danger"
    },
    {
      key: "missing-images",
      title: "Без фото",
      description: "Карточки выглядят хуже, пользователь хуже оценивает объект.",
      count: missingImages,
      tone: "warning"
    },
    {
      key: "missing-documents",
      title: "Без документов",
      description: "Нет Gutachten/Bekanntmachung/Exposé для проверки объекта.",
      count: missingDocuments,
      tone: "warning"
    },
    {
      key: "missing-auction-date",
      title: "Без даты торгов",
      description: "Нельзя правильно сортировать по ближайшему Termin.",
      count: missingAuctionDate,
      tone: "danger"
    },
    {
      key: "missing-market-value",
      title: "Без Verkehrswert",
      description: "Фильтр цены и первичная оценка объекта работают хуже.",
      count: missingMarketValue,
      tone: "neutral"
    },
    {
      key: "cancelled-without-text",
      title: "Отменённые без текста",
      description: "Статус отмены есть, но нет исходного текста об отмене Termin.",
      count: cancelledWithoutText,
      tone: "neutral"
    },
    {
      key: "duplicates",
      title: "Возможные дубли",
      description: "Совпадает нормализованный Aktenzeichen + Amtsgericht.",
      count: duplicateProperties.length,
      tone: "danger"
    }
  ];

  let selectedProperties: PropertyRow[] = [];
  if (selectedIssue === "duplicates") {
    selectedProperties = duplicateProperties;
  } else {
    selectedProperties = await prisma.property.findMany({
      where: getIssueWhere(selectedIssue),
      select: {
        id: true,
        title: true,
        address: true,
        city: true,
        court: true,
        aktenzeichen: true,
        normalizedAktenzeichen: true,
        status: true,
        auctionDate: true,
        auctionTime: true,
        marketValue: true,
        latitude: true,
        longitude: true,
        updatedAt: true,
        _count: { select: { images: true, documents: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 200
    }) as PropertyRow[];
  }

  return (
    <main className="admin-page">
      <section className="container admin-hero">
        <div>
          <p className="hero-kicker">Admin · Datenqualität</p>
          <h1>Контроль качества базы</h1>
          <p>
            Здесь собраны проблемные объекты: без координат, фото, документов, даты торгов, Verkehrswert и возможные дубли.
          </p>
        </div>
        <div className="admin-actions-inline">
          <Link href="/admin/dashboard" className="btn btn-soft">Dashboard</Link>
          <Link href="/admin" className="btn btn-soft">Все объекты</Link>
          <Link href="/admin/import" className="btn btn-primary">Импорт</Link>
        </div>
      </section>

      <section className="container page-section">
        <div className="quality-summary">
          <div className="dashboard-kpi"><span>Всего объектов</span><b>{formatNumber(total)}</b></div>
          <div className="dashboard-kpi"><span>Проблем с GPS</span><b>{formatNumber(missingCoordinates)}</b></div>
          <div className="dashboard-kpi"><span>Возможных дублей</span><b>{formatNumber(duplicateProperties.length)}</b></div>
        </div>

        <div className="quality-issue-grid">
          {issues.map((issue) => (
            <Link
              key={issue.key}
              href={issueHref(issue.key)}
              className={`quality-issue-card ${issue.tone} ${selectedIssue === issue.key ? "active" : ""}`}
            >
              <span>{issue.title}</span>
              <b>{formatNumber(issue.count)}</b>
              <small>{issue.description}</small>
            </Link>
          ))}
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-head">
            <h2>{getIssueLabel(selectedIssue)}</h2>
            <span>Показано: {formatNumber(selectedProperties.length)}</span>
          </div>
          {selectedIssue === "duplicates" ? (
            <p className="muted-text quality-note">
              Дубли определяются технически: одинаковые normalizedAktenzeichen + court. Перед удалением обязательно открой объекты и сравни адрес, дату, Verkehrswert и источник.
            </p>
          ) : null}
          <QualityPropertiesTable properties={selectedProperties} />
        </div>
      </section>
    </main>
  );
}
