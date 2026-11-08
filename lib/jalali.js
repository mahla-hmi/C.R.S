// Persian locale -> Shamsi calendar via built-in Intl; English -> normal Gregorian. ISO strings stay Gregorian internally.
export const fmt = (iso, loc, o) =>
  new Intl.DateTimeFormat(loc === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', o).format(new Date(iso + 'T12:00:00'));
