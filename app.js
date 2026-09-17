'use strict';
// ES5 syntax and older DOM APIs keep the quiz usable on older iOS Safari.
function $(id){return document.getElementById(id);}
function empty(node){while(node.firstChild)node.removeChild(node.firstChild);}
function text(id,value){$(id).textContent=value;}
function add(parent){for(var i=1;i<arguments.length;i++)parent.appendChild(arguments[i]);}
function pad(n){return n<10?'0'+n:String(n);}
var words=[],queue=[],index=0,answers=[],choices=[],locked=false,mode='en',playing=null;
var timer=null,remaining=0,pictureFrame=null;
function shuffle(arr){var a=arr.slice(),i,j,t;for(i=a.length-1;i>0;i--){j=Math.floor(Math.random()*(i+1));t=a[i];a[i]=a[j];a[j]=t;}return a;}
function norm(s){return (s.normalize?s.normalize('NFC'):s).toLowerCase().trim();}
function formatAnswer(s){s=s.trim();for(var i=0;i<s.length;i++){if(s.charAt(i).toUpperCase()!==s.charAt(i).toLowerCase())return s.slice(0,i)+s.charAt(i).toUpperCase()+s.slice(i+1);}return s;}
function makeChoices(w,all,direction){
 var field=direction==='en'?'meaning':'word',other=direction==='en'?'word':'meaning';
 var seen={},candidates=[],pool=shuffle(all),i,x,key;seen['$'+norm(w[field])]=true;
 for(i=0;i<pool.length;i++){x=pool[i];key='$'+norm(x[field]);if(norm(x[other])===norm(w[other])||seen[key])continue;seen[key]=true;candidates.push(x);if(candidates.length===3)break;}
 return shuffle([w].concat(candidates));
}
function stopAudio(){if(playing){playing.pause();playing=null;}}
function stopTimer(){if(timer!==null)clearInterval(timer);timer=null;remaining=0;text('countdown','');$('pause-auto').hidden=true;}
function startTimer(){
 stopTimer();var delay=Number($('auto-next').value);
 if(!locked||!delay||document.hidden)return;
 remaining=delay;$('pause-auto').hidden=false;
 function update(){text('countdown',(index===queue.length-1?'Xem kết quả sau ':'Câu tiếp theo sau ')+remaining+' giây');}
 update();timer=setInterval(function(){if(document.hidden){stopTimer();return;}remaining--;if(remaining<=0){advance();}else update();},1000);
}
function history(){try{var s=JSON.parse(localStorage.getItem('wordcraft-last'));if(s)text('history','Lượt gần nhất: '+s.correct+'/'+s.total+' câu đúng');}catch(e){}}
function score(){return answers.filter(function(a){return a.correct;}).length;}
function begin(retry){
 stopTimer();stopAudio();mode=$('mode').value;
 var pool=words.filter(function(w){return (!Number($('book').value)||w.book===Number($('book').value))&&(!Number($('unit').value)||w.unit===Number($('unit').value));});
 queue=shuffle(retry||pool).slice(0,retry?retry.length:Number($('count').value));
 if(!queue.length)return;
 index=0;answers=[];sessionRecorded=false;$('study-stats').hidden=false;document.body.classList.add('studying');$('setup').hidden=true;$('change-settings').hidden=false;
 $('welcome').hidden=true;$('result').hidden=true;$('quiz').hidden=false;$('study-panel').hidden=false;render();
}
function viewportHeight(){return window.visualViewport?window.visualViewport.height:window.innerHeight;}
function mobile(){return window.matchMedia('(max-width:680px)').matches;}
function fitQuestionPicture(){
 var quiz=$('quiz'),image=$('question-image').querySelector('img'),last=$('options').lastElementChild;
 if(quiz.hidden||!image||!last)return;
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
 stopTimer();stopAudio();locked=false;document.body.classList.remove('answered');var w=queue[index];choices=makeChoices(w,words,mode);
 text('session-label','CÂU '+(index+1)+' / '+queue.length);text('score',score()+' câu đúng');
 $('bar').style.width=(index/queue.length*100)+'%';
 text('meta','Bộ '+w.book+' · Bài '+pad(w.unit));
 text('prompt',mode==='en'?'Chọn nghĩa tiếng Việt phù hợp':'Chọn từ tiếng Anh phù hợp');
 text('question',mode==='en'?w.word:w.meaning);text('ipa',mode==='en'?w.ipa:'');
 $('audio').hidden=mode==='vi'||!w.audio;$('audio-status').textContent='';
 $('next').disabled=true;text('next','Chọn đáp án 0–3');empty($('feedback'));empty($('options'));empty($('question-image'));
 text('answer-hint','Chọn một đáp án để xem nghĩa và ví dụ.');
 if(w.image){
  var figure=document.createElement('figure');figure.className='illustration';
  var image=document.createElement('img');image.alt='Ảnh minh họa từ vựng';
  image.onerror=function(){if(figure.parentNode)figure.parentNode.removeChild(figure);};
  image.src=w.image;add(figure,image);add($('question-image'),figure);
 }
 choices.forEach(function(x,i){
  var b=document.createElement('button');b.type='button';b.className='option';
  var key=document.createElement('span');key.className='key';key.textContent=i;
  var label=document.createElement('span');label.textContent=formatAnswer(mode==='en'?x.meaning:x.word);
  add(b,key,label);b.onclick=function(){choose(i);};add($('options'),b);
 });
 requestAnimationFrame(function(){fitQuestionPicture();alignQuestion();});
}
function choose(i){
 if(locked||!choices[i])return;locked=true;document.body.classList.add('answered');
 var w=queue[index],correct=choices[i].id===w.id;
 answers.push({word:w,correct:correct,selected:choices[i]});
 for(var j=0;j<$('options').children.length;j++){var b=$('options').children[j];b.disabled=true;if(choices[j].id===w.id)b.classList.add('correct');else if(j===i)b.classList.add('wrong');}
 var title=document.createElement('strong');title.textContent=correct?'Chính xác!':'Đáp án đúng: '+formatAnswer(mode==='en'?w.meaning:w.word);
 var meaning=document.createElement('p');meaning.className='answer-meaning';meaning.textContent=w.word+' '+w.ipa+' — '+w.meaning;
 var example=document.createElement('p');example.textContent=w.explanation;
 add($('feedback'),title,meaning,example);text('answer-hint','Nghĩa và ví dụ');
 $('audio').hidden=!w.audio;$('next').disabled=false;
 text('score',score()+' câu đúng');text('next',index===queue.length-1?'Xem kết quả →':'Câu tiếp theo →');
 recordCompletedQuiz();
 startTimer();
}
function advance(){if(!locked)return;stopTimer();index++;if(index<queue.length)render();else finish();}
function finish(){
 recordCompletedQuiz();$('study-stats').hidden=true;
 stopTimer();stopAudio();document.body.classList.remove('studying');document.body.classList.remove('answered');
 $('study-panel').hidden=true;$('setup').hidden=false;$('change-settings').hidden=true;$('quiz').hidden=true;$('result').hidden=false;
 $('bar').style.width='100%';text('session-label','KẾT QUẢ LƯỢT HỌC');
 var correct=score(),wrong=answers.filter(function(a){return !a.correct;});
 text('result-score',correct+'/'+queue.length);text('result-message','Bạn trả lời đúng '+Math.round(correct/queue.length*100)+'%. '+(wrong.length?'Ôn lại các từ dưới đây để nhớ chắc hơn.':'Bạn đã trả lời đúng tất cả các câu!'));
 $('retry').hidden=!wrong.length;empty($('review'));
 wrong.forEach(function(a){var div=document.createElement('div');div.className='review-item';var b=document.createElement('strong');b.textContent=a.word.word+' — '+a.word.meaning;var s=document.createElement('span');s.textContent='Bạn chọn: '+formatAnswer(mode==='en'?a.selected.meaning:a.selected.word);add(div,b,s);add($('review'),div);});
 try{localStorage.setItem('wordcraft-last',JSON.stringify({correct:correct,total:queue.length}));}catch(e){}
 history();$('result').scrollIntoView(true);
}
$('settings').onsubmit=function(e){e.preventDefault();begin();};$('again').onclick=function(){begin();};
$('retry').onclick=function(){var missed=answers.filter(function(a){return !a.correct;}).map(function(a){return a.word;});$('mode').value=mode;begin(missed);};
$('next').onclick=advance;
$('pause-auto').onclick=function(){stopTimer();text('countdown','Đã dừng tự chuyển câu này.');};
$('auto-next').onchange=function(){if(locked)startTimer();};
$('change-settings').onclick=function(){stopTimer();$('setup').hidden=!$('setup').hidden;if(!$('setup').hidden)$('setup').scrollIntoView(true);};
document.addEventListener('visibilitychange',function(){if(document.hidden)stopTimer();});
$('audio').onclick=function(){
 var w=queue[index];if(!w||!w.audio)return;stopAudio();playing=new Audio(w.audio);
 function failed(){text('audio-status','Không phát được âm thanh. Hãy thử lại.');}
 playing.onerror=failed;
 try{var result=playing.play();if(result&&typeof result['catch']==='function')result['catch'](failed);}catch(e){failed();}
};
document.addEventListener('keydown',function(e){
 var tag=e.target.tagName;
 if(['SELECT','INPUT','TEXTAREA'].indexOf(tag)!==-1||e.ctrlKey||e.altKey||e.metaKey||$('quiz').hidden||!$('stats-panel').hidden)return;
 var key=e.key;
 if(!key){var code=e.which||e.keyCode;key=code>=96&&code<=105?String(code-96):code===13?'Enter':String.fromCharCode(code);}
 if(/^[0-3]$/.test(key)){e.preventDefault();choose(Number(key));}
 else if(key==='Enter'&&locked){e.preventDefault();advance();}
});
for(var book=1;book<=6;book++)$('book').add(new Option('Bộ '+book+' · 600 từ',book));
function updateUnits(){
 var old=$('unit').value,seen={},units=[];
 words.forEach(function(w){if((!Number($('book').value)||w.book===Number($('book').value))&&!seen[w.unit]){seen[w.unit]=true;units.push(w.unit);}});
 units.sort(function(a,b){return a-b;});empty($('unit'));$('unit').add(new Option('Tất cả bài','0'));
 units.forEach(function(i){$('unit').add(new Option('Bài '+pad(i),i));});if(units.indexOf(Number(old))!==-1)$('unit').value=old;
}
$('book').onchange=updateUnits;
function loadData(){
 var request=new XMLHttpRequest();request.open('GET','data.json',true);request.timeout=60000;
 function failed(){text('total','Không tải được dữ liệu. Kiểm tra mạng rồi tải lại trang.');$('reload-data').hidden=false;}
 request.onload=function(){if(request.status<200||request.status>=300){failed();return;}try{words=JSON.parse(request.responseText);updateUnits();text('total','3.600 từ · 6 bộ · 179 nhóm bài');$('start').disabled=false;$('open-stats').disabled=false;$('reload-data').hidden=true;history();}catch(e){failed();}};
 request.onerror=failed;request.ontimeout=failed;request.send();
}
$('reload-data').onclick=loadData;

