const fs=require('fs'),vm=require('vm');
const setup=fs.readFileSync('test-quiz.cjs','utf8').split('vm.createContext(ctx);')[0].replace("fs.readFileSync('index.html','utf8')","fs.readFileSync('technical.html','utf8')").replace("fs.readFileSync('data.json','utf8')","fs.readFileSync('technical.json','utf8')");
vm.runInNewContext(setup+String.raw`
nodes.result.hidden=true;nodes['term-language'].value='en';nodes.mode.options=[{},{}];
vm.createContext(ctx);vm.runInContext(fs.readFileSync('config-technical.js','utf8'),ctx);vm.runInContext(source,ctx);
assert.equal(ctx.words.length,4675);assert.equal(ctx.lessonCatalog().length,270);
assert.equal(Object.keys(ctx.config.bookNames).length,14);
assert.equal(ctx.normalizeWriting(' Adjust the (Parameter)! ','en'),'adjusttheparameter');
assert.equal(ctx.normalizeWriting('\u7535\u538b\uFF0C \u7EE7\u7535\u5668\u3002','zh'),'\u7535\u538b\u7EE7\u7535\u5668');
nodes.activity.value='write';ctx.updateActivitySetup();nodes.book.value='1';nodes.unit.value='1';nodes['term-language'].value='en';ctx.begin();
assert.equal(ctx.activity,'write');assert.equal(nodes['quiz-settings'].hidden,true);
let active=ctx.queue[0];nodes['write-english']=nodes.options.children[1];nodes['write-chinese']=nodes.options.children[3];
nodes['write-english'].value='wrong';nodes['write-chinese'].value=active.chinese;ctx.checkWritingAnswers();
assert.equal(ctx.locked,false);assert.equal(ctx.answers.length,0);assert(nodes.feedback.children[1].textContent.includes(active.english));
nodes['write-english'].value='  '+active.english.toUpperCase()+'  ';nodes['write-chinese'].value=active.chinese+'\u3002';
ctx.checkWritingAnswers();assert.equal(ctx.locked,true);assert.equal(ctx.answers.length,1);assert.equal(nodes.next.disabled,false);
let event={key:'Enter',preventDefault(){this.prevented=true;}};ctx.writingInputKey(event);assert(event.prevented);assert.equal(ctx.index,1);
for(let i=1;i<ctx.queue.length;i++){
 active=ctx.queue[ctx.index];nodes['write-english']=nodes.options.children[1];nodes['write-chinese']=nodes.options.children[3];
 nodes['write-english'].value=active.english;nodes['write-chinese'].value=active.chinese;
 ctx.checkWritingAnswers();if(!ctx.locked)throw Error("not accepted index="+ctx.index+" en="+ctx.normalizeWriting(nodes["write-english"].value,"en")+" expected="+ctx.normalizeWriting(active.english,"en")+" zh="+ctx.normalizeWriting(nodes["write-chinese"].value,"zh")+" expectedzh="+ctx.normalizeWriting(active.chinese,"zh"));ctx.advance();
}
assert.equal(nodes.result.hidden,false);assert.equal(nodes['result-score'].textContent,'20/20');
assert(ctx.studyStats.lessons['1-1'].sessions>=1);
console.log('PASS: both languages from Vietnamese prompts, correction retry, punctuation/case handling, Enter and completed lesson statistics.');
`,{require,console});
