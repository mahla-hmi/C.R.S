// Reservation status rules. A status can only be reached from the listed ones.
export const LIVE = ['pending', 'confirmed']; // these keep the table blocked (active:true)
export const MOVES = {
  confirmed: ['pending'],
  rejected: ['pending'],
  cancelled: ['pending', 'confirmed'],
  completed: ['confirmed'],
  no_show: ['confirmed'],
};
export const isLive = (status) => LIVE.includes(status);
