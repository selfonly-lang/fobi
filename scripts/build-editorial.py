from pathlib import Path
import json,html,re,zipfile
from datetime import datetime,timezone
r=Path(__file__).resolve().parents[1];pub=r/'public';H=html.escape
news=json.loads((r/'content/news.json').read_text())
def photo(x,classes=''):
 links='<a href="'+H(x['source'],quote=True)+'" target="_blank" rel="noopener">原始來源 ↗</a>'
 if x.get('original'):links+=' · <a href="'+H(x['original'],quote=True)+'" target="_blank" rel="noopener">原圖 ↗</a>'
 return '<figure class="'+classes+'"><a href="'+H(x['url'],quote=True)+'" target="_blank" rel="noopener"><img src="'+H(x['url'],quote=True)+'" alt="'+H(x['caption'],quote=True)+'" loading="lazy" width="1200" height="800"></a><figcaption>'+H(x['caption'])+'<br>'+links+'</figcaption></figure>'
def nav(platform=False):
 links=[('/Fobi','FOBI結案'),('/news','新聞'),('/Fobi/records','活動紀錄'),('/Fobi#partners','合作夥伴'),('/platform','Pageant平台')]
 if platform:links=[('/platform/recruitment','賽事招募'),('/platform/training','訓練資源'),('/platform/tickets','售票與贊助'),('/platform/media','媒體合作'),('/Fobi','FOBI結案')]
 brand='SELF PAGEANT' if platform else 'FOBI 2026';sub='EVERY PAGEANT. EVERY STAGE.' if platform else 'THE ARCHIVE · TAIWAN'
 return '<header class="wrap"><div class="nav"><a class="wordmark" href="'+('/platform' if platform else '/Fobi')+'">'+brand+'<small>'+sub+'</small></a><button class="nav-toggle" type="button" aria-label="開啟導覽" aria-expanded="false">選單 ☰</button><nav class="nav-links" aria-label="主要導覽">'+''.join(f'<a href="{u}">{t}</a>' for u,t in links)+'</nav></div></header>'
def footer():
 return '''<footer class="wrap"><div class="footer"><div><b>SELF PAGEANT · FOBI 2026</b><br>把舞台的光，留成可以閱讀的故事。<div class="personal"><a href="https://she.self.com.tw/line-connect/">個人 LINE ↗</a><a href="https://she.self.com.tw/#chapter=profile">個人官網 ↗</a><a href="https://she.self.com.tw/workspace/?view=card">個人化名片 ↗</a></div><img src="https://www.self.com.tw/fobi/assets/medical-board-logo.png" alt="醫美版"></div><div class="right">合作窗口｜醫見傳媒有限公司 Arthur Lin<br><a href="tel:+886935523001">0935-523-001</a> · LINE ID：beautiself<br><a href="https://www.self.com.tw/">己美 SELF ↗</a> · <a href="/platform/member">己美／LINE會員服務 ↗</a><br><a href="/platform/organizers">主辦單位進駐</a> · <a href="/platform/admin">平台管理</a></div></div><div class="copyright">SELF PAGEANT · 活動圖片來源、合作資訊與刊登範圍詳見各篇標示。</div></footer>'''
def shell(title,body,path,platform=False,desc='',image=None,schema=None):
 canonical=('https://pageant.self.com.tw/' if path=='/platform' else 'https://fobi.self.com.tw'+path)
 meta=f'<meta name="description" content="{H(desc,quote=True)}"><meta property="og:title" content="{H(title,quote=True)}"><meta property="og:description" content="{H(desc,quote=True)}"><meta property="og:url" content="{canonical}"><link rel="canonical" href="{canonical}">'
 if image:meta+=f'<meta property="og:image" content="{H(image,quote=True)}">'
 if schema:meta+='<script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False).replace('</','<\\/')+'</script>'
 return '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+H(title)+'</title>'+meta+'<link rel="stylesheet" href="/editorial/site.css"></head><body>'+nav(platform)+'<main>'+body+'</main>'+footer()+'<script defer src="/editorial/site.js"></script></body></html>'
