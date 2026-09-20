const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync('theme.js','utf8');
function boot(saved,systemDark,blocked){
 const classes=new Set(),buttons={};['theme-toggle','study-theme-toggle'].forEach(id=>buttons[id]={setAttribute(k,v){this[k]=v;}});
 const store={value:saved};const ctx={window:{matchMedia:()=>({matches:systemDark})},document:{documentElement:{classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}},getElementById:id=>buttons[id]},localStorage:{getItem(){if(blocked)throw Error();return store.value;},setItem(k,v){if(blocked)throw Error();store.value=v;}}};
 vm.runInNewContext(code,ctx);ctx.window.wordcraftTheme.init();return {classes,buttons,store};
}
let t=boot(null,true,false);assert(t.classes.has('dark'));t.buttons['theme-toggle'].onclick();assert(!t.classes.has('dark'));assert.equal(t.store.value,'light');assert.equal(t.buttons['study-theme-toggle']['aria-pressed'],'false');
t=boot('light',true,false);assert(!t.classes.has('dark'));t.buttons['study-theme-toggle'].onclick();assert(t.classes.has('dark'));assert.equal(t.store.value,'dark');assert.equal(t.buttons['theme-toggle']['aria-pressed'],'true');
t=boot('dark',false,false);assert(t.classes.has('dark'));t=boot(null,false,true);t.buttons['theme-toggle'].onclick();assert(t.classes.has('dark'));
const natives=process.binding('natives'),key=Object.keys(natives).find(k=>/acorn\/dist\/acorn$/.test(k));const parser={};vm.runInNewContext(natives[key],parser);parser.acorn.parse(code,{ecmaVersion:5});
console.log('PASS: saved theme, system preference, synchronized toggles, blocked storage and ES5 syntax.');
