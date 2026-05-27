import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AdminPropertyForm } from "@/components/AdminPropertyForm";
import { prisma } from "@/lib/prisma";
import { parseImageUrls, propertyDataFromForm } from "@/lib/admin-property-form";

export const dynamic = "force-dynamic";

async function createProperty(formData: FormData) {
  "use server";
  const data = propertyDataFromForm(formData);
  const images = parseImageUrls(formData);

  await prisma.property.create({
    data: {
      ...data,
      images: images.length > 0 ? { create: images } : undefined
    }
  });

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin");
}

export default function NewPropertyPage() {
  return (
    <main className="admin-page">
      <section className="container admin-hero compact">
        <div>
          <p className="hero-kicker">Admin MVP</p>
          <h1>Добавить объект</h1>
          <p>Заполни основные поля. Первое фото в списке автоматически станет главным.</p>
        </div>
      </section>
      <section className="container page-section">
        <AdminPropertyForm action={createProperty} submitLabel="Создать объект" />
      </section>
    </main>
  );
}