def write(path,content):
 dest=pub/(path.strip('/')+'/index.html');dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(content)
def cover(n):return n.get('illustration',{}).get('url',n['photos'][0]['url'])
def absolute(url):return 'https://fobi.self.com.tw'+url if url.startswith('/') else url
def card(n):
 label='品牌提供宣傳圖' if n['photos'][0].get('kind')=='brand-promotional' else n.get('format_label','賽事實拍資料照')
 return f'<article class="card" data-news-card data-category="{n["category"]}" data-search="{H(n["title"]+n["partner"]+n.get("topic",""),quote=True)}"><a href="/news/{n["slug"]}"><img class="card-image" data-photo-kind="{n["photos"][0].get("kind","photo")}" src="{cover(n)}" alt="{H(n["partner"]+"｜"+label,quote=True)}" loading="lazy" width="1200" height="800"><div class="image-label">{label}</div><div class="meta">{n["date"]} · {n.get("topic",n["category"])}</div><h3>{H(n["title"])}</h3><p>{H(n["subtitle"])}</p><span class="text-link">閱讀專題 ↗</span></a></article>'
def paras(values):return ''.join('<p>'+H(x)+'</p>' for x in values)
def fulltext(n):
 parts=[n['title'],n['subtitle'],n.get('byline','FOBI專案編輯室'),n['date'],n.get('format_label','賽事結案'),n.get('disclosure',n['note'])]
 if n['facts']:parts.extend(['\n活動紀錄',*n['facts']])
 for s in n.get('sections',[]):parts.extend(['\n'+s['heading'],*s['paragraphs']])
 for q in n.get('interview',[]):parts.extend(['問：'+q['question'],'答：'+q['answer']])
 parts.extend(n.get('closing',[]));parts.extend(n.get('perspective',[]))
 parts.extend(['\n編輯說明',n['note'],'\n圖片與圖說'])
 if n.get('illustration'):parts.extend([n['illustration']['caption'],absolute(n['illustration']['url']),n['illustration']['credit']])
 for photo_ in n['photos']:parts.extend([photo_['caption'],absolute(photo_['url'])])
 parts.extend(['\n來源',*[s['title']+' '+absolute(s['url']) for s in n['sources']],'\n合作聯絡｜醫見傳媒有限公司 Arthur Lin','0935-523-001｜LINE ID beautiself'])
 return '\n\n'.join(parts)
