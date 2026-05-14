(function(){
if(document.getElementById('ctHotelModal'))return;

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d){
  if(!d)return'';
  var p=d.split('-');
  var mo=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return p[2]+mo[parseInt(p[1])-1];
}
function addDays(iso,n){
  var p=iso.split('-');
  var d=new Date(parseInt(p[0]),parseInt(p[1])-1,parseInt(p[2])+parseInt(n));
  var mm=String(d.getMonth()+1).padStart(2,'0');
  var dd=String(d.getDate()).padStart(2,'0');
  return d.getFullYear()+'-'+mm+'-'+dd;
}
function diffDays(a,b){
  return Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/86400000);
}
function sendSabreCommand(cmd,cb){
  var ci=document.querySelector('input.command-line-input[name="cmdln"]');
  var sb=document.querySelector('button.send-button');
  if(!ci||!sb)return;
  ci.value=cmd;ci.focus();
  ci.dispatchEvent(new Event('input',{bubbles:true}));
  setTimeout(function(){sb.click();if(cb)setTimeout(cb,700);},120);
}

// ── Styles ────────────────────────────────────────────────────────────────────
var st=document.createElement('style');
st.id='ctHotelStyle';
st.textContent=
'#ctHotelOverlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:1000010;display:flex;align-items:center;justify-content:center;}'
+'#ctHotelModal{background:#fff;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.25);width:520px;max-width:95vw;max-height:90vh;overflow-y:auto;font-family:Aptos,Arial,sans-serif;}'
+'#ctHotelModal .hg-head{background:#00434e;color:#fff;padding:9px 14px;border-radius:10px 10px 0 0;display:flex;align-items:center;justify-content:space-between;}'
+'#ctHotelModal .hg-head-title{font-size:12px;font-weight:700;letter-spacing:.02em;display:flex;align-items:center;gap:7px;}'
+'#ctHotelModal .hg-dot{width:8px;height:8px;border-radius:50%;background:#ff2e5f;flex-shrink:0;}'
+'#ctHotelModal .hg-close{background:none;border:none;color:rgba(255,255,255,0.7);font-size:18px;cursor:pointer;line-height:1;padding:0 2px;}'
+'#ctHotelModal .hg-close:hover{color:#fff;}'
+'#ctHotelModal .hg-body{padding:10px 12px 12px;}'
+'#ctHotelModal .hg-sec{margin-bottom:8px;}'
+'#ctHotelModal .hg-sec-title{font-size:9px;font-weight:800;color:#00434e;text-transform:uppercase;letter-spacing:.07em;border-bottom:2px solid #fcd5df;padding-bottom:3px;margin-bottom:6px;}'
+'#ctHotelModal .hg-row{display:grid;gap:6px;margin-bottom:6px;}'
+'#ctHotelModal .hg-r4{grid-template-columns:1fr 1fr 1fr 1fr;}'
+'#ctHotelModal .hg-r5{grid-template-columns:2fr 1fr 2fr 1fr 2fr;}'
+'#ctHotelModal .hg-r2{grid-template-columns:1fr 1fr;}'
+'#ctHotelModal .hg-r3{grid-template-columns:1fr 1fr 1fr;}'
+'#ctHotelModal .hg-field{display:flex;flex-direction:column;gap:2px;}'
+'#ctHotelModal label{font-size:10px;color:#666;}'
+'#ctHotelModal input,#ctHotelModal select{font-family:inherit;font-size:11px;padding:4px 7px;border:1px solid #ccc;border-radius:4px;background:#fff;color:#1a1a1a;outline:none;width:100%;}'
+'#ctHotelModal input:focus,#ctHotelModal select:focus{border-color:#00434e;}'
+'#ctHotelModal .hg-ac{position:relative;}'
+'#ctHotelModal .hg-ac-list{position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #bbb;border-radius:4px;z-index:1000020;max-height:150px;overflow-y:auto;margin-top:1px;box-shadow:0 3px 10px rgba(0,0,0,.12);}'
+'#ctHotelModal .hg-ac-item{padding:5px 9px;cursor:pointer;border-bottom:.5px solid #f0f0f0;font-size:11px;}'
+'#ctHotelModal .hg-ac-item:last-child{border-bottom:none;}'
+'#ctHotelModal .hg-ac-item:hover{background:#fcd5df;}'
+'#ctHotelModal .hg-ac-name{font-weight:600;color:#1a1a1a;}'
+'#ctHotelModal .hg-ac-meta{font-size:9px;color:#888;margin-top:1px;}'
+'#ctHotelModal .hg-divider{border:none;border-top:1px solid #efefef;margin:8px 0;}'
+'#ctHotelModal .hg-preview{background:#f5f5f5;border:1px solid #e0e0e0;border-radius:4px;padding:5px 8px;font-family:Courier New,monospace;font-size:10px;color:#1a1a1a;word-break:break-all;line-height:1.55;min-height:28px;white-space:pre-wrap;margin-bottom:4px;}'
+'#ctHotelModal .hg-send-btn{width:100%;padding:8px;font-size:12px;font-weight:700;cursor:pointer;border-radius:5px;border:none;background:#ff2e5f;color:#fff;letter-spacing:.02em;transition:opacity .15s;margin-top:4px;}'
+'#ctHotelModal .hg-send-btn:hover{opacity:.85;}'
+'#ctHotelModal .hg-send-btn:disabled{background:#ccc;cursor:not-allowed;opacity:1;}'
+'#ctHotelModal .hg-send-btn.sending{background:#00434e;}'
+'#ctHotelModal .hg-warn{font-size:10px;color:#b05000;margin-top:2px;}'
+'#ctHotelModal .hg-status{font-size:10px;color:#00434e;font-weight:600;text-align:center;margin-top:4px;min-height:14px;}';
document.head.appendChild(st);

