import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CalendarClient } from "./CalendarClient";

export async function generateMetadata() {
  const t = await getTranslations("calendar");
  return { title: t("title") };
}

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <CalendarClient />;
}
