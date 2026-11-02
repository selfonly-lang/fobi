from pathlib import Path
import json,io
from docx import Document
from docx.shared import Inches,Pt
from PIL import Image
r=Path(__file__).resolve().parents[1];news=json.loads((r/'content/news.json').read_text());out=r/'public/news/downloads';out.mkdir(exist_ok=True)
def absolute(url):return 'https://fobi.self.com.tw'+url if url.startswith('/') else url
def setup(title,subtitle):
 d=Document();d.add_heading(title,0);d.add_paragraph(subtitle);d.styles['Normal'].font.name='Microsoft JhengHei';d.styles['Normal'].font.size=Pt(11)
 for s in d.sections:s.header.paragraphs[0].text='FOBI 2026｜醫美版 × 己美 SELF'
 return d
all_doc=setup('FOBI 2026｜22篇完整文字稿','21篇人物與品牌專題，加上賽事結案總報導。')
texts=[]
for i,n in enumerate(news,1):
 t=(r/'public/news/copy'/f'{n["slug"]}.txt').read_text();texts.append(t);all_doc.add_heading(f'{i:02d}｜'+n['title'],1)
 if n.get('word_count'):all_doc.add_paragraph(n.get('format_label','')+'｜正文'+str(n['word_count'])+'個中文字')
 for para in t.split('\n\n')[1:]:all_doc.add_paragraph(para)
 if i<len(news):all_doc.add_page_break()
all_doc.save(out/'FOBI-all-22-articles.docx');(out/'FOBI-all-22-articles.txt').write_text(('\n\n'+'='*40+'\n\n').join(texts))
def picture_bytes(ph):
 p=r/'public'/ph['url'].lstrip('/') if ph['url'].startswith('/') else Path('/workspace/fobi-closeout/photos')/(ph['id']+'.webp')
 raw=p.read_bytes();im=Image.open(io.BytesIO(raw));w,h=im.size
 if im.format=='WEBP':
  b=io.BytesIO();im.convert('RGB').save(b,format='JPEG',quality=92);raw=b.getvalue()
 return raw,w,h
def illustrated(items,title,filename):
 d=setup(title,'FOBI 2026｜人物、品牌與活動影像。')
 for i,n in enumerate(items,1):
  d.add_heading(f'{i:02d}｜'+n['title'],1);d.add_paragraph(n['subtitle']);d.add_paragraph(n.get('format_label','')+'｜正文'+str(n['word_count'])+'個中文字')
  for para in n['facts']:d.add_paragraph(para)
  for sec in n['sections']:
   d.add_heading(sec['heading'],2)
   for para in sec['paragraphs']:d.add_paragraph(para)
  if n.get('interview'):
   d.add_heading(n['interview_label'],2)
   for q in n['interview']:d.add_paragraph('問：'+q['question']);d.add_paragraph('答：'+q['answer'])
  for para in n.get('closing',[]):d.add_paragraph(para)
  d.add_heading('配圖與來源',2)
  for ph in n['photos']:
   raw,w,h=picture_bytes(ph);width=min(6.0,3.8*w/h);d.add_picture(io.BytesIO(raw),width=Inches(width));d.add_paragraph(ph['caption']);d.add_paragraph('圖片來源：'+absolute(ph['source']))
  d.add_heading('資料來源',2)
  for x in n['sources']:d.add_paragraph(x['title']+'｜'+absolute(x['url']))
  if i<len(items):d.add_page_break()
 d.save(out/filename)
partners=sorted(news[1:],key=lambda n:n.get('editorial_order',99))
for i in range(3):illustrated(partners[i*7:(i+1)*7],'FOBI 2026｜人物與品牌圖文書 第'+str(i+1)+'冊',f'FOBI-partner-profiles-volume-{i+1}.docx')
mao=next(n for n in news if n['slug']=='medical-media-mao-fobi-2026');illustrated([mao],'毛彩又｜醫見傳媒CEO人物側寫','FOBI-mao-profile.docx')
legacy={'medical-opinion','weimei','origin-capital','yoho','chenyao','medical-media-mao','lin-chunpin','lavisage','hongda','wang-yijie'}
selected=[n for n in partners if n['slug'].removesuffix('-fobi-2026') in legacy]
illustrated(selected,'FOBI 2026｜10篇重點人物與品牌圖文稿（更新版）','FOBI-expanded-10-illustrated.docx')
(out/'FOBI-expanded-10-articles.txt').write_text(('\n\n'+'='*40+'\n\n').join((r/'public/news/copy'/f'{n["slug"]}.txt').read_text() for n in selected))
(out/'photo-source-index.json').write_text(json.dumps([{'slug':n['slug'],'title':n['title'],'format':n.get('format_label'),'photos':n['photos']} for n in partners],ensure_ascii=False,indent=2))
print('Exported 22 texts, 21 illustrated profiles in 3 volumes, CEO portrait and updated legacy downloads.')
