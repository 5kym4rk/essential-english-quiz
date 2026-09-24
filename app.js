'use strict';
// ES5 syntax and older DOM APIs keep the quiz usable on older iOS Safari.
function $(id){return document.getElementById(id);}
function empty(node){while(node.firstChild)node.removeChild(node.firstChild);}
function text(id,value){$(id).textContent=value;}
function add(parent){for(var i=1;i<arguments.length;i++)parent.appendChild(arguments[i]);}
function pad(n){return n<10?'0'+n:String(n);}
if(window.wordcraftTheme)window.wordcraftTheme.init();
var config=window.wordcraftConfig||{},showDiagram=false;
if(config.kind)document.body.classList.add('collection-'+config.kind);
function bookName(n){return config.bookNames?config.bookNames[n]:'Bộ '+n;}
function unitName(b,u){return config.unitNames&&config.unitNames[b+'-'+u]?(config.unitPrefix||'NP ')+u+' · '+config.unitNames[b+'-'+u]:'Bài '+pad(u);}
function wordMeta(w){return bookName(w.book)+' · '+unitName(w.book,w.unit);}
var words=[],queue=[],index=0,answers=[],choices=[],locked=false,mode='en',playing=null;
var timer=null,remaining=0,pictureFrame=null,spoken=null;
function hasCardAudio(w){return !!(w&&(w.audio||(config.speechLang&&window.speechSynthesis&&window.SpeechSynthesisUtterance)));}
function learnOnlyBook(){return config.learnOnlyBooks&&config.learnOnlyBooks.indexOf(Number($('book').value))!==-1;}

