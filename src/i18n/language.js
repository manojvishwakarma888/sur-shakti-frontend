import { useSyncExternalStore } from 'react';
import { translate } from './translate.js';

export const languages = [
  { code: 'en', label: 'English', locale: 'en-IN' },
  { code: 'hi', label: 'हिन्दी', locale: 'hi-IN' },
  { code: 'gu', label: 'ગુજરાતી', locale: 'gu-IN' },
];
const valid = code => languages.some(item => item.code === code);
let language = 'en';
try { const saved = localStorage.getItem('app-language'); if (valid(saved)) language = saved; } catch { /* Private browsing: use English. */ }
const listeners = new Set();
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
const snapshot = () => language;
const updateDocument = () => { if (typeof document !== 'undefined') { document.documentElement.lang = language; document.documentElement.dir = 'ltr'; } };
updateDocument();
export function setLanguage(code) {
  if (!valid(code) || code === language) return;
  language = code;
  try { localStorage.setItem('app-language', code); } catch { /* Selection still works without storage. */ }
  updateDocument();
  listeners.forEach(listener => listener());
}
export function useLanguage() { return useSyncExternalStore(subscribe, snapshot, () => 'en'); }
export const t = (text, values) => translate(text, language, values);
export const getLocale = () => languages.find(item => item.code === language).locale;

