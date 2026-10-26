export function ecpayPaymentTarget(value) {
  const url = new URL(value);
  if (!['https://payment.ecpay.com.tw', 'https://payment-stage.ecpay.com.tw'].includes(url.origin) || url.pathname !== '/Cashier/AioCheckOut/V5' || url.username || url.password || url.search || url.hash) throw new Error('invalid_payment_destination');
  return url.href;
}
export function wantsPaymentAfterLogin(saved, type, now = Date.now()) {
  return Boolean(type === 'ticket' && saved?.type === type && Number.isFinite(saved.exp) && saved.exp > now && saved.continueToPayment === true);
}
export function validatePaymentFields(data, orderNo, expectedAmount) {
  if (!data?.ok || data.order_no !== orderNo || !data.fields || Array.isArray(data.fields)) throw new Error('invalid_payment_response');
  const target = ecpayPaymentTarget(data.payment_url);
  if (!Number.isInteger(Number(data.fields.TotalAmount)) || Number(data.fields.TotalAmount) <= 0 || (expectedAmount && Number(data.fields.TotalAmount) !== expectedAmount) || !/^[A-F0-9]{64}$/i.test(data.fields.CheckMacValue || '')) throw new Error('invalid_payment_amount_or_signature');
  return target;
}