function readImagePreference(){try{return localStorage.getItem('wordcraft-show-images')!=='off';}catch(e){return true;}}
var showImages=readImagePreference();
function readAutoReadPreference(){try{return localStorage.getItem('wordcraft-auto-read')==='on';}catch(e){return false;}}
var autoRead=readAutoReadPreference();
function updateAutoReadButton(){
 text('toggle-auto-read',autoRead?'Tự đọc: Bật':'Tự đọc: Tắt');
 $('toggle-auto-read').setAttribute('aria-pressed',autoRead?'true':'false');
}
function canReadCard(){return !$('quiz').hidden&&(activity==='learn'||mode==='en'||locked);}
function maybeAutoRead(){if(autoRead&&!document.hidden&&canReadCard())playCardAudio(true);}
$('toggle-auto-read').onclick=function(){
 autoRead=!autoRead;try{localStorage.setItem('wordcraft-auto-read',autoRead?'on':'off');}catch(e){}
 updateAutoReadButton();text('audio-status','');
 if(autoRead)maybeAutoRead();else stopAudio();
};
updateAutoReadButton();
// Keep a small look-ahead window; never download a whole lesson in advance.
var prefetchedPictures=[];
function prefetchNextPictures(){
 var connection=window.navigator&&window.navigator.connection;
 if(!showImages||config.kind==='grammar'||config.noImages||document.hidden||
    (connection&&connection.saveData))return;
 for(var offset=1;offset<=6&&index+offset<queue.length;offset++){
  var word=queue[index+offset],src=word.image||word.diagram;
  if(!src||prefetchedPictures.some(function(entry){return entry.src===src;}))continue;
  var image=document.createElement('img');
  image.setAttribute('fetchpriority','low');image.setAttribute('decoding','async');
  var entry={src:src,image:image};prefetchedPictures.push(entry);
  if(prefetchedPictures.length>12)prefetchedPictures.shift();
  image.onerror=(function(failed){return function(){
   var position=prefetchedPictures.indexOf(failed);
   if(position!==-1)prefetchedPictures.splice(position,1);
  };}(entry));
  image.src=src;
 }
}
function renderQuestionImage(){
 var host=$('question-image'),w=queue[index];
 empty(host);host.hidden=!showImages||config.kind==='grammar'||!!config.noImages;
 $('toggle-images').hidden=config.kind==='grammar'||!!config.noImages;
 text('toggle-images',showImages?'\u1ea2nh: B\u1eadt':'\u1ea2nh: T\u1eaft');
 $('toggle-images').setAttribute('aria-pressed',showImages?'true':'false');
 if(config.kind==='grammar'||config.noImages||!showImages||!w||!(w.image||w.diagram))return;
 var figure=document.createElement('figure');figure.className='illustration';
 var image=document.createElement('img');image.alt='\u1ea2nh minh h\u1ecda t\u1eeb v\u1ef1ng';
 image.onerror=function(){if(figure.parentNode)figure.parentNode.removeChild(figure);};
 image.setAttribute('fetchpriority','high');image.setAttribute('decoding','async');
 var prepared=false;
 function ready(){
  if(prepared||host.querySelector('img')!==image)return;
  prepared=true;schedulePictureFit();prefetchNextPictures();
 }
 image.onload=ready;
 image.src=showDiagram&&w.diagram?w.diagram:(w.image||w.diagram);add(figure,image);add(host,figure);
 if(image.complete&&image.naturalWidth)ready();
}
$('toggle-images').onclick=function(){
 showImages=!showImages;
 try{localStorage.setItem('wordcraft-show-images',showImages?'on':'off');}catch(e){}
 renderQuestionImage();schedulePictureFit();
};
function shuffle(arr){var a=arr.slice(),i,j,t;for(i=a.length-1;i>0;i--){j=Math.floor(Math.random()*(i+1));t=a[i];a[i]=a[j];a[j]=t;}return a;}
function norm(s){return (s.normalize?s.normalize('NFC'):s).toLowerCase().trim();}
function formatAnswer(s){s=s.trim();for(var i=0;i<s.length;i++){if(s.charAt(i).toUpperCase()!==s.charAt(i).toLowerCase())return s.slice(0,i)+s.charAt(i).toUpperCase()+s.slice(i+1);}return s;}
function makeChoices(w,all,direction){
 var field=direction==='en'?'meaning':'word',other=direction==='en'?'word':'meaning';
 var seen={},candidates=[],pool=shuffle(all),i,x,key;seen['$'+norm(w[field])]=true;
 for(i=0;i<pool.length;i++){x=pool[i];key='$'+norm(x[field]);if(norm(x[other])===norm(w[other])||seen[key])continue;seen[key]=true;candidates.push(x);if(candidates.length===3)break;}
 return shuffle([w].concat(candidates));
}
function stopAudio(){if(spoken&&window.speechSynthesis){spoken=null;window.speechSynthesis.cancel();}if(playing){playing.pause();playing=null;}}
function stopTimer(){if(timer!==null)clearInterval(timer);timer=null;remaining=0;text('countdown','');$('pause-auto').hidden=true;}
function startTimer(){
 stopTimer();var delay=Number($('auto-next').value);
 if(!locked||!delay||document.hidden)return;
 remaining=delay;$('pause-auto').hidden=false;
 function update(){text('countdown',(index===queue.length-1?'Xem kết quả sau ':'Câu tiếp theo sau ')+remaining+' giây');}
 update();timer=setInterval(function(){if(document.hidden){stopTimer();return;}remaining--;if(remaining<=0){advance();}else update();},1000);
}
function history(){try{var s=JSON.parse(localStorage.getItem(config.historyKey||'wordcraft-last'));if(s)text('history','Lượt gần nhất: '+s.correct+'/'+s.total+' câu đúng');}catch(e){}}
function score(){return answers.filter(function(a){return a.correct;}).length;}
var learningPlan=[],learningLessonIndex=0;
var technicalBaseWords=null;
function updateTechnicalLabels(){
 var label=$('term-language').value==='zh'?'Trung':'Anh';
 $('mode').options[0].text=label+' → Việt';
 $('mode').options[1].text='Việt → '+label;
}
function prepareTechnicalWords(){
 if(config.kind!=='technical')return;
 if(!technicalBaseWords)technicalBaseWords=words;
 var chinese=$('term-language').value==='zh';
 config.language=chinese?'tiếng Trung':'tiếng Anh';config.speechLang=chinese?'zh-CN':'en-US';
 words=technicalBaseWords.map(function(original){
  var word={};Object.keys(original).forEach(function(key){word[key]=original[key];});
  word.word=chinese?word.chinese:word.english;word.ipa=chinese?word.pinyin:'';
  word.explanation=(chinese?'English: '+word.english:'中文: '+word.chinese+' · '+word.pinyin)+'\n'+word.subdomain+(word.note?'\n'+word.note:'');
  return word;
 });
}
if(config.kind==='technical')$('term-language').onchange=updateTechnicalLabels;
function begin(retry,continueLesson){
 prepareTechnicalWords();
 stopTimer();stopAudio();mode=$('mode').value;activity=retry?'quiz':$('activity').value;learnSeen={};
 var pool=words.filter(function(w){return (activity==='learn'||!w.learnOnly)&&(!Number($('book').value)||w.book===Number($('book').value))&&(!Number($('unit').value)||w.unit===Number($('unit').value));});
 if(activity==='learn'){
  if(!continueLesson){
   var seenLessons={};learningPlan=[];learningLessonIndex=0;
   pool.forEach(function(w){var key=w.book+'-'+w.unit;if(!seenLessons[key]){seenLessons[key]=true;learningPlan.push({book:w.book,unit:w.unit});}});
   learningPlan.sort(function(a,b){return a.book-b.book||a.unit-b.unit;});
  }
  var lesson=learningPlan[learningLessonIndex];
  if(lesson){
   pool=words.filter(function(w){return w.book===lesson.book&&w.unit===lesson.unit;});
   $('book').value=String(lesson.book);updateUnits();$('unit').value=String(lesson.unit);
  }
 }
 $('next-lesson').hidden=true;$('review-lesson').hidden=true;
 queue=activity==='learn'?pool.slice():shuffle(retry||pool);
 if(!queue.length){text('total','Nhóm này chỉ hỗ trợ Học từ. Hãy chọn chế độ Học từ để xem câu hỏi và câu trả lời.');return;}
 index=0;answers=[];sessionRecorded=false;$('study-stats').hidden=false;document.body.classList.add('studying');$('setup').hidden=true;$('change-settings').hidden=false;
 $('welcome').hidden=true;$('result').hidden=true;$('quiz').hidden=false;$('study-panel').hidden=false;render();
}
function viewportHeight(){return window.visualViewport?window.visualViewport.height:window.innerHeight;}
function mobile(){return window.matchMedia('(max-width:680px)').matches;}
function fitQuestionPicture(){
 var quiz=$('quiz'),image=$('question-image').querySelector('img'),last=$('options').lastElementChild;
 if(quiz.hidden||!image)return;
 if(activity==='learn'){
  var panelReserve=mobile()?$('study-panel').getBoundingClientRect().height+12:0;
  var imageOffset=image.getBoundingClientRect().top-quiz.getBoundingClientRect().top;
  image.style.height=Math.max(80,Math.floor(viewportHeight()-imageOffset-panelReserve-15))+'px';
  return;
 }
 if(!last)return;
 var reserve=mobile()?$('study-panel').getBoundingClientRect().height+16:16;
 // After an answer, keep the picture stable while the mobile feedback sheet opens.
 if(locked&&mobile())return;
 var fixed=last.getBoundingClientRect().bottom-quiz.getBoundingClientRect().top-image.getBoundingClientRect().height;
 image.style.height=Math.max(40,Math.floor(viewportHeight()-reserve-fixed))+'px';
}
function alignQuestion(){var top=$('quiz').getBoundingClientRect().top+(window.pageYOffset||0)-8;window.scrollTo(0,Math.max(0,top));}
function schedulePictureFit(){if(pictureFrame)cancelAnimationFrame(pictureFrame);pictureFrame=requestAnimationFrame(fitQuestionPicture);}
window.addEventListener('resize',schedulePictureFit);
if(window.visualViewport)window.visualViewport.addEventListener('resize',schedulePictureFit);
function render(){
 showDiagram=false;
 if(activity==='learn'){renderLearning();return;}
 document.body.classList.remove('learning-words');
 $('toggle-diagram').hidden=true;$('learn-content').hidden=true;$('options').hidden=false;$('previous-word').hidden=true;
 text('keyboard-help','Ph\u00edm 0\u20133 \u0111\u1ec3 ch\u1ecdn \u00b7 Enter \u0111\u1ec3 ti\u1ebfp t\u1ee5c');
 stopTimer();stopAudio();locked=false;document.body.classList.remove('answered');var w=queue[index];choices=makeChoices(w,config.language?words.filter(function(x){return x.book===w.book&&!x.learnOnly;}):words,mode);
 text('session-label','CÂU '+(index+1)+' / '+queue.length);text('score',score()+' câu đúng');
 $('bar').style.width=(index/queue.length*100)+'%';
 text('meta',wordMeta(w));
 text('prompt',mode==='en'?'Chọn nghĩa tiếng Việt phù hợp':'Chọn '+(config.language||'tiếng Anh')+' phù hợp');
 text('question',mode==='en'?w.word:w.meaning);text('ipa',mode==='en'?w.ipa:'');
 $('audio').hidden=mode==='vi'||!hasCardAudio(w);$('audio-status').textContent='';
 $('next').disabled=true;text('next','Chọn đáp án 0–3');empty($('feedback'));empty($('options'));empty($('question-image'));
 text('answer-hint','Chọn một đáp án để xem nghĩa và ví dụ.');
 renderQuestionImage();
 choices.forEach(function(x,i){
  var b=document.createElement('button');b.type='button';b.className='option';
  var key=document.createElement('span');key.className='key';key.textContent=i;
  var label=document.createElement('span');label.textContent=formatAnswer(mode==='en'?x.meaning:x.word);
  add(b,key,label);b.onclick=function(){choose(i);};add($('options'),b);
 });
 requestAnimationFrame(function(){fitQuestionPicture();alignQuestion();});maybeAutoRead();
}
function choose(i){
 if(activity==='learn')return;
 if(locked||!choices[i])return;locked=true;document.body.classList.add('answered');
 var w=queue[index],correct=choices[i].id===w.id;
 answers.push({word:w,correct:correct,selected:choices[i]});
 for(var j=0;j<$('options').children.length;j++){var b=$('options').children[j];b.disabled=true;if(choices[j].id===w.id)b.classList.add('correct');else if(j===i)b.classList.add('wrong');}
 var title=document.createElement('strong');title.textContent=correct?'Chính xác!':'Đáp án đúng: '+formatAnswer(mode==='en'?w.meaning:w.word);
 var meaning=document.createElement('p');meaning.className='answer-meaning';meaning.textContent=w.word+' '+w.ipa+' — '+w.meaning;
 var example=document.createElement('p');example.textContent=w.explanation;
 add($('feedback'),title,meaning,example);text('answer-hint','Nghĩa và ví dụ');
 $('audio').hidden=!hasCardAudio(w);$('next').disabled=false;
 text('score',score()+' câu đúng');text('next',index===queue.length-1?'Xem kết quả →':'Câu tiếp theo →');
 recordCompletedQuiz();
 if(mode==='vi')maybeAutoRead();
 if(config.kind==='radicals')schedulePictureFit();
 startTimer();
}
function advance(){if(activity==='learn'){if(index<queue.length-1){index++;render();}else finishLearning();return;}if(!locked)return;stopTimer();index++;if(index<queue.length)render();else finish();}
function finish(){
 recordCompletedQuiz();$('study-stats').hidden=true;
 stopTimer();stopAudio();document.body.classList.remove('studying');document.body.classList.remove('answered');
 $('study-panel').hidden=true;$('setup').hidden=false;$('change-settings').hidden=true;$('quiz').hidden=true;$('result').hidden=false;
 $('bar').style.width='100%';text('session-label','KẾT QUẢ LƯỢT HỌC');
 var correct=score(),wrong=answers.filter(function(a){return !a.correct;});
 text('result-score',correct+'/'+queue.length);text('result-message','Bạn trả lời đúng '+Math.round(correct/queue.length*100)+'%. '+(wrong.length?'Ôn lại các từ dưới đây để nhớ chắc hơn.':'Bạn đã trả lời đúng tất cả các câu!'));
 $('retry').hidden=!wrong.length;empty($('review'));
 wrong.forEach(function(a){var div=document.createElement('div');div.className='review-item';var b=document.createElement('strong');b.textContent=a.word.word+' — '+a.word.meaning;var s=document.createElement('span');s.textContent='Bạn chọn: '+formatAnswer(mode==='en'?a.selected.meaning:a.selected.word);add(div,b,s);add($('review'),div);});
 try{localStorage.setItem(config.historyKey||'wordcraft-last',JSON.stringify({correct:correct,total:queue.length}));}catch(e){}
 history();$('result').scrollIntoView(true);
}
$('settings').onsubmit=function(e){e.preventDefault();begin();};$('again').onclick=function(){begin();};
$('retry').onclick=function(){var missed=answers.filter(function(a){return !a.correct;}).map(function(a){return a.word;});$('mode').value=mode;begin(missed);};
$('next').onclick=advance;
$('pause-auto').onclick=function(){stopTimer();text('countdown','Đã dừng tự chuyển câu này.');};
$('auto-next').onchange=function(){if(locked)startTimer();};
$('change-settings').onclick=function(){stopTimer();$('setup').hidden=!$('setup').hidden;if(!$('setup').hidden)$('setup').scrollIntoView(true);};
document.addEventListener('visibilitychange',function(){if(document.hidden){stopTimer();stopAudio();}});
function playCardAudio(automatic){
 var w=queue[index];if(!hasCardAudio(w))return;stopAudio();text('audio-status','');
 if(!w.audio){
  var utterance=new window.SpeechSynthesisUtterance(w.word);spoken=utterance;utterance.lang=config.speechLang;utterance.rate=0.8;
  utterance.onerror=function(){if(spoken===utterance)text('audio-status','Không đọc được bằng giọng của thiết bị. Hãy thử lại hoặc kiểm tra giọng tiếng Trung.');};
  utterance.onend=function(){if(spoken===utterance)spoken=null;};
  try{window.speechSynthesis.speak(utterance);}catch(e){utterance.onerror();}
  return;
 }
 playing=new Audio(w.audio);
 var currentAudio=playing;
 function failed(){if(playing!==currentAudio)return;text('audio-status',automatic?'Chạm nút ♪ để nghe nếu trình duyệt chặn tự phát.':'Không phát được âm thanh. Hãy thử lại.');}
 playing.onerror=failed;
 try{var result=playing.play();if(result&&typeof result['catch']==='function')result['catch'](failed);}catch(e){failed();}
}
$('audio').onclick=function(){playCardAudio(false);};
var shortcutButtons={
 'start':'S','reload-data':'L','change-settings':'C',
 'open-stats':'T','study-stats':'T','result-stats':'T','close-stats':'Esc',
 'audio':'A','toggle-auto-read':'R','toggle-images':'I','toggle-diagram':'G',
 'theme-toggle':'D','study-theme-toggle':'D','pause-auto':'P',
 'previous-word':'←','next':'Enter / →','next-lesson':'N','review-lesson':'V',
 'retry':'Q','again':'S','stats-prev':'←','stats-next':'→','stats-help-toggle':'F',
 'shortcut-help-toggle':'H','shortcut-help-close':'Esc'
};
function shortcutAvailable(node){
 if(!node||node.disabled)return false;
 for(var parent=node;parent;parent=parent.parentNode)if(parent.hidden)return false;
 return true;
}
function shortcutClick(id){
 var node=$(id);if(!shortcutAvailable(node))return false;
 node.click();return true;
}
Object.keys(shortcutButtons).forEach(function(id){
 var node=$(id);if(!node)return;
 node.setAttribute('data-shortcut',shortcutButtons[id]);
 node.setAttribute('title','Phím: '+shortcutButtons[id]);
});
var shortcutReturnFocus=null;
$('shortcut-help-toggle').onclick=function(){
 if($('shortcut-help').hidden)shortcutReturnFocus=document.activeElement;
 var panel=$('shortcut-help');panel.hidden=!panel.hidden;
 $('shortcut-help-toggle').setAttribute('aria-expanded',panel.hidden?'false':'true');
 if(!panel.hidden)$('shortcut-help-close').focus();
 else if(shortcutReturnFocus&&shortcutReturnFocus.focus)shortcutReturnFocus.focus();
 schedulePictureFit();
};
$('shortcut-help-close').onclick=$('shortcut-help-toggle').onclick;
// Some Vietnamese input methods rewrite the second D keydown as a composition
// event. Use keyup for the theme shortcut so each released D toggles once.
function isThemeShortcut(e){
 var key=String(e.key||'').toLowerCase();
 return e.code==='KeyD'||(e.which||e.keyCode)===68||key==='d'||key==='\u0111';
}
function canUseThemeShortcut(e){
 var target=e.target,tag=(target.tagName||'').toUpperCase();
 return !e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.repeat&&
  tag!=='INPUT'&&tag!=='TEXTAREA'&&!target.isContentEditable;
}
document.addEventListener('keyup',function(e){
 if(!canUseThemeShortcut(e)||!isThemeShortcut(e))return;
 if(shortcutClick(!$('quiz').hidden&&$('stats-panel').hidden?'study-theme-toggle':'theme-toggle'))e.preventDefault();
});
document.addEventListener('keydown',function(e){
 var target=e.target,tag=(target.tagName||'').toUpperCase();
 if(!canUseThemeShortcut(e))return;
 if(isThemeShortcut(e)){e.preventDefault();return;}
 if(e.isComposing||tag==='SELECT')return;
 var code=e.which||e.keyCode;
 var key=e.key||({13:'Enter',27:'Escape',37:'ArrowLeft',39:'ArrowRight'}[code])||
  (code>=96&&code<=105?String(code-96):String.fromCharCode(code));
 key=key.toLowerCase();
 // After a quiz answer, Enter takes priority over the previously focused button.
 if(key==='enter'&&activity==='quiz'&&locked&&!$('quiz').hidden&&
    $('stats-panel').hidden&&$('shortcut-help').hidden){
  e.preventDefault();advance();return;
 }
 // Preserve native activation of focused buttons and links.
 if((key==='enter'||key===' ')&&(tag==='BUTTON'||tag==='A'||tag==='SUMMARY'))return;
 function click(id){if(shortcutClick(id)){e.preventDefault();return true;}return false;}
 if(key==='h'){click('shortcut-help-toggle');return;}
 if(key==='escape'||key==='esc'){
  if(!$('shortcut-help').hidden){click('shortcut-help-toggle');return;}
  if(!$('stats-panel').hidden){click('close-stats');return;}
  if(!$('quiz').hidden&&!$('setup').hidden)click('change-settings');
  return;
 }
 if(!$('shortcut-help').hidden)return;
 if(!$('stats-panel').hidden){
  if(key==='arrowleft'||key==='left')click('stats-prev');
  else if(key==='arrowright'||key==='right')click('stats-next');
  else if(key==='f')click('stats-help-toggle');
  else if(key==='t')click('close-stats');
  else if(key==='b'){$('stats-book').focus();e.preventDefault();}
  return;
 }
 if(key==='t'){click(!$('quiz').hidden?'study-stats':!$('result').hidden?'result-stats':'open-stats');return;}
 if(key==='c'){if(click('change-settings')&&!$('setup').hidden)$('activity').focus();return;}
 if(!$('setup').hidden){
  var fields={m:'activity',b:'book',u:'unit',o:'mode',j:'auto-next'};
  if(fields[key]&&shortcutAvailable($(fields[key]))){$(fields[key]).focus();e.preventDefault();return;}
  if(key==='s'){click('start');return;}
  if(key==='l'){click('reload-data');return;}
 }
 if(!$('quiz').hidden){
  var actions={a:'audio',r:'toggle-auto-read',i:'toggle-images',g:'toggle-diagram',p:'pause-auto'};
  if(actions[key]){click(actions[key]);return;}
  if(activity==='learn'){
   if(key==='arrowleft'||key==='left'){e.preventDefault();previousWord();}
   else if(key==='arrowright'||key==='right'||key==='enter'){e.preventDefault();advance();}
  }else if(/^[0-3]$/.test(key)){e.preventDefault();choose(Number(key));}
  else if((key==='enter'||key==='arrowright'||key==='right')&&locked){e.preventDefault();advance();}
 }else if(!$('result').hidden){
  var resultActions={n:'next-lesson',v:'review-lesson',q:'retry',s:'again'};
  if(resultActions[key])click(resultActions[key]);
 }
});
if(config.bookNames){
 empty($('book'));$('book').add(new Option('Tất cả cấp / nhóm','0'));empty($('stats-book'));
 Object.keys(config.bookNames).forEach(function(b){$('book').add(new Option(bookName(b),b));$('stats-book').add(new Option(bookName(b),b));});
 $('stats-book').value='1';
}else for(var book=1;book<=6;book++)$('book').add(new Option('Bộ '+book+' · 600 từ',book));
function updateUnits(){
 var old=$('unit').value,seen={},units=[];
 words.forEach(function(w){if((!Number($('book').value)||w.book===Number($('book').value))&&!seen[w.unit]){seen[w.unit]=true;units.push(w.unit);}});
 units.sort(function(a,b){return a-b;});empty($('unit'));$('unit').add(new Option('Tất cả bài','0'));
 units.forEach(function(i){$('unit').add(new Option(unitName(Number($('book').value),i),i));});if(units.indexOf(Number(old))!==-1)$('unit').value=old;
}
$('book').onchange=function(){updateUnits();if(learnOnlyBook()){$('activity').value='learn';updateActivitySetup();}};
function loadData(){
 var request=new XMLHttpRequest();request.open('GET',config.dataFile||'data.json',true);request.timeout=60000;
 function failed(){text('total','Không tải được dữ liệu. Kiểm tra mạng rồi tải lại trang.');$('reload-data').hidden=false;}
 request.onload=function(){if(request.status<200||request.status>=300){failed();return;}try{words=JSON.parse(request.responseText);if(config.kind==='technical'){technicalBaseWords=null;prepareTechnicalWords();updateTechnicalLabels();}updateUnits();text('total',config.language?words.length+' thẻ · '+lessonCatalog().length+' bài':'3.600 từ · 6 bộ · 179 nhóm bài');$('start').disabled=false;$('open-stats').disabled=false;$('reload-data').hidden=true;history();}catch(e){failed();}};
 request.onerror=failed;request.ontimeout=failed;request.send();
}
$('reload-data').onclick=loadData;

