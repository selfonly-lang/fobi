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
 links=[('/Fobi','FOBI結案'),('/news','新聞'),('/Fobi#gallery','實拍影像'),('/Fobi#partners','合作夥伴'),('/platform','Pageant平台')]
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
 label='AI合成示意圖・非現場實拍' if n.get('illustration') else ('人物／品牌資料影像' if n.get('expanded') and n['slug']!='medical-media-mao-fobi-2026' else '賽事實拍資料照')
 return f'<article class="card" data-news-card data-category="{n["category"]}" data-search="{H(n["title"]+n["partner"]+n.get("topic",""),quote=True)}"><a href="/news/{n["slug"]}"><img class="card-image" src="{cover(n)}" alt="{H(n["partner"]+"｜"+label,quote=True)}" loading="lazy" width="1200" height="800"><div class="image-label">{label}</div><div class="meta">{n["date"]} · {n.get("topic",n["category"])}</div><h3>{H(n["title"])}</h3><p>{H(n["subtitle"])}</p><span class="text-link">閱讀專題 ↗</span></a></article>'
def paras(values):return ''.join('<p>'+H(x)+'</p>' for x in values)
def fulltext(n):
 parts=[n['title'],n['subtitle'],n.get('byline','FOBI專案編輯室'),n['date'],n.get('disclosure',n['note']),'\n活動紀錄',*n['facts']]
 for s in n.get('sections',[]):parts.extend(['\n'+s['heading'],*s['paragraphs']])
 for q in n.get('interview',[]):parts.extend(['問：'+q['question'],'答：'+q['answer']])
 parts.extend(n.get('closing',[]));parts.extend(n.get('perspective',[]))
 parts.extend(['\n編輯說明',n['note'],'\n圖片與圖說'])
 if n.get('illustration'):parts.extend([n['illustration']['caption'],absolute(n['illustration']['url']),n['illustration']['credit']])
 for photo_ in n['photos']:parts.extend([photo_['caption'],absolute(photo_['url'])])
 parts.extend(['\n來源',*[s['title']+' '+absolute(s['url']) for s in n['sources']],'\n合作聯絡｜醫見傳媒有限公司 Arthur Lin','0935-523-001｜LINE ID beautiself'])
 return '\n\n'.join(parts)
for n in news:
 body='<article class="article wrap"><a class="text-link" href="/news">← 回新聞中心</a><div class="meta">'+n['date']+' · '+H(n['category'])+'</div><h1>'+H(n['title'])+'</h1><p class="subtitle">'+H(n['subtitle'])+'</p><p class="byline">'+H(n.get('byline','FOBI專案編輯室'))+'</p>'
 if n.get('illustration'):
  ai=n['illustration'];body+='<figure class="editorial-illustration"><a href="'+ai['url']+'" target="_blank" rel="noopener"><img src="'+ai['url']+'" alt="'+H(n['partner']+'品牌情境AI合成示意圖，非企業主本人、非現場實拍',quote=True)+'" width="1536" height="1152"></a><figcaption><b>AI合成示意圖・非現場實拍</b><br>'+H(ai['caption'])+'<br>'+H(ai['credit'])+'</figcaption></figure>'
 if n.get('expanded'):
  body+='<p class="reading-meta">人物與品牌專題 · 正文'+str(n['word_count'])+'個中文字</p><div class="report-gallery">'+''.join(photo(x) for x in n['photos'])+'</div>'
 if n['facts']:body+='<section><h2>活動與合作紀錄</h2>'+paras(n['facts'])+'</section>'
 for i,s in enumerate(n.get('sections',[])):
  body+='<section><h2>'+H(s['heading'])+'</h2>'+paras(s['paragraphs'])+'</section>'
  if i==0 and not n.get('expanded'):body+=photo(n['photos'][0])
 if n.get('interview'):
  body+='<section class="interview" id="interview"><h2>'+H(n['interview_label'])+'</h2>'
  for q in n['interview']:body+='<h3>問：'+H(q['question'])+'</h3><p>答：'+H(q['answer'])+'</p>'
  body+='</section>'+paras(n.get('closing',[]))
 if n.get('perspective'):body+='<section><h2>專題觀察</h2>'+paras(n['perspective'])+'</section>'
 if not n.get('expanded'):body+=''.join(photo(x) for x in (n['photos'][1:] if n.get('sections') else n['photos']))
 body+='<aside class="disclosure"><b>編輯與合作說明</b><p>'+H(n.get('disclosure',n['note']))+'</p><p>'+H(n['note'])+'</p></aside><div class="sources"><b>資料與圖片來源</b><ul>'+''.join('<li><a href="'+H(x['url'],quote=True)+'" target="_blank" rel="noopener">'+H(x['title'])+'</a></li>' for x in n['sources'])+'</ul></div>'
 body+='<div class="article-tools"><button type="button" data-copy-article>複製新聞文字</button><button type="button" data-share-article>分享文章</button><button type="button" data-print>列印／儲存PDF</button><a class="text-link" href="/news/copy/'+n['slug']+'.txt" download>下載本文 ↓</a></div><p class="small" data-copy-status role="status"></p><div class="support">合作聯絡｜醫見傳媒有限公司 Arthur Lin<br><a href="tel:+886935523001">0935-523-001</a> · LINE ID beautiself<br><a class="text-link" href="/platform/media">洽詢活動媒體與新聞合作 ↗</a></div></article>'
 schema={'@context':'https://schema.org','@type':'Article','headline':n['title'],'description':n['subtitle'],'datePublished':n['date']+'T10:00:00+08:00','dateModified':datetime.now(timezone.utc).isoformat(),'image':list(dict.fromkeys([absolute(cover(n))]+[absolute(x['url']) for x in n['photos']])),'author':{'@type':'Organization','name':n.get('byline','FOBI專案編輯室')},'publisher':{'@type':'Organization','name':'FOBI・SELF PAGEANT'},'mainEntityOfPage':'https://fobi.self.com.tw/news/'+n['slug'],'articleSection':n['category']}
 write('/news/'+n['slug'],shell(n['title']+'｜FOBI新聞',body,'/news/'+n['slug'],desc=n['subtitle'],image=absolute(cover(n)),schema=schema))
 d=pub/'news/copy';d.mkdir(exist_ok=True);(d/(n['slug']+'.txt')).write_text(fulltext(n))
