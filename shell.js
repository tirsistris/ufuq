/* Presentation shell — the panels around the phone, and the router inside it.

   It knows which screen is on show and how to reach every other one. It knows
   nothing about the money: the screens register themselves, the shell tells
   them when they are entered and left, and hands back the language. Its own
   text is Russian and stays Russian — AR/EN switches the bank inside the
   frame, not the presentation around it.

   Both screens are already in the document, so moving between them shows one
   subtree and hides the other. Nothing is fetched and nothing is parsed; the
   address bar is brought along with the History API so every screen keeps the
   link it has always had. */

var SHELL=(function(){

  /* One list for both screens, so a screen is named and reached the same way
     wherever you are. The amounts are fixed demo data, not whatever the
     previous state happened to hold: Limit is above the limit by definition.
     They seed a state; they never relax the checks the amount goes through. */
  var SCREENS=[
    {k:'home',    ru:'Главная',       at:'month'},
    {k:'amount',  ru:'Ввод суммы',    at:'transfer',step:0,amount:'500'},
    {k:'confirm', ru:'Подтверждение', at:'transfer',step:1,amount:'500'},
    {k:'waiting', ru:'Обработка',     at:'transfer',step:2,amount:'500'},
    {k:'sent',    ru:'Успех',         at:'transfer',step:3,amount:'500'},
    {k:'limit',   ru:'Лимит',         at:'transfer',step:4,amount:'3000'},
    {k:'failed',  ru:'Ошибка',        at:'transfer',step:5,amount:'500'}
  ];

  /* the tab title each screen carried when it was its own page */
  var TITLE={month:'أفق — الشهر',transfer:'أفق — تحويل'};

  var mods={},active=null,
      lang='ar',rec='noura',cur='home',
      touched={},lastSet={};

  function byKey(k){
    for(var i=0;i<SCREENS.length;i++)if(SCREENS[i].k===k)return SCREENS[i];
    return SCREENS[0];
  }

  /* The addresses are the ones the two pages have always had, so every link
     ever shared still names the same screen — only the way it is opened has
     changed. The recipient key travels; the person's data never does. */
  function href(k){
    var s=byKey(k);
    if(s.at==='month')return 'index.html?lang='+lang;
    return 'transfer.html?lang='+lang+'&r='+encodeURIComponent(rec)+'&s='+s.k;
  }

  /* what the address bar is asking for, read the same way on first load and
     on every Back or Forward */
  function address(){
    var p=new URLSearchParams(location.search),
        onTransfer=/transfer\.html$/i.test(location.pathname),
        s=byKey(p.get('s')||'amount'),
        r=p.get('r');
    return {
      /* a transfer link that names the month falls back to the entry step,
         the way transfer.html always did */
      k:onTransfer?(s.at==='transfer'?s.k:'amount'):'home',
      lang:p.get('lang')==='en'?'en':'ar',
      rec:(r&&MONTH.people[r])?r:rec
    };
  }

  /* ---------- the screen list on the right ---------- */

  function paintNav(){
    [].forEach.call(document.querySelectorAll('#screens button'),function(b){
      var on=b.dataset.k===cur;
      b.classList.toggle('on',on);
      b.setAttribute('aria-current',on?'true':'false');
    });
  }

  /* built once, wired once — the buttons outlive every screen change */
  function buildNav(){
    var host=document.getElementById('screens');
    if(!host)return;
    host.innerHTML=SCREENS.map(function(s){
      return '<button type="button" data-k="'+s.k+'">'+s.ru+'</button>';
    }).join('');
    [].forEach.call(host.querySelectorAll('button'),function(b){
      b.onclick=function(){
        /* the screen already on show is not a destination */
        if(b.dataset.k===cur)return;
        open(b.dataset.k,{seed:true,history:'push'});
      };
    });
    paintNav();
  }

  /* ---------- language ---------- */

  function paintLang(){
    [].forEach.call(document.querySelectorAll('.lang button'),function(b){
      b.classList.toggle('on',b.dataset.l===lang);
    });
  }

  function wireLang(){
    [].forEach.call(document.querySelectorAll('.lang button'),function(b){
      b.onclick=function(){
        if(b.dataset.l===lang)return;
        lang=b.dataset.l;
        paintLang();
        /* the language is a property of the screen you are on, not a move to
           another one: the address is corrected in place, so Back still goes
           where it went before, and a reload comes back to the same state */
        history.replaceState(null,'',href(cur));
        if(active)active.enter({state:byKey(cur),seed:false,fresh:false});
      };
    });
  }

  /* ---------- the folds on the panels ---------- */

  /* The folds are open where there is room to read and closed where there is
     not — but once someone works one by hand, their choice stands.

     A `toggle` event fires for our own writes too, and it fires late, so a
     plain flag would read every resize as a decision by the reader. What
     separates the two is the value: a user's toggle leaves the fold at
     something other than what we last set it to. */
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

  /* ---------- moving between screens ---------- */

  /* seed  — apply the state's demo amount. A deliberate pick from the list, or
             a link opened directly, asks for that state as advertised; Back and
             Forward do not, so walking the history never rewrites what was
             typed in the flow.
     history — 'push' for a move someone made, 'replace' for a correction to
             the address of the screen already on show, nothing when the move
             came from the history itself. */
  function open(k,opts){
    opts=opts||{};
    var s=byKey(k),mod=mods[s.at];
    if(!mod)return;

    var arriving=active!==mod;
    /* Whatever is not the destination is put away, and whatever it had running
       stops with it: a hidden screen never keeps a timer or a frame loop
       alive. This runs on the first open too — the document ships with the
       month on show, so a link straight to a transfer state has one to close
       before there is an active screen to speak of. */
    Object.keys(mods).forEach(function(name){
      var m=mods[name];
      if(m===mod||m.root.hidden)return;
      if(m.leave)m.leave();
      m.root.hidden=true;
    });
    active=mod;
    mod.root.hidden=false;
    cur=s.k;
    document.title=TITLE[s.at];
    paintNav();

    /* A screen arrives at the size and shape it was left in. Its transitions
       describe changes made while it is being watched, so they are held shut
       for the frame it appears in — otherwise the widths it was last given
       would be animated to the new ones in front of someone who never saw the
       old ones. */
    if(arriving)mod.root.classList.add('no-anim');
    mod.enter({state:s,seed:opts.seed!==false,fresh:arriving});
    if(arriving){
      void mod.root.offsetWidth;
      requestAnimationFrame(function(){mod.root.classList.remove('no-anim')});
    }

    if(opts.history==='push')history.pushState(null,'',href(s.k));
    else if(opts.history==='replace')history.replaceState(null,'',href(s.k));
  }

  window.addEventListener('popstate',function(){
    var a=address();
    lang=a.lang;rec=a.rec;
    paintLang();
    open(a.k,{seed:false,history:null});
  });

  return {
    /* a screen hands over its root and the two moments it cares about */
    register:function(name,mod){mods[name]=mod},

    start:function(){
      var a=address();
      lang=a.lang;rec=a.rec;
      buildNav();paintLang();wireLang();wireFolds();
      /* the address is left exactly as it was opened, so a shared link is
         never rewritten under the person who followed it */
      open(a.k,{seed:true,history:null});
    },

    /* a screen asking for another one — the same move the list makes */
    go:function(k){
      if(k===cur)return;
      open(k,{seed:true,history:'push'});
    },

    /* the month hands over a recipient key and asks for the entry step */
    openTransfer:function(recKey){
      if(MONTH.people[recKey])rec=recKey;
      open('amount',{seed:true,history:'push'});
    },

    /* A screen calls this whenever its own state moves, so the list on the
       right and the address bar stay honest about where you are. A step the
       flow reaches on its own — the wait resolving — replaces the address
       instead of pushing, so Back cannot land on a state that immediately
       moves on again. */
    mark:function(k,opts){
      cur=k;paintNav();
      document.title=TITLE[byKey(k).at];
      if(opts&&opts.replace)history.replaceState(null,'',href(k));
      else history.pushState(null,'',href(k));
    },

    lang:function(){return lang},
    recipient:function(){return rec},
    screen:function(k){return byKey(k)},

    /* Every element inside a screen is addressed within that screen's own
       root, so the two screens can share a vocabulary without sharing an id.
       Nothing below the frame is looked up by getElementById.

       The lookup is remembered, but only while the element it found is still
       in the document: a step rebuilds its own controls, and the next ask for
       one of those finds the node that is actually on screen rather than the
       one it replaced. */
    els:function(root){
      var cache={};
      return function(name){
        var e=cache[name];
        if(e&&e.isConnected)return e;
        return (cache[name]=root.querySelector('[data-el="'+name+'"]'));
      };
    }
  };
})();