for n in news:
 body='<article class="article wrap" data-editorial-format="'+n.get('layout','overview')+'"><a class="text-link" href="/news">← 回新聞中心</a><div class="meta">'+n['date']+' · '+H(n['category'])+'</div><h1>'+H(n['title'])+'</h1><p class="subtitle">'+H(n['subtitle'])+'</p><p class="byline">'+H(n.get('byline','FOBI專案編輯室'))+'</p>'
 if n.get('expanded'):
  body+='<div class="reading-meta">'+H(n['format_label'])+' · 台灣與世界的交流故事</div>'
 sections=n.get('sections',[])
 def sec(x):return '<section><h2>'+H(x['heading'])+'</h2>'+paras(x['paragraphs'])+'</section>'
 layout=n.get('layout','overview')
 if layout=='analysis':
  body+='<div class="report-gallery">'+''.join(photo(x) for x in n['photos'])+'</div>'+paras(n['facts'])+''.join(sec(x) for x in sections)
 elif layout=='reportage':
  body+=photo(n['photos'][0],'feature-wide')+paras(n['facts'])
  for i,x in enumerate(sections):
   body+=sec(x)
   if i==1:body+=photo(n['photos'][1],'feature-inline')
   if i==3:body+=photo(n['photos'][2],'feature-inline')
 elif layout=='photostory':
  body+=paras(n['facts'])
  if sections:body+=sec(sections[0])
  body+=photo(n['photos'][0],'feature-wide')
  for i,x in enumerate(sections[1:],1):
   body+=sec(x)
   if i==2:body+='<div class="image-pair">'+''.join(photo(x) for x in n['photos'][1:])+'</div>'
 elif layout in ['portrait','interview']:
  body+=paras(n['facts'])
  if sections:body+=sec(sections[0])
  body+=photo(n['photos'][0],'profile-hero')
  for i,x in enumerate(sections[1:],1):
   body+=sec(x)
   if i==2:body+=photo(n['photos'][1],'feature-inline')
   if i==4:body+=photo(n['photos'][2],'feature-inline')
  if n.get('interview'):
   body+='<section class="interview" id="interview"><h2>'+H(n['interview_label'])+'</h2>'
   for q in n['interview']:body+='<h3>問：'+H(q['question'])+'</h3><p>答：'+H(q['answer'])+'</p>'
   body+='</section>'
   if len(sections)<3:body+=photo(n['photos'][1],'feature-inline')
   if len(sections)<5:body+=photo(n['photos'][2],'feature-inline')
  body+=paras(n.get('closing',[]))
 else:
  body+=photo(n['photos'][0])+paras(n['facts'])+paras(n.get('perspective',[]))+''.join(photo(x) for x in n['photos'][1:])
 body+='<aside class="disclosure"><b>編輯與合作說明</b><p>'+H(n.get('disclosure',n['note']))+'</p><p>'+H(n['note'])+'</p></aside><div class="sources"><b>資料與圖片來源</b><ul>'+''.join('<li><a href="'+H(x['url'],quote=True)+'" target="_blank" rel="noopener">'+H(x['title'])+'</a></li>' for x in n['sources'])+'</ul></div>'
 body+='<div class="article-tools"><button type="button" data-copy-article>複製新聞文字</button><button type="button" data-share-article>分享文章</button><button type="button" data-print>列印／儲存PDF</button><a class="text-link" href="/news/copy/'+n['slug']+'.txt" download>下載本文 ↓</a></div><p class="small" data-copy-status role="status"></p><div class="support">合作聯絡｜醫見傳媒有限公司 Arthur Lin<br><a href="tel:+886935523001">0935-523-001</a> · LINE ID beautiself<br><a class="text-link" href="/platform/media">洽詢活動媒體與新聞合作 ↗</a></div></article>'
 schema={'@context':'https://schema.org','@type':'Article','headline':n['title'],'description':n['subtitle'],'datePublished':n['date']+'T10:00:00+08:00','dateModified':datetime.now(timezone.utc).isoformat(),'image':list(dict.fromkeys([absolute(cover(n))]+[absolute(x['url']) for x in n['photos']])),'author':{'@type':'Organization','name':n.get('byline','FOBI專案編輯室')},'publisher':{'@type':'Organization','name':'FOBI・SELF PAGEANT'},'mainEntityOfPage':'https://fobi.self.com.tw/news/'+n['slug'],'articleSection':n['category']}
 write('/news/'+n['slug'],shell(n['title']+'｜FOBI新聞',body,'/news/'+n['slug'],desc=n['subtitle'],image=absolute(cover(n)),schema=schema))
 d=pub/'news/copy';d.mkdir(exist_ok=True);(d/(n['slug']+'.txt')).write_text(fulltext(n))
