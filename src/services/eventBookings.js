import api from './api';

const basePath = '/event-bookings';

export async function listEventBookings(params = {}) {
  const { data } = await api.get(basePath, { params: { page: 1, pageSize: 50, ...params } });
  if (!Array.isArray(data)) throw new Error('The server returned an unexpected booking list.');
  return data;
}

export async function createEventBooking(payload) {
  const { data } = await api.post(basePath, payload);
  return data;
}

export async function quoteEventBooking(payload, signal) {
  const { data } = await api.post(`${basePath}/quote`, payload, { signal });
  return data;
}

export async function getEventAvailability(startsAt, endsAt, signal) {
  const { data } = await api.get(`${basePath}/availability`, { params: { startsAt, endsAt }, signal });
  return data;
}

export async function reviewEventBooking(id, payload) {
  const { data } = await api.post(`${basePath}/${id}/review`, payload);
  return data;
}

export async function cancelEventBooking(id, reason) {
  const { data } = await api.post(`${basePath}/${id}/cancel`, { reason });
  return data;
}

export async function getEventInventory() {
  const { data } = await api.get(`${basePath}/inventory`);
  return data;
}

export async function updateEventInventory(totalChairs) {
  const { data } = await api.put(`${basePath}/inventory`, { totalChairs });
  return data;
}

export async function listPlotBlocks(startsAt, endsAt) {
  const { data } = await api.get(`${basePath}/plot-blocks`, { params: { startsAt, endsAt } });
  if (!Array.isArray(data)) throw new Error('The server returned an unexpected plot closure list.');
  return data;
}

export async function createPlotBlock(payload) {
  const { data } = await api.post(`${basePath}/plot-blocks`, payload);
  return data;
}

export async function deletePlotBlock(id) {
  await api.delete(`${basePath}/plot-blocks/${id}`);
}

export async function getEventPaymentSummary(id) {
  const { data } = await api.get(`${basePath}/${id}/payment-summary`);
  return data;
}

export async function getEventPaymentInstructions(id) {
  const { data } = await api.get(`${basePath}/${id}/payment-instructions`);
  return data;
}

export async function listEventPayments(id) {
  const { data } = await api.get(`${basePath}/${id}/payments`);
  return Array.isArray(data) ? data : [];
}

export async function submitEventUpiPayment(id, payload) {
  const { data } = await api.post(`${basePath}/${id}/payments/upi`, payload);
  return data;
}

export async function collectEventCashPayment(id, payload) {
  const { data } = await api.post(`${basePath}/${id}/payments/cash`, payload);
  return data;
}

export async function reviewEventPayment(id, paymentId, payload) {
  const { data } = await api.post(`${basePath}/${id}/payments/${paymentId}/review`, payload);
  return data;
}

export async function getEventPaymentReceipt(id, paymentId) {
  const { data } = await api.get(`${basePath}/${id}/payments/${paymentId}/receipt`);
  return data;
}

export async function getEventSettlement(id) {
  const { data } = await api.get(`${basePath}/${id}/settlement`);
  return data;
}

export async function createEventSettlement(id, payload) {
  const { data } = await api.post(`${basePath}/${id}/settlement`, payload);
  return data;
}

export async function listEventRefunds(id) {
  const { data } = await api.get(`${basePath}/${id}/refunds`);
  return Array.isArray(data) ? data : [];
}

export async function createEventRefund(id, payload) {
  const { data } = await api.post(`${basePath}/${id}/refunds`, payload);
  return data;
}
