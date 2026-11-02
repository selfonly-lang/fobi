(()=>{
 const API='https://tlpsqaywjcgowprhauod.supabase.co/functions/v1/pageant-platform';
 document.querySelectorAll('[data-intake]').forEach(form=>{let busy=false,key=crypto.randomUUID();const button=form.querySelector('[type=submit]'),status=form.querySelector('.form-status');
 form.addEventListener('submit',async event=>{event.preventDefault();if(busy||!form.reportValidity())return;busy=true;button.disabled=true;status.textContent='正在送出需求…';const fd=new FormData(form);const data=Object.fromEntries(fd.entries());data.services=fd.getAll('services');data.consent=fd.get('consent')==='on';data.kind=form.dataset.kind;data.idempotency_key=key;data.action='submit';
 try{const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(15000)}),result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error==='rate_limited'?'短時間送出較多需求，請稍後再試或直接聯絡專案窗口。':'目前無法送出需求，請稍後重試。');status.textContent='需求已受理。案件編號：'+result.reference+'。請保存編號，專案窗口將依您提供的聯絡方式回覆；此紀錄不代表已完成報名、付款或簽約。';form.reset();key=crypto.randomUUID();}catch(error){status.textContent=(error.message||'連線暫時中斷。')+' 您可聯絡 Arthur Lin：0935-523-001，LINE beautiself。';}finally{busy=false;button.disabled=false;}});
 });
})();
