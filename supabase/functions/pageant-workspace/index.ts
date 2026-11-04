import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.118.0';
import {STAGES,KINDS,validateContent,checkTransition,workflow,effectivePublication} from './model.js';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const ORIGINS=['https://fobi.self.com.tw','https://pageant.self.com.tw'];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
class Failure extends Error {constructor(message:string,public status=400){super(message)}}
const fail=(m:string,s=400):never=>{throw new Failure(m,s)};
const clean=(v:unknown,max=200)=>typeof v==='string'&&v.trim().length<=max?v.trim():fail('欄位格式錯誤');
const id=(v:unknown)=>typeof v==='string'&&uuid.test(v)?v:fail('識別碼格式錯誤');
async function result(q:any){const {data,error}=await q;if(error){console.error('workspace database',error.code);fail(error.code==='23505'?'網址或項目已存在':'資料儲存失敗',error.code==='23505'?409:503)}return data;}
async function audit(uid:string,action:string,project:string|null,entity:string|null,detail={}){await result(db.from('pageant_workspace_audit').insert({actor_id:uid,action,project_id:project,entity_id:entity,detail}));}
function exposedArticle(a:any){
 return {id:a.id,project_id:a.project_id,slug:a.slug,...effectivePublication(a),updated_at:a.updated_at};
}
function currentPublication(a:any){
 const p=effectivePublication(a);return {publication:p.content,publish_at:p.publish_at,scheduled_publication:null,scheduled_at:null};
}
async function publicArticles(slug:string|null,project:string|null){
 let q=db.from('pageant_articles').select('id,project_id,slug,publication,publish_at,scheduled_publication,scheduled_at,updated_at').or('publication.not.is.null,scheduled_publication.not.is.null').order('updated_at',{ascending:false}).limit(250);
 if(slug)q=q.eq('slug',slug);if(project)q=q.eq('project_id',id(project));
 return (await result(q)).map(exposedArticle).filter((a:any)=>a.content&&a.publish_at&&Date.parse(a.publish_at)<=Date.now()).sort((a:any,b:any)=>Date.parse(b.publish_at)-Date.parse(a.publish_at));
}
async function validateAssets(content:any,project:string,publishing=false){
 for(const photo of content.photos||[]){
  const u=new URL(photo.url,'https://fobi.self.com.tw');
  if(['fobi.self.com.tw','pageant.self.com.tw'].includes(u.hostname)&&u.pathname==='/api/news'){
   const path=u.searchParams.get('path')||'';if(u.searchParams.get('action')!=='image'||!path.startsWith(project+'/'))fail('新聞圖片必須屬於同一個賽事專案');
   const asset=await result(db.from('pageant_assets').select('id').eq('project_id',project).eq('object_path',path).maybeSingle());if(!asset)fail('圖片素材不存在');
   photo.url='/api/news?action=image&path='+encodeURIComponent(path);
   if(publishing){const signed=await db.storage.from('pageant-editorial').createSignedUrl(path,60);if(signed.error)fail('圖片尚未上傳完成，請先完成上傳');}
  }
 }
}
Deno.serve(async(req)=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...(ORIGINS.includes(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{}),'Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
 const json=(status:number,data:any)=>new Response(JSON.stringify(data),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 try{
  if(origin&&!ORIGINS.includes(origin))fail('來源不允許',403);
  const url=new URL(req.url), action=url.searchParams.get('action')||'';
  if(req.method==='GET'&&action==='public-news')return json(200,{ok:true,articles:await publicArticles(url.searchParams.get('slug'),url.searchParams.get('project'))});
  if(req.method==='GET'&&action==='public-projects')return json(200,{ok:true,projects:await result(db.from('pageant_projects').select('id,slug,title,status,event_date,venue,domain,summary').eq('public',true).order('created_at'))});
  // Uploaded files stay private until referenced by an effective publication.
  if(req.method==='GET'&&action==='image'){
   const path=url.searchParams.get('path')||'';if(!/^[a-f0-9-]+\/[a-f0-9-]+\.(jpg|png|webp)$/.test(path))fail('圖片不存在',404);
   const articles=await publicArticles(null,null),target='/api/news?action=image&path='+encodeURIComponent(path);
   if(!articles.some((a:any)=>a.content?.photos?.some((p:any)=>p.url===target)))fail('圖片不存在',404);
   const r=await db.storage.from('pageant-editorial').createSignedUrl(path,120);if(r.error)fail('圖片不存在',404);
   return json(200,{ok:true,url:r.data.signedUrl});
  }
  const authorization=req.headers.get('authorization')||'';
  if(!authorization.startsWith('Bearer '))fail('請先登入管理帳號',401);
  const auth=await db.auth.getUser(authorization.slice(7));if(auth.error||!auth.data.user)fail('登入已過期，請重新登入',401);
  const uid=auth.data.user.id;
  const staff=await result(db.from('pageant_staff').select('*').eq('user_id',uid).maybeSingle());
  const memberships=await result(db.from('pageant_project_members').select('project_id,role').eq('user_id',uid));
  const owner=staff?.role==='owner';if(!staff&&!memberships.length)fail('此帳號尚未獲授權使用後台',403);
  const roleFor=(project:string)=>owner?'owner':memberships.find((m:any)=>m.project_id===project)?.role||null;
  const permit=(project:string,roles=['owner','manager','editor','reviewer','viewer'])=>{const role=roleFor(id(project));if(!role||!roles.includes(role))fail('沒有此專案的操作權限',403);return role;};
  const writable=['owner','manager','editor'];
  let body:any={};if(req.method==='POST'){
   if(Number(req.headers.get('content-length'))>600000)fail('資料過大',413);
   const text=await req.text();if(text.length>600000)fail('資料過大',413);try{body=JSON.parse(text)}catch{fail('資料格式錯誤')}
  }
  if(req.method==='GET'&&action==='session')return json(200,{ok:true,user:{id:uid,email:auth.data.user.email,name:staff?.display_name||''},role:owner?'owner':staff?.role||'viewer',memberships,stages:STAGES,kinds:KINDS});
  if(req.method==='POST'&&action==='logout'){
   const r=await fetch(Deno.env.get('SUPABASE_URL')+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:Deno.env.get('SUPABASE_ANON_KEY')!,Authorization:authorization}});return json(r.ok?200:400,{ok:r.ok});
  }
  if(req.method==='GET'&&action==='projects'){
   let q=db.from('pageant_projects').select('*').order('created_at');if(!owner)q=q.in('id',memberships.map((x:any)=>x.project_id));
   return json(200,{ok:true,projects:await result(q)});
  }
  if(req.method==='POST'&&action==='save-project'){
   if(body.id)permit(body.id,['owner','manager']);else if(!owner)fail('只有平台管理員可建立專案',403);
   if(!/^[a-z0-9][a-z0-9-]{1,79}$/.test(body.slug||''))fail('請使用小寫英文、數字及連字號作為專案網址');
   if(!['planning','recruiting','active','closed','archived'].includes(body.status))fail('專案狀態錯誤');
   if(body.event_date&&!/^\d{4}-\d{2}-\d{2}$/.test(body.event_date))fail('日期格式錯誤');
   const data={slug:body.slug,title:clean(body.title),status:body.status,event_date:body.event_date||null,venue:clean(body.venue||'',500),domain:clean(body.domain||'',500),summary:clean(body.summary||'',3000),public:body.public===true};if(!data.title)fail('請填專案名稱');
   if(data.domain&&!/^https:\/\/[a-z0-9.-]+\/?$/.test(data.domain))fail('專案網域必須是HTTPS網址');
   const project=body.id?await result(db.from('pageant_projects').update(data).eq('id',id(body.id)).eq('version',body.version).select().maybeSingle()):await result(db.rpc('pageant_create_project',{p_data:data,p_actor:uid,p_tasks:workflow('00000000-0000-4000-8000-000000000000')}));
   if(!project)fail('內容已被其他人更新，請重新載入',409);
   await audit(uid,'project_saved',project.id,project.id);return json(200,{ok:true,project});
  }
  if(req.method==='GET'&&action==='workspace'){
   const project=id(url.searchParams.get('project'));permit(project);
   const [items,articles,assets,audits,members]=await Promise.all([
    result(db.from('pageant_work_items').select('*').eq('project_id',project).order('created_at').limit(2000)),
    result(db.from('pageant_articles').select('id,project_id,slug,title,status,publish_at,scheduled_at,updated_at,version').eq('project_id',project).order('updated_at',{ascending:false}).limit(500)),
    result(db.from('pageant_assets').select('*').eq('project_id',project).order('created_at',{ascending:false}).limit(500)),
    result(db.from('pageant_workspace_audit').select('*').eq('project_id',project).order('created_at',{ascending:false}).limit(100)),
    result(db.from('pageant_project_members').select('*').eq('project_id',project))]);
   return json(200,{ok:true,items,articles,assets,audits,members,role:roleFor(project)});
  }
  if(req.method==='POST'&&action==='save-item'){
   const project=id(body.project_id);permit(project,writable);
   if(!KINDS.some((k:any)=>k[0]===body.kind)||!STAGES.some((s:any)=>s[0]===body.stage))fail('項目分類錯誤');
   if(!['todo','doing','blocked','done','cancelled'].includes(body.status))fail('任務狀態錯誤');
   const payload=body.payload||{};if(typeof payload!=='object'||Array.isArray(payload)||JSON.stringify(payload).length>40000)fail('項目內容過大');
   const deps=payload.dependencies||[];if(!Array.isArray(deps)||deps.length>50)fail('相依任務格式錯誤');
   if(deps.length){deps.forEach(id);if(deps.includes(body.id))fail('任務不可依賴自己');const rows=await result(db.from('pageant_work_items').select('id,status,payload').eq('project_id',project).in('id',deps));if(rows.length!==deps.length)fail('相依任務必須屬於此專案');if(body.status==='done'&&rows.some((r:any)=>r.status!=='done'))fail('請先完成相依任務');}
   if(body.id&&deps.length){
    const graph=await result(db.from('pageant_work_items').select('id,payload').eq('project_id',project).limit(2000));
    const links=new Map(graph.map((x:any)=>[x.id,x.id===body.id?deps:x.payload?.dependencies||[]]));
    const visiting=new Set(),seen=new Set();const cyclic=(node:string):boolean=>{if(visiting.has(node))return true;if(seen.has(node))return false;visiting.add(node);for(const child of links.get(node)||[])if(cyclic(child))return true;visiting.delete(node);seen.add(node);return false;};
    if(cyclic(body.id))fail('相依任務不可形成循環');
   }
   if(body.owner_id){id(body.owner_id);const userRole=await result(db.from('pageant_staff').select('role').eq('user_id',body.owner_id).maybeSingle());const member=await result(db.from('pageant_project_members').select('user_id').eq('project_id',project).eq('user_id',body.owner_id).maybeSingle());if(userRole?.role!=='owner'&&!member)fail('負責人尚未加入專案');}
   if(body.due_at&&!Number.isFinite(Date.parse(body.due_at)))fail('期限格式錯誤');
   const data={project_id:project,kind:body.kind,stage:body.stage,title:clean(body.title),status:body.status,owner_id:body.owner_id||null,due_at:body.due_at||null,payload};if(!data.title)fail('請填項目名稱');
   const item=body.id?await result(db.from('pageant_work_items').update(data).eq('id',id(body.id)).eq('project_id',project).eq('version',body.version).select().maybeSingle()):await result(db.from('pageant_work_items').insert({...data,created_by:uid}).select().single());
   if(!item)fail('內容已被其他人更新，請重新載入',409);await audit(uid,'item_saved',project,item.id);return json(200,{ok:true,item});
  }
  if(req.method==='GET'&&action==='article'){
   const article=await result(db.from('pageant_articles').select('*').eq('id',id(url.searchParams.get('id'))).maybeSingle());if(!article)fail('新聞不存在',404);permit(article.project_id);
   const versions=await result(db.from('pageant_article_versions').select('id,version,created_at,actor_id').eq('article_id',article.id).order('version',{ascending:false}).limit(50));return json(200,{ok:true,article,versions});
  }
  if(req.method==='POST'&&action==='save-article'){
   const project=id(body.project_id);permit(project,writable);
   const content=validateContent(body.content);await validateAssets(content,project);
   let existing=null;if(body.id){existing=await result(db.from('pageant_articles').select('*').eq('id',id(body.id)).eq('project_id',project).maybeSingle());if(!existing)fail('新聞不存在',404);}
   const slug=existing?.slug||body.slug;if(!/^[a-z0-9][a-z0-9-]{1,119}$/.test(slug||''))fail('新聞網址格式錯誤');
   const data={project_id:project,slug,title:content.title,content,status:'draft',updated_by:uid,...currentPublication(existing)};
   // Saving a draft never changes the previously published snapshot.
   const article=existing?await result(db.from('pageant_articles').update(data).eq('id',existing.id).eq('version',body.version).select().maybeSingle()):await result(db.from('pageant_articles').insert({...data,created_by:uid}).select().single());
   if(!article)fail('內容已被其他人更新，請重新載入',409);return json(200,{ok:true,article});
  }
  if(req.method==='POST'&&action==='transition-article'){
   const article=await result(db.from('pageant_articles').select('*').eq('id',id(body.id)).maybeSingle());if(!article)fail('新聞不存在',404);
   const role=permit(article.project_id,['owner','manager','editor','reviewer']);
   checkTransition(article.status,body.status,role,body.publish_at);
   const data:any={status:body.status,updated_by:uid};
   if(body.status==='draft')Object.assign(data,currentPublication(article));
   if(['published','scheduled'].includes(body.status)){
    validateContent(article.content);const c=article.content;await validateAssets(c,article.project_id,true);
    if(!c.sections.length&&!c.facts?.length)fail('新聞須有內文');if(!c.photos.length||c.photos.some((p:any)=>!p.caption?.trim()||!p.source))fail('發布前請補齊圖片、圖說及來源');
    if(body.status==='scheduled'){Object.assign(data,currentPublication(article),{scheduled_publication:c,scheduled_at:new Date(body.publish_at).toISOString()});}else{Object.assign(data,{publication:c,publish_at:new Date().toISOString(),scheduled_publication:null,scheduled_at:null});}
   }
   if(body.status==='withdrawn'){data.publication=null;data.publish_at=null;data.scheduled_publication=null;data.scheduled_at=null;}
   const changed=await result(db.from('pageant_articles').update(data).eq('id',article.id).eq('version',body.version).select().maybeSingle());if(!changed)fail('新聞已被更新，請重新載入',409);return json(200,{ok:true,article:changed});
  }
  if(req.method==='POST'&&action==='restore-article'){
   const a=await result(db.from('pageant_articles').select('*').eq('id',id(body.id)).maybeSingle());if(!a)fail('新聞不存在',404);permit(a.project_id,writable);
   const v=await result(db.from('pageant_article_versions').select('snapshot').eq('article_id',a.id).eq('version',body.restore_version).maybeSingle());if(!v)fail('版本不存在',404);
   const changed=await result(db.from('pageant_articles').update({title:v.snapshot.title,content:v.snapshot.content,status:'draft',updated_by:uid,...currentPublication(a)}).eq('id',a.id).eq('version',body.version).select().maybeSingle());if(!changed)fail('新聞已被更新',409);return json(200,{ok:true,article:changed});
  }
  if(req.method==='POST'&&action==='upload-url'){
   const project=id(body.project_id);permit(project,writable);
   const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};const ext=extensions[body.mime as keyof typeof extensions];if(!ext||!Number.isInteger(body.bytes)||body.bytes<1||body.bytes>12582912)fail('僅支援12MB以內 JPG、PNG 或 WebP');
   const path=project+'/'+crypto.randomUUID()+'.'+ext;const r=await db.storage.from('pageant-editorial').createSignedUploadUrl(path);if(r.error)fail('無法建立上傳連結',503);
   const asset=await result(db.from('pageant_assets').insert({project_id:project,object_path:path,filename:clean(body.filename,200),mime:body.mime,bytes:body.bytes,caption:clean(body.caption||'',1500),source:clean(body.source||'',2000),created_by:uid}).select().single());
   return json(200,{ok:true,asset,url:r.data.signedUrl,public_url:'/api/news?action=image&path='+encodeURIComponent(path)});
  }
  if(req.method==='POST'&&action==='delete-asset'){
   const asset=await result(db.from('pageant_assets').select('*').eq('id',id(body.id)).maybeSingle());if(!asset)fail('圖片不存在',404);permit(asset.project_id,writable);
   const target='/api/news?action=image&path='+encodeURIComponent(asset.object_path);
   const used=await result(db.from('pageant_article_versions').select('id').contains('snapshot',{content:{photos:[{url:target}]}}).limit(1));if(used.length)fail('圖片已被新聞版本引用，請保留原始素材');
   const removed=await db.storage.from('pageant-editorial').remove([asset.object_path]);if(removed.error)fail('無法移除圖片',503);
   await result(db.from('pageant_assets').delete().eq('id',asset.id));await audit(uid,'asset_deleted',asset.project_id,asset.id);return json(200,{ok:true});
  }
  if(req.method==='GET'&&action==='private-image'){
   const asset=await result(db.from('pageant_assets').select('*').eq('object_path',url.searchParams.get('path')||'').maybeSingle());if(!asset)fail('圖片不存在',404);permit(asset.project_id);
   const r=await db.storage.from('pageant-editorial').createSignedUrl(asset.object_path,300);if(r.error)fail('圖片不存在',404);return json(200,{ok:true,url:r.data.signedUrl});
  }
  if(req.method==='POST'&&action==='asset-preview'){
   const asset=await result(db.from('pageant_assets').select('*').eq('id',id(body.id)).maybeSingle());if(!asset)fail('圖片不存在',404);permit(asset.project_id);
   const r=await db.storage.from('pageant-editorial').createSignedUrl(asset.object_path,300);if(r.error)fail('圖片尚未上傳',404);return json(200,{ok:true,url:r.data.signedUrl});
  }
  if(req.method==='GET'&&action==='legacy'){
   const project=id(url.searchParams.get('project'));permit(project,['owner','manager']);const p=await result(db.from('pageant_projects').select('slug').eq('id',project).single());
   if(p.slug!=='fobi-2026')return json(200,{ok:true,orders:[],tickets:[],applications:[],interests:[]});
   const [orders,tickets,applications,interests]=await Promise.all([
    result(db.from('fobi_orders').select('id,order_no,type,amount,currency,payment_status,created_at,paid_at,ticket_count').order('created_at',{ascending:false}).limit(1000)),
    result(db.from('fobi_tickets').select('id,ticket_no,holder_name,status,checked_in_at,ticket_type,company').order('created_at',{ascending:false}).limit(1000)),
    result(db.from('pageant_applications').select('id,applicant_name,country_code,review_status,payment_status,created_at').eq('event_id','b0267cdd-e7da-4a2f-b679-a2c2b72ebcd3').limit(1000)),
    result(db.from('fobi_interests').select('id,type,company,contact_name,status,created_at').limit(1000))]);
   await audit(uid,'view_legacy_tickets',project,null);return json(200,{ok:true,orders,tickets,applications,interests});
  }
  if(req.method==='GET'&&action==='requests'){
   if(!owner)fail('僅平台管理員可查看合作需求',403);return json(200,{ok:true,requests:await result(db.from('pageant_project_requests').select('*').order('created_at',{ascending:false}).limit(500))});
  }
  if(req.method==='POST'&&action==='save-request'){
   if(!owner)fail('沒有權限',403);if(!['received','contacted','planning','completed','closed'].includes(body.status))fail('需求狀態錯誤');
   const request=await result(db.from('pageant_project_requests').update({status:body.status,admin_note:clean(body.admin_note||'',3000),updated_by:uid,updated_at:new Date().toISOString()}).eq('id',id(body.id)).select().single());await audit(uid,'request_updated',null,request.id);return json(200,{ok:true,request});
  }
  if(req.method==='GET'&&action==='team'){
   if(!owner)fail('僅平台管理員可管理團隊',403);
   return json(200,{ok:true,staff:await result(db.from('pageant_staff').select('*')),members:await result(db.from('pageant_project_members').select('*'))});
  }
  if(req.method==='POST'&&action==='save-member'){
   if(!owner)fail('僅平台管理員可授權',403);
   const user=id(body.user_id);if(!['manager','editor','reviewer','viewer'].includes(body.role))fail('角色錯誤');
   const exists=await db.auth.admin.getUserById(user);if(exists.error||!exists.data.user)fail('找不到此SELF／SHE會員識別碼');
   const project=id(body.project_id);await result(db.from('pageant_project_members').upsert({project_id:project,user_id:user,role:body.role}));await audit(uid,'member_granted',project,user,{role:body.role});return json(200,{ok:true});
  }
  if(req.method==='POST'&&action==='remove-member'){
   if(!owner)fail('沒有權限',403);const project=id(body.project_id),user=id(body.user_id);await result(db.from('pageant_project_members').delete().eq('project_id',project).eq('user_id',user));await audit(uid,'member_removed',project,user);return json(200,{ok:true});
  }
  fail('功能不存在',404);
 }catch(error){return json(error instanceof Failure?error.status:400,{ok:false,error:error instanceof Error?error.message:'系統暫時無法使用'});}
});
