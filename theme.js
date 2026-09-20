(function(){
 'use strict';
 var dark=false;
 try{var saved=localStorage.getItem('wordcraft-theme');dark=saved==='dark'||(saved!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);}catch(e){}
 function apply(){if(dark)document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}
 function refresh(){['theme-toggle','study-theme-toggle'].forEach(function(id){var button=document.getElementById(id);if(!button)return;button.textContent=dark?'T\u1ed1i: B\u1eadt':'T\u1ed1i: T\u1eaft';button.setAttribute('aria-pressed',dark?'true':'false');});}
 function toggle(){dark=!dark;apply();refresh();try{localStorage.setItem('wordcraft-theme',dark?'dark':'light');}catch(e){}}
 apply();window.wordcraftTheme={init:function(){['theme-toggle','study-theme-toggle'].forEach(function(id){var button=document.getElementById(id);if(button)button.onclick=toggle;});refresh();}};
}());
