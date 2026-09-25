import api from './api';
export const staffRole = user => ['admin', 'secretary'].includes(String(user?.role).toLowerCase());
export const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value || 0));
export const flatPath = flat => '/maintenance/flats/' + encodeURIComponent(flat.trim().toUpperCase());
export const noRetry = { 'axios-retry': { retries: 0 } };
export const newKey = () => crypto.randomUUID();
export function validateProof(file) {
  if (!file) return '';
  if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) return 'Choose JPEG, PNG, WebP, or PDF.';
  if (!file.size || file.size > 5 * 1024 * 1024) return 'Choose a nonempty file no larger than 5 MB.';
  return '';
}
export async function listPage(path, params = {}) {
  const { data } = await api.get(path, { params: { take: 50, ...params } });
  if (!Array.isArray(data)) throw new Error('The server returned an unexpected list.');
  return data;
}

// Payment discovery uses an envelope rather than a plain array.
export async function paymentHistory(params = {}) {
  const { data } = await api.get('/payment-transactions', { params: { skip: 0, take: 50, ...params } });
  if (!data || !Array.isArray(data.items) || !Number.isInteger(data.totalCount)) throw new Error('The server returned an unexpected payment history.');
  return data;
}
