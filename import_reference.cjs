'use strict';
const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const key=Object.keys(process.binding('natives')).find(k=>/acorn\/dist\/acorn$/.test(k));
const parser={};vm.runInNewContext(process.binding('natives')[key],parser);
const manifest=JSON.parse(fs.readFileSync('.reference-source/manifest.json','utf8'));
const words=[],bookNames={},learnOnlyBooks=[],report=[];
function literal(node){
 if(node.type==='Literal'&&typeof node.value==='string')return node.value.trim();
 throw Error('Non-string data field: '+node.type);
}
for(let n=0;n<manifest.length;n++){
 const entry=manifest[n],src=fs.readFileSync('.reference-source/'+entry.key+'.js','utf8');
 const ast=parser.acorn.parse(src,{ecmaVersion:2020});
 const arrays=[];
 for(const statement of ast.body){
  if(statement.type==='ExpressionStatement'&&statement.expression.type==='AssignmentExpression'&&statement.expression.left.name==='vocab'&&statement.expression.right.type==='ArrayExpression')arrays.push(statement.expression.right);
  else if(statement.type==='EmptyStatement')continue;
  else throw Error('Unexpected source statement in '+entry.key+': '+statement.type);
 }
 if(arrays.length!==1)throw Error('Expected one vocab array '+entry.key);
 const book=n+1;bookNames[book]=entry.key==='21'?'Hỏi đáp (học câu)':entry.label;
 if(entry.key==='21')learnOnlyBooks.push(book);
 const seen=new Set();let count=0,duplicates=0,incomplete=0;
 for(const row of arrays[0].elements){
  if(row.type!=='ObjectExpression')throw Error('Expected object');
  const data={};
  for(const prop of row.properties){
   if(prop.type!=='Property'||prop.computed||prop.kind!=='init')throw Error('Invalid property');
   const name=prop.key.name||prop.key.value;
   data[name]=literal(prop.value);
  }
  if(!data.hanzi||!data.meaning){incomplete++;continue;}data.pinyin=data.pinyin||'';
  const fingerprint=JSON.stringify([data.hanzi,data.pinyin,data.meaning]);
  if(seen.has(fingerprint)){duplicates++;continue;}seen.add(fingerprint);
  const id='ref-'+entry.key+'-'+crypto.createHash('sha256').update(fingerprint).digest('hex').slice(0,16);
  words.push({id,book,unit:Math.floor(count/20)+1,word:data.hanzi,meaning:data.meaning,ipa:data.pinyin,explanation:entry.key==='21'?'Câu trả lời gợi ý bằng tiếng Trung từ trang nguồn.':'',learnOnly:entry.key==='21'});
  count++;
 }
 report.push({source:entry.url,label:bookNames[book],cards:count,duplicatesRemoved:duplicates,incompleteSkipped:incomplete,sha256:crypto.createHash('sha256').update(src).digest('hex')});
}
fs.writeFileSync('hsk-reference.json',JSON.stringify(words));
fs.writeFileSync('config-reference.js','window.wordcraftConfig='+JSON.stringify({kind:'reference',language:'Tiếng Trung',dataFile:'hsk-reference.json',statsKey:'wordcraft-hsk-reference-v1',historyKey:'wordcraft-last-reference',bookNames,unitNames:{},learnOnlyBooks,speechLang:'zh-CN',noImages:true})+';\n');
fs.writeFileSync('reference-import-report.json',JSON.stringify({source:'https://learnlanglab.github.io/learn/',importedAt:new Date().toISOString(),cards:words.length,groups:report},null,2));
console.log(JSON.stringify(report.map(r=>({label:r.label,cards:r.cards,duplicates:r.duplicatesRemoved}))));
console.log('Total cards',words.length);
