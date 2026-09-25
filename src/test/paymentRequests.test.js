import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the actual page request functions against the backend DTO contract.
const source = ['MyBills', 'PaymentReview'].map(page => readFileSync(new URL('../pages/' + page + '.jsx', import.meta.url), 'utf8')).join('\n');
function requestFunction(name, response = { transactionId: 42 }) {
  const start = source.indexOf('  const ' + name + ' =');
  assert.ok(start >= 0);
  const end = source.indexOf('\n  };', start) + 5;
  const calls = [];
  const context = vm.createContext({
    api: { post: async (url, payload) => { calls.push({ url, payload }); return { data: response }; } },
    extractTransactionEntityId: payload => payload.transactionId,
  });
  const fn = vm.runInContext(source.slice(start, end) + '\n' + name, context);
  return { fn, calls };
}
test('cash creation uses numeric BillId, AmountPaid and PaymentMode DTO fields', async () => {
  const { fn, calls } = requestFunction('createPaymentTransaction');
  assert.equal(await fn({ billId: '17', amount: 500, method: 'CASH', idempotencyKey: 'cash-17' }), '42');
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{ url: '/payment-transactions/create', payload: { billId: 17, amountPaid: 500, paymentMode: 'CASH', idempotencyKey: 'cash-17' } }]);
});
test('UPI creation preserves decimal amounts and retry idempotency keys', async () => {
  const { fn, calls } = requestFunction('createPaymentTransaction');
  await fn({ billId: '18', amount: '500.25', idempotencyKey: 'retry-18' });
  assert.equal(calls[0].payload.amountPaid, 500.25);
  assert.equal(calls[0].payload.paymentMode, 'UPI');
  assert.equal(calls[0].payload.idempotencyKey, 'retry-18');
});
test('submission sends the required TransactionReferenceId', async () => {
  const { fn, calls } = requestFunction('submitPaymentTransaction');
  await fn({ paymentTransactionId: 42, transactionId: 'UTR123456' });
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{ url: '/payment-transactions/42/submit', payload: { transactionReferenceId: 'UTR123456' } }]);
});
test('manual verification includes the cash reference in supported Notes', async () => {
  const { fn, calls } = requestFunction('manualVerifyPaymentTransaction');
  await fn({ paymentTransactionId: 42, transactionId: 'CASH-17' });
  assert.equal(calls[0].url, '/payment-transactions/admin/42/manual-verify');
  assert.equal(calls[0].payload.notes, 'Cash payment verified by admin. Reference: CASH-17');
});
test('staff verification sends approval and failure reason fields', async () => {
  const { fn, calls } = requestFunction('verifyPaymentTransaction');
  await fn({ paymentTransactionId: 42, isVerified: false, failureReason: 'Reference did not match.' });
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    url: '/payment-transactions/42/verify',
    payload: { isVerified: false, failureReason: 'Reference did not match.' },
  }]);
});
test('staff retry sends the optional reason field', async () => {
  const { fn, calls } = requestFunction('retryPaymentVerification');
  await fn({ paymentTransactionId: 42, reason: 'Gateway is available again.' });
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    url: '/payment-transactions/admin/42/retry-verification',
    payload: { reason: 'Gateway is available again.' },
  }]);
});
