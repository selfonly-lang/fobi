import { BrowserQRCodeReader } from '@zxing/browser';
import { ticketToken } from './ticket-token.js';
const ADMIN='https://tlpsqaywjcgowprhauod.supabase.co/functions/v1/fobi-admin';
const el = id => document.getElementById(id);
const errors = {already_checked_in:'此入口已核銷，請勿重複放行',vip_not_entitled:'此票不含 VIP 入口',afterparty_not_entitled:'此票不含慶功宴',ticket_void:'票券已作廢',ticket_not_found:'查無票券',invalid_gate:'入口錯誤',order_not_paid:'訂單尚未確認付款',admin_session_expired:'管理員登入已過期'};
el('token').value=new URLSearchParams(location.search).get('token')||'';
let busy=false, controls;
function result(ok, message) {
  el('result').className='show '+(ok?'ok':'bad');
  el('result').textContent=message;
}
function stop() {
  controls?.stop(); controls=null;
  el('camera').hidden=true; el('stopScan').hidden=true;
  el('scan').disabled=false;
}
el('stopScan').onclick=stop;
window.addEventListener('pagehide',stop);
el('scan').onclick=async()=>{
  if(!navigator.mediaDevices?.getUserMedia){el('scanStatus').textContent='此裝置無法使用相機，請使用掃描器或手動輸入 Token';return;}
  el('scan').disabled=true;el('camera').hidden=false;el('stopScan').hidden=false;
  el('scanStatus').textContent='掃描後請確認入口，再按確認報到';
  try {
    const reader=new BrowserQRCodeReader();
    controls=await reader.decodeFromVideoDevice(undefined,el('camera'),(scan,_error,c)=>{
      if(scan) {
        try { el('token').value=ticketToken(scan.getText()); c.stop(); stop(); el('scanStatus').textContent='已讀取 QR，尚未核銷，請確認入口'; }
        catch { el('scanStatus').textContent='這不是 FOBI 票券 QR'; }
      }
    });
  } catch { stop(); el('scanStatus').textContent='相機無法開啟，請允許相機權限或手動輸入 Token'; }
};
el('go').onclick=async()=>{
  if(busy)return;
  if(!navigator.onLine){result(false,'目前離線，未核銷。請恢復網路後重試，勿直接放行');return;}
  const key=sessionStorage.getItem('fobi_admin_token')||localStorage.getItem('fobi_admin_token')||'';
  if(!key){result(false,'請先從 FOBI 後台完成管理員登入');return;}
  let qr;try{qr=ticketToken(el('token').value)}catch{result(false,'QR 格式錯誤，請重新掃描');return;}
  busy=true;el('go').disabled=true;result(false,'正在確認，請等候結果');
  try{
    const r=await fetch(ADMIN,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({action:'ticket_checkin',qr_token:qr,gate:el('gate').value}),signal:AbortSignal.timeout(15000)});
    const d=await r.json();
    if(!r.ok||!d.ok){result(false,errors[d.error]||'無法核銷，請確認票券或重新登入');return;}
    result(true,'報到成功：'+d.ticket_no+' · '+(d.holder_name||'未命名')+' · '+el('gate').value);
  }catch{result(false,'連線中斷，結果尚未確認。請恢復網路並查詢／重掃，勿直接放行');}
  finally{busy=false;el('go').disabled=false;}
};
