import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AdminPropertyForm } from "@/components/AdminPropertyForm";
import { prisma } from "@/lib/prisma";
import { parseImageUrls, propertyDataFromForm } from "@/lib/admin-property-form";

type EditPageParams = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export default async function EditPropertyPage({ params }: { params: EditPageParams }) {
  const { id } = await params;
  const property = await prisma.property.findUnique({
    where: { id },
    include: { images: { orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }] } }
  });

  if (!property) notFound();

  async function updateProperty(formData: FormData) {
    "use server";
    const data = propertyDataFromForm(formData);
    const images = parseImageUrls(formData);

    await prisma.$transaction(async (tx) => {
      await tx.property.update({ where: { id }, data });
      await tx.propertyImage.deleteMany({ where: { propertyId: id } });
      if (images.length > 0) {
        await tx.propertyImage.createMany({
          data: images.map((image) => ({ ...image, propertyId: id }))
        });
      }
    });

    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath(`/properties/${id}`);
    redirect("/admin");
  }

  return (
    <main className="admin-page">
      <section className="container admin-hero compact">
        <div>
          <p className="hero-kicker">Admin MVP</p>
          <h1>Редактировать объект</h1>
          <p>{property.title}</p>
        </div>
      </section>
      <section className="container page-section">
        <AdminPropertyForm action={updateProperty} submitLabel="Сохранить изменения" property={property} />
      </section>
    </main>
  );
}
