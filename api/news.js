import {renderArticle,renderNews,shell} from '../lib/news-render.js';
const EDGE='https://tlpsqaywjcgowprhauod.supabase.co/functions/v1/pageant-workspace';
export default async function handler(req,res){
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).end();
 try{
 const u=new URL(req.url,'https://fobi.self.com.tw');
 if(u.searchParams.get('action')==='image'){
 const r=await fetch(EDGE+'?action=image&path='+encodeURIComponent(u.searchParams.get('path')||''),{signal:AbortSignal.timeout(15000)}),d=await r.json();if(!r.ok||!d.url)return res.status(404).end();return res.redirect(302,d.url);
 }
 const slug=u.searchParams.get('slug');if(slug&&!/^[a-z0-9][a-z0-9-]{1,119}$/.test(slug))return res.status(404).end();
 const r=await fetch(EDGE+'?action=public-news'+(slug?'&slug='+encodeURIComponent(slug):'')+(u.searchParams.get('project')?'&project='+encodeURIComponent(u.searchParams.get('project')):''),{signal:AbortSignal.timeout(15000)}),d=await r.json();
 if(!r.ok)throw Error('unavailable');res.setHeader('Content-Type','text/html; charset=utf-8');
 if(slug&&!d.articles?.length)return res.status(404).send(shell('新聞未公開','<section class="wrap"><h1>這篇新聞目前未公開</h1><a href="/news">返回新聞列表</a></section>'));
 return res.status(200).send(slug?renderArticle(d.articles[0]):renderNews(d.articles));
 }catch{res.setHeader('Retry-After','60');return res.status(503).send('新聞服務暫時無法使用，請稍後重試。');}
}
