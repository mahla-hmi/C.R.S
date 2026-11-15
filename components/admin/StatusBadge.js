import { adminI18n } from '@/lib/admin/lang';
import { TONE } from '@/lib/admin/labels';
export default async function StatusBadge({ status }) {
  const { t } = await adminI18n();
  return <span className={`ad-badge ${TONE[status] || 'mut'}`}>{t.status[status] || status || '—'}</span>;
}
