const PASSWORD_ROTATION_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const getPolicyKey = (email) => `surshakti_password_last_updated_${normalizeEmail(email)}`;

export const markPasswordUpdatedNow = (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  localStorage.setItem(getPolicyKey(normalized), String(Date.now()));
};

export const isPasswordUpdateDue = (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  const key = getPolicyKey(normalized);
  const stored = localStorage.getItem(key);

  // First successful login creates the baseline, so reminder starts after 30 days.
  if (!stored) {
    localStorage.setItem(key, String(Date.now()));
    return false;
  }

  const lastUpdatedAt = Number(stored);
  if (!Number.isFinite(lastUpdatedAt)) {
    localStorage.setItem(key, String(Date.now()));
    return false;
  }

  return Date.now() - lastUpdatedAt >= PASSWORD_ROTATION_INTERVAL_MS;
};