// Study counts are per completed quiz, once per lesson represented in that quiz.
var statsKey=config.statsKey||'wordcraft-study-stats-v1',studyStats={version:1,completedSessions:0,lessons:{}};
var statsMemoryOnly=false;
var sessionRecorded=false,statsStorageWarning='',statsScrollTop=0,statsWasStudying=false;
function safeCount(value){return typeof value==='number'&&isFinite(value)&&value>=0?Math.floor(value):0;}
function parseStudyStats(raw){
 if(!raw)return {version:1,completedSessions:0,lessons:{}};
 var parsed=JSON.parse(raw);
 if(!parsed||parsed.version!==1||!parsed.lessons||typeof parsed.lessons!=='object')throw new Error('Invalid study history');
 var clean={version:1,completedSessions:safeCount(parsed.completedSessions),readingSessions:safeCount(parsed.readingSessions),lessons:{}};
 Object.keys(parsed.lessons).forEach(function(key){
  if(config.language){if(!/^[1-9][0-9]*-[1-9][0-9]{0,3}$/.test(key)||!config.bookNames[key.split('-')[0]])return;}
  else if(!/^[1-6]-(?:[1-9]|[12][0-9]|30)$/.test(key))return;
  var entry=parsed.lessons[key];
  if(!entry||typeof entry!=='object')return;
  var sessions=safeCount(entry.sessions);
  var reading=safeCount(entry.readingSessions);if(sessions||reading)clean.lessons[key]={sessions:sessions,readingSessions:reading};
 });
 return clean;
}
function readStudyStats(){
 if(statsMemoryOnly)return studyStats;
 try{
  var saved=localStorage.getItem(statsKey);
  studyStats=parseStudyStats(saved);
  statsStorageWarning='';
 }catch(e){
  statsMemoryOnly=true;
  statsStorageWarning='Không đọc được lịch sử đã lưu. Bạn vẫn có thể học; thống kê mới tạm giữ trong lần mở trang này.';
 }
 return studyStats;
}
function recordCompletedQuiz(){
 if(activity==='learn'||sessionRecorded||!queue.length||answers.length!==queue.length)return;
 sessionRecorded=true;
 // Read the latest saved totals before adding this quiz.
 var current=readStudyStats(),seen={};
 answers.forEach(function(answer){
  var key=answer.word.book+'-'+answer.word.unit;
  if(seen[key])return;seen[key]=true;
  if(!current.lessons[key])current.lessons[key]={sessions:0};
  current.lessons[key].sessions++;
 });
 current.completedSessions++;
 try{localStorage.setItem(statsKey,JSON.stringify(current));statsStorageWarning='';statsMemoryOnly=false;}
 catch(e){statsMemoryOnly=true;statsStorageWarning='Trình duyệt chưa cho phép lưu lịch sử. Thống kê chỉ được giữ trong lần mở trang này.';}
}
function lessonCatalog(){
 var seen={},list=[];
 words.forEach(function(word){
  var key=word.book+'-'+word.unit;
  if(!seen[key]){seen[key]=true;list.push({key:key,book:word.book,unit:word.unit});}
 });
 return list.sort(function(a,b){return a.book-b.book||a.unit-b.unit;});
}
var statsPage=0,statsPageSize=30;
function renderStudyStats(){
 var catalog=lessonCatalog(),selected=Number($('stats-book').value)||1;
 var allLearned=0,bookLearned=0,rows=[],maximum=1;
 catalog.forEach(function(lesson){
  var count=studyStats.lessons[lesson.key]?(safeCount(studyStats.lessons[lesson.key].sessions)+safeCount(studyStats.lessons[lesson.key].readingSessions)):0;
  if(count)allLearned++;
  if(lesson.book===selected){rows.push({unit:lesson.unit,count:count});if(count)bookLearned++;maximum=Math.max(maximum,count);}
 });
 text('stats-learned',allLearned+' / '+catalog.length);
 text('stats-sessions',String(studyStats.completedSessions+safeCount(studyStats.readingSessions)));
 text('stats-book-summary',bookName(selected)+' · '+bookLearned+' / '+rows.length+' bài đã luyện');
 text('stats-storage-note',statsStorageWarning||'Lịch sử lưu trong trình duyệt trên thiết bị này, không đồng bộ giữa các máy. Xóa dữ liệu trình duyệt sẽ xóa thống kê.');
 $('stats-empty').hidden=studyStats.completedSessions+safeCount(studyStats.readingSessions)>0;
 empty($('stats-chart'));
 statsPage=Math.max(0,Math.min(statsPage,Math.ceil(rows.length/statsPageSize)-1));
 var start=statsPage*statsPageSize;
 $('stats-pager').hidden=rows.length<=statsPageSize;
 $('stats-prev').disabled=statsPage===0;$('stats-next').disabled=start+statsPageSize>=rows.length;
 text('stats-page-label',(start+1)+'–'+Math.min(start+statsPageSize,rows.length)+' / '+rows.length+' bài');
 text('stats-detail','Chạm một ô để xem tên bài và số lượt học.');
 rows.slice(start,start+statsPageSize).forEach(function(row){
  var item=document.createElement('li');item.className='stats-tile';
  var button=document.createElement('button');button.type='button';
  var level=row.count===0?0:row.count===1?1:row.count<5?2:3;
  button.className='stats-cell level-'+level;
  var fullName=bookName(selected)+' · '+unitName(selected,row.unit);
  button.setAttribute('aria-label',fullName+': '+row.count+' lượt');
  button.setAttribute('aria-pressed','false');
  var name=document.createElement('span');name.textContent=(config.kind==='grammar'?'NP ':'Bài ')+pad(row.unit);
  var value=document.createElement('strong');value.textContent=row.count+' lượt';
  add(button,name,value);
  button.onclick=function(){
   for(var i=0;i<$('stats-chart').children.length;i++)$('stats-chart').children[i].firstChild.setAttribute('aria-pressed','false');
   button.setAttribute('aria-pressed','true');text('stats-detail',fullName+' — '+row.count+' lượt học hoàn tất');
  };
  add(item,button);add($('stats-chart'),item);
 });
}
function openStudyStats(){
 stopTimer();stopAudio();statsScrollTop=window.pageYOffset||0;statsWasStudying=!$('quiz').hidden;
 readStudyStats();statsPage=0;
 $('stats-book').value=Number($('book').value)?$('book').value:'1';
 document.body.classList.remove('studying');document.body.classList.remove('answered');
 $('learning-layout').hidden=true;$('stats-panel').hidden=false;
 renderStudyStats();window.scrollTo(0,0);$('stats-title').focus();
}
function closeStudyStats(){
 $('stats-panel').hidden=true;$('learning-layout').hidden=false;
 if(statsWasStudying){document.body.classList.add('studying');if(locked)document.body.classList.add('answered');schedulePictureFit();}
 window.scrollTo(0,statsScrollTop);
}
$('open-stats').onclick=openStudyStats;
$('study-stats').onclick=openStudyStats;
$('result-stats').onclick=openStudyStats;
$('close-stats').onclick=closeStudyStats;
$('stats-book').onchange=function(){statsPage=0;renderStudyStats();};
$('stats-prev').onclick=function(){statsPage--;renderStudyStats();};
$('stats-next').onclick=function(){statsPage++;renderStudyStats();};
$('stats-help-toggle').onclick=function(){var show=$('stats-help').hidden;$('stats-help').hidden=!show;$('stats-help-toggle').setAttribute('aria-expanded',show?'true':'false');};


