import { STATUS } from '@/lib/admin/labels';
export default function StatusBadge({ status }) {
  const [label, tone] = STATUS[status] || [status || '—', 'mut'];
  return <span className={`ad-badge ${tone}`}>{label}</span>;
}
