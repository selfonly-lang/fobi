import {wantsPaymentAfterLogin} from './payment-flow-model.js';
const status = document.getElementById('memberStatus');
const buttons = [...document.querySelectorAll('[data-provider]')];
const params = new URLSearchParams(location.search);
const type = params.get('type') === 'sponsor' ? 'sponsor' : 'ticket';
const key = 'fobi_contact_draft_v2';
const fields = ['name', 'phone', 'email', 'company', 'count', 'tier', 'country', 'note'];
let authenticated = false;
let asked = false;
let prompting = false;
let restoredCountry = '';
let continueToPayment = false;

function saveDraft(options = {}) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ type, continueToPayment: options.continueToPayment === true, exp: Date.now() + 600000, fields: Object.fromEntries(fields.map(id => [id, document.getElementById(id).value])) }));
  } catch { /* Storage is optional; purchasing must still work. */ }
}
function clearDraft() { try { sessionStorage.removeItem(key); } catch {} }
function restoreDraft() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || 'null');
    clearDraft();
    if (!saved || saved.exp <= Date.now() || saved.type !== type) return;
    continueToPayment = wantsPaymentAfterLogin(saved, type);
    for (const id of fields) {
      if (typeof saved.fields?.[id] === 'string') {
        if (id === 'country') restoredCountry = saved.fields[id];
        else document.getElementById(id).value = saved.fields[id];
      }
    }
  } catch { clearDraft(); }
}
function restoreCountry() {
  const select = document.getElementById('country');
  if ([...select.options].some(option => option.value === restoredCountry)) select.value = restoredCountry;
}

async function beforeOrder() { return true; }

window.fobiMember = { beforeOrder, clearDraft, restoreCountry };
restoreDraft();
window.dispatchEvent(new Event('fobi:draft-restored'));
restoreCountry();

async function initialize() {
  let available = false;
  try {
    const response = await fetch('/api/member?action=status', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    const data = await response.json();
    available = response.ok && data.available === true;
  } catch {}
  buttons.forEach(button => { button.disabled = !available; });
  status.textContent = available ? '登入後將依所選張數直接前往綠界付款。' : '會員快速登入暫未開放，可直接填表購票。';
  if (params.has('member_result')) {
    const result = params.get('member_result');
    params.delete('member_result');
    history.replaceState(null, '', location.pathname + (params.size ? '?' + params : ''));
    if (result === 'success' && available) {
      try {
        const response = await fetch('/api/member?action=profile', { method: 'POST', signal: AbortSignal.timeout(8000) });
        const data = await response.json();
        if (!response.ok || !data.contact) throw new Error();
        for (const id of ['name', 'phone', 'email']) {
          if (typeof data.contact[id] === 'string' && data.contact[id]) document.getElementById(id).value = data.contact[id];
        }
        authenticated = true;
        status.textContent = '已帶入聯絡資料。';
        if (continueToPayment && type === 'ticket') { continueToPayment = false; window.fobiCheckout?.continueAfterLogin(); }
      } catch { status.textContent = '會員資料帶入未完成，請重新登入或直接填表。請確認下方填表內容。'; }
    } else status.textContent = '會員登入未完成，請重試或直接填表。請確認下方填表內容。';
  }
}

buttons.forEach(button => button.addEventListener('click', async () => {
  saveDraft({ continueToPayment: type === 'ticket' });
  buttons.forEach(item => { item.disabled = true; });
  status.textContent = '正在前往安全登入…';
  try {
    const response = await fetch('/api/member?action=start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: button.dataset.provider, returnPath: location.pathname + location.search }), signal: AbortSignal.timeout(8000) });
    const data = await response.json();
    const target = new URL(data.url);
    if (!response.ok || target.origin !== 'https://www.self.com.tw' || target.pathname !== '/oauth/authorize') throw new Error();
    location.assign(target.toString());
  } catch {
    clearDraft();
    buttons.forEach(item => { item.disabled = false; });
    status.textContent = '目前無法開啟會員登入，請稍後重試或直接填表。';
  }
}));

initialize();

document.querySelectorAll("[data-member-join]").forEach(link => link.addEventListener("click", saveDraft));