total=len(news);partners=len(news)-1
body='<section class="wrap news-hero"><div class="kicker">FOBI 2026 · ENTERPRISE & INTERNATIONAL STORIES</div><h1>讓世界看到台灣，<br>也讀懂品牌的故事。</h1><p class="lead">'+str(partners)+'位／家合作夥伴與支持者，加上結案總報導共'+str(total)+'篇。10篇人物與品牌重點報導已擴寫為700字以上，從企業故事、專業背景與願景，延伸國際合作的台灣視角。</p><p class="small muted">新版優先呈現具名公開人物照、品牌服務影像及FOBI實拍，各自標示原始場景。其餘篇目的AI示意圖保留清楚標示。毛彩又執行長本人照仍待身分確認。</p><div class="actions"><a class="button" href="/news/downloads/FOBI-all-22-articles.docx" download>下載全部文字稿 Word ↓</a><a class="button light" href="/news/downloads/FOBI-expanded-10-illustrated.docx" download>下載10篇重點圖文 Word ↓</a><a class="button light" href="/news/articles-copy.zip" download>下載'+str(total)+'篇個別文案與圖說 ↓</a></div><div class="filters"><button class="active" data-filter="all">全部</button><button data-filter="賽事結案">賽事結案</button><button data-filter="合作夥伴專題">合作夥伴</button><input class="search" type="search" id="newsSearch" aria-label="搜尋合作方與新聞" placeholder="搜尋品牌／人物／新聞"></div><p class="news-count" id="newsCount">共'+str(total)+'篇</p></section><section class="wrap section"><div class="grid" id="newsGrid">'+''.join(card(n) for n in sorted(news,key=lambda x:not x.get('expanded',False)))+'</div><p id="newsEmpty" class="empty" hidden>沒有符合條件的新聞，請更換關鍵字。</p></section>'
write('/news',shell('FOBI企業與人物專題｜讓世界看到台灣',body,'/news',desc=str(total)+'篇結案與企業人物報導，10篇700字以上重點稿，附人物、品牌與賽事影像及來源。',image=news[0]['photos'][0]['url']))
archive=pub/'Fobi/index.html';text=archive.read_text()
text=re.sub(r'<article class="card".*?</article>',lambda m:card(next(n for n in news if '/news/'+n['slug']+'"' in m.group(0))),text,flags=re.S)
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
