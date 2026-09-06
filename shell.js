/* Presentation shell — the panels around the phone, shared by both pages.

   It knows which screen is on show and how to reach every other one. It knows
   nothing about the money: the pages hand it a way to switch state, and it
   hands back the language. Its own text is Russian and stays Russian — AR/EN
   switches the bank inside the frame, not the presentation around it. */

var SHELL=(function(){

  var QP=new URLSearchParams(location.search);
  var lang=QP.get('lang')==='en'?'en':'ar';
  /* the recipient the demo falls back to when none has been picked yet */
  var rec=QP.get('r')||'noura';

  /* One list for both pages, so a screen is named and reached the same way
     wherever you are. The amounts are fixed demo data, not whatever the
     previous state happened to hold: Limit is above the limit by definition.
     They seed a state; they never relax the checks the amount goes through. */
  var SCREENS=[
    {k:'home',    ru:'Главная',       page:'index'},
    {k:'amount',  ru:'Ввод суммы',    page:'transfer',step:0,amount:'500'},
    {k:'confirm', ru:'Подтверждение', page:'transfer',step:1,amount:'500'},
    {k:'waiting', ru:'Обработка',     page:'transfer',step:2,amount:'500'},
    {k:'sent',    ru:'Успех',         page:'transfer',step:3,amount:'500'},
    {k:'limit',   ru:'Лимит',         page:'transfer',step:4,amount:'3000'},
    {k:'failed',  ru:'Ошибка',        page:'transfer',step:5,amount:'500'}
  ];

  var opts={},cur='home',touched={};

  function byKey(k){
    for(var i=0;i<SCREENS.length;i++)if(SCREENS[i].k===k)return SCREENS[i];
    return SCREENS[0];
  }

  function href(s){
    if(s.page==='index')return 'index.html?lang='+lang;
    return 'transfer.html?lang='+lang+'&r='+encodeURIComponent(rec)+'&s='+s.k;
  }

  function paintNav(){
    [].forEach.call(document.querySelectorAll('#screens button'),function(b){
      var on=b.dataset.k===cur;
      b.classList.toggle('on',on);
      b.setAttribute('aria-current',on?'true':'false');
    });
  }

  function buildNav(){
    var host=document.getElementById('screens');
    if(!host)return;
    host.innerHTML=SCREENS.map(function(s){
      return '<button type="button" data-k="'+s.k+'">'+s.ru+'</button>';
    }).join('');
    [].forEach.call(host.querySelectorAll('button'),function(b){
      b.onclick=function(){
        var s=byKey(b.dataset.k);
        /* a state on this page changes in place, so the composition does not
           reload and nothing jumps; anything else is a real navigation */
        if(s.page===opts.page&&opts.onPick&&opts.onPick(s))return;
        if(s.page===opts.page&&s.page==='index')return;
        location.href=href(s);
      };
    });
    paintNav();
  }

  function wireLang(){
    var all=document.querySelectorAll('.lang button');
    [].forEach.call(all,function(b){
      b.classList.toggle('on',b.dataset.l===lang);
      b.onclick=function(){
        if(b.dataset.l===lang)return;
        lang=b.dataset.l;
        [].forEach.call(all,function(x){x.classList.toggle('on',x.dataset.l===lang)});
        /* keep the address bar in step without disturbing the recipient or the
           state, so a reload comes back to the same screen */
        QP.set('lang',lang);
        history.replaceState(null,'','?'+QP.toString());
        if(opts.onLang)opts.onLang(lang);
      };
    });
  }

  /* The folds are open where there is room to read and closed where there is
     not — but once someone works one by hand, their choice stands.

     A `toggle` event fires for our own writes too, and it fires late, so a
     plain flag would read every resize as a decision by the reader. What
     separates the two is the value: a user's toggle leaves the fold at
     something other than what we last set it to. */
  var lastSet={};

  function setFold(el,key,open){
    if(!el||touched[key])return;
    lastSet[key]=open;
    el.open=open;
  }

  function syncFolds(){
    var wide=window.matchMedia('(min-width:1180px)').matches,
        narrow=window.matchMedia('(max-width:699px)').matches;
    setFold(document.getElementById('foldAbout'),'about',wide);
    setFold(document.getElementById('foldScreens'),'screens',!narrow);
  }

  function wireFolds(){
    [['foldAbout','about'],['foldScreens','screens']].forEach(function(p){
      var el=document.getElementById(p[0]);
      if(el)el.addEventListener('toggle',function(){
        if(el.open!==lastSet[p[1]])touched[p[1]]=true;
      });
    });
    syncFolds();
    window.addEventListener('resize',syncFolds);
  }

  return {
    init:function(o){
      opts=o||{};
      cur=opts.current||(opts.page==='index'?'home':'amount');
      buildNav();wireLang();wireFolds();
    },
    /* the page calls this whenever its own state moves, so working the phone
       keeps the list on the right side honest */
    mark:function(k){cur=k;paintNav()},
    lang:function(){return lang},
    recipient:function(){return rec},
    screen:function(k){return byKey(k)},
    transferUrl:function(recKey,stateKey){
      return 'transfer.html?lang='+lang+'&r='+encodeURIComponent(recKey)+'&s='+(stateKey||'amount');
    }
  };
})();
