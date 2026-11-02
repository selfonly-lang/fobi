from pathlib import Path
import json,io,re
from docx import Document
from docx.shared import Inches,Pt
from PIL import Image
r=Path(__file__).resolve().parents[1];news=json.loads((r/'content/news.json').read_text());out=r/'public/news/downloads';out.mkdir(exist_ok=True)
def setup(title,subtitle):
 d=Document();d.add_heading(title,0);d.add_paragraph(subtitle);d.styles['Normal'].font.name='Microsoft JhengHei';d.styles['Normal'].font.size=Pt(11)
 for s in d.sections:s.header.paragraphs[0].text='FOBI 2026｜醫美版 × 己美 SELF'
 return d
all_doc=setup('FOBI 2026｜全部22篇完整文字稿','2026年11月2日更新｜10篇加強稿正文均逾700個中文字；其餘篇目保留原刊版本。')
texts=[]
for i,n in enumerate(news,1):
 t=(r/'public/news/copy'/f'{n["slug"]}.txt').read_text();texts.append(t);all_doc.add_heading(f'{i:02d}｜'+n['title'],1)
 if n.get('expanded'):all_doc.add_paragraph('正文中文字數：'+str(n['word_count'])+'字（不含標題、來源及圖說）')
 for p in t.split('\n\n')[1:]:all_doc.add_paragraph(p)
 if i<len(news):all_doc.add_page_break()
all_doc.save(out/'FOBI-all-22-articles.docx');(out/'FOBI-all-22-articles.txt').write_text(('\n\n'+'='*40+'\n\n').join(texts))
expanded=[n for n in news if n.get('expanded')]
d=setup('FOBI 2026｜10篇人物與品牌加強圖文稿','每篇正文810至851個中文字，搭配3則具來源影像。毛彩又本人照待確認；相關篇先列3張賽事實拍。品牌圖與既往資料照不當作本屆實拍。')
def picture_bytes(ph):
 if ph['url'].startswith('/'):p=r/'public'/ph['url'].lstrip('/')
 else:p=Path('/workspace/fobi-closeout/photos')/(ph['id']+'.webp')
 raw=p.read_bytes();im=Image.open(io.BytesIO(raw));w,h=im.size
 if im.format=='WEBP':
  # Format conversion for DOCX compatibility; no crop or retouch.
  b=io.BytesIO();im.convert('RGB').save(b,format='JPEG',quality=95);raw=b.getvalue()
 return raw,w,h
for i,n in enumerate(expanded,1):
 d.add_heading(f'{i:02d}｜'+n['title'],1);d.add_paragraph(n['subtitle']);d.add_paragraph(n['byline']+'｜正文'+str(n['word_count'])+'個中文字')
 for s in n['sections']:
  d.add_heading(s['heading'],2)
  for p in s['paragraphs']:d.add_paragraph(p)
 d.add_heading('配圖與來源',2)
 for ph in n['photos']:
  raw,w,h=picture_bytes(ph);width=min(6.0,3.8*w/h);d.add_picture(io.BytesIO(raw),width=Inches(width));d.add_paragraph(ph['caption']);d.add_paragraph('圖片來源：'+ph['source'])
 d.add_heading('資料與編輯說明',2);d.add_paragraph(n['disclosure']);d.add_paragraph(n['note'])
 for x in n['sources']:d.add_paragraph(x['title']+'｜'+('https://fobi.self.com.tw'+x['url'] if x['url'].startswith('/') else x['url']))
 if i<len(expanded):d.add_page_break()
d.save(out/'FOBI-expanded-10-illustrated.docx')
(out/'FOBI-expanded-10-articles.txt').write_text(('\n\n'+'='*40+'\n\n').join((r/'public/news/copy'/f'{n["slug"]}.txt').read_text() for n in expanded))
(out/'photo-source-index.json').write_text(json.dumps([{'slug':n['slug'],'title':n['title'],'photos':n['photos'],'note':n['note']} for n in expanded],ensure_ascii=False,indent=2))
print('Exported all-22 text documents and 10-feature illustrated Word.')
