from pathlib import Path
import json,html,re,xml.etree.ElementTree as ET
r=Path(__file__).resolve().parents[1];pub=r/'public';H=html.escape
news=json.loads((r/'content/news.json').read_text())
# The same shell as the editorial pages, without rebuilding other routes.
s=(r/'scripts/build-editorial.py').read_text();exec(s[s.index('def photo('):s.index('def cover(')])
records=json.loads((r/'content/event-records.json').read_text())
body='<section class="wrap news-hero"><div class="kicker">FOBI 2026 · THE EVENT RECORD</div><h1>照片留下相遇，<br>紀錄保留來處。</h1><p class="lead">這裡整理活動方提供的照片與品牌宣傳圖，並連結本屆公開賽後報導。不同影像依原始用途標示，人物姓名僅使用已確認資訊。</p><div class="actions"><a class="button" href="https://www.facebook.com/share/19ucVAM7qq/?mibextid=wwXIfr" target="_blank" rel="noopener">FOBI Facebook活動動態 ↗</a><a class="button light" href="/Fobi">賽果與活動時間軸 ↗</a><a class="button light" href="/news">人物與品牌報導 ↗</a></div></section><section class="wrap section"><div class="section-head"><div><div class="kicker">PROVIDED EVENT MATERIALS</div><h2>活動方提供影像。</h2></div></div><p class="small muted">原圖保留現場、版面與浮水印。含品牌宣傳文字的版面，僅作為品牌提供素材展示，並非本站另行作出的使用推薦或產品認證。</p><div class="grid">'
for x in records:
 label='品牌提供宣傳圖' if x.get('kind')=='brand-promotional' else '活動方提供照片'
 body+='<article class="record-card" id="'+x['id']+'"><div class="meta">'+label+'</div><figure><a href="'+x['url']+'" target="_blank" rel="noopener"><img src="'+x['url']+'" alt="'+H(x['caption'],quote=True)+'" loading="lazy"></a><figcaption>'+H(x['caption'])+'</figcaption></figure><a class="text-link" href="'+x['url']+'" download>下載原圖 ↓</a></article>'
body+='</div></section><section class="wrap section"><div class="split"><div><div class="kicker">PUBLIC EVENT SOURCES</div><h2>本屆賽事與照片來源。</h2><p>10月30日總決賽及10月28日賽程資料照，依各篇圖說連結原始報導。佳麗的合影與展示，僅依畫面與可查資料敘述。</p><p><a class="text-link" href="https://www.wownews.tw/2026/10/2026_01664561917.html" target="_blank" rel="noopener">Wow!NEWS｜總決賽紀錄 ↗</a></p><p><a class="text-link" href="https://www.wownews.tw/2026/10/blog-post_29.html" target="_blank" rel="noopener">Wow!NEWS｜泳裝與晚禮服賽紀錄 ↗</a></p></div><div><div class="kicker">A SEPARATE 2025 RECORD</div><h2>毛彩又的亞軍紀錄。</h2><p>全球城市小姐組織公開的2025年賽後紀錄，列毛彩又為全球城市美業形象大使臺灣賽區第二名。這是她的既往人物背景，與FOBI 2026為不同賽事。</p><a class="text-link" href="https://www.missglobalcity.org/news20250909.htm" target="_blank" rel="noopener">2025美業形象大使公開紀錄 ↗</a><p><a class="button light" href="/news/medical-media-mao-fobi-2026">閱讀毛彩又CEO人物側寫 ↗</a></p></div></div></section>'
write('/Fobi/records',shell('FOBI活動照片與紀錄來源｜毛彩又・品牌・國際佳麗',body,'/Fobi/records',desc='活動方提供照片、品牌宣傳圖與公開賽事紀錄，含毛彩又CEO身分確認及2025美業形象大使亞軍來源。'))
volumes=[]
partners=sorted(news[1:],key=lambda n:n.get('editorial_order',99))
for i in range(3):
 group=partners[i*7:(i+1)*7];volumes.append((f'FOBI-partner-profiles-volume-{i+1}.docx','人物與品牌圖文書 第'+str(i+1)+'冊','、'.join(n['partner'] for n in group)))
files=[('FOBI-all-22-articles.docx','全部22篇完整文字稿 Word','包含21篇獨立人物與品牌專題，以及賽事結案總報導。'),('FOBI-all-22-articles.txt','全部22篇完整文字稿 TXT','純文字版本，方便直接選取、修改與貼文整理。'),('FOBI-mao-profile.docx','毛彩又CEO人物側寫 Word','人物專文、3張活動方提供照片與2025亞軍公開資料來源。'),*volumes]
body='<section class="wrap news-hero"><div class="kicker">MANUSCRIPTS & PHOTO CREDITS</div><h1>把故事帶走，<br>也保留完整來源。</h1><p class="lead">全部文字稿、毛彩又專文，以及21篇人物品牌圖文書。圖文書分為三冊，每冊7篇，方便下載與審閱。</p></section><section class="wrap section">'
for name,title,desc in files:body+='<article class="download-row"><h3>'+H(title)+'</h3><p>'+H(desc)+'</p><a class="button light" href="/news/downloads/'+name+'" download>下載 ↓</a></article>'
body+='<article class="download-row"><h3>22篇個別文稿與全部圖說 ZIP</h3><p>每篇獨立TXT檔，另附圖片來源索引。</p><a class="button light" href="/news/articles-copy.zip" download>下載ZIP ↓</a></article><p><a class="text-link" href="/news">← 回人物與品牌專區</a></p></section>'
write('/news/downloads',shell('FOBI全部文稿與人物品牌圖文書下載',body,'/news/downloads',desc='22篇完整文稿、毛彩又人物專文及21篇品牌圖文書分冊下載。'))
config=r/'vercel.json';d=json.loads(config.read_text());pairs=[('/Fobi/records','/Fobi/records/index.html'),('/Fobi/records/','/Fobi/records/index.html'),('/news/downloads','/news/downloads/index.html'),('/news/downloads/','/news/downloads/index.html')]
for src,dst in reversed(pairs):
 if not any(x['source']==src for x in d['rewrites']):d['rewrites'].insert(0,{'source':src,'destination':dst})
config.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
# A visible route from the archive, as well as editorial navigation.
archive=pub/'Fobi/index.html';s=archive.read_text();s=s.replace('href="/Fobi#gallery"','href="/Fobi/records"');s=s.replace('閱讀已結束賽事','閱讀已結束賽事')
if '查看活動照片與來源紀錄' not in s:s=s.replace('合作致謝</a>','合作致謝</a><a class="button light" href="/Fobi/records">查看活動照片與來源紀錄 ↗</a>')
archive.write_text(s)
sm=pub/'closeout-sitemap.xml';root=ET.fromstring(sm.read_text());ns='{http://www.sitemaps.org/schemas/sitemap/0.9}';have={e.text for e in root.iter(ns+'loc')}
for path in ['/Fobi/records','/news/downloads']:
 u='https://fobi.self.com.tw'+path
 if u not in have:x=ET.SubElement(root,ns+'url');ET.SubElement(x,ns+'loc').text=u;ET.SubElement(x,ns+'lastmod').text='2026-11-02'
ET.register_namespace('',ns[1:-1]);sm.write_text(ET.tostring(root,encoding='unicode',xml_declaration=True))
print('Built event record hub, source archive and download catalogue.')