// ── Build modal ───────────────────────────────────────────────────────────────
var overlay=document.createElement('div');
overlay.id='ctHotelOverlay';
overlay.innerHTML=
'<div id="ctHotelModal">'
+'<div class="hg-head">'
+'<div class="hg-head-title"><div class="hg-dot"></div>TNW passive hotel generator</div>'
+'<button class="hg-close" id="ctHotelClose">&times;</button>'
+'</div>'
+'<div class="hg-body">'

// Hotel
+'<div class="hg-sec">'
+'<div class="hg-sec-title">Hotel</div>'
+'<div class="hg-field" style="margin-bottom:6px"><label>Hotel name</label>'
+'<div class="hg-ac"><input type="text" id="hgHotel" placeholder="Start typing..." autocomplete="off"><div class="hg-ac-list" id="hgHotelAC" style="display:none"></div></div></div>'
+'<div class="hg-row hg-r4">'
+'<div class="hg-field"><label>City</label><input type="text" id="hgCity" placeholder="HBA"></div>'
+'<div class="hg-field"><label>Provider</label><input type="text" id="hgProvider" placeholder="SALHBA"></div>'
+'<div class="hg-field"><label>CRS</label><select id="hgCRS"><option value="HOTELDIR">HOTELDIR</option><option value="EAN">EAN</option><option value="THN">THN</option><option value="BOO">BOO</option><option value="AIRNBN">AIRNBN</option></select></div>'
+'<div class="hg-field"><label>Rooms</label><input type="number" id="hgRooms" value="1" min="1" max="9"></div>'
+'</div>'
+'</div>'

// Stay & rate
+'<div class="hg-sec">'
+'<div class="hg-sec-title">Stay &amp; rate</div>'
+'<div class="hg-row hg-r5" style="margin-bottom:6px">'
+'<div class="hg-field"><label>Check-in</label><input type="date" id="hgCheckin"></div>'
+'<div class="hg-field"><label>Nights</label><input type="number" id="hgNights" min="1" placeholder="0"></div>'
+'<div class="hg-field"><label>Check-out</label><input type="date" id="hgCheckout"></div>'
+'<div class="hg-field"><label>Rate/room</label><input type="number" id="hgRate" placeholder="150.00" step="0.01" min="0"></div>'
+'<div class="hg-field"><label>Room type</label><input type="text" id="hgRoomType" value="STD"></div>'
+'</div>'
+'<div class="hg-field" style="width:110px"><label>Currency</label><select id="hgCurrency"><option value="AUD">AUD</option><option value="NZD">NZD</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select></div>'
+'</div>'

// Booker
+'<div class="hg-sec">'
+'<div class="hg-sec-title">Booker &amp; guarantee</div>'
+'<div class="hg-row hg-r2" style="margin-bottom:6px">'
+'<div class="hg-field"><label>Travel booker</label>'
+'<div class="hg-ac"><input type="text" id="hgBooker" placeholder="Start typing..." autocomplete="off"><div class="hg-ac-list" id="hgBookerAC" style="display:none"></div></div>'
+'<div class="hg-warn" id="hgBookerWarn" style="display:none"></div></div>'
+'<div class="hg-field"><label>Chargeback inclusions</label><select id="hgSI"><option value="">-- Select booker first --</option></select></div>'
+'</div>'
+'<div class="hg-field"><label>Guarantee card <span style="font-size:9px;color:#aaa">(auto-filled — editable)</span></label><input type="text" id="hgCard" placeholder="Auto-filled from booker"></div>'
+'</div>'

// Confirmation
+'<div class="hg-sec">'
+'<div class="hg-sec-title">Confirmation</div>'
+'<div class="hg-field"><label>Confirmation number</label><input type="text" id="hgCF" placeholder="Hotel confirmation number"></div>'
+'</div>'

