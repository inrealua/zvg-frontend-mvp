import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, formatEuro, translateStatus } from "@/lib/format";

export const dynamic = "force-dynamic";

type DuplicateSearchParams = Promise<Record<string, string | string[] | undefined>>;

type DuplicateProperty = {
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
  source: string;
  sourceUrl: string | null;
  updatedAt: Date;
  _count: {
    images: number;
    documents: number;
    favorites: number;
  };
};

type DuplicateGroup = {
  key: string;
  court: string;
  normalizedAktenzeichen: string;
  items: DuplicateProperty[];
};

function groupKey(property: Pick<DuplicateProperty, "normalizedAktenzeichen" | "court">) {
  return `${property.normalizedAktenzeichen.trim().toLowerCase()}__${property.court.trim().toLowerCase()}`;
}

function visibleGroupKey(group: DuplicateGroup) {
  return `${group.normalizedAktenzeichen} · ${group.court}`;
}

function pickRecommendedMaster(items: DuplicateProperty[]) {
  return [...items].sort((a, b) => {
    const scoreA = a._count.images * 5 + a._count.documents * 3 + (a.sourceUrl ? 2 : 0) + (a.marketValue ? 1 : 0) + (a.auctionDate ? 1 : 0);
    const scoreB = b._count.images * 5 + b._count.documents * 3 + (b.sourceUrl ? 2 : 0) + (b.marketValue ? 1 : 0) + (b.auctionDate ? 1 : 0);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  })[0];
}