// Study counts are per completed quiz, once per lesson represented in that quiz.
var statsKey='wordcraft-study-stats-v1',studyStats={version:1,completedSessions:0,lessons:{}};
var statsMemoryOnly=false;
var sessionRecorded=false,statsStorageWarning='',statsScrollTop=0,statsWasStudying=false;
function safeCount(value){return typeof value==='number'&&isFinite(value)&&value>=0?Math.floor(value):0;}
function parseStudyStats(raw){
 if(!raw)return {version:1,completedSessions:0,lessons:{}};
 var parsed=JSON.parse(raw);
 if(!parsed||parsed.version!==1||!parsed.lessons||typeof parsed.lessons!=='object')throw new Error('Invalid study history');
 var clean={version:1,completedSessions:safeCount(parsed.completedSessions),lessons:{}};
 Object.keys(parsed.lessons).forEach(function(key){
  if(!/^[1-6]-(?:[1-9]|[12][0-9]|30)$/.test(key))return;
  var entry=parsed.lessons[key];
  if(!entry||typeof entry!=='object')return;
  var sessions=safeCount(entry.sessions);
  if(sessions)clean.lessons[key]={sessions:sessions};
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
 if(sessionRecorded||!queue.length||answers.length!==queue.length)return;
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
function renderStudyStats(){
 var catalog=lessonCatalog(),selected=Number($('stats-book').value)||1;
 var allLearned=0,bookLearned=0,rows=[],maximum=1;
 catalog.forEach(function(lesson){
  var count=studyStats.lessons[lesson.key]?studyStats.lessons[lesson.key].sessions:0;
  if(count)allLearned++;
  if(lesson.book===selected){rows.push({unit:lesson.unit,count:count});if(count)bookLearned++;maximum=Math.max(maximum,count);}
 });
 text('stats-learned',allLearned+' / '+catalog.length);
 text('stats-sessions',String(studyStats.completedSessions));
 text('stats-book-summary','Bộ '+selected+' · '+bookLearned+' / '+rows.length+' bài đã luyện');
 text('stats-storage-note',statsStorageWarning||'Lịch sử lưu trong trình duyệt trên thiết bị này, không đồng bộ giữa các máy. Xóa dữ liệu trình duyệt sẽ xóa thống kê.');
 $('stats-empty').hidden=studyStats.completedSessions>0;
 empty($('stats-chart'));
 rows.forEach(function(row){
  var item=document.createElement('li');item.className='stats-row'+(row.count?'':' stats-unseen');
  var label=document.createElement('div');label.className='stats-row-label';
  var name=document.createElement('span');name.textContent='Bài '+pad(row.unit);
  var value=document.createElement('strong');value.textContent=row.count?row.count+' lượt':'Chưa học · 0 lượt';
  add(label,name,value);
  var track=document.createElement('div');track.className='stats-track';track.setAttribute('aria-hidden','true');
  var bar=document.createElement('span');bar.className='stats-bar';bar.style.width=(row.count/maximum*100)+'%';
  add(track,bar);add(item,label,track);add($('stats-chart'),item);
 });
}
function openStudyStats(){
 stopTimer();stopAudio();statsScrollTop=window.pageYOffset||0;statsWasStudying=!$('quiz').hidden;
 readStudyStats();
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
$('stats-book').onchange=renderStudyStats;

loadData();
