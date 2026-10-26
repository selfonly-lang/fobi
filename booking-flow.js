import {validatePaymentFields} from './payment-flow-model.js';
const API='https://tlpsqaywjcgowprhauod.supabase.co/functions/v1/fobi-public';
const PAY='https://tlpsqaywjcgowprhauod.supabase.co/functions/v1/fobi-payment';
const qs=new URLSearchParams(location.search),type=qs.get('type')==='sponsor'?'sponsor':'ticket';
const el=id=>document.getElementById(id),form=el('orderForm');
let currentOrder='',expectedAmount=0,creating=false,paying=false;
function message(id,text){el(id).textContent=text;el(id).hidden=!text;}
function updateTotal(){if(type!=='ticket')return;const count=Number(el('count').value),text='NT$'+(4000*count).toLocaleString('en-US');el('totalPrice').textContent=text;el('mobileTotal').textContent=text;el('countSummary').textContent=count+' 張票';}
function setCreateBusy(value){creating=value;el('submitBtn').disabled=value;el('mobileBuy').disabled=value;el('submitBtn').textContent=value?'正在前往綠界…':type==='sponsor'?'前往綠界支付贊助 →':'前往綠界付款 →';}
async function startPayment(){
  if(!currentOrder||paying)return;
  paying=true;el('payBtn').disabled=true;el('payBtn').textContent='正在前往綠界…';message('paymentError','');
  try{
    const response=await fetch(PAY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start',order_no:currentOrder}),signal:AbortSignal.timeout(20000)});
    const data=await response.json();if(!response.ok)throw Error(data.error||'payment_unavailable');
    const target=validatePaymentFields(data,currentOrder,expectedAmount);
    const paymentForm=document.createElement('form');paymentForm.method='POST';paymentForm.action=target;
    for(const [name,value] of Object.entries(data.fields)){const input=document.createElement('input');input.type='hidden';input.name=name;input.value=String(value);paymentForm.append(input);}
    document.body.append(paymentForm);paymentForm.submit();
  }catch{
    paying=false;el('payBtn').disabled=false;el('payBtn').textContent='重新前往綠界付款 →';el('receiptHeading').textContent='訂單已保留';message('paymentError','暫時無法開啟綠界，請重試付款，無須重新下單。');
  }
}
function showReceipt(){el('orderNo').textContent=currentOrder;form.style.display='none';el('receipt').classList.add('show');document.body.classList.add('order-created');el('receiptHeading').textContent='正在前往綠界付款';el('receipt').focus();el('receipt').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});}
form.addEventListener('submit',async event=>{
  event.preventDefault();if(creating||paying)return;if(currentOrder){await startPayment();return;}
  if(!window.fobiMember){message('orderError','購票服務仍在載入，請稍後再試。');return;}
  if(!form.reportValidity())return;message('orderError','');setCreateBusy(true);
  try{
    if(!await window.fobiMember.beforeOrder())return;
    const base={contact_name:el('name').value,phone:el('phone').value,email:el('email').value,note:el('note').value};
    const payload=type==='sponsor'?{...base,action:'reserve_country',country_code:el('country').value,tier:el('tier').value,company:el('company').value}:{...base,action:'create_member_order',member_count:Number(el('count').value)};
    const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
    const data=await response.json();if(!response.ok||!data.ok||typeof data.order_no!=='string'||!data.order_no)throw Error('order_failed');
    currentOrder=data.order_no;expectedAmount=type==='ticket'?4000*Number(el('count').value):0;
    try{localStorage.setItem('fobi_last_order',currentOrder);}catch{}
    window.fobiMember.clearDraft();showReceipt();await startPayment();
  }catch{message('orderError','目前無法建立訂單，請稍後再試。');}
  finally{setCreateBusy(false);}
});
el('payBtn').addEventListener('click',startPayment);
el('count').addEventListener('change',updateTotal);window.addEventListener('fobi:draft-restored',updateTotal);
window.fobiCheckout={continueAfterLogin(){updateTotal();if(form.reportValidity()){el('memberStatus').textContent='登入完成，正在前往綠界付款…';form.requestSubmit();return true;}el('memberStatus').textContent='登入完成，請補齊聯絡資料，再按「前往綠界付款」。';return false;}};
document.body.dataset.bookingType=type;(type==='ticket'?el('ticketTab'):el('sponsorTab')).classList.add('active');
if(type==='sponsor'){
  el('title').textContent='企業國家贊助';el('summaryEy').textContent='SPONSOR A COUNTRY';el('summaryTitle').textContent='認領一個國家';el('summaryPrice').textContent='NT$40,000 起';el('priceUnit').hidden=true;el('totalRow').hidden=true;el('sponsorFields').style.display='grid';el('ticketFields').style.display='none';el('nextStep').textContent='確認贊助資料後，直接前往綠界付款。';
  el('facts').innerHTML='<p>FOBI 國際總決賽現場・官方品牌合作曝光・尊榮貴賓接待</p><p>VIP1／VIP2／VIP3 每個贊助方案目前均含 10 張入場票</p><p>VIP1／VIP2 含 OPERA 慶功宴；實際權益依後台方案設定。</p>';
  if(qs.get('tier'))el('tier').value=qs.get('tier');
  fetch(API+'?resource=countries').then(r=>r.json()).then(data=>{const select=el('country');select.replaceChildren();for(const country of (data.countries||[]).filter(x=>x.status==='available')){const option=document.createElement('option');option.value=country.code;option.textContent=country.name_en+' · Table '+String(country.table_no).padStart(2,'0');select.append(option);}if(qs.get('country')&&[...select.options].some(x=>x.value===qs.get('country')))select.value=qs.get('country');else window.fobiMember?.restoreCountry();}).catch(()=>{el('country').replaceChildren(new Option('國家名單讀取失敗，請重新整理',''));});
}else{el('facts').innerHTML='<p>2026.10.30 世界美顏小姐總決賽</p><p>19:00 頒獎典禮暨國際晚宴・OPERA After Party</p><p>每人 NT$4,000，實際入場權益依票券與主辦公告。</p>';}
setCreateBusy(false);updateTotal();
fetch(PAY+'?action=status',{signal:AbortSignal.timeout(8000)}).then(r=>r.json()).then(data=>{if(data.mode==='stage'){el('paymentEnvironment').hidden=false;el('paymentEnvironment').textContent='目前為綠界測試付款，不會完成正式扣款。';}else if(data.mode==='production'&&!data.ready){el('paymentEnvironment').hidden=false;el('paymentEnvironment').textContent='正式付款設定尚未完成，請洽活動方。';}}).catch(()=>{});
