import pathlib,zipfile,sqlite3,json,re,html,hashlib,collections
from html.parser import HTMLParser
ROOT=pathlib.Path(__file__).resolve().parent
class Image(HTMLParser):
 def __init__(self): super().__init__();self.src=None
 def handle_starttag(self,tag,attrs):
  if tag.lower()=='img' and not self.src:self.src=dict(attrs).get('src')
def clean(s):
 s=re.sub(r'<(script|style)\b[^>]*>.*?</\1>',' ',s,flags=re.I|re.S)
 s=re.sub(r'\[sound:[^]]+\]',' ',s)
 return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]*>',' ',s))).strip()
def rows(s,kind):
 return [clean(x) for x in re.findall(r'<TR\s+id='+kind+r'[^>]*>(.*?)</TR>',s,re.I|re.S)]
def export(kind,filename):
 z=zipfile.ZipFile(pathlib.Path.home()/'Downloads'/filename)
 c=sqlite3.connect(':memory:');c.deserialize(z.read('collection.anki2'))
 media={v:k for k,v in json.loads(z.read('media')).items()}
 folder=ROOT/'chinese-media';folder.mkdir(exist_ok=True)
 missing=set()
 def asset(raw,image=False):
  if image:
   p=Image();p.feed(raw);name=p.src
  else:
   m=re.search(r'\[sound:([^]]+)\]',raw);name=m.group(1) if m else None
  if not name:return None
  if name not in media:missing.add(name);return None
  ext=pathlib.Path(name).suffix.lower()
  if ext not in {'.jpg','.jpeg','.png','.gif','.webp','.mp3','.ogg','.wav','.m4a'}:return None
  data=z.read(media[name]);dest=folder/(hashlib.sha256(data).hexdigest()[:24]+ext)
  if not dest.exists():dest.write_bytes(data)
  return 'chinese-media/'+dest.name
 out=[];counter=collections.Counter();units={};skipped=[]
 for nid,raw,tags in c.execute('select id,flds,tags from notes order by id'):
  f=raw.split('\x1f')
  level=int(re.search(r'HSK(\d)',tags).group(1)) if kind!='radicals' else 1
  if kind=='vocabulary':
   word,meaning,ipa=map(clean,f[:3]);defs=rows(f[5],'mn_T_cv_id')
   if not meaning:
    meaning='; '.join(re.sub(r'^\d+\.\s*','',d.split('。')[0]) for d in defs[:3])
    if not meaning:meaning={'不屑一顾':'Không thèm để mắt; coi thường','馅儿':'Nhân bánh'}.get(word,'')
   assert word and meaning,(nid,word)
   counter[level]+=1;unit=(counter[level]-1)//20+1
   examples=rows(f[5],'mh_T_cv_id');translations=rows(f[5],'mh_n_T_cv_id')
   explanation='\n'.join(a+(' — '+translations[i] if i<len(translations) else '') for i,a in enumerate(examples[:2]))
   if not explanation:
    m=re.search(r'<div class="sen_cn">(.*?)</div>',f[6],re.S)
    explanation=clean(m.group(1)) if m else ''
   image=asset(f[4],True);audio=asset(f[3]);diagram=None
  elif kind=='grammar':
   word,ipa,meaning=map(clean,f[:3]);unit=int(re.search(r'\d+',f[9]).group())
   title=clean(f[6]);units[str(level)+'-'+str(unit)]=title
   explanation=title+'\nCấu trúc: '+clean(f[4])+'\nCách dùng: '+clean(f[5])
   image=asset(f[8],True) or asset(f[7],True);diagram=asset(f[7],True);audio=asset(f[3])
  else:
   word=clean(f[3]);meaning=clean(f[6]);ipa=clean(f[2])
   if not word:skipped.append(nid);continue
   number=int(float(f[0]));unit=(number-1)//20+1
   explanation=clean(f[8])+'\nGợi nhớ: '+clean(f[7])
   image=asset(f[4],True);diagram=asset(f[5],True);audio=asset(f[9])
  assert word and meaning
  w=dict(id=kind+'-'+str(nid),book=level,unit=unit,word=word,meaning=meaning,ipa=ipa,explanation=explanation)
  for key,value in [('image',image),('audio',audio),('diagram',diagram)]:
   if value and not(key=='diagram' and value==image):w[key]=value
  out.append(w)
 out.sort(key=lambda w:(w['book'],w['unit']))
 (ROOT/('chinese-'+kind+'.json')).write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
 config=dict(dataFile='chinese-'+kind+'.json',statsKey='wordcraft-chinese-'+kind+'-v1',historyKey='wordcraft-last-'+kind,language='Tiếng Trung',bookNames={str(i):('Bộ thủ' if kind=='radicals' else 'HSK '+str(i)) for i in sorted(set(w['book'] for w in out))},unitNames=units,kind=kind,total=len(out))
 (ROOT/('config-'+kind+'.js')).write_text('window.wordcraftConfig='+json.dumps(config,ensure_ascii=True,separators=(',',':'))+';\n',encoding='utf-8')
 report=dict(cards=len(out),lessons=len(set((w['book'],w['unit']) for w in out)),audio=sum('audio' in w for w in out),images=sum('image' in w for w in out),diagrams=sum('diagram' in w for w in out),skipped=skipped,missingMedia=len(missing))
 print(kind,report)
 return report
if __name__=='__main__':
 reports={}
 for kind,name in [('vocabulary','HSK1-6_full_audio_image_and_Vietnamese_meaning_.apkg'),('grammar','Ng_php_HSK_6_cp_vi_450_im_ng_php__4800_mu_cu.apkg'),('radicals','214_B_Th_Hanzi-Pinyin-Sound-Picture-Hn_Vit.apkg')]:
  reports[kind]=export(kind,name)
 (ROOT/'chinese-import-report.json').write_text(json.dumps(reports,indent=2),encoding='utf-8')
 print('Exported media MB',round(sum(p.stat().st_size for p in (ROOT/'chinese-media').iterdir())/1e6,1))
