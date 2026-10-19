import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const fixture=JSON.parse(await readFile(new URL('./fixtures/live-schema-20261019.json',import.meta.url)));
const db=new PGlite();
await db.exec("create role anon; create role authenticated; create role service_role; create sequence fobi_ticket_serial_seq;");
const tables=Map.groupBy(fixture.tables,x=>x.table_name);
for(const [name,cols] of tables) {
 const definitions=cols.map(c=>'"'+c.column_name+'" '+(c.data_type==='USER-DEFINED'?c.udt_name:c.data_type)+(c.column_default?' default '+c.column_default:''));
 if(cols.some(c=>c.column_name==='id'))definitions.push('primary key(id)');
 if(['fobi_sponsor_profiles','fobi_participant_profiles'].includes(name))definitions.push('unique(source_interest_id)');
 await db.exec('create table public.'+name+'('+definitions.join(',')+')');
}
await db.exec("create unique index fobi_checkins_ticket_once on public.fobi_checkins(ticket_id) where ticket_id is not null");
for(const sql of fixture.functions)await db.exec(sql);
for(const sql of fixture.triggers)await db.exec(sql);
await db.exec(await readFile(new URL('../supabase/migrations/20261019101045_event_readiness.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../supabase/migrations/20261019101344_notification_outbox.sql',import.meta.url),'utf8'));
await db.exec("insert into fobi_ticket_settings(event_code,ticket_type,included_count,afterparty_enabled,active) values ('FB26-01','VIP1',10,true,true),('FB26-01','VIP2',10,true,true),('FB26-01','VIP3',10,false,true),('FB26-01','MEMBER',1,true,true)");
async function order(type='member',tier=null,count=2){
 const i=(await db.query("insert into fobi_interests(type,tier,member_count,contact_name,phone,email) values($1,$2,$3,'QA','000','qa@example.invalid') returning id",[type,tier,count])).rows[0];
 const o=(await db.query("insert into fobi_orders(interest_id,type,amount,order_no,payment_status) values($1,$2,6000,$3,'pending') returning *",[i.id,type,crypto.randomUUID()])).rows[0];
 const pay=()=>db.query("select fobi_mark_order_paid($1,'QA','QA',now(),'QA','{}') result",[o.order_no]);
 await pay();
 return {o,pay,tickets:(await db.query("select * from fobi_tickets where order_id=$1",[o.id])).rows};
}
async function check(q,g){return (await db.query("select fobi_checkin_ticket($1,$2,'QA') result",[q,g])).rows[0].result;}
test('paid member issues correct count; repeated callback does not duplicate tickets',async()=>{
 const a=await order();assert.equal(a.tickets.length,2);await a.pay();
 assert.equal((await db.query('select count(*)::int n from fobi_tickets where order_id=$1',[a.o.id])).rows[0].n,2);
});
test('sponsor spaced tier maps VIP1/2 afterparty, VIP3 excludes afterparty',async()=>{
 for(const tier of ['VIP 1','VIP 2','VIP 3']){
  const a=await order('sponsor',tier);assert.equal(a.tickets.length,10);
  assert.equal(a.tickets[0].afterparty_entitlement,tier!=='VIP 3');
 }
});
test('member VIP denied; MAIN then AFTERPARTY succeeds; duplicate gates denied',async()=>{
 const {tickets:[t]}=await order();
 assert.equal((await check(t.qr_token,'VIP')).error,'vip_not_entitled');
 assert.equal((await check(t.qr_token,'MAIN')).ok,true);
 assert.equal((await check(t.qr_token,'MAIN')).error,'already_checked_in');
 assert.equal((await check(t.qr_token,'AFTERPARTY')).ok,true);
 assert.equal((await check(t.qr_token,'AFTERPARTY')).error,'already_checked_in');
});
test('VIP and MAIN share admission; VIP3 has no party entitlement',async()=>{
 const {tickets:[t]}=await order('sponsor','VIP 3');
 assert.equal((await check(t.qr_token,'AFTERPARTY')).error,'afterparty_not_entitled');
 assert.equal((await check(t.qr_token,'VIP')).ok,true);
 assert.equal((await check(t.qr_token,'MAIN')).error,'already_checked_in');
});
test('invalid gate, unpaid and void ticket fail closed',async()=>{
 const {o,tickets:[t]}=await order();
 assert.equal((await check(t.qr_token,'WRONG')).error,'invalid_gate');
 await db.query("update fobi_orders set payment_status='refunded' where id=$1",[o.id]);
 assert.equal((await check(t.qr_token,'MAIN')).error,'order_not_paid');
 await db.query("update fobi_tickets set status='void' where id=$1",[t.id]);
 assert.equal((await check(t.qr_token,'MAIN')).error,'ticket_void');
});
test('concurrent duplicate requests yield one success',async()=>{
 const {tickets:[t]}=await order();
 const result=await Promise.all([check(t.qr_token,'MAIN'),check(t.qr_token,'MAIN')]);
 assert.equal(result.filter(x=>x.ok).length,1);
});
test('anon and authenticated cannot call payment or checkin RPC',async()=>{
 for(const role of ['anon','authenticated']){
  const {rows:[row]}=await db.query("select has_function_privilege($1,'fobi_checkin_ticket(uuid,text,text)','execute') c,has_function_privilege($1,'fobi_mark_order_paid(text,text,text,timestamptz,text,jsonb)','execute') p",[role]);
  assert.equal(row.c,false);assert.equal(row.p,false);
 }
});

test('payment and notification enqueue share transaction; duplicate callback enqueues once',async()=>{
 const a=await order();await a.pay();
 assert.equal((await db.query('select count(*)::int n from fobi_notification_outbox where order_id=$1',[a.o.id])).rows[0].n,1);
 assert.equal((await db.query("select has_table_privilege('anon','fobi_notification_outbox','select') p")).rows[0].p,false);
});
