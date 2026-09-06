/* The month's money — one source for both screens.

   The accounting period is the Gregorian month. The Hijri date rides along as
   a second reading of the same day, never as a second period.

   total is the opening balance plus what actually came in during the month.
   It is not the current account balance: Promised still sits in the account
   but is spoken for, and Spent has already left it.

   The bar on both screens divides exactly this total. Its axis is money and
   nothing else — a width is an amount, never an elapsed day. Dates live in the
   header and in the commitments list, where they are read as dates. */

var MONTH=(function(){
  var opening=1500,            /* carried over from the previous month */
      inflow=7500;             /* received during September */

  /* Amounts live here once. The labels that name them stay in each screen's
     dictionary and pair up by index. */
  var commitments=[850,620,480,250],
      spends=[250,180,145,320,410,95];

  function sum(a){return a.reduce(function(x,y){return x+y},0)}

  var total=opening+inflow,spent=sum(spends),promised=sum(commitments);

  return {
    opening:opening,inflow:inflow,
    total:total,spent:spent,promised:promised,
    free:total-spent-promised,
    commitments:commitments,spends:spends,
    limit:2500,                /* sarie: quick transfer without an added beneficiary */
    lastAmount:300,
    quick:[100,300,500],
    account:'•••• 7742',
    /* one day in one place, so the two screens cannot drift apart on the date */
    day:{ar:{g:'4 سبتمبر 2026',h:'22 ربيع الأول 1448 هـ'},
         en:{g:'4 September 2026',h:'22 Rabi I 1448 AH'}},
    order:['abdullah','noura','faisal'],
    people:{
      abdullah:{ar:'عبدالله',en:'Abdullah',ini:{ar:'ع',en:'A'},tel:'+966 55 214 3387',g:'m'},
      noura:{ar:'نورة',en:'Noura',ini:{ar:'ن',en:'N'},tel:'+966 50 883 1204',g:'f'},
      faisal:{ar:'فيصل',en:'Faisal',ini:{ar:'ف',en:'F'},tel:'+966 54 671 9350',g:'m'}
    }
  };
})();

/* share of the month's money, as a percentage of the bar's width */
function pct(v){return v/MONTH.total*100}
/* 1400 -> "1 400", joined by a non-breaking space so the sum never wraps */
function grp(n){return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,' ')}
/* the currency is bound to its number, so a wrapping note can never leave
   "SAR" stranded on the next line */
function money(n){return grp(n)+' SAR'}

/* Segment geometry, shared so both screens draw the same money the same way.

   A segment carries no inline padding and no minimum width of its own — the
   inline padding sits on its labels instead — so its box is exactly its share
   of the total. Two things follow: 0 SAR renders as 0 px rather than as a
   strip of background, and the seam lands on the real edge instead of near it,
   because nothing can push a segment wider than its money and make the row
   overflow.

   Labels are the only thing that yields to narrowness, and hiding one never
   changes the width it was measured against.

   What a label needs is measured, not assumed. The two screens set this type at
   different sizes and the two scripts run to different lengths, so one px
   threshold would silence one language while letting the other spill over its
   neighbour — which is what the bar used to do. */

/* Measured on a detached copy sized to its own content, so asking costs the
   bar nothing. Cached against the text, since that is what changes as sums
   are typed. */
function segNeed(el){
  var key=el.textContent;
  if(el._needKey===key)return el._need;
  var probe=el.cloneNode(true);
  probe.classList.remove('mute','amt-only');
  probe.removeAttribute('id');
  [].forEach.call(probe.querySelectorAll('[id]'),function(e){e.removeAttribute('id')});
  probe.style.cssText='position:absolute;left:-9999px;top:0;width:max-content;visibility:hidden;transition:none';
  el.parentNode.appendChild(probe);
  var full=probe.getBoundingClientRect().width;
  probe.classList.add('amt-only');
  var amt=probe.getBoundingClientRect().width;
  probe.remove();
  el._needKey=key;
  return (el._need={full:full,amt:amt});
}

/* amtOnly=false for a slice that speaks through a callout below the bar
   instead of showing a cramped sum inside itself */
function segApply(el,px,amtOnly){
  var need=segNeed(el),
      f=px>=need.full?'full':(amtOnly&&px>=need.amt)?'amt-only':'mute';
  el.classList.toggle('mute',f==='mute');
  el.classList.toggle('amt-only',f==='amt-only');
  return f;
}
