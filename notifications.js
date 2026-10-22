// Pure, injectable delivery adapter. No credentials or customer data in this module.
export function paymentNotice(order,tickets){
 if(order.payment_status!=='paid'||!tickets.length)throw new Error('tickets_not_ready');
 return {
  subject:'FOBI 2026｜付款確認與電子票券',
  text:['您的付款已確認。','訂單：'+order.order_no,'2026/10/30 14:00 世界美顏小姐總決賽','總決賽場地：臺北新板希爾頓酒店','晚上另有慶功宴，依票券所列權益入場。',...tickets.map(t=>t.ticket_no+'｜'+t.ticket_type+'｜慶功宴：'+(t.afterparty_entitlement?'包含':'不包含')+'\nhttps://fobi.self.com.tw/ticket.html?token='+encodeURIComponent(t.qr_token)),'請先開啟票券、儲存截圖。請勿公開票券或 Token，現場仍須連線核銷。'].join('\n')
 };
}
export async function deliverNotice({order,tickets,email,lineUserId,channel='email',confirmedRecipients=[],dryRun=true,send}){
 const content=paymentNotice(order,tickets);
 const recipient=channel==='email'?email:lineUserId;
 if(!['email','line'].includes(channel)||!recipient)throw new Error('recipient_missing');
 if(!confirmedRecipients.includes(recipient))throw new Error('recipient_not_confirmed');
 if(channel==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))throw new Error('invalid_email');
 if(channel==='line'&&!/^U[0-9a-f]{32}$/.test(recipient))throw new Error('verified_line_user_id_required');
 const key=order.id+':payment_ticket:'+channel;
 if(dryRun)return {dryRun:true,recipient,channel,key,content};
 if(typeof send!=='function')throw new Error('sender_not_configured');
 const receipt=await send({recipient,channel,key,content});
 if(!receipt?.id)throw new Error('delivery_not_acknowledged');
 return {dryRun:false,providerId:receipt.id,key};
}
