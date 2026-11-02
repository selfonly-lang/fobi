import {createClient} from 'jsr:@supabase/supabase-js@2.118.0';
const origins=new Set(['https://fobi.self.com.tw','https://pageant.self.com.tw']);
const services=['recruitment','training','exposure','tickets','sponsors','media'];
async function sha256(v:string){const a=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return [...new Uint8Array(a)].map(x=>x.toString(16).padStart(2,'0')).join('');}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Access-Control-Allow-Origin':origins.has(origin)?origin:'https://fobi.self.com.tw','Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
 const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(req.method==='OPTIONS')return new Response('ok',{status:origins.has(origin)?200:403,headers});
 if(req.method==='GET'&&new URL(req.url).searchParams.get('action')==='status')return json({ok:true,available:true,services});
 if(req.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
 if(!origins.has(origin))return json({ok:false,error:'invalid_origin'},403);
 const raw=await req.text();if(raw.length>16000)return json({ok:false,error:'request_too_large'},413);
 let body:any;try{body=JSON.parse(raw);}catch{return json({ok:false,error:'invalid_input'},400);}
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 try{
  if(body.action==='submit'){
   const text=(k:string,max:number)=>typeof body[k]==='string'?body[k].trim().slice(0,max):'';
   const event_name=text('event_name',160),contact_name=text('contact_name',120),email=text('email',180).toLowerCase(),phone=text('phone',40),role=text('role',30),kind=text('kind',30),message=text('message',3000),key=text('idempotency_key',36),budget=text('budget',50)||'待討論';
   const selected=Array.isArray(body.services)?[...new Set(body.services.filter((x:unknown)=>typeof x==='string'&&services.includes(x)))]:[];
   if(!event_name||!contact_name||!/^\S+@\S+\.\S+$/.test(email)||!/^\+?[0-9 ()-]{7,40}$/.test(phone)||!['organizer','participant','sponsor','media'].includes(role)||!services.includes(kind)||!message||body.consent!==true||text('website',200)||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(key))return json({ok:false,error:'invalid_input'},400);
   const prior=await db.from('pageant_project_requests').select('reference').eq('idempotency_key',key).maybeSingle();if(prior.error)throw prior.error;if(prior.data)return json({ok:true,reference:prior.data.reference});
   const count=await db.from('pageant_project_requests').select('id',{count:'exact',head:true}).eq('email',email).gte('created_at',new Date(Date.now()-600000).toISOString());if(count.error)throw count.error;if((count.count||0)>=5)return json({ok:false,error:'rate_limited'},429);
   const event_date=text('event_date',10);if(event_date&&!/^\d{4}-\d{2}-\d{2}$/.test(event_date))return json({ok:false,error:'invalid_input'},400);
   const reference='PP-'+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+crypto.randomUUID().replaceAll('-','').slice(0,12).toUpperCase();
   const payload={reference,idempotency_key:key,role,kind,event_name,contact_name,email,phone,event_date:event_date||null,location:text('location',180)||null,budget,scale:text('scale',80)||null,services:selected.length?selected:[kind],message,consent:true};
   const {data,error}=await db.from('pageant_project_requests').upsert(payload,{onConflict:'idempotency_key',ignoreDuplicates:true}).select('reference').maybeSingle();
   if(error)throw error;if(data)return json({ok:true,reference:data.reference});
   const duplicate=await db.from('pageant_project_requests').select('reference').eq('idempotency_key',key).single();if(duplicate.error)throw duplicate.error;return json({ok:true,reference:duplicate.data.reference});
  }
  if(!['list','update'].includes(body.action))return json({ok:false,error:'unsupported_action'},400);
  const h=req.headers.get('authorization')||'',token=h.startsWith('Bearer ')?h.slice(7):'';if(!token)return json({ok:false,error:'admin_login_required'},401);
  const hash=await sha256(token);const {data:session,error:sErr}=await db.from('fobi_admin_sessions').select('id,self_user_id,expires_at').eq('token_hash',hash).gt('expires_at',new Date().toISOString()).maybeSingle();
  if(sErr||!session)return json({ok:false,error:'admin_session_expired'},401);
  if(body.action==='list'){
   const {data,error}=await db.from('pageant_project_requests').select('id,reference,role,kind,event_name,contact_name,email,phone,event_date,location,budget,scale,services,message,status,admin_note,created_at,updated_at').order('created_at',{ascending:false}).limit(200);if(error)throw error;return json({ok:true,requests:data});
  }
  if(!['received','contacted','confirmed','closed'].includes(body.status)||typeof body.id!=='string')return json({ok:false,error:'invalid_input'},400);
  const note=typeof body.admin_note==='string'?body.admin_note.trim().slice(0,3000):null;
  const {data,error}=await db.from('pageant_project_requests').update({status:body.status,admin_note:note,updated_by:session.self_user_id,updated_at:new Date().toISOString()}).eq('id',body.id).select('id,reference,status').maybeSingle();if(error)throw error;if(!data)return json({ok:false,error:'not_found'},404);
  await db.from('fobi_admin_audit').insert({action:'platform_request_update',section:'pageant_platform',detail:{request_id:data.id,status:data.status,by:session.self_user_id}});return json({ok:true,request:data});
 }catch{console.error('pageant_platform_request_failed');return json({ok:false,error:'server_error'},500);}
});