async function ensureMainImage(propertyId: string) {
  const existingMain = await prisma.propertyImage.findFirst({
    where: { propertyId, isMain: true },
    select: { id: true }
  });

  if (existingMain) return;

  const firstImage = await prisma.propertyImage.findFirst({
    where: { propertyId },
    select: { id: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });

  if (firstImage) {
    await prisma.propertyImage.update({
      where: { id: firstImage.id },
      data: { isMain: true }
    });
  }
}

async function mergeDuplicateGroup(formData: FormData) {
  "use server";

  const masterId = String(formData.get("masterId") || "");
  const duplicateIds = String(formData.get("duplicateIds") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((id) => id !== masterId);

  if (!masterId || duplicateIds.length === 0) {
    redirect("/admin/duplicates?error=missing-selection");
  }

  const master = await prisma.property.findUnique({
    where: { id: masterId },
    select: { id: true, normalizedAktenzeichen: true, court: true }
  });

  if (!master) {
    redirect("/admin/duplicates?error=master-not-found");
  }

  const duplicates = await prisma.property.findMany({
    where: { id: { in: duplicateIds } },
    select: { id: true, normalizedAktenzeichen: true, court: true }
  });

  const safeDuplicateIds = duplicates
    .filter((item) => item.normalizedAktenzeichen === master.normalizedAktenzeichen && item.court === master.court)
    .map((item) => item.id);

  if (safeDuplicateIds.length === 0) {
    redirect("/admin/duplicates?error=no-safe-duplicates");
  }

  await prisma.$transaction(async (tx) => {
    await tx.propertyImage.updateMany({
      where: { propertyId: { in: safeDuplicateIds } },
      data: { propertyId: masterId, isMain: false }
    });

    await tx.propertyDocument.updateMany({
      where: { propertyId: { in: safeDuplicateIds } },
      data: { propertyId: masterId }
    });

    const duplicateFavorites = await tx.favorite.findMany({
      where: { propertyId: { in: safeDuplicateIds } },
      select: { userId: true }
    });

    for (const favorite of duplicateFavorites) {
      await tx.favorite.upsert({
        where: { userId_propertyId: { userId: favorite.userId, propertyId: masterId } },
        update: {},
        create: { userId: favorite.userId, propertyId: masterId }
      });
    }

    await tx.favorite.deleteMany({ where: { propertyId: { in: safeDuplicateIds } } });
    await tx.property.deleteMany({ where: { id: { in: safeDuplicateIds } } });
  });

  await ensureMainImage(masterId);
  redirect("/admin/duplicates?merged=1");
}

function MessageBox({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  if (searchParams.merged) {
    return <div className="notice success">Дубли объединены: фото, документы и избранное перенесены в главный объект.</div>;
  }

  if (searchParams.error) {
    const errorText = typeof searchParams.error === "string" ? searchParams.error : "unknown";
    return <div className="notice error">Операция не выполнена: {errorText}</div>;
  }

  return null;
}

function DuplicateGroupCard({ group }: { group: DuplicateGroup }) {
  const recommendedMaster = pickRecommendedMaster(group.items);
  const duplicateIds = group.items.map((item) => item.id).join(",");

  return (
    <section className="duplicate-card">
      <div className="duplicate-card-head">
        <div>
          <h2>{visibleGroupKey(group)}</h2>
          <p>{group.items.length} возможных дубля. Рекомендованный главный объект: <strong>{recommendedMaster?.title}</strong></p>
        </div>
        <span className="duplicate-count">{group.items.length}</span>
      </div>

      <form action={mergeDuplicateGroup}>
        <input type="hidden" name="duplicateIds" value={duplicateIds} />
        <div className="admin-table-wrap">
          <table className="admin-table duplicate-table">
            <thead>
              <tr>
                <th>Главный</th>
                <th>Объект</th>
                <th>Дело / источник</th>
                <th>Торги</th>
                <th>Цена</th>
                <th>Данные</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {group.items.map((property) => (
                <tr key={property.id} className={property.id === recommendedMaster?.id ? "recommended-row" : undefined}>
                  <td>
                    <label className="radio-cell">
                      <input type="radio" name="masterId" value={property.id} defaultChecked={property.id === recommendedMaster?.id} />
                      <span>{property.id === recommendedMaster?.id ? "рекоменд." : "выбрать"}</span>
                    </label>
                  </td>
                  <td>
                    <strong>{property.title}</strong>
                    <small>{property.address}</small>
                    <small>{property.city}</small>
                  </td>
                  <td>
                    <strong>{property.aktenzeichen}</strong>
                    <small>{property.source}</small>
                    {property.sourceUrl ? <small><a href={property.sourceUrl} target="_blank" rel="noreferrer">Источник</a></small> : null}
                  </td>
                  <td>
                    <strong>{formatDate(property.auctionDate)}</strong>
                    <small>{property.auctionTime ?? "—"}</small>
                  </td>
                  <td>{formatEuro(property.marketValue)}</td>
                  <td>
                    <div className="quality-badges">
                      <span className={property._count.images > 0 ? "ok" : "bad"}>{property._count.images} фото</span>
                      <span className={property._count.documents > 0 ? "ok" : "bad"}>{property._count.documents} док.</span>
                      <span className={property._count.favorites > 0 ? "ok" : "neutral"}>{property._count.favorites} fav</span>
                    </div>
                  </td>
                  <td><span className={`admin-status ${property.status.toLowerCase()}`}>{translateStatus(property.status)}</span></td>
                  <td>
                    <div className="table-actions">
                      <Link href={`/properties/${property.id}`}>Открыть</Link>
                      <Link href={`/admin/properties/${property.id}/edit`}>Исправить</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="duplicate-actions">
          <p>
            При объединении выбранный главный объект останется. Фото, документы и избранное из остальных объектов будут перенесены в него. Остальные записи будут удалены.
          </p>
          <button type="submit" className="admin-danger-button">Объединить выбранную группу</button>
        </div>
      </form>
    </section>
  );
}

export default async function AdminDuplicatesPage({ searchParams }: { searchParams: DuplicateSearchParams }) {
  const resolvedSearchParams = await searchParams;
  const allProperties = await prisma.property.findMany({
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
      source: true,
      sourceUrl: true,
      updatedAt: true,
      _count: { select: { images: true, documents: true, favorites: true } }
    },
    orderBy: [{ court: "asc" }, { normalizedAktenzeichen: "asc" }, { updatedAt: "desc" }]
  });

  const map = new Map<string, DuplicateProperty[]>();

  for (const property of allProperties) {
    const key = groupKey(property);
    if (!property.normalizedAktenzeichen || !property.court) continue;
    const group = map.get(key) ?? [];
    group.push(property);
    map.set(key, group);
  }

  const duplicateGroups: DuplicateGroup[] = [...map.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({
      key,
      normalizedAktenzeichen: items[0].normalizedAktenzeichen,
      court: items[0].court,
      items
    }))
    .sort((a, b) => b.items.length - a.items.length || visibleGroupKey(a).localeCompare(visibleGroupKey(b)));

  const totalDuplicateObjects = duplicateGroups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <main className="container admin-page">
      <div className="admin-page-head">
        <div>
          <p className="eyebrow">Admin · Duplicates</p>
          <h1>Поиск и объединение дублей</h1>
          <p className="muted-text">
            Дубли определяются по паре normalizedAktenzeichen + Gericht. Перед объединением проверь адрес, дату торгов и источник.
          </p>
        </div>
        <div className="admin-actions-row">
          <Link className="admin-secondary-button" href="/admin/quality?issue=duplicates">Quality duplicates</Link>
          <Link className="admin-secondary-button" href="/admin/dashboard">Dashboard</Link>
          <Link className="admin-primary-button" href="/admin">Все объекты</Link>
        </div>
      </div>

      <MessageBox searchParams={resolvedSearchParams} />

      <section className="admin-kpi-grid duplicate-kpi-grid">
        <div className="admin-kpi-card">
          <span>Групп дублей</span>
          <strong>{duplicateGroups.length}</strong>
        </div>
        <div className="admin-kpi-card">
          <span>Объектов в дублях</span>
          <strong>{totalDuplicateObjects}</strong>
        </div>
        <div className="admin-kpi-card">
          <span>Можно удалить после merge</span>
          <strong>{Math.max(0, totalDuplicateObjects - duplicateGroups.length)}</strong>
        </div>
      </section>

      {duplicateGroups.length === 0 ? (
        <div className="empty-box">Дубли по normalizedAktenzeichen + Gericht не найдены.</div>
      ) : (
        <div className="duplicate-list">
          {duplicateGroups.map((group) => <DuplicateGroupCard group={group} key={group.key} />)}
        </div>
      )}
    </main>
  );
}
