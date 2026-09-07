/* The transfer screen — six states of one operation, drawn on the same bar.

   The screen holds three things and nothing else: which step is on show, the
   amount that was typed, and who it is going to. MONTH is read, never written:
   what a transfer would do to the month is drawn here as a hypothesis, so
   showing a state twice cannot debit anything twice, and every route into a
   step goes through the same validity check. */

(function(){

  var root=document.querySelector('[data-screen="transfer"]'),
      el=SHELL.els(root);

  /* aliases onto the shared model — the numbers themselves live in model.js */
  var SPENT=MONTH.spent,FREE=MONTH.free,PROM=MONTH.promised,LIMIT=MONTH.limit;

  /* the shell names the states; a state seeds its own demo amount, so Limit
     always arrives above the limit */
  var STEP_KEY=['amount','confirm','waiting','sent','limit','failed'];

  var lang='ar',step=0,amount='500',recKey='noura',timer=null;
  /* departure glyph — marks a button that leaves the transfer */
  var EXT='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-8.5 8.5M18 13.5V18a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4.5"/></svg>';

  function n(v){return '<span class="num ltr">'+v+'</span>'}
  function set(k,v){el(k).textContent=v}
  function html(k,v){el(k).innerHTML=v}

  /* The wording depends on who the money is going to — Arabic agrees the
     beneficiary complement and the imperative suffix with the recipient's
     gender, and both languages name the person in half a dozen places. The
     recipient can change without the page reloading now, so the dictionary is
     built per language and per person, and kept once it has been built. */
  var built={};
  function dict(k){
    var key=k+'|'+recKey;
    if(built[key])return built[key];

    var REC=MONTH.people[recKey]||MONTH.people.abdullah,
        PHONE=REC.tel,
        FEM=REC.g==='f',
        BENE=FEM?'مستفيدةً':'مستفيداً',
        ACTIVATE=FEM?'وفعّلها':'وفعّله',
        PRON=FEM?'her':'him';

    var d=k==='ar'?{
      dir:'rtl',title:'الشهر',mark:'أفق',
      acct:'جاري <b class="ltr">'+MONTH.account+'</b>',
      availL:'المتاح الآن',amountL:'المبلغ',
      monthSub:['من ',' لهذا الشهر'],
      toSub:'إلى ',
      s:['مصروف','متاح','موعود'],wedge:'المبلغ',
      notes:{
        amount:'حساب مبدئي: هذا ما يبقى في <b>متاح</b> لو أرسلت المبلغ. لم يُخصم شيء بعد.',
        over:'المبلغ أكبر من <b>متاح</b>، فلا يظهر على الشريط. اخفضه إلى '+n(money(MONTH.free))+' أو أقل.',
        confirm:'راجع الاسم والمبلغ. الحساب ما زال كما هو — لم يُخصم شيء بعد.',
        wait:'جارٍ التنفيذ. يخرج المبلغ من <b>متاح</b> عند وصوله.',
        sent:'انتقل المبلغ من <b>متاح</b> إلى <b>مصروف</b>. مجموع الشهر لم يتغيّر.',
        limit:'الخط داخل المبلغ هو حد التحويل السريع — '+n(money(MONTH.limit))+'.',
        fail:'توزيع مال الشهر كما كان قبل المحاولة.'
      },
      rec:'المستلم',phone:'الجوال',amt:'المبلغ',
      afterL:'المتاح بعد التحويل',afterOver:'يتجاوز المتاح بـ',
      lastL:function(a){return 'آخر تحويل ل'+REC.ar+' · <b class="num ltr">'+money(a)+'</b>'},reuse:'إعادة',
      name:REC.ar,
      route:['خُصم من الحساب','شبكة سريع','وصل إلى '+REC.ar],
      sendBtn:'إرسال ',sending:'جارٍ الإرسال',
      resultW:'أُرسل ',resultSub:'وصل إلى '+REC.ar+' · <span class="num ltr">'+PHONE+'</span>',
      back:'العودة إلى الشهر',
      contBtn:'متابعة',nowW:'الآن',
      limH:'المبلغ أعلى من حد التحويل السريع',
      limP:'في شبكة <b>سريع</b>، التحويل بدون إضافة المستفيد محدود. لإرسال المبلغ كاملاً، أضِف '+REC.ar+' '+BENE+' '+ACTIVATE+'.',
      limRow:'حد التحويل السريع',
      addBene:'إضافة '+REC.ar+' '+BENE,
      editAmt:'العودة لتعديل المبلغ',
      failH:'المبلغ بقي معك',
      failP:'لم يكتمل التحويل عبر <b>سريع</b>. حسابك كما هو.',
      retry:'إعادة المحاولة',changeAmt:'تغيير المبلغ',
      tabs:['الشهر','التحويلات','الحساب']
    }:{
      dir:'ltr',title:'Month',mark:'Ufuq',
      acct:'Current <b class="ltr">'+MONTH.account+'</b>',
      availL:'Available now',amountL:'Amount',
      monthSub:['of ',' for this month'],
      toSub:'to ',
      s:['Spent','Available','Promised'],wedge:'Amount',
      notes:{
        amount:'A preview: this is what would be left in <b>Available</b> if you send it. Nothing has been debited yet.',
        over:'The amount is larger than <b>Available</b>, so it isn\'t drawn on the bar. Lower it to '+n(money(MONTH.free))+' or less.',
        confirm:'Check the name and the amount. Your account is still untouched — nothing has been debited yet.',
        wait:'In progress. The amount leaves <b>Available</b> when it lands.',
        sent:'The amount moved from <b>Available</b> into <b>Spent</b>. The month\'s total is unchanged.',
        limit:'The line inside the amount is the quick transfer limit — '+n(money(MONTH.limit))+'.',
        fail:'The month\'s money is split exactly as it was before the attempt.'
      },
      rec:'Recipient',phone:'Phone',amt:'Amount',
      afterL:'Available after transfer',afterOver:'Over available by',
      lastL:function(a){return 'Last to '+REC.en+' · <b class="num ltr">'+money(a)+'</b>'},reuse:'Reuse',
      name:REC.en,
      route:['Debited from account','sarie network','Delivered to '+REC.en],
      sendBtn:'Send ',sending:'Sending',
      resultW:'Sent ',resultSub:'Delivered to '+REC.en+' · <span class="num ltr">'+PHONE+'</span>',
      back:'Back to Month',
      contBtn:'Continue',nowW:'now',
      limH:'This is above the quick transfer limit',
      limP:'On the <b>sarie</b> network, transfers without adding the recipient are capped. To send the full amount, add '+REC.en+' as a beneficiary and activate '+PRON+'.',
      limRow:'Quick transfer limit',
      addBene:'Add '+REC.en+' as beneficiary',
      editAmt:'Back to edit the amount',
      failH:'The money stayed with you',
      failP:'The transfer through <b>sarie</b> didn\'t complete. Your account is unchanged.',
      retry:'Try again',changeAmt:'Change amount',
      tabs:['Month','Transfers','Account']
    };
    d.tel=PHONE;
    return (built[key]=d);
  }

  var ICONS='<svg width="18" height="11" viewBox="0 0 18 11"><rect x="0" y="7" width="3" height="4" rx=".6" fill="#14181A"></rect><rect x="4.5" y="4.7" width="3" height="6.3" rx=".6" fill="#14181A"></rect><rect x="9" y="2.4" width="3" height="8.6" rx=".6" fill="#14181A"></rect><rect x="13.5" y="0" width="3" height="11" rx=".6" fill="#14181A"></rect></svg><svg width="16" height="11" viewBox="0 0 16 11"><path d="M8 2.8c2.1 0 4 .8 5.4 2.2l1-1C12.7 2.3 10.5 1.3 8 1.3S3.3 2.3 1.6 4l1 1C4 3.6 5.9 2.8 8 2.8Z" fill="#14181A"></path><path d="M8 6c1.2 0 2.3.5 3.1 1.3l1-1C11 5.2 9.6 4.6 8 4.6s-3 .6-4.1 1.7l1 1C5.7 6.5 6.8 6 8 6Z" fill="#14181A"></path><circle cx="8" cy="9.4" r="1.3" fill="#14181A"></circle></svg>';
  function battery(rtl){return rtl
    ?'<svg width="25" height="12" viewBox="0 0 25 12"><rect x="3.5" y=".5" width="21" height="11" rx="3" stroke="#14181A" stroke-opacity=".35" fill="none"></rect><rect x="5" y="2" width="15" height="8" rx="1.8" fill="#14181A"></rect><path d="M2 4v4c-.7-.3-1.2-1-1.2-2S1.3 4.3 2 4Z" fill="#14181A" fill-opacity=".45"></path></svg>'
    :'<svg width="25" height="12" viewBox="0 0 25 12"><rect x=".5" y=".5" width="21" height="11" rx="3" stroke="#14181A" stroke-opacity=".35" fill="none"></rect><rect x="2" y="2" width="15" height="8" rx="1.8" fill="#14181A"></rect><path d="M23 4v4c.7-.3 1.2-1 1.2-2S23.7 4.3 23 4Z" fill="#14181A" fill-opacity=".45"></path></svg>';}

  /* What was typed, unchanged. An amount above Available is refused — it is
     never quietly reduced to the maximum, because the number on screen has to
     stay the number the user entered. */
  function amountNum(){return parseInt(amount||'0',10)||0}
  function valid(){var a=amountNum();return a>0&&a<=FREE}
  /* Only an amount the month can back gets a width: the bar's widths are real
     money, so an impossible amount is drawn as nothing and explained in words
     rather than shown at a size it does not have. */
  function drawn(){return valid()?amountNum():0}

  /* The rule must equal the wedge exactly, and the wedge's real edge is not
     computable from its percentage: below the 12px floor flex-shrink moves it.
     So the annotation is anchored to the wedge's measured rect and re-read
     while the width transition runs. The label centres on the rule and is
     nudged back inside the bar when it would hang off the end. */
  /* Labels are gated on the segment's MEASURED inner width, re-read while the
     width transition runs, so a segment that is still narrower than the
     threshold stays silent instead of showing clipped text for ~150ms. */
  function syncMute(){
    var wedge=el('g-wedge');
    function w(k){return el(k).getBoundingClientRect().width}
    segApply(el('g-spent'),w('g-spent'),true);
    segApply(el('g-free'),w('g-free'),true);
    segApply(el('g-prom'),w('g-prom'),true);
    /* the slice speaks through the callout below rather than a cramped sum,
       and says nothing at all once it has been absorbed or rolled back */
    segApply(wedge,w('g-wedge'),false);
    if(step===3||step===5)wedge.classList.add('mute');
  }

  function syncCall(){
    var row=el('callrow');
    if(!row.classList.contains('on'))return;
    var c=el('call'),w=el('g-wedge'),bar=el('bar'),sp=el('t-call');
    var wr=w.getBoundingClientRect(),br=bar.getBoundingClientRect();
    var rtl=getComputedStyle(document.getElementById('frame')).direction==='rtl';
    c.style.transform='none';
    c.style.insetInlineStart=(rtl?br.right-wr.right:wr.left-br.left)+'px';
    c.style.setProperty('--cw',wr.width+'px');
    sp.style.transform='translateX(0px)';
    var spr=sp.getBoundingClientRect(),nudge=0;
    if(spr.left<br.left)nudge=br.left-spr.left;
    else if(spr.right>br.right)nudge=br.right-spr.right;
    if(nudge)sp.style.transform='translateX('+nudge+'px)';
  }

  var syncUntil=0,syncing=false;
  function syncLoop(){
    /* a screen that is put away has nothing to measure, and its loop ends here
       rather than running on against a box of zero width */
    if(root.hidden){syncing=false;return}
    syncCall();syncMute();
    if(performance.now()<syncUntil)requestAnimationFrame(syncLoop);
    else syncing=false;
  }
  function trackCall(){
    syncUntil=performance.now()+900;
    if(!syncing){syncing=true;requestAnimationFrame(syncLoop)}
  }

  /* the width transition also drives the gate directly, so labels re-evaluate
     even if the rAF window is throttled. Wired once, on the bar that is always
     there — never re-added by a render. */
  ['transitionrun','transitionend'].forEach(function(ev){
    el('bar').addEventListener(ev,function(){
      if(root.hidden)return;
      syncMute();syncCall();
    },true);
  });

  function paint(){
    var d=dict(lang),rtl=d.dir==='rtl',sent=step===3,failed=step===5;
    var a=amountNum(),w=drawn(),over=a>FREE;
    var spentV=sent?SPENT+w:SPENT;
    /* the seam is the edge of what has been spent, so it moves only when the
       money does — and on Sent the money really has moved */
    var seamPct=pct(spentV);

    /* On Sent the slice is not recoloured in place — it is absorbed: Spent takes
       its width and the slice goes to zero in the same frame, so the shared
       0.42s width transition slides the seam across it while its far edge
       stays put. The material swap lands first (merged is toggled before the
       widths), which reads as "filled, then swallowed" rather than "shrank". */
    /* Failure is the reverse movement, not another outcome painted on top:
       the slice keeps its held material and simply retreats to zero while
       Available grows back into it. No merged class — nothing was spent. */
    el('g-wedge').classList.toggle('merged',sent);
    el('g-spent').style.width=pct(spentV)+'%';
    el('g-wedge').style.width=pct(sent||failed?0:w)+'%';
    el('g-free').style.width=pct(failed?FREE:FREE-w)+'%';
    el('g-prom').style.width=pct(PROM)+'%';
    var seam=el('seam');
    seam.style.right=rtl?seamPct+'%':'auto';
    seam.style.left=rtl?'auto':seamPct+'%';

    /* the limit sits INSIDE the amount: left of it leaves now,
       right of it needs the recipient added. Divider material, not colour. */
    var overLimit=w>LIMIT&&!sent&&!failed;
    var ll=el('limitline');
    ll.classList.toggle('on',overLimit);
    if(overLimit)ll.style.insetInlineStart=(LIMIT/w*100)+'%';

    set('v-spent',grp(spentV));
    set('v-wedge',w?grp(w):'');
    /* Available speaks the sum while the hero is taken by the typed amount,
       and the share once the hero returns to the balance */
    set('v-free',sent?(pct(FREE-w)).toFixed(0)+'%':grp(failed?FREE:FREE-w));
    set('v-prom',grp(PROM));
    set('t-sw',w?d.wedge:'');

    /* Labels are gated on the width a segment actually has; the width itself
       is untouched, so a slice too narrow to be labelled stays honest about
       its size and speaks through the callout below the bar instead. */
    syncMute();trackCall();

    var bw=el('bar').clientWidth||348,wedgeEl=el('g-wedge');
    var thin=w>0&&!sent&&!failed&&pct(w)/100*bw<segNeed(wedgeEl).full;
    var cr=el('callrow');
    cr.classList.toggle('on',thin);
    /* height is held only while the callout is actually shown; the fold is
       animated on the segments' own curve so it reads as one movement */
    cr.classList.toggle('reserve',thin);
    if(thin){
      set('t-call',money(w));
      syncCall();trackCall();
    }

    // hero: the typed amount IS the hero number until it is sent
    if(sent){
      set('t-hl',d.availL);set('t-hv',grp(FREE-w));
      html('t-hs',d.monthSub[0]+n(money(MONTH.total))+d.monthSub[1]);
    }else{
      set('t-hl',d.amountL);set('t-hv',grp(a));
      html('t-hs',d.toSub+d.name+' · '+n(d.tel));
    }
    /* an unbackable amount is explained wherever the step would otherwise
       describe a slice that is not on the bar */
    html('note',(over&&!sent&&!failed)?d.notes.over
      :[d.notes.amount,d.notes.confirm,d.notes.wait,d.notes.sent,d.notes.limit,d.notes.fail][step]);
    zone();
  }

  function zone(){
    var d=dict(lang),a=amountNum(),z=el('zone'),h='';
    /* zero, empty and above-Available all block the next step in the same way */
    var blocked=!valid();
    if(step===0){
      var over=a>FREE;
      h='<div class="after'+(over?' over':'')+'">'+
          '<span class="after-l">'+(over?d.afterOver:d.afterL)+'</span>'+
          '<span class="after-v num ltr">'+grp(over?a-FREE:FREE-a)+'<span class="cu">SAR</span></span>'+
        '</div>'+
        '<div class="quick">'+MONTH.quick.map(function(v){
          return '<button data-v="'+v+'"'+(a===v?' class="on"':'')+'><span class="num ltr">'+grp(v)+'</span></button>';
        }).join('')+'</div>'+
        '<div class="last"><span>'+d.lastL(MONTH.lastAmount)+'</span><button data-reuse="1">'+d.reuse+'</button></div>';
      var keys=['1','2','3','4','5','6','7','8','9','.','0','⌫'];
      h+='<div class="pad">'+keys.map(function(k){
        var gl=(k==='.'||k==='⌫')?' gl':'';
        return '<button class="k'+gl+'" data-k="'+k+'">'+k+'</button>';
      }).join('')+'</div>'+
      '<button class="act" data-el="go"'+(blocked?' disabled':'')+'>'+d.contBtn+'</button>';
    }else if(step===4){
      h='<div class="lim-h">'+d.limH+'</div>'+
        '<div class="lim-p">'+d.limP+'</div>'+
        '<div class="rows lim-rows">'+
          '<div class="row"><span class="row-l">'+d.limRow+'</span><span class="row-v num ltr">'+money(LIMIT)+'</span></div>'+
          '<div class="row"><span class="row-l">'+d.amt+'</span><span class="row-v num ltr">'+money(a)+'</span></div>'+
        '</div>'+
        '<button class="act" data-act="sendlimit"'+(LIMIT>FREE?' disabled':'')+'>'+d.sendBtn+'<span class="num ltr">'+money(LIMIT)+'</span> '+d.nowW+'</button>'+
        '<button class="act leave" data-act="add">'+EXT+'<span>'+d.addBene+'</span></button>'+
        '<button class="act bare" data-act="edit">'+d.editAmt+'</button>';
    }else if(step===5){
      h='<div class="lim-h">'+d.failH+'</div>'+
        '<div class="lim-p">'+d.failP+'</div>'+
        '<div class="rows lim-rows">'+
          '<div class="row"><span class="row-l">'+d.rec+'</span><span class="row-v">'+d.name+'</span></div>'+
          '<div class="row"><span class="row-l">'+d.amt+'</span><span class="row-v num ltr">'+money(a)+'</span></div>'+
        '</div>'+
        '<button class="act" data-act="retry">'+d.retry+'</button>'+
        '<button class="act bare" data-act="edit">'+d.changeAmt+'</button>';
    }else if(step===1){
      h='<div class="rows">'+
        '<div class="row lead"><span class="row-l">'+d.rec+'</span><span class="row-v">'+d.name+'</span></div>'+
        '<div class="row"><span class="row-l">'+d.phone+'</span><span class="row-v num ltr">'+d.tel+'</span></div>'+
        '<div class="row"><span class="row-l">'+d.amt+'</span><span class="row-v num ltr">'+money(a)+'</span></div>'+
        '</div>'+
        '<button class="act" data-el="go"'+(blocked?' disabled':'')+'>'+d.sendBtn+'<span class="num ltr">'+money(a)+'</span></button>';
    }else if(step===2){
      var st=['done','now','next'];
      h='<div class="rows">'+d.route.map(function(r,i){
        return '<div class="row"><span class="mark '+st[i]+'"></span><span class="step-n '+st[i]+'">'+r+'</span></div>';
      }).join('')+'</div>'+
      '<div class="sending">'+d.sending+'</div>';
    }else{
      h='<div class="result">'+d.resultW+'<span class="num ltr">'+money(a)+'</span></div>'+
        '<div class="result-sub">'+d.resultSub+'</div>'+
        '<div class="rows">'+d.route.map(function(r){
          return '<div class="row"><span class="mark done"></span><span class="step-n done">'+r+'</span></div>';
        }).join('')+'</div>'+
        '<button class="act ghost" data-el="go">'+d.back+'</button>';
    }
    z.innerHTML=h;

    /* Every step ends with its actions. Gather that trailing run into one
       footer the shell can pin, so the primary action stays reachable when a
       shortened frame makes the screen scroll. Wiring below still finds them:
       they are one level deeper, not elsewhere. */
    var foot=document.createElement('div');
    foot.className='zone-act';
    while(z.lastElementChild&&(z.lastElementChild.classList.contains('act')||
                               z.lastElementChild.classList.contains('sending'))){
      foot.insertBefore(z.lastElementChild,foot.firstChild);
    }
    if(foot.firstChild)z.appendChild(foot);

    /* The controls of a step are built with the step and thrown away with it,
       so every handler here lands on a node that has just been created. None
       of them accumulates: there is never a second handler on the same
       button, because there is never a second button. */
    var go=z.querySelector('[data-el="go"]');
    /* the guard repeats the disabled attribute because the step chips outside
       the frame can land on Confirm with an amount that was never accepted */
    if(go)go.onclick=function(){
      if(step===0){if(!valid())return;setStep(amountNum()>LIMIT?4:1)}
      else if(step===1){if(!valid())return;setStep(2)}
      /* "Back to Month" goes back to Month, carrying the language rather
         than quietly resetting to the amount step */
      else SHELL.go('home');
    };
    /* send what the channel allows now */
    var sl=z.querySelector('[data-act="sendlimit"]');
    if(sl)sl.onclick=function(){amount=String(LIMIT);setStep(1)};
    /* return to the amount KEEPS what was typed */
    var ed=z.querySelector('[data-act="edit"]');
    if(ed)ed.onclick=function(){setStep(0)};
    /* retry re-runs the same amount through the channel */
    var rt=z.querySelector('[data-act="retry"]');
    if(rt)rt.onclick=function(){setStep(2)};
    [].slice.call(z.querySelectorAll('.quick button')).forEach(function(b){
      b.onclick=function(){amount=b.dataset.v;paint()};
    });
    var re=z.querySelector('[data-reuse]');
    if(re)re.onclick=function(){amount=String(MONTH.lastAmount);paint()};
    [].slice.call(z.querySelectorAll('.k')).forEach(function(b){
      b.onclick=function(){
        var k=b.dataset.k;
        if(k==='⌫')amount=amount.length<=1?'0':amount.slice(0,-1);
        else if(k==='.')return;
        else amount=(amount==='0'?'':amount)+k;
        if(amount.length>5)amount=amount.slice(0,5);
        paint();
      };
    });
  }

  /* The wait is the one thing on this screen that moves by itself. It is armed
     on the way into the step and disarmed on the way out, and it checks once
     more before it fires: a screen nobody is looking at never resolves. */
  function arm(){
    disarm();
    timer=setTimeout(function(){
      timer=null;
      if(root.hidden||step!==2)return;
      step=3;
      /* the flow moved on on its own, so it corrects the address rather than
         adding a stop Back would have to walk through — and land on a wait
         that would immediately move on again */
      SHELL.mark('sent',{replace:true});
      paint();
    },1900);
  }
  function disarm(){if(timer){clearTimeout(timer);timer=null}}

  /* a step reached from inside the flow: it announces itself, so the list on
     the right and the address bar follow the phone */
  function setStep(k,amt){
    disarm();
    step=k;
    if(amt!==undefined)amount=amt;
    /* the limit state only exists above the limit */
    if(k===4&&amountNum()<=LIMIT)amount='3000';
    SHELL.mark(STEP_KEY[k]);
    paint();
    if(k===2)arm();
  }

  function render(k){
    lang=k;var d=dict(k),rtl=d.dir==='rtl';
    document.getElementById('frame').setAttribute('dir',d.dir);
    document.documentElement.setAttribute('lang',k);
    el('status').innerHTML='<span class="t">9:41</span><div class="ic">'+ICONS+battery(rtl)+'</div>';
    set('t-title',d.title);set('t-mark',d.mark);
    /* the dates stay here, in the header, where a date is read as a date */
    set('t-dg',MONTH.day[k].g);set('t-dh',MONTH.day[k].h);
    html('t-acct',d.acct);
    set('t-s1',d.s[0]);set('t-s2',d.s[1]);set('t-s3',d.s[2]);
    set('t-ax0','0');set('t-ax1',money(MONTH.total));
    el('nav').innerHTML=d.tabs.map(function(t,i){
      return '<button class="tab'+(i===0?' on':'')+'"><span class="rule"></span>'+t+'</button>';
    }).join('');
    paint();
  }

  SHELL.register('transfer',{
    root:root,
    /* The shell says which state to show and whether it was asked for by name.
       A state picked from the list, or opened by its own link, arrives with the
       demo amount it advertises; Back, Forward and a change of language bring
       back what was actually typed. */
    enter:function(ctx){
      var s=ctx.state;
      recKey=SHELL.recipient();
      disarm();
      if(ctx.seed&&s.amount!==undefined)amount=s.amount;
      step=s.step;
      /* the limit state only exists above the limit, however it was reached */
      if(step===4&&amountNum()<=LIMIT)amount='3000';
      render(SHELL.lang());
      if(step===2)arm();
    },
    /* the wait does not run on a screen that is no longer on show */
    leave:function(){disarm();syncUntil=0}
  });

})();
