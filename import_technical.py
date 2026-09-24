"""Import note data only; never execute Anki templates, scripts or embedded HTML."""
from pathlib import Path
import sys, zipfile, sqlite3, json, re, html, collections, hashlib

ROOT = Path(__file__).resolve().parent

def clean(value):
    value = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', ' ', value, flags=re.I | re.S)
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]*>', ' ', value))).strip()

def main(source):
    with zipfile.ZipFile(source) as archive:
        db = sqlite3.connect(':memory:')
        db.deserialize(archive.read('collection.anki2'))
        models = json.loads(db.execute('select models from col').fetchone()[0])
        expected = ['English', 'Chinese', 'Pinyin', 'Vietnamese', 'Domain', 'Subdomain', 'Note', 'Source', 'TagsText']
        assert all([f['name'] for f in model['flds']] == expected for model in models.values())
        rows = db.execute('select id,flds from notes order by id').fetchall()
        assert json.loads(archive.read('media')) == {}, 'Review media before changing this importer'
    groups = collections.OrderedDict()
    for nid, raw in rows:
        fields = list(map(clean, raw.split('\x1f')))
        assert len(fields) == 9 and all(fields[:6]), nid
        groups.setdefault((fields[4], fields[5]), []).append((nid, fields))
    output, books, units = [], {}, {}
    counts = collections.Counter()
    for (domain, subdomain), items in groups.items():
        book = int(domain.split()[0])
        books[str(book)] = domain
        for offset in range(0, len(items), 20):
            counts[book] += 1
            unit = counts[book]
            units[str(book)+'-'+str(unit)] = subdomain + (' \u00b7 '+str(offset//20+1) if len(items)>20 else '')
            for nid, fields in items[offset:offset+20]:
                en, zh, pinyin, vi, domain, subdomain, note, source_name, tags = fields
                output.append(dict(id='technical-'+str(nid), book=book, unit=unit, word=en, meaning=vi, ipa='',
                    explanation=zh+' \u00b7 '+pinyin+'\n'+subdomain, english=en, chinese=zh, pinyin=pinyin,
                    domain=domain, subdomain=subdomain, note=note, source=source_name, tags=tags))
    output.sort(key=lambda w:(w['book'], w['unit']))
    assert len(output) == len(rows) == len({w['id'] for w in output})
    (ROOT/'technical.json').write_text(json.dumps(output, ensure_ascii=False, separators=(',',':')), encoding='utf-8')
    config = dict(dataFile='technical.json', kind='technical', language='ti\u1ebfng Anh', speechLang='en-US',
        noImages=True, bookNames=books, unitNames=units, unitPrefix='B\u00e0i ',
        statsKey='wordcraft-technical-v1', historyKey='wordcraft-last-technical', total=len(output))
    (ROOT/'config-technical.js').write_text('window.wordcraftConfig='+json.dumps(config,ensure_ascii=True,separators=(',',':'))+';\n', encoding='utf-8')
    report = dict(sourceFile=source.name, sha256=hashlib.sha256(source.read_bytes()).hexdigest(), notes=len(rows),
        exported=len(output), domains=len(books), subdomains=len(groups), lessons=len(units), media=0)
    (ROOT/'technical-import-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report))

if __name__ == '__main__':
    main(Path(sys.argv[1]) if len(sys.argv)>1 else Path.home()/'Downloads'/'Technical_Master_EN_ZH_VI_v2_FIXED.apkg')
