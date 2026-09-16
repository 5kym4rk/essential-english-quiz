'use strict';
const $=id=>document.getElementById(id);
let words=[],queue=[],index=0,answers=[],choices=[],locked=false,mode='en',playing;
const shuffle=arr=>{const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const norm=s=>s.normalize('NFC').toLocaleLowerCase().trim();
// Apply identical capitalization to correct answers and distractors.
const formatAnswer=s=>s.trim().replace(/\p{L}/u,c=>c.toLocaleUpperCase('vi-VN'));
function makeChoices(w,all,direction){
 const field=direction==='en'?'meaning':'word',other=direction==='en'?'word':'meaning';
 const seen=new Set([norm(w[field])]);const candidates=[];
 for(const x of shuffle(all)){if(norm(x[other])===norm(w[other])||seen.has(norm(x[field])))continue;seen.add(norm(x[field]));candidates.push(x);if(candidates.length===3)break;}
 return shuffle([w,...candidates]);
}
function text(id,t){$(id).textContent=t;}
function stopAudio(){if(playing){playing.pause();playing=null;}}
function history(){try{const s=JSON.parse(localStorage.getItem('wordcraft-last'));if(s)text('history','Lượt gần nhất: '+s.correct+'/'+s.total+' câu đúng');}catch{}}
function begin(retry){
 stopAudio();mode=$('mode').value;
 const pool=words.filter(w=>(!+$('book').value||w.book===+$('book').value)&&(!+$('unit').value||w.unit===+$('unit').value));
 queue=shuffle(retry||pool).slice(0,retry?retry.length:+$('count').value);
 if(!queue.length)return;
 index=0;answers=[];$('welcome').hidden=true;$('result').hidden=true;$('quiz').hidden=false;render();
 if(matchMedia('(max-width:680px)').matches)$('quiz').scrollIntoView({behavior:'smooth',block:'start'});
}
function render(){
 stopAudio();locked=false;const w=queue[index];choices=makeChoices(w,words,mode);
 text('session-label','CÂU '+(index+1)+' / '+queue.length);text('score',answers.filter(a=>a.correct).length+' câu đúng');
 $('bar').style.width=(index/queue.length*100)+'%';
 text('meta','Bộ '+w.book+' · Bài '+String(w.unit).padStart(2,'0'));
 text('prompt',mode==='en'?'Chọn nghĩa tiếng Việt phù hợp':'Chọn từ tiếng Anh phù hợp');
 text('question',mode==='en'?w.word:w.meaning);text('ipa',mode==='en'?w.ipa:'');
 $('audio').hidden=mode==='vi'||!w.audio;$('next').hidden=true;$('feedback').replaceChildren();$('options').replaceChildren();
 $('question-image').replaceChildren();
 if(w.image){
  const figure=document.createElement('figure');figure.className='illustration';
  const image=document.createElement('img');image.src=w.image;image.alt='Ảnh minh họa từ vựng';image.decoding='async';
  const caption=document.createElement('figcaption');caption.textContent='Ảnh minh họa';
  image.onerror=()=>figure.remove();figure.append(image,caption);$('question-image').append(figure);
 }
 choices.forEach((x,i)=>{const b=document.createElement('button');b.className='option';const key=document.createElement('span');key.className='key';key.textContent=i+1;const label=document.createElement('span');label.textContent=formatAnswer(mode==='en'?x.meaning:x.word);b.append(key,label);b.onclick=()=>choose(i);$('options').append(b);});
}
function choose(i){
 if(locked||!choices[i])return;locked=true;const w=queue[index];const correct=choices[i].id===w.id;
 answers.push({word:w,correct,selected:choices[i]});
 [...$('options').children].forEach((b,j)=>{b.disabled=true;if(choices[j].id===w.id)b.classList.add('correct');else if(j===i)b.classList.add('wrong');});
 const title=document.createElement('strong');title.textContent=correct?'Chính xác!':'Đáp án đúng: '+formatAnswer(mode==='en'?w.meaning:w.word);
 const explanation=document.createElement('p');explanation.textContent=w.word+' '+w.ipa+' — '+w.explanation;
 $('feedback').append(title,explanation);
$('audio').hidden=!w.audio;$('next').hidden=false;
 text('score',answers.filter(a=>a.correct).length+' câu đúng');text('next',index===queue.length-1?'Xem kết quả →':'Câu tiếp theo →');
}
function finish(){
 stopAudio();$('quiz').hidden=true;$('result').hidden=false;$('bar').style.width='100%';text('session-label','KẾT QUẢ LƯỢT HỌC');
 const correct=answers.filter(a=>a.correct).length,wrong=answers.filter(a=>!a.correct);
 text('result-score',correct+'/'+queue.length);text('result-message','Bạn trả lời đúng '+Math.round(correct/queue.length*100)+'%. '+(wrong.length?'Ôn lại các từ dưới đây để nhớ chắc hơn.':'Bạn đã trả lời đúng tất cả các câu!'));
 $('retry').hidden=!wrong.length;$('review').replaceChildren();
 wrong.forEach(a=>{const div=document.createElement('div');div.className='review-item';const b=document.createElement('strong');b.textContent=a.word.word+' — '+a.word.meaning;const s=document.createElement('span');s.textContent='Bạn chọn: '+formatAnswer(mode==='en'?a.selected.meaning:a.selected.word);div.append(b,s);$('review').append(div);});
 try{localStorage.setItem('wordcraft-last',JSON.stringify({correct,total:queue.length}));}catch{}history();
}
$('settings').onsubmit=e=>{e.preventDefault();begin();};$('again').onclick=()=>begin();
$('retry').onclick=()=>{const missed=answers.filter(a=>!a.correct).map(a=>a.word);$('mode').value=mode;begin(missed);};
$('next').onclick=()=>{if(!locked)return;index++;if(index<queue.length)render();else finish();};
$('audio').onclick=()=>{const w=queue[index];if(!w?.audio)return;stopAudio();playing=new Audio(w.audio);playing.play().catch(()=>{text('feedback','Không phát được âm thanh. Bạn có thể thử lại.');});};
document.addEventListener('keydown',e=>{if(['SELECT','INPUT','TEXTAREA'].includes(e.target.tagName)||e.ctrlKey||e.altKey||e.metaKey||$('quiz').hidden)return;if(/^[1-4]$/.test(e.key)){e.preventDefault();choose(+e.key-1);}else if(e.key==='Enter'&&locked){e.preventDefault();$('next').click();}});
for(let i=1;i<=6;i++)$('book').add(new Option('Bộ '+i+' · 600 từ',i));
function updateUnits(){const old=$('unit').value;const units=[...new Set(words.filter(w=>!+$('book').value||w.book===+$('book').value).map(w=>w.unit))].sort((a,b)=>a-b);$('unit').replaceChildren(new Option('Tất cả bài','0'));units.forEach(i=>$('unit').add(new Option('Bài '+String(i).padStart(2,'0'),i)));if(units.includes(+old))$('unit').value=old;} $('book').onchange=updateUnits;
fetch('data.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).then(data=>{words=data;updateUnits();text('total',words.length.toLocaleString('vi-VN')+' từ · 6 bộ · 179 nhóm bài');$('start').disabled=false;history();}).catch(()=>{text('total','Không tải được dữ liệu. Hãy tải lại trang.');});
