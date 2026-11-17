// Strings for the "My reservations" page (plain data: passed from a server to a client component).
export const md = {
  fa: { title: 'رزروهای من', back: 'بازگشت به خانه', lead: 'نام و شمارهٔ تماسی را که هنگام رزرو وارد کرده‌اید بنویسید تا رزروهایتان نمایش داده شود.',
    name: 'نام و نام خانوادگی', phone: 'شمارهٔ تماس', find: 'نمایش رزروها', finding: 'در حال جستجو…', upcoming: 'پیش‌رو', past: 'گذشته', book: 'رزرو جدید',
    empty: 'رزروی با این نام و شماره یافت نشد. لطفاً نام و شماره را همان‌گونه که هنگام رزرو وارد کردید بنویسید.', table: 'میز', code: 'کد پیگیری',
    status: { pending: 'در انتظار تأیید', confirmed: 'تأیید شده', rejected: 'رد شده', cancelled: 'لغو شده', completed: 'انجام شده', no_show: 'عدم حضور' },
    errors: { bad_contact: 'نام یا شمارهٔ تماس معتبر نیست.', rate: 'تعداد درخواست‌ها بیش از حد مجاز بود؛ لطفاً اندکی بعد دوباره تلاش کنید.',
      db: 'اتصال به پایگاه‌داده برقرار نشد؛ لطفاً اندکی بعد دوباره تلاش کنید.', generic: 'خطایی رخ داد؛ لطفاً دوباره تلاش کنید.' } },
  en: { title: 'My bookings', back: 'Back to home', lead: 'Enter the name and phone number you used when booking to see your reservations.',
    name: 'Full name', phone: 'Phone number', find: 'Show my bookings', finding: 'Searching…', upcoming: 'Upcoming', past: 'Past', book: 'New booking',
    empty: 'No booking found for this name and number. Type them exactly as you did when booking.', table: 'Table', code: 'Booking code',
    status: { pending: 'Pending confirmation', confirmed: 'Confirmed', rejected: 'Declined', cancelled: 'Cancelled', completed: 'Completed', no_show: 'No-show' },
    errors: { bad_contact: 'Name or phone looks invalid.', rate: 'Too many attempts. Please try again in a little while.',
      db: 'Cannot reach the database. Is MongoDB running?', generic: 'Something went wrong, please retry.' } },
};
