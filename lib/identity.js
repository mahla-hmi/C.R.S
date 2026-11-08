// Keys used to match "my reservations" to a guest: forgiving about typing habits, strict about identity.
import { normDigits } from './booking';

// "علي  رضايي" == "علی‌رضایی" == "Ali Rezaei " -> letters/digits only, Persian/Arabic variants unified.
export const nameKeyOf = (s) => normDigits(s).normalize('NFKC').toLowerCase()
  .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/ة/g, 'ه').replace(/[أإآٱ]/g, 'ا').replace(/ؤ/g, 'و').replace(/ئ/g, 'ی')
  .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
  .replace(/[^\p{L}\p{N}]/gu, '');

// 09123456789 == +98 912 345 6789 == 0098-912-3456789 -> last 10 digits
export const phoneKeyOf = (s) => normDigits(s).replace(/\D/g, '').slice(-10);
