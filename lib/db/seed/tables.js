// Initial floor plan (x,y in %). Loaded into the `tables` collection on first start; after that the DATABASE is the source of truth.
export const TABLES = [
  { id: 'W1', seats: 2, x: 12, y: 14, zone: 'window' }, { id: 'W2', seats: 2, x: 12, y: 38, zone: 'window' },
  { id: 'W3', seats: 4, x: 12, y: 66, zone: 'window' }, { id: 'A1', seats: 4, x: 40, y: 18, zone: 'indoor' },
  { id: 'A2', seats: 4, x: 40, y: 48, zone: 'indoor' }, { id: 'A3', seats: 6, x: 42, y: 80, zone: 'indoor' },
  { id: 'B1', seats: 2, x: 68, y: 14, zone: 'indoor' }, { id: 'B2', seats: 4, x: 68, y: 42, zone: 'indoor' },
  { id: 'B3', seats: 2, x: 68, y: 68, zone: 'indoor' }, { id: 'T1', seats: 4, x: 90, y: 22, zone: 'terrace' },
  { id: 'T2', seats: 6, x: 90, y: 54, zone: 'terrace' }, { id: 'T3', seats: 2, x: 90, y: 82, zone: 'terrace' },
];
