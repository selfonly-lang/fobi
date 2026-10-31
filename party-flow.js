import {validatePaymentFields} from './payment-flow-model.js';
const API='https://tlpsqaywjcgowprhauod.supabase.co/functions/v1/fobi-party';
const form=document.getElementById('partyForm'),pay=document.getElementById('pay'),notice=document.getElementById('paymentStatus'),status=document.getElementById('formStatus'),memberStatus=document.getElementById('memberStatus');
const buttons=[...document.querySelectorAll('[data-provider]')];
const fields=['name','phone','email','quantity'];
let ready=false,busy=false,key=crypto.randomUUID(),orderNo='';
const money=n=>'NT$'+n.toLocaleString('en-US');
function updateTotal(){document.getElementById('total').textContent=money(Number(form.quantity.value)*2500);}
form.quantity.addEventListener('change',updateTotal);
function draft(intent=false){try{sessionStorage.setItem('fobi_party_draft',JSON.stringify({exp:Date.now()+600000,key,intent,values:Object.fromEntries(fields.map(id=>[id,document.getElementById(id).value]))}));}catch{}}
let autoPay=false;
try{const saved=JSON.parse(sessionStorage.getItem('fobi_party_draft'));if(saved?.exp>Date.now()){for(const id of fields)if(typeof saved.values?.[id]==='string')document.getElementById(id).value=saved.values[id];key=saved.key||key;autoPay=saved.intent===true;}sessionStorage.removeItem('fobi_party_draft');}catch{}
updateTotal();
async function getStatus(){try{const response=await fetch(API+'?action=status',{cache:'no-store',signal:AbortSignal.timeout(10000)}),data=await response.json();ready=response.ok&&data.ready===true&&data.mode==='production'&&data.sales_open===true&&data.price===2500;pay.disabled=!ready;notice.textContent=ready?'綠界安全付款｜每人 NT$2,500':data.sales_open===false?'本次派對已結束，線上報名已關閉。':'線上付款準備中，報名請洽 Arthur Lin：0935-523-001。';}catch{ready=false;pay.disabled=true;notice.textContent='暫時無法確認付款狀態，請稍後重試或聯絡活動窗口。';}}
async function openPayment(){
 if(busy||!ready||!form.reportValidity())return;
 busy=true;pay.disabled=true;status.textContent='正在準備安全付款…';draft(false);
 try{
  const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start',idempotency_key:key,...Object.fromEntries(fields.map(id=>[id,id==='quantity'?Number(document.getElementById(id).value):document.getElementById(id).value.trim()]))}),signal:AbortSignal.timeout(18000)}),data=await response.json();
  if(!response.ok||!data.ok){if(data.error==='already_paid'){orderNo=data.order_no;await showOrder(orderNo);return;}if(data.error==='order_changed'){key=crypto.randomUUID();draft(false);throw new Error('資料已變更，請確認後再按一次付款。');}throw new Error(data.error==='payment_unavailable'?'付款尚未開放，請聯絡活動窗口。':'目前無法準備付款，請稍後重試。');}
  orderNo=data.order_no;
  if(data.mode!=='production'||data.payment_url!=='https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5'||!validatePaymentFields(data,orderNo,Number(form.quantity.value)*2500))throw new Error('付款驗證未完成，請聯絡活動窗口。');
  const target=document.createElement('form');target.method='POST';target.action=data.payment_url;target.hidden=true;
  for(const [name,value]of Object.entries(data.fields)){const input=document.createElement('input');input.type='hidden';input.name=name;input.value=String(value);target.append(input);}
  document.body.append(target);status.textContent='即將前往綠界安全付款…';target.submit();
 }catch(error){status.textContent=error.message||'連線失敗，請稍後重試。';}
 finally{busy=false;pay.disabled=!ready;}
}
form.addEventListener('submit',event=>{event.preventDefault();openPayment();});
async function showOrder(value){
 const box=document.getElementById('receipt');box.hidden=false;box.textContent='正在確認付款結果…';
 try{const response=await fetch(API+'?action=order&order='+encodeURIComponent(value),{cache:'no-store',signal:AbortSignal.timeout(10000)}),data=await response.json();if(!response.ok||!data.order)throw new Error();const o=data.order;box.replaceChildren();const title=document.createElement('strong');title.textContent=o.payment_status==='paid'?'付款成功，期待今晚相見！':'尚未收到付款成功通知';box.append(title,document.createElement('br'),document.createTextNode(o.quantity+' 位 · '+money(o.amount)),document.createElement('br'),document.createTextNode('訂單編號：'+o.order_no));if(o.payment_status==='paid'){pay.disabled=true;ready=false;try{sessionStorage.removeItem('fobi_party_draft');}catch{}}else{const check=document.createElement('button');check.type='button';check.textContent='重新確認付款狀態';check.className='text-link';check.addEventListener('click',()=>showOrder(value));box.append(document.createElement('br'),check);}box.scrollIntoView({block:'center'});}catch{box.textContent='目前無法確認付款結果，請聯絡 Arthur Lin 查詢；請勿重複付款。';}
}
async function member(){
 let available=false;try{const r=await fetch('/api/member?action=status',{signal:AbortSignal.timeout(8000)});available=r.ok&&(await r.json()).available===true;}catch{}
 buttons.forEach(b=>b.disabled=!available);
 if(!available)memberStatus.textContent='快速登入暫未開放，您可直接填寫資料。';
 const params=new URLSearchParams(location.search),result=params.get('member_result');
 if(result){params.delete('member_result');history.replaceState(null,'',location.pathname+(params.size?'?'+params:''));if(result==='success'&&available){try{const r=await fetch('/api/member?action=profile',{method:'POST',signal:AbortSignal.timeout(8000)}),d=await r.json();if(!r.ok||!d.contact)throw new Error();for(const id of ['name','phone','email'])if(d.contact[id])document.getElementById(id).value=d.contact[id];memberStatus.textContent='已帶入會員資料，請確認報名人數。';if(autoPay&&ready)form.requestSubmit();}catch{memberStatus.textContent='資料帶入未完成，請直接填表或重新登入。';}}else memberStatus.textContent='登入未完成，可重試或直接填寫資料。';}
}
buttons.forEach(button=>button.addEventListener('click',async()=>{draft(true);buttons.forEach(b=>b.disabled=true);memberStatus.textContent='正在前往安全登入…';try{const r=await fetch('/api/member?action=start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:button.dataset.provider,returnPath:'/party'}),signal:AbortSignal.timeout(8000)}),d=await r.json(),u=new URL(d.url);if(!r.ok||u.origin!=='https://www.self.com.tw'||u.pathname!=='/oauth/authorize')throw new Error();location.assign(u.href);}catch{buttons.forEach(b=>b.disabled=false);memberStatus.textContent='無法開啟登入，請直接填寫資料。';}}));
await getStatus();const order=new URLSearchParams(location.search).get('order');if(order&&/^FP[a-f0-9]{32}$/.test(order)){await showOrder(order);}else await member();
