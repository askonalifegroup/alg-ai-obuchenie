/* ALG mini-analytics: собственный счётчик → Google Таблица. Без персональных данных. */
(function(){
  var EP='';  // ← сюда вставляется адрес веб-приложения Apps Script (…/exec)
  if(!EP||EP.indexOf('https://')!==0)return;
  if(navigator.webdriver)return;
  try{
    if(/[?&]notrack=1/.test(location.search))localStorage.setItem('alg_notrack','1');
    if(/[?&]notrack=0/.test(location.search))localStorage.removeItem('alg_notrack');
    if(localStorage.getItem('alg_notrack')==='1')return;
  }catch(e){}
  function rnd(){return Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4);}
  function store(st,k,v){try{if(v!==undefined)st.setItem(k,v);return st.getItem(k);}catch(e){return null;}}
  var vid=store(localStorage,'alg_vid')||store(localStorage,'alg_vid',rnd())||rnd();
  var sid=store(sessionStorage,'alg_sid')||store(sessionStorage,'alg_sid',rnd())||rnd();
  var qs={};location.search.replace(/^\?/,'').split('&').forEach(function(p){if(!p)return;var a=p.split('=');try{qs[a[0]]=decodeURIComponent((a[1]||'').replace(/\+/g,' '));}catch(e){}});
  var refHost='';try{if(document.referrer){var h=new URL(document.referrer).hostname;if(h&&h!==location.hostname)refHost=h;}}catch(e){}
  var src=null;try{src=JSON.parse(store(sessionStorage,'alg_src')||'null');}catch(e){}
  if(!src||qs.utm_source){
    src={s:qs.utm_source||refHost||'direct',m:qs.utm_medium||'',c:qs.utm_campaign||'',t:qs.utm_content||'',r:refHost};
    store(sessionStorage,'alg_src',JSON.stringify(src));
  }
  var page=(location.pathname.split('/').pop()||'index').replace('.html','')||'index';
  var dev=innerWidth<700?'mobile':(innerWidth<1100?'tablet':'desktop');
  var q=[],timer=null;
  function ev(name,label,value){
    q.push({e:name,l:String(label||'').slice(0,80),v:value==null?'':value,p:page,vid:vid,sid:sid,
      s:src.s,m:src.m,c:src.c,t:src.t,r:src.r,d:dev,w:innerWidth,ts:Date.now()});
    if(!timer)timer=setTimeout(flush,4000);
  }
  function flush(){
    clearTimeout(timer);timer=null;if(!q.length)return;
    var body=JSON.stringify(q);q=[];
    try{fetch(EP,{method:'POST',mode:'no-cors',keepalive:true,headers:{'Content-Type':'text/plain;charset=utf-8'},body:body});}
    catch(e){try{navigator.sendBeacon(EP,body);}catch(x){}}
  }
  ev('pageview',document.title.slice(0,60));
  /* прокрутка */
  var seen={},tick=false;
  function sc(){tick=false;var h=document.documentElement.scrollHeight-innerHeight;if(h<=0)return;
    var p=(scrollY/h)*100;[25,50,75,100].forEach(function(t){if(!seen[t]&&p>=(t===100?96:t)){seen[t]=1;ev('scroll',t);}});}
  addEventListener('scroll',function(){if(!tick){tick=true;requestAnimationFrame(sc);}},{passive:true});
  /* просмотры разделов */
  if('IntersectionObserver' in window){
    var secs=[['.hero','hero'],['.about','about'],['#timeline','timeline'],['#programs','programs'],['#rules','rules'],['#wiki','wiki_block'],['#outside','outside'],['#footer','footer']],sv={};
    var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting&&en.intersectionRatio>=.3){var k=en.target.dataset.trk;if(!sv[k]){sv[k]=1;ev('section',k);}}});},{threshold:[.3]});
    secs.forEach(function(x){var el=document.querySelector(x[0]);if(el){el.dataset.trk=x[1];io.observe(el);}});
  }
  /* клики */
  var FORMS={'p7sAP95iVcmZdcmc8':'base','7WBE4qxLmZiAX6rY6':'cowork','fsbLYq9Tk9iCmh1e9':'focus'};
  document.addEventListener('click',function(e){
    var t=e.target;if(!t||!t.closest)return;
    var a=t.closest('a'),href=a?(a.getAttribute('href')||''):'';
    if(a&&href.indexOf('forms.gle')>-1){var id=href.split('/').pop();ev('click','signup_'+(FORMS[id]||'form'));return;}
    if(a&&href.indexOf('mailto:')===0){ev('click','email');return;}
    if(a&&href.indexOf('tel:')===0){ev('click','phone');return;}
    if(a&&href.indexOf('wiki.html')>-1){ev('click','to_wiki');return;}
    if(a&&/alg-ai-obuchenie|index\.html/.test(href)){ev('click','to_landing');return;}
    if(a&&href.charAt(0)==='#'&&a.closest('.main-nav'))ev('click','nav'+href);
    var day=t.closest('.cal-day.has-session');if(day){ev('click','calendar_day',day.textContent.trim());return;}
    var sum=t.closest('summary');if(sum){var pt=sum.querySelector('.prog-title');ev('click','program_toggle',pt?pt.textContent.trim().slice(0,40):'');return;}
    if(t.closest('#mcBody')){ev('click','mascot');return;}
    if(t.closest('.mc-bubble a')){ev('click','mascot_tip');return;}
    var card=t.closest('.card');if(card){var h3=card.querySelector('h3');ev('click','wiki_post',h3?h3.textContent.trim().slice(0,70):'');return;}
    var chip=t.closest('.chip');if(chip){ev('click','wiki_category',chip.textContent.trim().slice(0,30));return;}
  },true);
  /* поиск в базе знаний */
  var si=document.getElementById('searchInput');
  if(si){var st;si.addEventListener('input',function(){clearTimeout(st);st=setTimeout(function(){var v=si.value.trim().toLowerCase();if(v.length>=2)ev('wiki_search',v.slice(0,40));},1500);});}
  /* время на странице: «пульс» раз в 30 с, пока вкладка активна */
  var since=0,total=0,vis=document.visibilityState==='visible';
  setInterval(function(){if(!vis||total>=1800)return;since++;total++;if(since>=30){ev('ping','',30);since=0;}},1000);
  function leave(){if(since>=2)ev('ping','',since);since=0;flush();}
  document.addEventListener('visibilitychange',function(){vis=document.visibilityState==='visible';if(!vis)leave();});
  addEventListener('pagehide',leave);
})();
