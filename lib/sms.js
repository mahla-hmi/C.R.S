// SMS hook. SMS_PROVIDER=console (default) just prints the message to the server log.
// To go live, add a provider branch in sendSms() (Kavenegar, Melipayamak, Ghasedak, ...) and set SMS_PROVIDER.
import { fmt } from './jalali';
import { fmtTime } from './booking';
import { dict } from './dict';

export async function sendSms(to, text) {
  const provider = process.env.SMS_PROVIDER || 'console';
  if (provider === 'console') { console.log(`[SMS -> ${to}]\n${text}`); return; }
  throw new Error(`SMS provider "${provider}" is not implemented yet (lib/sms.js)`);
}

export function bookingText(v, code) {
  const name = dict[v.locale].name;
  const when = fmt(v.date, v.locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const range = `${fmtTime(v.startMin, v.locale)}-${fmtTime(v.endMin, v.locale)}`;
  return v.locale === 'fa'
    ? `${name}\nرزرو شما ثبت شد (در انتظار تأیید).\n${when}، ساعت ${range}\nمیز ${v.tableId}\nکد پیگیری: ${code}`
    : `${name}\nYour booking is in (pending confirmation).\n${when}, ${range}\nTable ${v.tableId}\nCode: ${code}`;
}
export const sendBookingSms = (v, code) => sendSms(v.phone, bookingText(v, code));

// Message to the guest when the owner changes the status of a reservation (confirmed / rejected / cancelled).
export function statusText(r, status) {
  const name = dict[r.locale || 'fa'].name;
  const when = fmt(r.date, r.locale || 'fa', { weekday: 'long', day: 'numeric', month: 'long' });
  const range = `${fmtTime(r.startMin, r.locale || 'fa')}-${fmtTime(r.endMin, r.locale || 'fa')}`;
  if ((r.locale || 'fa') === 'fa') {
    if (status === 'confirmed') return `${name}\nرزرو شما تأیید شد.\n${when}، ساعت ${range}\nمیز ${r.tableId}\nکد پیگیری: ${r.code}\nمنتظر دیدارتان هستیم.`;
    if (status === 'rejected') return `${name}\nمتأسفانه رزرو شما (${when}، ${range}) ممکن نشد. لطفاً زمان دیگری انتخاب کنید یا با ما تماس بگیرید.\nکد: ${r.code}`;
    return `${name}\nرزرو شما (${when}، ${range}) لغو شد.\nکد: ${r.code}`;
  }
  if (status === 'confirmed') return `${name}\nYour booking is confirmed.\n${when}, ${range}\nTable ${r.tableId}\nCode: ${r.code}\nSee you soon.`;
  if (status === 'rejected') return `${name}\nSorry, we could not take your booking (${when}, ${range}). Please pick another time or call us.\nCode: ${r.code}`;
  return `${name}\nYour booking (${when}, ${range}) was cancelled.\nCode: ${r.code}`;
}
export const sendStatusSms = (r, status) => sendSms(r.phone, statusText(r, status));

// Message to the guest when the cafe changes the date, time, table or party size of a booking.
export function changeText(r) {
  const loc = r.locale || 'fa', name = dict[loc].name;
  const when = fmt(r.date, loc, { weekday: 'long', day: 'numeric', month: 'long' });
  const range = `${fmtTime(r.startMin, loc)}-${fmtTime(r.endMin, loc)}`;
  return loc === 'fa'
    ? `${name}\nرزرو شما تغییر کرد.\n${when}، ساعت ${range}\nمیز ${r.tableId}\nکد پیگیری: ${r.code}`
    : `${name}\nYour booking was updated.\n${when}, ${range}\nTable ${r.tableId}\nCode: ${r.code}`;
}
export const sendChangeSms = (r) => sendSms(r.phone, changeText(r));
