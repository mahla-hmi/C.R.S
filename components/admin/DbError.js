import { adminI18n } from '@/lib/admin/lang';
export default async function DbError() {
  const { t } = await adminI18n();
  return <div className="ad-empty"><b>{t.dbError.title}</b><p>{t.dbError.text}</p></div>;
}