+'<div class="hg-divider"></div>'

// Preview & send
+'<div class="hg-sec-title">Commands to send</div>'
+'<div class="hg-preview" id="hgPrev1">Complete fields above to preview.</div>'
+'<div class="hg-preview" id="hgPrev2"></div>'
+'<button class="hg-send-btn" id="hgSendBtn" disabled>Send to Sabre</button>'
+'<div class="hg-status" id="hgStatus"></div>'

+'</div>'
+'</div>';

document.body.appendChild(overlay);

// ── Close ─────────────────────────────────────────────────────────────────────
document.getElementById('ctHotelClose').addEventListener('click',closeModal);
overlay.addEventListener('click',function(e){if(e.target===overlay)closeModal();});
function closeModal(){
  var o=document.getElementById('ctHotelOverlay');if(o)o.remove();
  var s=document.getElementById('ctHotelStyle');if(s)s.remove();
}

// ── Autocomplete: hotel ───────────────────────────────────────────────────────
var hgHotel=document.getElementById('hgHotel');
var hgHotelAC=document.getElementById('hgHotelAC');
hgHotel.addEventListener('input',function(){
  var val=this.value.toLowerCase();
  hgHotelAC.innerHTML='';
  if(val.length<2){hgHotelAC.style.display='none';return;}
  var m=CT_HOTELS.filter(function(h){return h.name.toLowerCase().includes(val);});
  if(!m.length){hgHotelAC.style.display='none';return;}
  m.forEach(function(h){
    var d=document.createElement('div');d.className='hg-ac-item';
    d.innerHTML='<div class="hg-ac-name">'+h.name+'</div><div class="hg-ac-meta">'+h.city+' &middot; '+h.provider+'</div>';
    d.addEventListener('mousedown',function(){
      hgHotel.value=h.name;
      document.getElementById('hgCity').value=h.city;
      document.getElementById('hgProvider').value=h.provider;
      hgHotelAC.style.display='none';
      buildPreview();
    });
    hgHotelAC.appendChild(d);
  });
  hgHotelAC.style.display='block';
});
hgHotel.addEventListener('blur',function(){setTimeout(function(){hgHotelAC.style.display='none';},150);});

// ── Autocomplete: booker ──────────────────────────────────────────────────────
var hgBooker=document.getElementById('hgBooker');
var hgBookerAC=document.getElementById('hgBookerAC');
var selectedBooker=null;
hgBooker.addEventListener('input',function(){
  var val=this.value.toLowerCase();
  hgBookerAC.innerHTML='';
  if(val.length<2){hgBookerAC.style.display='none';return;}
  var m=CT_BOOKERS.filter(function(b){return b.name.toLowerCase().includes(val);});
  if(!m.length){hgBookerAC.style.display='none';return;}
  m.forEach(function(b){
    var d=document.createElement('div');d.className='hg-ac-item';
    d.innerHTML='<div class="hg-ac-name">'+b.name+'</div>';
    d.addEventListener('mousedown',function(){selectBooker(b);});
    hgBookerAC.appendChild(d);
  });
  hgBookerAC.style.display='block';
});
hgBooker.addEventListener('blur',function(){setTimeout(function(){hgBookerAC.style.display='none';},150);});

function selectBooker(b){
  selectedBooker=b;
  hgBooker.value=b.name;
  hgBookerAC.style.display='none';
  var siSel=document.getElementById('hgSI');
  var cardIn=document.getElementById('hgCard');
  var warn=document.getElementById('hgBookerWarn');
  siSel.innerHTML='';warn.style.display='none';
  var isPaying=b.name==='PAYING OWN ACCOUNT';
  if(isPaying){cardIn.value='';cardIn.placeholder='N/A — guest pays own account';}
  else{
cardIn.value=(b.card||'').replace('/EXP','EXP');
    cardIn.placeholder=b.card?'Auto-filled or enter manually':'No card on file — enter manually';
    if(!b.card){warn.textContent='No card on file for this booker';warn.style.display='block';}
  }
  if(b.si&&b.si.length>0){
    b.si.forEach(function(s){var o=document.createElement('option');o.value=s.value;o.textContent=s.label;siSel.appendChild(o);});
  }else{
    var o=document.createElement('option');o.value='';o.textContent='No SI options — add to master list';siSel.appendChild(o);
    warn.textContent=(warn.style.display==='block'?warn.textContent+' · ':'')+'No SI options configured';
    warn.style.display='block';
  }
  buildPreview();
}

