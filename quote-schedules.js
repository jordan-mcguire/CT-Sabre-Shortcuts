(function(){
var EX=document.getElementById('_qs');if(EX){EX.remove();return;}
if(!window._qsCart)window._qsCart=[];
if(!window._qsSeq)window._qsSeq=1;
if(!window._qsCols)window._qsCols={duration:true,aircraft:false,price:false,notes:false,optionLabels:false};

var MO={JAN:'Jan',FEB:'Feb',MAR:'Mar',APR:'Apr',MAY:'May',JUN:'Jun',JUL:'Jul',AUG:'Aug',SEP:'Sep',OCT:'Oct',NOV:'Nov',DEC:'Dec'};
var DOW={MON:'Mon',TUE:'Tue',WED:'Wed',THU:'Thu',FRI:'Fri',SAT:'Sat',SUN:'Sun'};
function esc(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function extractDate(h){
var c=h.querySelector('.click-header');var t=c?c.textContent.trim():'';
var m=t.match(/^(\d{2})([A-Z]{3})\s+([A-Z]{3})/);
if(!m)return{full:'',short:''};
var dow=DOW[m[3]]||m[3];
return{full:dow+' '+m[1]+' '+(MO[m[2]]||m[2]),short:m[1]+(MO[m[2]]||m[2]).toUpperCase()};
}

function scanScreen(){
var itins=[];
document.querySelectorAll('.air-availability-container').forEach(function(c){
var list=c.querySelector('.expansion-row-list');if(!list)return;
var curDate={full:'',short:''},cur=null;
Array.prototype.forEach.call(list.children,function(ch){
if(ch.classList&&ch.classList.contains('air-availability-expert-header')){curDate=extractDate(ch);return;}
if(!ch.classList||!ch.classList.contains('air-availability-row'))return;
var rh=ch.querySelector('.air-availability-row-heading');if(!rh)return;
var cs=rh.querySelectorAll('.flex-line-item-4 span');
var fromCode=cs[0]?cs[0].textContent.trim():'';
var toCode=cs[1]?cs[1].textContent.trim():'';
var isCont=!fromCode;
var rawA=((rh.querySelector('.flex-line-item-1')||{}).textContent||'').trim();
var lineM=rawA.match(/^(\d+)\s+(.*)$/);
var lineNo=lineM?lineM[1]:'';
var pr=(lineM?lineM[2]:rawA).split('/');
var leg={
lineNo:lineNo,
airline:pr[0]||'',
operatedBy:(pr[1]&&pr[1]!=='**')?pr[1]:'',
flightNo:((rh.querySelector('.flex-line-item-2')||{}).textContent||'').trim(),
fromCode:fromCode,toCode:toCode,
depTime:((rh.querySelector('.flex-line-item-5')||{}).textContent||'').trim(),
arrTime:((rh.querySelector('.flex-line-item-6')||{}).textContent||'').trim(),
dayOffset:((rh.querySelector('.flex-line-item-7')||{}).textContent||'').trim(),
aircraft:((rh.querySelector('.flex-line-item-8 .aircraft-codes')||{}).textContent||'').trim(),
duration:((rh.querySelector('.flex-line-item-9')||{}).textContent||'').trim(),
warning:((rh.querySelector('.additional-message-text')||{}).textContent||'').trim()
};
if(isCont&&cur){cur.legs.push(leg);}
else{cur={date:curDate.full,dateShort:curDate.short,legs:[leg],rawText:rh.getAttribute('data-clipboard-text')||'',price:'',notes:''};itins.push(cur);}
});
});
itins.forEach(function(it){
var re=/([A-Z]{3})\s*-\s*([A-Z][A-Z ]*?[A-Z])\s{2,}/g,m,cities=[];
while((m=re.exec(it.rawText))){cities.push(m[1]+' - '+m[2].replace(/\s+/g,' ').trim());}
it.legs.forEach(function(leg,i){leg.fromCity=cities[i*2]||leg.fromCode;leg.toCity=cities[i*2+1]||leg.toCode;});
});
return itins;
}

var SCANNED=[],SEL={};
var VIEW=window._qsCart.length?'cart':'scan';
var MIN=false;

var P=document.createElement('div');P.id='_qs';
if(!document.getElementById('_qss'))document.head.insertAdjacentHTML('beforeend','<style id="_qss">.qsrow{display:flex;align-items:center;gap:6px;padding:4px 10px;border-bottom:1px solid #f0f0f0;font-size:11px;font-family:Consolas,Menlo,monospace}.qsrow:hover{background:#f7fcfd}.qsrow.grp-first{border-top:2px solid #e5e7eb;margin-top:2px}.qsn{color:#9ca3af;width:20px;flex-shrink:0}.qsd{font-weight:bold;color:#00434e;width:56px;flex-shrink:0}.qsf{color:#00434e;font-weight:bold;width:70px;flex-shrink:0}.qst{width:150px;flex-shrink:0;white-space:nowrap}.qsc{color:#9ca3af;font-size:9px;width:70px;flex-shrink:0}.qschip{background:#fef3c7;color:#92400e;font-size:9px;padding:0 3px;border-radius:3px;margin-left:3px}.qswarn{color:#cc1a45;font-size:9px;font-style:italic;margin-left:6px}.qsbtn{background:#ff2e5f;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold}.qsbtn2{background:#6b7280;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px}.qstab{padding:5px 10px;font-size:11px;cursor:pointer;color:#6b7280;border-bottom:2px solid transparent}.qstab.active{color:#00434e;font-weight:bold;border-bottom:2px solid #ff2e5f}.qsic{border:1px solid #d1d5db;background:#fff;border-radius:4px;cursor:pointer;font-size:10px;padding:1px 5px;color:#374151}.qsic:hover{background:#f0f9fa}.qsicdel{border:1px solid #f0c9d4;background:#fff;border-radius:4px;cursor:pointer;font-size:10px;padding:1px 5px;color:#ff2e5f}.qsicdel:hover{background:#fff5f7}</style>');
P.style.cssText='position:fixed;top:16px;right:16px;width:640px;max-height:460px;background:#fff;border:1px solid #d1d5db;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.18);z-index:999999;font-family:Arial,sans-serif;font-size:13px;display:flex;flex-direction:column;overflow:hidden;';

function legRow(leg,idx,isFirstOfGroup,extraLabel){
var op=leg.operatedBy?(' <span style="color:#9ca3af">('+esc(leg.operatedBy)+')</span>'):'';
var day=leg.dayOffset?('<span class="qschip">'+esc(leg.dayOffset)+'d</span>'):'';
var w=leg.warning?('<span class="qswarn">'+esc(leg.warning)+'</span>'):'';
return '<div class="qsrow'+(isFirstOfGroup?' grp-first':'')+'">'
+(extraLabel!==undefined?extraLabel:'')
+'<span class="qsf">'+esc(leg.airline)+' '+esc(leg.flightNo)+'</span>'
+'<span class="qst">'+esc(leg.depTime)+' '+esc(leg.fromCode)+' &rarr; '+esc(leg.arrTime)+' '+esc(leg.toCode)+day+'</span>'
+op+w
+'</div>';
}

function colToggle(key,label){
return '<label style="font-size:11px;color:#6b7280"><input type="checkbox" '+(window._qsCols[key]?'checked':'')+' onchange="_qsCol(\''+key+'\',this)"/> '+label+'</label>';
}

function renderScan(){
var h='<div style="overflow-y:auto;flex:1;min-height:0">';
if(!SCANNED.length){h+='<div style="padding:20px;text-align:center;color:#9ca3af;font-size:12px">Click "Scan Screen" while viewing Sabre air availability.</div>';}
else{SCANNED.forEach(function(it,i){
var sel=SEL[i];
it.legs.forEach(function(leg,li){
var lbl='<input type="checkbox" '+(sel?'checked':'')+' onchange="_qsSel('+i+',this)" style="flex-shrink:0"/>'
+'<span class="qsn">'+(i+1)+'</span>'
+'<span class="qsd">'+(li===0?esc(it.dateShort):'')+'</span>';
h+=legRow(leg,i,li===0,lbl)
.replace('<div class="qsrow','<div style="background:'+(sel?'#e6f4f7':'#fff')+'" class="qsrow'+(li===0?' grp-first':''));
});
});}
h+='</div>';return h;
}

function renderCart(){
var h='<div style="padding:6px 10px;background:#f0f9fa;border-bottom:1px solid #e5e7eb;display:flex;gap:10px;align-items:center;flex-wrap:wrap;flex-shrink:0">'
+colToggle('duration','Duration')+colToggle('aircraft','Aircraft')+colToggle('price','Price')+colToggle('notes','Notes')+colToggle('optionLabels','Option numbers')
+'<button class="qsbtn2" style="margin-left:auto" onclick="_qsClearAll()">Clear All</button></div>'
+'<div style="overflow-y:auto;flex:1;min-height:0">';
if(!window._qsCart.length){h+='<div style="padding:20px;text-align:center;color:#9ca3af;font-size:12px">Cart is empty. Scan a screen and add options.</div>';}
else{window._qsCart.forEach(function(it,i){
it.legs.forEach(function(leg,li){
var lbl='<span class="qsn">'+(i+1)+'</span>'
+'<span class="qsd">'+(li===0?esc(it.dateShort):'')+'</span>';
var rowHtml=legRow(leg,i,li===0,lbl);
if(li===0){
var ctrls='<div style="margin-left:auto;display:flex;gap:4px">'
+(i>0?'<button class="qsic" onclick="_qsMove('+i+',-1)">&uarr;</button>':'')
+(i<window._qsCart.length-1?'<button class="qsic" onclick="_qsMove('+i+',1)">&darr;</button>':'')
+'<button class="qsicdel" onclick="_qsDel('+i+')">Remove</button></div>';
rowHtml=rowHtml.replace('</div>',ctrls+'</div>');
}
h+=rowHtml;
});
if(window._qsCols.price||window._qsCols.notes){
h+='<div class="qsrow" style="gap:8px">'
+'<span class="qsn"></span><span class="qsd"></span>'
+(window._qsCols.price?'<input placeholder="Price" value="'+esc(it.price)+'" style="font-size:10px;padding:3px 6px;border:1px solid #d1d5db;border-radius:4px;width:80px" onchange="_qsPrice('+i+',this.value)"/>':'')
+(window._qsCols.notes?'<input placeholder="Notes" value="'+esc(it.notes)+'" style="font-size:10px;padding:3px 6px;border:1px solid #d1d5db;border-radius:4px;flex:1" onchange="_qsNotes('+i+',this.value)"/>':'')
+'</div>';
}
});}
h+='</div>';return h;
}

function rn(){
var cnt=window._qsCart.length;
var scnSelCnt=Object.keys(SEL).filter(function(k){return SEL[k];}).length;
P.innerHTML=''
+'<div id="_qshdr" style="background:#00434e;color:#fff;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;cursor:move;user-select:none">'
+'<b style="font-size:13px">Quote Schedules</b>'
+'<div style="display:flex;align-items:center;gap:8px">'
+'<span onclick="_qsmin()" style="cursor:pointer;font-size:14px;color:#9ca3af" title="Minimise">&#8722;</span>'
+'<span onclick="document.getElementById(\'_qs\').remove()" style="cursor:pointer;font-size:20px;color:#9ca3af">&times;</span></div></div>'
+(MIN?'':''
+'<div style="display:flex;border-bottom:1px solid #e5e7eb;flex-shrink:0">'
+'<div class="qstab'+(VIEW==='scan'?' active':'')+'" onclick="_qstab(\'scan\')">Scan Screen</div>'
+'<div class="qstab'+(VIEW==='cart'?' active':'')+'" onclick="_qstab(\'cart\')">Cart ('+cnt+')</div></div>'
+(VIEW==='scan'?renderScan():renderCart())
+'<div id="_qssbar" style="padding:6px 10px;background:#f8fafb;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;flex-shrink:0;display:flex;align-items:center;justify-content:space-between">'
+(VIEW==='scan'?'<button class="qsbtn2" onclick="_qsScan()">Scan Screen</button>':'<span id="_qsst">Reorder, edit, then Copy.</span>')
+(VIEW==='scan'?'<button class="qsbtn" onclick="_qsAddSel()">Add Selected ('+scnSelCnt+')</button>':'<button class="qsbtn" onclick="_qsCopy()">Copy ('+cnt+')</button>')
+'</div>');
P.style.maxHeight=MIN?'none':'460px';
}

window._qstab=function(v){VIEW=v;rn();};
window._qsmin=function(){MIN=!MIN;rn();};
window._qsScan=function(){SCANNED=scanScreen();SEL={};rn();};
window._qsSel=function(i,cb){SEL[i]=cb.checked;rn();};
window._qsAddSel=function(){SCANNED.forEach(function(it,i){if(SEL[i]){it.id=window._qsSeq++;window._qsCart.push(it);}});SEL={};VIEW='cart';rn();};
window._qsMove=function(i,d){var j=i+d;if(j<0||j>=window._qsCart.length)return;var t=window._qsCart[i];window._qsCart[i]=window._qsCart[j];window._qsCart[j]=t;rn();};
window._qsDel=function(i){window._qsCart.splice(i,1);rn();};
window._qsClearAll=function(){if(!confirm('Clear entire cart?'))return;window._qsCart=[];rn();};
window._qsCol=function(k,cb){window._qsCols[k]=cb.checked;rn();};
window._qsPrice=function(i,v){window._qsCart[i].price=v;};
window._qsNotes=function(i,v){window._qsCart[i].notes=v;};

function bH(){
if(!window._qsCart.length)return'';
var cols=window._qsCols;
var w=80+90+250+(cols.duration?70:0)+(cols.price?70:0)+(cols.notes?110:0);
var h='<div style="width:'+w+'px;font-family:Arial,sans-serif">'
+'<p style="font-size:15px;font-weight:bold;color:#00434e;margin:0 0 12px">Flight Schedule Options</p>'
+'<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:'+w+'px;table-layout:fixed;font-family:Arial,sans-serif;font-size:12px">'
+'<thead><tr style="background:#00434e;color:#fff">'
+'<th style="padding:9px 10px;text-align:left;width:80px">Date</th>'
+'<th style="padding:9px 10px;text-align:left;width:90px">Flight</th>'
+'<th style="padding:9px 10px;text-align:left;width:250px">Route</th>'
+(cols.duration?'<th style="padding:9px 10px;text-align:left;width:70px">Duration</th>':'')
+(cols.price?'<th style="padding:9px 10px;text-align:left;width:70px">Price</th>':'')
+(cols.notes?'<th style="padding:9px 10px;text-align:left;width:110px">Notes</th>':'')
+'</tr></thead><tbody>';
window._qsCart.forEach(function(it,i){
var bg=i%2?'#f0f9fa':'#fff';
var lastRowInOption=it.legs.length-1;
if(cols.optionLabels){
var colspan=3+(cols.duration?1:0)+(cols.price?1:0)+(cols.notes?1:0);
h+='<tr style="background:'+bg+'"><td colspan="'+colspan+'" style="padding:6px 10px 0;font-size:10px;font-weight:bold;color:#00434e;border-top:2px solid #d1d5db">Option '+(i+1)+'</td></tr>';
}
it.legs.forEach(function(leg,li){
var op=leg.operatedBy?(' <span style="color:#9ca3af;font-size:10px">(Op by '+esc(leg.operatedBy)+')</span>'):'';
var day=leg.dayOffset?(' <span style="background:#fef3c7;color:#92400e;font-size:9px;padding:0 3px;border-radius:3px">'+esc(leg.dayOffset)+' day</span>'):'';
var w2=leg.warning?('<br><span style="color:#cc1a45;font-size:9px;font-style:italic">'+esc(leg.warning)+'</span>'):'';
var bottomBorder=(li===lastRowInOption)?'border-bottom:2px solid #d1d5db':'';
h+='<tr style="background:'+bg+'">'
+'<td style="padding:10px 10px;font-size:11px;font-weight:bold;line-height:1.6;word-wrap:break-word;'+bottomBorder+'">'+(li===0?esc(it.date):'')+'</td>'
+'<td style="padding:10px 10px;color:#00434e;font-weight:700;font-size:11px;line-height:1.6;word-wrap:break-word;'+bottomBorder+'">'+esc(leg.airline)+' '+esc(leg.flightNo)+op+'</td>'
+'<td style="padding:10px 10px;font-size:11px;line-height:1.7;word-wrap:break-word;'+bottomBorder+'">Dep <b>'+esc(leg.fromCity)+'</b>, '+esc(leg.depTime)+'<br>Arr <b>'+esc(leg.toCity)+'</b>, '+esc(leg.arrTime)+day+w2+'</td>'
+(cols.duration?('<td style="padding:10px 10px;font-size:11px;line-height:1.6;word-wrap:break-word;'+bottomBorder+'">'+esc(leg.duration)+'</td>'):'')
+(cols.price?('<td style="padding:10px 10px;color:#ff2e5f;font-weight:700;font-size:11px;line-height:1.6;word-wrap:break-word;'+bottomBorder+'">'+(li===0?esc(it.price):'')+'</td>'):'')
+(cols.notes?('<td style="padding:10px 10px;font-size:11px;line-height:1.6;word-wrap:break-word;'+bottomBorder+'">'+(li===0?esc(it.notes):'')+'</td>'):'')
+'</tr>';
});
});
h+='</tbody></table><p style="font-size:11px;color:#9ca3af;margin:10px 0 0">Subject to availability at time of booking.</p></div>';
return h;
}

window._qsCopy=async function(){
var h=bH();
if(!h){var st=document.getElementById('_qsst');if(st){st.style.color='#ff2e5f';st.innerText='Cart is empty.';}return;}
try{
await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([h],{type:'text/html'}),'text/plain':new Blob([h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')],{type:'text/plain'})})]);
var s=document.getElementById('_qsst');if(s){s.style.color='#00434e';s.innerText='Copied!';}
setTimeout(function(){var x=document.getElementById('_qsst');if(x){x.style.color='#9ca3af';x.innerText='Reorder, edit, then Copy.';}},3000);
}catch(e){
try{await navigator.clipboard.writeText(bH().replace(/<[^>]+>/g,' ').replace(/\s+/g,' '));}
catch(e2){var s2=document.getElementById('_qsst');if(s2){s2.style.color='#ff2e5f';s2.innerText='Copy failed.';}}
}
};

rn();
document.body.appendChild(P);
(function(){
var dx=0,dy=0,mx=0,my=0,dragging=false;
P.addEventListener('mousedown',function(e){
var hdr=document.getElementById('_qshdr');
if(!hdr||!hdr.contains(e.target))return;
if(e.target.tagName==='SPAN'&&e.target.hasAttribute('onclick'))return;
dragging=true;
mx=e.clientX;my=e.clientY;dx=P.offsetLeft;dy=P.offsetTop;
e.preventDefault();
});
document.addEventListener('mousemove',function(e){
if(!dragging)return;
var nx=dx+(e.clientX-mx),ny=dy+(e.clientY-my);
P.style.left=nx+'px';P.style.top=ny+'px';P.style.right='auto';
});
document.addEventListener('mouseup',function(){dragging=false;});
})();
})();
