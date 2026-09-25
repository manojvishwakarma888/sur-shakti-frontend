export const SOCIETY_UPI_ID = '7276450016@ybl';
export const SOCIETY_NAME = 'Sur Shakti Residency';

export function createSocietyUpiUri(amount, note) {
  return `upi://pay?${new URLSearchParams({
    pa: SOCIETY_UPI_ID,
    pn: SOCIETY_NAME,
    am: String(amount),
    cu: 'INR',
    tn: note,
  }).toString()}`;
}
