import pathlib,json,zipfile,sqlite3,re,html,collections
root=pathlib.Path(__file__).resolve().parent
def clean(s):
 s=re.sub(r'\{\{c\d+::(.*?)(?:::[^{}]*)?\}\}',r'\1',s)
 return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]*>',' ',s))).strip()
words=[]
for book in range(1,7):
 with zipfile.ZipFile(pathlib.Path.home()/'Downloads'/f'4000_Essential_English_Words_{book}_-_Vietnamese.apkg') as z:
  c=sqlite3.connect(':memory:');c.deserialize(z.read('collection.anki2'))
  models=json.loads(c.execute('select models from col').fetchone()[0]);decks=json.loads(c.execute('select decks from col').fetchone()[0]);media={v:k for k,v in json.loads(z.read('media')).items()}
  for nid,mid,flds in c.execute('select id,mid,flds from notes order by id'):
   f=dict(zip([x['name'] for x in models[str(mid)]['flds']],flds.split('\x1f')))
   did=c.execute('select did from cards where nid=? limit 1',(nid,)).fetchone()[0];match=re.search(r'Unit\s*(\d+)',decks[str(did)]['name'],re.I);assert match
   meaning=clean(f['Short Vietnamese'])
   if not meaning:
    found=re.search(r'<font[^>]*>\s*<b>(.*?)</b>',f['Full Vietnamese'],re.S);assert found;meaning=clean(found.group(1))
   w={'id':f'{book}-{nid}','book':book,'unit':int(match.group(1)),'word':clean(f['Keyword']),'meaning':meaning,'ipa':clean(f['Transcription']),'explanation':clean(f['Explanation'])}
   snd=re.search(r'\[sound:([^]]+)\]',f.get('Sound',f.get('Keyword_Sound','')))
   if snd and snd.group(1) in media:
    name=f'{book}-{nid}.mp3';(root/'media'/name).write_bytes(z.read(media[snd.group(1)]));w['audio']='media/'+name
   assert w['word'] and w['meaning'];words.append(w)
assert len(words)==3600
counts=collections.Counter((w['book'],w['unit']) for w in words)
(root/'data.json').write_text(json.dumps(words,ensure_ascii=False,separators=(',',':')),encoding='utf-8');(root/'.nojekyll').touch()
print(len(words),'words; units',len(counts),'audio',sum('audio' in w for w in words),'MB',round(sum(p.stat().st_size for p in (root/'media').iterdir())/1e6,1))
print('Unit counts differing from 20:',[(k,v) for k,v in counts.items() if v!=20])