var activity='quiz',learnSeen={};
function updateActivitySetup(){
 if(learnOnlyBook())$('activity').value='learn';
 var learning=$('activity').value==='learn';
 $('quiz-settings').hidden=learning;
 text('start',learning?'Bắt đầu học từ →':'Bắt đầu trắc nghiệm →');
}
$('activity').onchange=updateActivitySetup;
function renderLearning(){
 stopTimer();stopAudio();locked=false;choices=[];var w=queue[index];learnSeen[w.id]=true;
 document.body.classList.add('learning-words');document.body.classList.remove('answered');
 $('options').hidden=true;$('learn-content').hidden=false;$('previous-word').hidden=false;$('previous-word').disabled=index===0;
 empty($('options'));empty($('feedback'));text('answer-hint','Dùng phím ← / → để chuyển từ.');
 text('session-label','TỪ '+(index+1)+' / '+queue.length);text('score','HỌC TỪ');
 $('bar').style.width=((index+1)/queue.length*100)+'%';
 text('meta',wordMeta(w));text('prompt','Đọc từ, nghĩa và ví dụ');
 if($('toggle-diagram')){$('toggle-diagram').hidden=config.kind==='grammar'||!w.diagram; text('toggle-diagram','Xem sơ đồ / cách viết');}
 text('question',w.word);text('ipa',w.ipa);text('learn-meaning',w.meaning);text('learn-example',w.explanation);
 $('audio').hidden=!hasCardAudio(w);text('audio-status','');$('next').disabled=false;
 text('next',index===queue.length-1?'Hoàn tất lượt học ✓':'Từ tiếp theo →');
 text('keyboard-help','← Từ trước · → Từ tiếp theo');
 renderQuestionImage();requestAnimationFrame(function(){fitQuestionPicture();alignQuestion();});maybeAutoRead();
}
function previousWord(){if(activity!=='learn'||index===0)return;index--;render();}
$('previous-word').onclick=previousWord;
function finishLearning(){
 stopTimer();stopAudio();recordCompletedReading();
 document.body.classList.remove('studying');document.body.classList.remove('learning-words');document.body.classList.remove('answered');
 $('study-panel').hidden=true;$('setup').hidden=false;$('change-settings').hidden=true;$('study-stats').hidden=true;
 $('quiz').hidden=true;$('result').hidden=false;$('retry').hidden=true;empty($('review'));
 text('session-label','HOÀN TẤT HỌC TỪ');text('result-score',queue.length+' từ');
 text('result-message','Đã học xong '+wordMeta(queue[0])+'. Bạn có thể ôn đúng bài này bằng trắc nghiệm hoặc học bài tiếp theo.');
 $('next-lesson').hidden=learningLessonIndex+1>=learningPlan.length;
 $('review-lesson').hidden=!!queue[0].learnOnly;
 $('bar').style.width='100%';$('result').scrollIntoView(true);
}
function recordCompletedReading(){
 if(sessionRecorded||!queue.length||Object.keys(learnSeen).length!==queue.length)return;
 sessionRecorded=true;var current=readStudyStats(),seen={};
 queue.forEach(function(w){var key=w.book+'-'+w.unit;if(seen[key])return;seen[key]=true;
  if(!current.lessons[key])current.lessons[key]={sessions:0};
  current.lessons[key].readingSessions=safeCount(current.lessons[key].readingSessions)+1;
 });
 current.readingSessions=safeCount(current.readingSessions)+1;
 try{localStorage.setItem(statsKey,JSON.stringify(current));statsStorageWarning='';statsMemoryOnly=false;}
 catch(e){statsMemoryOnly=true;statsStorageWarning='Không lưu được lịch sử. Thống kê tạm giữ trong lần mở trang này.';}
}

if($('toggle-diagram'))$('toggle-diagram').onclick=function(){showDiagram=!showDiagram;showImages=true;renderQuestionImage();schedulePictureFit();text('toggle-diagram',showDiagram?'Xem ảnh minh họa':'Xem sơ đồ / cách viết');};
$('next-lesson').onclick=function(){if(learningLessonIndex+1<learningPlan.length){learningLessonIndex++;begin(null,true);}};
$('review-lesson').onclick=function(){$('activity').value='quiz';updateActivitySetup();begin();};
updateActivitySetup();
loadData();
