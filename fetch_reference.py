"""Download only data files linked by LearnLangLab's level selector."""
import urllib.request,re,json,pathlib,concurrent.futures
BASE='https://learnlanglab.github.io/learn/'
def main():
 page=urllib.request.urlopen(BASE,timeout=30).read().decode('utf-8')
 select=re.search(r'<select[^>]*id="levelSelector".*?</select>',page,re.S).group()
 groups=re.findall(r'<option value="(\d+)">(.*?)</option>',select)
 folder=pathlib.Path(__file__).resolve().parent/'.reference-source'
 folder.mkdir(exist_ok=True)
 def get(pair):
  key,label=pair
  url=BASE+'hsk'+key+'_vocab.js'
  data=urllib.request.urlopen(url,timeout=30).read().decode('utf-8-sig')
  (folder/(key+'.js')).write_text(data,encoding='utf-8')
  return dict(key=key,label=label.strip(),url=url,bytes=len(data))
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: result=list(pool.map(get,groups))
 (folder/'manifest.json').write_text(json.dumps(result,ensure_ascii=False),encoding='utf-8')
 print('Downloaded',len(result),'data groups; run node import_reference.cjs next.')
if __name__=='__main__': main()