// ── Date / nights sync ────────────────────────────────────────────────────────
document.getElementById('hgCheckin').addEventListener('input',function(){
  var ci=this.value;
  var n=parseInt(document.getElementById('hgNights').value);
  var co=document.getElementById('hgCheckout').value;
  if(ci&&n>0){
    document.getElementById('hgCheckout').value=addDays(ci,n);
  }else if(ci&&co&&co>ci){
    document.getElementById('hgNights').value=diffDays(ci,co);
  }
  buildPreview();
});
document.getElementById('hgNights').addEventListener('input',function(){
  var n=parseInt(this.value);
  var ci=document.getElementById('hgCheckin').value;
  if(ci&&n>0){
    document.getElementById('hgCheckout').value=addDays(ci,n);
  }
  buildPreview();
});
document.getElementById('hgCheckout').addEventListener('input',function(){
  var co=this.value;
  var ci=document.getElementById('hgCheckin').value;
  if(ci&&co&&co>ci){
    var d=diffDays(ci,co);
    if(d>0)document.getElementById('hgNights').value=d;
  }
  buildPreview();
});

// ── Build preview ─────────────────────────────────────────────────────────────
['hgCity','hgProvider','hgCRS','hgRooms','hgRate','hgRoomType','hgCurrency','hgSI','hgCard','hgCF'].forEach(function(id){
  var el=document.getElementById(id);
  if(el)el.addEventListener('input',buildPreview);
  if(el)el.addEventListener('change',buildPreview);
});
['hgCity','hgProvider','hgRoomType','hgCF'].forEach(function(id){
  var el=document.getElementById(id);
  if(el)el.addEventListener('input',function(){this.value=this.value.toUpperCase();});
});
  document.getElementById('hgRate').addEventListener('blur',function(){
  if(this.value&&parseFloat(this.value)>0){
    this.value=parseFloat(this.value).toFixed(2);
  }
});

function buildPreview(){
  var rooms=parseInt(document.getElementById('hgRooms').value)||1;
  var city=document.getElementById('hgCity').value.toUpperCase();
  var checkin=fmtDate(document.getElementById('hgCheckin').value);
  var checkout=fmtDate(document.getElementById('hgCheckout').value);
  var hotel=document.getElementById('hgHotel').value.toUpperCase();
  var roomType=document.getElementById('hgRoomType').value.toUpperCase();
  var rate=parseFloat(document.getElementById('hgRate').value)||0;
  var currency=document.getElementById('hgCurrency').value;
  var provider=document.getElementById('hgProvider').value.toUpperCase();
  var crs=document.getElementById('hgCRS').value;
  var si=document.getElementById('hgSI').value.toUpperCase();
  var isPaying=selectedBooker&&selectedBooker.name==='PAYING OWN ACCOUNT';
  var gCard=isPaying?'':document.getElementById('hgCard').value.toUpperCase();
  var cf=document.getElementById('hgCF').value.toUpperCase();
  var totalRate=(rate*rooms).toFixed(2);

  var missing=[];
  if(!hotel)missing.push('hotel');
  if(!city)missing.push('city');
  if(!checkin)missing.push('check-in');
  if(!checkout)missing.push('check-out');
  if(!rate)missing.push('rate');
  if(!provider)missing.push('provider');
  if(!si)missing.push('SI option');
  if(!isPaying&&!gCard)missing.push('guarantee card');
  if(!cf)missing.push('confirmation number');

  var p1=document.getElementById('hgPrev1');
  var p2=document.getElementById('hgPrev2');
  var btn=document.getElementById('hgSendBtn');

  if(missing.length){
    p1.textContent='Still needed: '+missing.join(', ')+'.';
    p2.textContent='';
    btn.disabled=true;
    return;
  }

  var gPart=isPaying?'':'/G-'+gCard;
  var line1='0HHTYYGK'+rooms+city+'IN'+checkin+'-OUT'+checkout+'/'+hotel+'/'+roomType+'/'+totalRate+currency+'/W-'+provider+'/CRS-'+crs+'/SI-'+si+gPart+'/CF-'+cf;
  var line2='5L\u00A5VP-'+si+'/HTL-'+cf;
  p1.textContent=line1;
  p2.textContent=line2;
  btn.disabled=false;
  btn._line1=line1;
  btn._line2=line2;
}

// ── Send to Sabre ─────────────────────────────────────────────────────────────
document.getElementById('hgSendBtn').addEventListener('click',function(){
  var btn=this;
  var l1=btn._line1,l2=btn._line2;
  if(!l1||!l2)return;
  btn.disabled=true;btn.classList.add('sending');btn.textContent='Sending command 1...';
  var status=document.getElementById('hgStatus');
  status.textContent='';
  sendSabreCommand(l1,function(){
    btn.textContent='Sending command 2...';
    status.textContent='✓ Command 1 sent';
    sendSabreCommand(l2,function(){
      btn.textContent='Done!';
      status.textContent='✓ Both commands sent';
      setTimeout(function(){
        btn.disabled=false;btn.classList.remove('sending');
        btn.textContent='Send to Sabre';
        status.textContent='';
      },2500);
    });
  });
});

buildPreview();
})();
