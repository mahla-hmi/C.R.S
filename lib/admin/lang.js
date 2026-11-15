// Server side: which language the panel is in right now (cookie), with its texts and number formatter.
import { cache } from 'react';
import { cookies } from 'next/headers';
import { A, LANG_COOKIE, parseLang, numberFor, fill } from './i18n';

export const getLang = cache(async () => parseLang((await cookies()).get(LANG_COOKIE)?.value));
export async function adminI18n() {
  const lang = await getLang();
  return { lang, t: A[lang], n: numberFor(lang), fill };
}
