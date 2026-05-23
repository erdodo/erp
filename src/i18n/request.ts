import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value ?? "tr";

  const validLocales = ["tr", "en"];
  const resolvedLocale = validLocales.includes(locale) ? locale : "tr";

  return {
    locale: resolvedLocale,
    messages: (
      await import(`../../public/locales/${resolvedLocale}/common.json`)
    ).default,
  };
});
