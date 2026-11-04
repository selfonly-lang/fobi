export const STAGES = [
 ['planning','立案企劃',['確認活動目標與預算','建立主辦與執行窗口','確認場地及日期']],
 ['recruitment','佳麗招募',['設定報名資格與資料同意','審核報名與面試','確認參賽名單']],
 ['training','培訓排程',['排定台步與儀態課程','安排鏡頭及訪談訓練','紀錄出席與學習成果']],
 ['exposure','品牌曝光',['蒐集肖像與素材授權','製作選手及品牌內容','安排社群曝光排程']],
 ['tickets','售票票務',['確認票種價格與退費條款','核對支付及訂單紀錄','安排票券核銷及入場']],
 ['sponsors','贊助合作',['建立贊助方案及企業名單','確認合約與交付權益','彙整品牌露出成果']],
 ['media','新聞媒體',['查核品牌與人物資料','撰稿配圖送審','發布新聞及保存公開連結']],
 ['onsite','現場執行',['確認接待與彩排流程','確認舞台及現場人員','紀錄活動照片與突發狀況']],
 ['closeout','成果結案',['核對收支與交付成果','完成各贊助商報告','封存新聞照片與活動紀錄']]
];
export const KINDS = [['task','流程任務'],['recruitment','佳麗招募'],['training','訓練課程'],['sponsor','贊助合作'],['media','素材與媒體'],['schedule','活動日程'],['closeout','結案交付']];
export const STATUS = {todo:'待處理',doing:'進行中',blocked:'待協調',done:'已完成',cancelled:'已取消',draft:'草稿',review:'待審核',approved:'已核准',scheduled:'排程中',published:'已發布',withdrawn:'已下架',planning:'企劃中',recruiting:'招募中',active:'執行中',closed:'已結束',archived:'已封存'};
export const TRANSITIONS = {draft:['review'],review:['draft','approved'],approved:['draft','published','scheduled'],published:['draft','withdrawn'],scheduled:['draft','withdrawn'],withdrawn:['draft']};
export function safeUrl(value, {image=false}={}) {
 if(typeof value!=='string'||value.length>2000)return false;
 if(value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\')&&!/[\u0000-\u0020]/.test(value))return true;
 try {const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!image||!u.pathname.endsWith('.svg'));}catch{return false;}
}
export function validateContent(c) {
 if(!c||typeof c!=='object'||Array.isArray(c))throw Error('內容格式錯誤');
 for(const key of ['title','subtitle','byline','category','partner','topic'])if(c[key]!==undefined&&(typeof c[key]!=='string'||c[key].length>(key==='subtitle'?1000:240)))throw Error('文字欄位過長');
 if(!c.title?.trim())throw Error('請填寫新聞標題');
 for(const key of ['facts','perspective','closing'])if(c[key]!==undefined&&(!Array.isArray(c[key])||c[key].length>60||c[key].some(x=>typeof x!=='string'||x.length>10000)))throw Error('段落格式錯誤');
 if(!Array.isArray(c.sections)||c.sections.length>60||c.sections.some(s=>typeof s.heading!=='string'||s.heading.length>240||!Array.isArray(s.paragraphs)||s.paragraphs.length>60||s.paragraphs.some(p=>typeof p!=='string'||p.length>10000)))throw Error('文章段落格式錯誤');
 if(!Array.isArray(c.photos)||c.photos.length>20||c.photos.some(p=>!safeUrl(p.url,{image:true})||typeof p.caption!=='string'||p.caption.length>1500||(p.source&&!safeUrl(p.source))))throw Error('圖片須使用 HTTPS 或站內網址，並填寫圖說');
 if(!Array.isArray(c.sources)||c.sources.length>40||c.sources.some(s=>typeof s.title!=='string'||s.title.length>500||!safeUrl(s.url)))throw Error('來源網址格式錯誤');
 return c;
}
export function checkTransition(current,next,role,at,now=Date.now()){
 if(!TRANSITIONS[current]?.includes(next))throw Error('不允許的發布狀態變更');
 if(['approved','published','scheduled','withdrawn'].includes(next)&&!['owner','manager','reviewer'].includes(role))throw Error('此操作需要審核權限');
 if(next==='scheduled'&&(!at||!Number.isFinite(Date.parse(at))||Date.parse(at)<=now))throw Error('請設定未來的發布時間');
}
export function workflow(project_id){return STAGES.flatMap(([stage,,titles])=>titles.map(title=>({project_id,kind:'task',stage,title,status:'todo',payload:{note:'',checklist:[],dependencies:[]}})));}
export const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function effectivePublication(article,now=Date.now()){
 const due=article?.scheduled_publication&&article.scheduled_at&&Date.parse(article.scheduled_at)<=now;
 return {content:due?article.scheduled_publication:article?.publication||null,publish_at:due?article.scheduled_at:article?.publish_at||null};
}
