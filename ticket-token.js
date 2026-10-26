export function ticketToken(raw) {
  let value = String(raw || '').trim();
  if (value.startsWith('https://')) {
    const url = new URL(value);
    if (url.origin !== 'https://fobi.self.com.tw' || url.pathname !== '/ticket.html') throw new Error('invalid_qr');
    value = url.searchParams.get('token') || '';
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error('invalid_qr');
  return value.toLowerCase();
}
