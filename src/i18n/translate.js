import { messages } from './messages.js';

export function translate(text, language = 'en', values = {}) {
  if (typeof text !== 'string') return text;
  const translated = language === 'en' ? text : messages[text.trim().toLowerCase()]?.[language] ?? text;
  return translated.replace(/\{\{(\w+)\}\}/g, (match, key) => values[key] == null ? match : String(values[key]));
}

