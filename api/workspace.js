import {renderArticle} from '../lib/news-render.js';
// Browser-facing backend: Supabase tokens are restricted to Secure HttpOnly cookies.
const DB='https://tlpsqaywjcgowprhauod.supabase.co';
const KEY='sb_publishable_sQQtebH-fuHcAMm4e4wCPg_xRmac_l-';
const EDGE=DB+'/functions/v1/pageant-workspace';
const HOSTS=['fobi.self.com.tw','pageant.self.com.tw'];
const ACCESS='__Host-pageant_access',REFRESH='__Host-pageant_refresh';
const cookie=(name,value,seconds)=>`${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${seconds}; Secure; HttpOnly; SameSite=Lax`;
const cookies=req=>Object.fromEntries(String(req.headers.cookie||'').split(';').map(s=>s.trim().split('=')).filter(a=>a.length===2).map(([k,v])=>[k,decodeURIComponent(v)]));
export function createWorkspaceHandler(fetcher=fetch){return async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const json=(status,data)=>res.status(status).json(data);
 try{
 const host=String(req.headers.host||'').split(':')[0];if(!HOSTS.includes(host))return json(403,{ok:false,error:'來源不允許'});
 if(!['GET','POST'].includes(req.method))return json(405,{ok:false,error:'不支援的方法'});
 if(req.method==='POST'&&req.headers.origin!==`https://${host}`)return json(403,{ok:false,error:'請從網站內操作'});
 const url=new URL(req.url,`https://${host}`),action=url.searchParams.get('action')||'session';
 let body=req.body||{};if(typeof body==='string'){if(body.length>600000)return json(413,{ok:false,error:'資料過大'});body=JSON.parse(body)}
 const request=async(path,options={})=>{const r=await fetcher(path,{...options,signal:AbortSignal.timeout(20000)});let data;try{data=await r.json()}catch{data={error:'服務暫時無法使用'}}return {r,data};};
 const auth=async(path,data)=>request(DB+'/auth/v1/'+path,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify(data)});
 const setSession=data=>{if(!data?.access_token||!data?.refresh_token)throw Error('登入驗證失敗');res.setHeader('Set-Cookie',[cookie(ACCESS,data.access_token,3600),cookie(REFRESH,data.refresh_token,28800)]);};
 if(req.method==='POST'&&action==='login-code'){
 if(typeof body.email!=='string'||body.email.length>254||!/^\S+@\S+\.\S+$/.test(body.email))return json(400,{ok:false,error:'請填寫有效Email'});
 const {r}=await auth('otp',{email:body.email,create_user:false});return json(r.ok?200:400,{ok:r.ok,...(!r.ok?{error:'目前無法寄送驗證信，請稍後再試；或使用原會員密碼登入。'}:{message:'若此Email已建立會員，將收到登入驗證碼。'})});
 }
 if(req.method==='POST'&&['verify-code','login-password'].includes(action)){
 if(typeof body.email!=='string'||body.email.length>254)return json(400,{ok:false,error:'Email格式錯誤'});
 let response;if(action==='verify-code'){
 if(!/^\d{6,10}$/.test(String(body.code||'')))return json(400,{ok:false,error:'請輸入信件中的驗證碼'});
 response=await auth('verify',{email:body.email,token:body.code,type:'email'});
 }else{if(typeof body.password!=='string'||body.password.length>256)return json(400,{ok:false,error:'密碼格式錯誤'});response=await auth('token?grant_type=password',{email:body.email,password:body.password});}
 if(!response.r.ok)return json(401,{ok:false,error:'登入失敗，請確認帳號、密碼或驗證碼'});
 // A valid membership alone does not grant access to the project workspace.
 const check=await request(EDGE+'?action=session',{headers:{Authorization:'Bearer '+response.data.access_token}});
 if(!check.r.ok){await request(DB+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+response.data.access_token}});return json(check.r.status,check.data);}
 setSession(response.data);return json(200,{ok:true});
 }
 const jar=cookies(req);let token=jar[ACCESS];
 if(!token&&jar[REFRESH]){const fresh=await auth('token?grant_type=refresh_token',{refresh_token:jar[REFRESH]});if(fresh.r.ok){setSession(fresh.data);token=fresh.data.access_token;}}
 if(action==='logout'&&req.method==='POST'){
 if(token)await request(EDGE+'?action=logout',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}'});
 res.setHeader('Set-Cookie',[cookie(ACCESS,'',0),cookie(REFRESH,'',0)]);return json(200,{ok:true});
 }
 if(!token)return json(401,{ok:false,error:'請先登入管理帳號'});
 const forwardParams=new URLSearchParams(url.searchParams);if(action==='preview')forwardParams.set('action','article');
 const forward=()=>request(EDGE+'?'+forwardParams,{method:req.method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(req.method==='POST'?{body:JSON.stringify(body)}:{})});
 let response=await forward();if(response.r.status===401&&jar[REFRESH]){const fresh=await auth('token?grant_type=refresh_token',{refresh_token:jar[REFRESH]});if(fresh.r.ok){setSession(fresh.data);token=fresh.data.access_token;response=await forward();}}
 if(action==='preview'&&response.r.ok){res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('X-Robots-Tag','noindex, nofollow');return res.status(200).send(renderArticle(response.data.article,true));}
 if(action==='private-image'&&response.r.ok)return res.redirect(302,response.data.url);
 return json(response.r.status,response.data);
 }catch{return json(503,{ok:false,error:'服務暫時無法使用，請稍後再試'});}
};}
export default createWorkspaceHandler();
