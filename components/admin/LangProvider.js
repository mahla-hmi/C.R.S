'use client';
import { createContext, useContext, useMemo } from 'react';
import { A, numberFor, fill } from '@/lib/admin/i18n';

const Ctx = createContext(null);
// wraps the whole panel (app/admin/layout.js) so every client component can call useAdmin()
export function LangProvider({ lang, children }) {
  const value = useMemo(() => ({ lang, t: A[lang], n: numberFor(lang), fill }), [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAdmin = () => useContext(Ctx);
