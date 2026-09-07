/* The month screen — where the money of the month is divided.

   Every sum and every share comes from MONTH; the dictionaries below carry
   wording only, so the two screens cannot disagree about the money. The screen
   reads the model and never writes to it: what a transfer would do is drawn on
   the transfer screen, and the month always states the month as it stands. */

(function(){

  var root=document.querySelector('[data-screen="month"]'),
      el=SHELL.els(root);

  var SH={spent:pct(MONTH.spent).toFixed(0),free:pct(MONTH.free).toFixed(0),prom:pct(MONTH.promised).toFixed(0)};
  function n(v){return '<span class="num ltr">'+v+'</span>'}

  var L={
    ar:{
      dir:'rtl',title:'الشهر',mark:'أفق',
      hl:'المتاح الآن',acct:'جاري <b class="ltr">'+MONTH.account+'</b>',
      hs:['من ',' لهذا الشهر'],
      s:['مصروف','متاح','موعود'],
      note:'الشريط يقسم مال الشهر — '+n(money(MONTH.total))+': رصيد أول الشهر والوارد. الطول مبلغ، لا وقت.',
      drill:{
        spent:'<b>مصروف</b> — '+n(money(MONTH.spent))+' · '+SH.spent+'% من مال الشهر. خرج من الحساب.',
        free:'<b>متاح</b> — '+n(money(MONTH.free))+' · '+SH.free+'% من مال الشهر. هذا وحده لك الآن.',
        prom:'<b>موعود</b> — '+n(money(MONTH.promised))+' · '+SH.prom+'% من مال الشهر. على الحساب، لكنه محسوب لغيرك. المواعيد في القائمة أدناه.'
      },
      obt:'التزامات قادمة',
      obs:[['قسط السيارة','8 سبتمبر','بعد 4 أيام'],['تأمين طبي','15 سبتمبر',''],['رسوم المدرسة','22 سبتمبر',''],['اشتراكات','28 سبتمبر','']],
      spentT:'ما صُرف حتى الآن',
      spentList:[['نقل','4 سبتمبر'],['مطعم','3 سبتمبر'],['وقود','3 سبتمبر'],['بقالة','2 سبتمبر'],['كهرباء','1 سبتمبر'],['صيدلية','1 سبتمبر']],
      qst:'إرسال سريع',
      act:'تحويل برقم الجوال',
      tabs:['الشهر','التحويلات','الحساب']
    },
    en:{
      dir:'ltr',title:'Month',mark:'Ufuq',
      hl:'Available now',acct:'Current <b class="ltr">'+MONTH.account+'</b>',
      hs:['of ',' for this month'],
      s:['Spent','Available','Promised'],
      note:'The bar splits the month\'s money — '+n(money(MONTH.total))+': opening balance plus what came in. Length is an amount, not time.',
      drill:{
        spent:'<b>Spent</b> — '+n(money(MONTH.spent))+' · '+SH.spent+'% of the month\'s money. Already out of the account.',
        free:'<b>Available</b> — '+n(money(MONTH.free))+' · '+SH.free+'% of the month\'s money. This alone is yours now.',
        prom:'<b>Promised</b> — '+n(money(MONTH.promised))+' · '+SH.prom+'% of the month\'s money. In the account, spoken for. Due dates are in the list below.'
      },
      obt:'Upcoming commitments',
      obs:[['Car instalment','8 September','in 4 days'],['Health insurance','15 September',''],['School fees','22 September',''],['Subscriptions','28 September','']],
      spentT:'Spent so far',
      spentList:[['Transport','4 September'],['Dining','3 September'],['Fuel','3 September'],['Groceries','2 September'],['Electricity','1 September'],['Pharmacy','1 September']],
      qst:'Quick send',
      act:'Transfer by phone number',
      tabs:['Month','Transfers','Account']
    }
  };

  var ICONS='<svg width="18" height="11" viewBox="0 0 18 11"><rect x="0" y="7" width="3" height="4" rx=".6" fill="#14181A"></rect><rect x="4.5" y="4.7" width="3" height="6.3" rx=".6" fill="#14181A"></rect><rect x="9" y="2.4" width="3" height="8.6" rx=".6" fill="#14181A"></rect><rect x="13.5" y="0" width="3" height="11" rx=".6" fill="#14181A"></rect></svg><svg width="16" height="11" viewBox="0 0 16 11"><path d="M8 2.8c2.1 0 4 .8 5.4 2.2l1-1C12.7 2.3 10.5 1.3 8 1.3S3.3 2.3 1.6 4l1 1C4 3.6 5.9 2.8 8 2.8Z" fill="#14181A"></path><path d="M8 6c1.2 0 2.3.5 3.1 1.3l1-1C11 5.2 9.6 4.6 8 4.6s-3 .6-4.1 1.7l1 1C5.7 6.5 6.8 6 8 6Z" fill="#14181A"></path><circle cx="8" cy="9.4" r="1.3" fill="#14181A"></circle></svg>';
  function battery(rtl){
    return rtl
      ? '<svg width="25" height="12" viewBox="0 0 25 12"><rect x="3.5" y=".5" width="21" height="11" rx="3" stroke="#14181A" stroke-opacity=".35" fill="none"></rect><rect x="5" y="2" width="15" height="8" rx="1.8" fill="#14181A"></rect><path d="M2 4v4c-.7-.3-1.2-1-1.2-2S1.3 4.3 2 4Z" fill="#14181A" fill-opacity=".45"></path></svg>'
      : '<svg width="25" height="12" viewBox="0 0 25 12"><rect x=".5" y=".5" width="21" height="11" rx="3" stroke="#14181A" stroke-opacity=".35" fill="none"></rect><rect x="2" y="2" width="15" height="8" rx="1.8" fill="#14181A"></rect><path d="M23 4v4c.7-.3 1.2-1 1.2-2S23.7 4.3 23 4Z" fill="#14181A" fill-opacity=".45"></path></svg>';
  }

  /* the shell owns the language and puts it in the URL, so it survives a
     transfer and the way back */
  var cur=null,lang='ar';

  function set(k,v){el(k).textContent=v}
  function html(k,v){el(k).innerHTML=v}

  /* the label comes from the dictionary, the sum from MONTH, paired by index */
  function commitments(){
    var d=L[lang];
    set('t-obt',d.obt);set('t-obtotal',money(MONTH.promised));
    el('obs').innerHTML=d.obs.map(function(o,i){
      return '<div class="ob"><span class="hatch"></span><div><div class="ob-n">'+o[0]+'</div>'+
        '<div class="ob-d"><span>'+o[1]+'</span>'+(o[2]?' · <span class="soon">'+o[2]+'</span>':'')+'</div></div>'+
        '<span class="ob-a num ltr">'+grp(MONTH.commitments[i])+'</span></div>';
    }).join('');
  }
  function spentHistory(){
    var d=L[lang];
    set('t-obt',d.spentT);set('t-obtotal',money(MONTH.spent));
    el('obs').innerHTML=d.spentList.map(function(o,i){
      return '<div class="ob"><span class="solid"></span><div><div class="ob-n">'+o[0]+'</div>'+
        '<div class="ob-d">'+o[1]+'</div></div>'+
        '<span class="ob-a past num ltr">'+grp(MONTH.spends[i])+'</span></div>';
    }).join('');
  }

  /* Widths are shares of MONTH.total, so they always add to the whole bar and
     a slice worth nothing occupies nothing. The seam sits on the spent/available
     edge — the same boundary the segments already draw, stated once more in ink. */
  function drawBar(){
    var rtl=L[lang].dir==='rtl',w=pct(MONTH.spent);
    el('g-spent').style.width=w+'%';
    el('g-free').style.width=pct(MONTH.free)+'%';
    el('g-prom').style.width=pct(MONTH.promised)+'%';
    var seam=el('seam');
    seam.style.right=rtl?w+'%':'auto';
    seam.style.left=rtl?'auto':w+'%';
    set('v-spent',grp(MONTH.spent));
    set('v-free',SH.free+'%');
    set('v-prom',grp(MONTH.promised));
    fitLabels();
  }

  /* a label is shown only where it physically fits; the width it was measured
     against never changes because of the answer */
  function fitLabels(){
    var bw=el('bar').clientWidth;
    /* nothing to measure while the screen is put away */
    if(!bw)return;
    segApply(el('g-spent'),pct(MONTH.spent)/100*bw,true);
    segApply(el('g-free'),pct(MONTH.free)/100*bw,true);
    segApply(el('g-prom'),pct(MONTH.promised)/100*bw,true);
  }
  window.addEventListener('resize',fitLabels);

  function render(k){
    lang=k;var d=L[k],rtl=d.dir==='rtl';
    var f=document.getElementById('frame');
    f.setAttribute('dir',d.dir);
    document.documentElement.setAttribute('lang',k);

    el('status').innerHTML=
      '<span class="t">9:41</span><div class="ic">'+ICONS+battery(rtl)+'</div>';

    set('t-title',d.title);set('t-mark',d.mark);
    /* the dates stay here, in the header, where a date is read as a date */
    set('t-dg',MONTH.day[k].g);set('t-dh',MONTH.day[k].h);
    set('t-hl',d.hl);html('t-acct',d.acct);
    set('t-hv',grp(MONTH.free));
    html('t-hs',d.hs[0]+n(money(MONTH.total))+d.hs[1]);
    set('t-s1',d.s[0]);set('t-s2',d.s[1]);set('t-s3',d.s[2]);
    set('t-ax0','0');set('t-ax1',money(MONTH.total));
    set('t-qst',d.qst);set('t-act',d.act);

    drawBar();

    el('send').innerHTML=MONTH.order.map(function(key){
      var p=MONTH.people[key];
      return '<button class="r" data-r="'+key+'"><span class="mono">'+p.ini[k]+'</span><span class="n">'+p[k]+'</span></button>';
    }).join('');
    /* the key travels, the person's data does not: no name or number in the URL */
    [].slice.call(el('send').querySelectorAll('.r')).forEach(function(b){
      b.onclick=function(){SHELL.openTransfer(b.dataset.r)};
    });

    el('nav').innerHTML=d.tabs.map(function(t,i){
      return '<button class="tab'+(i===0?' on':'')+'"><span class="rule"></span>'+t+'</button>';
    }).join('');

    cur=null;
    html('note',d.note);
    commitments();
    bindSegs();
  }

  function bindSegs(){
    var segs=[].slice.call(root.querySelectorAll('.seg'));
    segs.forEach(function(s){
      /* assigned, not added: a re-render replaces the handler it had rather
         than stacking another one on top */
      s.onclick=function(){
        var k=s.dataset.k;
        if(cur===k){
          cur=null;html('note',L[lang].note);
          segs.forEach(function(x){x.classList.remove('dim')});
          commitments();
          return;
        }
        cur=k;html('note',L[lang].drill[k]);
        segs.forEach(function(x){x.classList.toggle('dim',x!==s)});
        if(k==='spent'){spentHistory()}else{commitments()}
      };
    });
  }

  SHELL.register('month',{
    root:root,
    /* the month has one state, so entering it is simply drawing it in the
       language the shell is holding */
    enter:function(){render(SHELL.lang())},
    /* nothing of the month's runs while it is away */
    leave:function(){}
  });

})();