total=len(news);partners=len(news)-1
featured=next(x for x in news if x['slug']=='medical-media-mao-fobi-2026')
body='<section class="wrap news-hero"><div class="kicker">FOBI 2026 · PEOPLE, BRANDS & TAIWAN</div><h1>每一份支持，<br>都有自己的故事。</h1><p class="lead">21篇人物與品牌專題，21種閱讀角度。從媒體CEO的舞台經歷，到企業的研發、服務與國際交流；加上結案總報導，共22篇。合作篇正文均達700字以上。</p><div class="actions"><a class="button" href="/news/downloads/FOBI-all-22-articles.docx" download>下載全部文稿 Word ↓</a><a class="button light" href="/news/downloads/">圖文書與文稿下載 ↗</a><a class="button light" href="/Fobi/records">活動照片與來源 ↗</a></div></section><section class="wrap featured-story"><div>'+photo(featured['photos'][0],'featured-portrait')+'</div><div><div class="kicker">THIS WEEK’S PORTRAIT</div><h2>'+H(featured['title'])+'</h2><p class="lead">'+H(featured['subtitle'])+'</p><a class="button" href="/news/'+featured['slug']+'">閱讀毛彩又人物側寫 ↗</a></div></section><section class="wrap"><div class="filters"><button class="active" data-filter="all">全部</button><button data-filter="賽事結案">賽事結案</button><button data-filter="合作夥伴專題">合作夥伴</button><input class="search" type="search" id="newsSearch" aria-label="搜尋合作方與新聞" placeholder="搜尋品牌／人物／新聞"></div><p class="news-count" id="newsCount">共'+str(total)+'篇</p></section><section class="wrap section"><div class="grid" id="newsGrid">'+''.join(card(n) for n in sorted(news,key=lambda x:x.get('editorial_order',99)))+'</div><p id="newsEmpty" class="empty" hidden>沒有符合條件的新聞，請更換關鍵字。</p></section>'
write('/news',shell('FOBI人物與品牌故事｜每份支持，都有自己的故事',body,'/news',desc='21篇700字以上人物與品牌專題，加上結案共22篇；不同敘事、不同配圖，附真實活動紀錄與文稿下載。',image=absolute(featured['photos'][0]['url'])))
archive=pub/'Fobi/index.html';text=archive.read_text()
featured_cards=[next(n for n in news if n['slug']==slug) for slug in ['medical-media-mao-fobi-2026','fora-fobi-2026','diamond-fobi-2026']]
counter=iter(featured_cards)
text=re.sub(r'<article class="card".*?</article>',lambda m:card(next(counter)),text,flags=re.S)
text=text.replace('舞台之外，<br>還有支持的力量。','讓世界看到台灣，<br>讀懂品牌的力量。')
partnercards=''.join('<a class="partner" href="/news/'+n['slug']+'"><b>'+H(n['partner'])+'</b><span>'+H(n.get('topic','合作專題'))+' ↗</span></a>' for n in news[1:])
text=re.sub(r'<div class="partner-grid">.*?</div>',lambda m:'<div class="partner-grid">'+partnercards+'</div>',text,flags=re.S)
text=text.replace('<strong>16</strong>','<strong>'+str(partners)+'</strong>').replace('<strong>17</strong>','<strong>'+str(total)+'</strong>').replace('閱讀全部17篇新聞','閱讀全部'+str(total)+'篇新聞')
archive.write_text(text)
with zipfile.ZipFile(pub/'news/articles-copy.zip','w',zipfile.ZIP_DEFLATED) as z:
 for n in news:z.writestr(n['slug']+'.txt',fulltext(n))
 z.writestr('photo-sources.json',json.dumps([{'partner':n['partner'],'illustration':n.get('illustration'),'photos':n['photos']} for n in news],ensure_ascii=False,indent=2))
(pub/'news/data.json').write_text(json.dumps([{k:n[k] for k in ['slug','category','partner','title','subtitle','date']}|{'cover':cover(n),'illustration':bool(n.get('illustration'))} for n in news],ensure_ascii=False,indent=2))
css=pub/'editorial/site.css';text=css.read_text()
if '/* enterprise features */' not in text:
 text+='\n/* enterprise features */\n.image-label{font-size:11px;letter-spacing:.07em;color:#766657;margin-top:8px}.byline{font-size:14px;color:#766657}.interview{padding:28px;background:#f2ede6;border-left:2px solid #b29a7a}.interview h3{font-size:19px;line-height:1.7;margin-top:28px}.interview p{margin-bottom:24px}.editorial-illustration figcaption{font-size:12px;line-height:1.8}.article .disclosure p{font-size:13px;line-height:1.9}.article h2{line-height:1.65;font-size:25px}.article-tools{flex-wrap:wrap}@media(max-width:600px){.article h2{font-size:22px}.interview{padding:20px}}\n'
 css.write_text(text)
print('Built',len(news),'articles, listing, archive and download package.')
