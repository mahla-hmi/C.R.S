import { adminI18n } from '@/lib/admin/lang';
export default async function NoAccess({ text }) {
  const { t } = await adminI18n();
  return <div className="ad-empty"><b>{t.noAccess.title}</b><p>{text || t.noAccess.text}</p></div>;
}
