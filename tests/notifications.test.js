import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deliverNotice,paymentNotice} from '../notifications.js';
const order={id:'synthetic-order',order_no:'QA-ONLY',payment_status:'paid'};
const tickets=[{ticket_no:'QA-000001',ticket_type:'MEMBER',afterparty_entitlement:true,qr_token:'01234567-89ab-4cde-8f01-23456789abcd'}];
test('unpaid orders cannot produce payment confirmation',()=>assert.throws(()=>paymentNotice({...order,payment_status:'pending'},tickets)));
test('unconfirmed recipient cannot send even in dry run',async()=>assert.rejects(()=>deliverNotice({order,tickets,email:'qa@example.invalid'}),/recipient_not_confirmed/));
test('dry run produces correct venue, ticket and entitlement without sending',async()=>{
 let calls=0;const r=await deliverNotice({order,tickets,email:'qa@example.invalid',confirmedRecipients:['qa@example.invalid'],send:async()=>calls++});
 assert.equal(calls,0);assert.match(r.content.text,/臺北新板希爾頓酒店/);assert.match(r.content.text,/慶功宴：包含/);assert.match(r.content.text,/ticket.html\?token=/);
});
test('LINE OA public handle cannot substitute for recipient user id',async()=>{
 await assert.rejects(()=>deliverNotice({order,tickets,channel:'line',lineUserId:'@673opbay',confirmedRecipients:['@673opbay']}),/verified_line_user_id_required/);
});
test('injected provider receives stable idempotency key; acknowledgement required',async()=>{
 const args={order,tickets,email:'qa@example.invalid',confirmedRecipients:['qa@example.invalid'],dryRun:false};
 const r=await deliverNotice({...args,send:async x=>({id:x.key})});
 assert.equal(r.providerId,'synthetic-order:payment_ticket:email');
 await assert.rejects(()=>deliverNotice({...args,send:async()=>({})}),/delivery_not_acknowledged/);
});
