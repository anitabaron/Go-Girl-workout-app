import { getTranslations } from "@/i18n/server";

export default async function StatisticsPage() {
  const t = await getTranslations("statisticsPage");
  return <div>{t("comingSoon")}</div>;
}
