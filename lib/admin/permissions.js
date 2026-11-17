// What a team member can do. The owner role always has everything; a "staff" member only gets the boxes the owner ticks.
// To add a new permission later, add it here and check it with can() in the page AND the API route.
// (the visible names and explanations of each permission are in lib/admin/i18n.js, under "perm")
export const PERM_LIST = [{ id: 'reservations.view' }, { id: 'reservations.manage' }, { id: 'menu.manage' }];
export const ALL_PERMS = PERM_LIST.map((p) => p.id);
// keeps only known permissions; "manage" always includes "view"
export function normalizePerms(list) {
  const set = new Set((Array.isArray(list) ? list : []).filter((x) => ALL_PERMS.includes(x)));
  if (set.has('reservations.manage')) set.add('reservations.view');
  return ALL_PERMS.filter((p) => set.has(p));
}
export const can = (session, perm) => !!session && (session.role === 'owner' || (session.perms || []).includes(perm));
