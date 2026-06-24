(function(){
if(document.getElementById('ctGroupHotelOverlay'))return;

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
  if(!ci||!sb){if(cb)cb();return;}
  ci.value=cmd;ci.focus();
  ci.dispatchEvent(new Event('input',{bubbles:true}));
  setTimeout(function(){sb.click();if(cb)setTimeout(cb,700);},120);
}
function suffixLetter(i){
  return String.fromCharCode(65+i); // A, B, C...
}

// ── Styles ────────────────────────────────────────────────────────────────────
var st=document.createElement('style');
st.id='ctGroupHotelStyle';
st.textContent=
'#ctGroupHotelOverlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000010;display:flex;align-items:center;justify-content:center;}'
+'#ctGroupHotelModal{background:#fff;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.25);width:580px;max-width:95vw;max-height:90vh;overflow-y:auto;font-family:Aptos,Arial,sans-serif;}'
+'#ctGroupHotelModal .hg-head{background:#00434e;color:#fff;padding:9px 14px;border-radius:10px 10px 0 0;display:flex;align-items:center;justify-content:space-between;}'
+'#ctGroupHotelModal .hg-head-title{font-size:12px;font-weight:700;letter-spacing:.02em;display:flex;align-items:center;gap:7px;}'
+'#ctGroupHotelModal .hg-dot{width:8px;height:8px;border-radius:50%;background:#ff2e5f;flex-shrink:0;}'
+'#ctGroupHotelModal .hg-close{background:none;border:none;color:rgba(255,255,255,0.7);font-size:18px;cursor:pointer;line-height:1;padding:0 2px;}'
+'#ctGroupHotelModal .hg-close:hover{color:#fff;}'
+'#ctGroupHotelModal .hg-body{padding:10px 12px 12px;}'
+'#ctGroupHotelModal .hg-sec{margin-bottom:8px;}'
+'#ctGroupHotelModal .hg-sec-title{font-size:9px;font-weight:800;color:#00434e;text-transform:uppercase;letter-spacing:.07em;border-bottom:2px solid #fcd5df;padding-bottom:3px;margin-bottom:6px;}'
+'#ctGroupHotelModal .hg-row{display:grid;gap:6px;margin-bottom:6px;}'
+'#ctGroupHotelModal .hg-r2{grid-template-columns:1fr 1fr;}'
+'#ctGroupHotelModal .hg-r3{grid-template-columns:1fr 1fr 1fr;}'
+'#ctGroupHotelModal .hg-r4{grid-template-columns:1fr 1fr 1fr 1fr;}'
+'#ctGroupHotelModal .hg-field{display:flex;flex-direction:column;gap:2px;}'
+'#ctGroupHotelModal label{font-size:10px;color:#666;}'
+'#ctGroupHotelModal input,#ctGroupHotelModal select{font-family:inherit;font-size:11px;padding:4px 7px;border:1px solid #ccc;border-radius:4px;background:#fff;color:#1a1a1a;outline:none;width:100%;box-sizing:border-box;}'
+'#ctGroupHotelModal input:focus,#ctGroupHotelModal select:focus{border-color:#00434e;}'
+'#ctGroupHotelModal .hg-divider{border:none;border-top:1px solid #efefef;margin:8px 0;}'
+'#ctGroupHotelModal .hg-preview{background:#f5f5f5;border:1px solid #e0e0e0;border-radius:4px;padding:5px 8px;font-family:Courier New,monospace;font-size:10px;color:#1a1a1a;word-break:break-all;line-height:1.7;min-height:28px;white-space:pre-wrap;margin-bottom:4px;}'
+'#ctGroupHotelModal .hg-send-btn{width:100%;padding:8px;font-size:12px;font-weight:700;cursor:pointer;border-radius:5px;border:none;background:#ff2e5f;color:#fff;letter-spacing:.02em;transition:opacity .15s;margin-top:4px;}'
+'#ctGroupHotelModal .hg-send-btn:hover{opacity:.85;}'
+'#ctGroupHotelModal .hg-send-btn:disabled{background:#ccc;cursor:not-allowed;opacity:1;}'
+'#ctGroupHotelModal .hg-send-btn.sending{background:#00434e;}'
+'#ctGroupHotelModal .hg-status{font-size:10px;color:#00434e;font-weight:600;text-align:center;margin-top:4px;min-height:14px;}'
// Segment table
+'#ctGroupHotelModal .seg-table{width:100%;border-collapse:collapse;margin-bottom:6px;}'
+'#ctGroupHotelModal .seg-table th{font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.04em;padding:3px 5px;text-align:left;border-bottom:1px solid #e0e0e0;}'
+'#ctGroupHotelModal .seg-table td{padding:3px 4px;vertical-align:middle;}'
+'#ctGroupHotelModal .seg-table input{font-size:10.5px;padding:3px 5px;}'
+'#ctGroupHotelModal .seg-del{background:none;border:none;color:#ccc;font-size:14px;cursor:pointer;padding:0 4px;line-height:1;}'
+'#ctGroupHotelModal .seg-del:hover{color:#ff2e5f;}'
+'#ctGroupHotelModal .hg-add-btn{background:none;border:1px dashed #00434e;color:#00434e;border-radius:4px;padding:4px 10px;font-size:10px;font-weight:700;cursor:pointer;width:100%;margin-bottom:6px;font-family:Aptos,Arial,sans-serif;}'
+'#ctGroupHotelModal .hg-add-btn:hover{background:#f0f9f8;}'
+'#ctGroupHotelModal .seg-suffix{font-size:9px;color:#888;font-family:Courier New,monospace;font-weight:700;min-width:14px;text-align:center;}'
+'#ctGroupHotelModal .seg-nights-display{font-size:10px;color:#888;text-align:center;min-width:28px;}'
+'#ctGroupHotelModal .seg-total-display{font-size:10px;color:#00434e;font-weight:700;text-align:right;min-width:52px;font-family:Courier New,monospace;}'
;
document.head.appendChild(st);

// ── Segment state ─────────────────────────────────────────────────────────────
var segments=[
  {rooms:'',checkin:'',checkout:'',nights:'',rate:''}
];

// ── Build modal ───────────────────────────────────────────────────────────────
var overlay=document.createElement('div');
overlay.id='ctGroupHotelOverlay';
overlay.innerHTML=
'<div id="ctGroupHotelModal">'
+'<div class="hg-head">'
+'<div class="hg-head-title"><div class="hg-dot"></div>Group passive hotel generator</div>'
+'<button class="hg-close" id="ctGHClose">&times;</button>'
+'</div>'
+'<div class="hg-body">'

// Hotel details
+'<div class="hg-sec">'
+'<div class="hg-sec-title">Hotel details</div>'
+'<div class="hg-row hg-r2" style="margin-bottom:6px">'
+'<div class="hg-field"><label>Hotel name</label><input type="text" id="ghHotel" placeholder="CROWN PROMENADE MELBOURNE"></div>'
+'<div class="hg-field"><label>City code</label><input type="text" id="ghCity" placeholder="MEL" style="text-transform:uppercase"></div>'
+'</div>'
+'<div class="hg-row hg-r4">'
+'<div class="hg-field"><label>Provider</label><input type="text" id="ghProvider" placeholder="NTMEL9" style="text-transform:uppercase"></div>'
+'<div class="hg-field"><label>CRS</label><select id="ghCRS"><option value="HOTELDIR">HOTELDIR</option><option value="EAN">EAN</option><option value="THN">THN</option><option value="BOO">BOO</option><option value="AIRNBN">AIRNBN</option></select></div>'
+'<div class="hg-field"><label>Room type</label><input type="text" id="ghRoomType" value="STD" style="text-transform:uppercase"></div>'
+'<div class="hg-field"><label>Currency</label><select id="ghCurrency"><option value="AUD">AUD</option><option value="NZD">NZD</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select></div>'
+'</div>'
+'</div>'

// Guarantee & SI
+'<div class="hg-sec">'
+'<div class="hg-sec-title">Guarantee &amp; SI</div>'
+'<div class="hg-row hg-r2">'
+'<div class="hg-field"><label>Guarantee (G-)</label><input type="text" id="ghGuarantee" placeholder="Leave blank if not required"></div>'
+'<div class="hg-field"><label>SI</label><input type="text" id="ghSI" placeholder="Voucher Policy i.e. All Charges"></div>'
+'</div>'
+'</div>'

// Confirmation
+'<div class="hg-sec">'
+'<div class="hg-sec-title">Confirmation</div>'
+'<div class="hg-row hg-r2">'
+'<div class="hg-field"><label>Confirmation number</label><input type="text" id="ghCF" placeholder="00174456" style="text-transform:uppercase"></div>'
+'<div class="hg-field" style="justify-content:flex-end;padding-top:14px"><label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:10px;color:#666"><input type="checkbox" id="ghSuffixCheck" style="width:auto;margin:0"> Auto A/B/C suffix on CF (auto-applied for multiple segments)</label></div>'
+'</div>'
+'</div>'

// Segments
+'<div class="hg-sec">'
+'<div class="hg-sec-title">Room segments</div>'
+'<table class="seg-table">'
+'<thead><tr>'
+'<th style="width:16px"></th>'
+'<th>Rooms</th>'
+'<th>Check-in</th>'
+'<th>Nights</th>'
+'<th>Check-out</th>'
+'<th>Rate/room/night</th>'
+'<th>Total</th>'
+'<th></th>'
+'</tr></thead>'
+'<tbody id="ghSegBody"></tbody>'
+'</table>'
+'<button class="hg-add-btn" id="ghAddSeg">+ Add segment</button>'
+'<div id="ghGrandTotal" style="text-align:right;font-size:10px;color:#00434e;font-weight:700;font-family:Courier New,monospace;padding:2px 4px;min-height:16px;"></div>'
+'</div>'

+'<div class="hg-divider"></div>'

// Preview & send
+'<div class="hg-sec-title">Commands to send</div>'
+'<div class="hg-preview" id="ghPreview">Complete fields above to preview.</div>'
+'<button class="hg-send-btn" id="ghSendBtn" disabled>Send to Sabre</button>'
+'<div class="hg-status" id="ghStatus"></div>'

+'</div>'
+'</div>';

document.body.appendChild(overlay);

// ── Close ─────────────────────────────────────────────────────────────────────
document.getElementById('ctGHClose').addEventListener('click',closeModal);
overlay.addEventListener('click',function(e){if(e.target===overlay)closeModal();});
function closeModal(){
  var o=document.getElementById('ctGroupHotelOverlay');if(o)o.remove();
  var s=document.getElementById('ctGroupHotelStyle');if(s)s.remove();
}

function updateGrandTotal(){
  var el=document.getElementById('ghGrandTotal');
  if(!el)return;
  var grand=0;var valid=true;
  segments.forEach(function(seg){
    var nights=seg.checkin&&seg.checkout?diffDays(seg.checkin,seg.checkout):0;
    if(nights>0&&parseFloat(seg.rate)>0&&parseInt(seg.rooms)>0){
      grand+=nights*parseFloat(seg.rate)*parseInt(seg.rooms);
    }else{valid=false;}
  });
  var currency=document.getElementById('ghCurrency')?document.getElementById('ghCurrency').value:'';
  el.textContent=valid&&grand>0?'Indicative group total: '+grand.toFixed(2)+' '+currency:'';
}

// ── Targeted row total update (avoids full re-render) ────────────────────────
function updateRowTotal(i){
  var seg=segments[i];
  var tbody=document.getElementById('ghSegBody');
  if(!tbody)return;
  var row=tbody.rows[i];
  if(!row)return;
  var totalCell=row.querySelector('.seg-total-display');
  if(!totalCell)return;
  var nights=seg.checkin&&seg.checkout?diffDays(seg.checkin,seg.checkout):0;
  var total='';
  if(nights>0&&parseFloat(seg.rate)>0&&parseInt(seg.rooms)>0){
    total=(nights*parseFloat(seg.rate)*parseInt(seg.rooms)).toFixed(2);
  }
  totalCell.textContent=total||'--';
  updateGrandTotal();
}

// ── Segment rendering ─────────────────────────────────────────────────────────
function renderSegments(){
  var tbody=document.getElementById('ghSegBody');
  tbody.innerHTML='';
  var multi=segments.length>1;
  segments.forEach(function(seg,i){
    var suffix=multi?suffixLetter(i):'';
    var nights=seg.checkin&&seg.checkout?diffDays(seg.checkin,seg.checkout):'';
    var total='';
    if(nights>0&&parseFloat(seg.rate)>0&&parseInt(seg.rooms)>0){
      total=(nights*parseFloat(seg.rate)*parseInt(seg.rooms)).toFixed(2);
    }
    var tr=document.createElement('tr');
    tr.innerHTML=
      '<td class="seg-suffix">'+suffix+'</td>'
      +'<td><input type="number" class="seg-rooms" data-i="'+i+'" value="'+seg.rooms+'" min="1" placeholder="1" style="width:48px"></td>'
      +'<td><input type="date" class="seg-checkin" data-i="'+i+'" value="'+seg.checkin+'"></td>'
      +'<td><input type="number" class="seg-nights" data-i="'+i+'" value="'+(nights||seg.nights||'')+'" min="1" placeholder="0" style="width:40px"></td>'
      +'<td><input type="date" class="seg-checkout" data-i="'+i+'" value="'+seg.checkout+'"></td>'
      +'<td><input type="number" class="seg-rate" data-i="'+i+'" value="'+seg.rate+'" min="0" step="0.01" placeholder="339.00"></td>'
      +'<td class="seg-total-display">'+(total?total:'--')+'</td>'
      +'<td><button class="seg-del" data-i="'+i+'" title="Remove">&times;</button></td>';
    tbody.appendChild(tr);
  });

  // Attach listeners
  tbody.querySelectorAll('.seg-rooms,.seg-rate').forEach(function(el){
    el.addEventListener('input',function(){
      var i=parseInt(this.dataset.i);
      segments[i][this.classList.contains('seg-rooms')?'rooms':'rate']=this.value;
      updateRowTotal(i);
      buildPreview();
    });
  });
  tbody.querySelectorAll('.seg-checkin').forEach(function(el){
    el.addEventListener('change',function(){
      var i=parseInt(this.dataset.i);
      segments[i].checkin=this.value;
      var n=parseInt(segments[i].nights)||0;
      if(n>0){
        segments[i].checkout=addDays(this.value,n);
        var coEl=tbody.querySelector('.seg-checkout[data-i="'+i+'"]');
        if(coEl)coEl.value=segments[i].checkout;
      }else if(segments[i].checkout&&segments[i].checkout>this.value){
        segments[i].nights=String(diffDays(this.value,segments[i].checkout));
        var nEl=tbody.querySelector('.seg-nights[data-i="'+i+'"]');
        if(nEl)nEl.value=segments[i].nights;
      }
      updateRowTotal(i);
      buildPreview();
    });
  });
  tbody.querySelectorAll('.seg-nights').forEach(function(el){
    el.addEventListener('input',function(){
      var i=parseInt(this.dataset.i);
      segments[i].nights=this.value;
      if(segments[i].checkin&&parseInt(this.value)>0){
        segments[i].checkout=addDays(segments[i].checkin,parseInt(this.value));
        var coEl=tbody.querySelector('.seg-checkout[data-i="'+i+'"]');
        if(coEl)coEl.value=segments[i].checkout;
      }
      updateRowTotal(i);
      buildPreview();
    });
  });
  tbody.querySelectorAll('.seg-checkout').forEach(function(el){
    el.addEventListener('change',function(){
      var i=parseInt(this.dataset.i);
      segments[i].checkout=this.value;
      if(segments[i].checkin&&this.value>segments[i].checkin){
        segments[i].nights=String(diffDays(segments[i].checkin,this.value));
        var nEl=tbody.querySelector('.seg-nights[data-i="'+i+'"]');
        if(nEl)nEl.value=segments[i].nights;
      }
      updateRowTotal(i);
      buildPreview();
    });
  });
  tbody.querySelectorAll('.seg-del').forEach(function(el){
    el.addEventListener('click',function(){
      var i=parseInt(this.dataset.i);
      if(segments.length===1)return;
      segments.splice(i,1);
      renderSegments();
      buildPreview();
    });
  });
  updateGrandTotal();
}

document.getElementById('ghAddSeg').addEventListener('click',function(){
  segments.push({rooms:'',checkin:'',checkout:'',nights:'',rate:''});
  renderSegments();
  buildPreview();
});

// ── Global field listeners ────────────────────────────────────────────────────
['ghHotel','ghCity','ghProvider','ghCRS','ghRoomType','ghCurrency','ghGuarantee','ghSI','ghCF'].forEach(function(id){
  var el=document.getElementById(id);
  if(el){el.addEventListener('input',buildPreview);el.addEventListener('change',buildPreview);}
});
document.getElementById('ghSuffixCheck').addEventListener('change',buildPreview);

// Auto-uppercase
['ghCity','ghProvider','ghRoomType','ghCF','ghHotel'].forEach(function(id){
  var el=document.getElementById(id);
  if(el)el.addEventListener('input',function(){this.value=this.value.toUpperCase();});
});

// ── Build preview ─────────────────────────────────────────────────────────────
var builtLines=[];

function buildPreview(){
  var hotel=document.getElementById('ghHotel').value.toUpperCase().trim();
  var city=document.getElementById('ghCity').value.toUpperCase().trim();
  var provider=document.getElementById('ghProvider').value.toUpperCase().trim();
  var crs=document.getElementById('ghCRS').value;
  var roomType=document.getElementById('ghRoomType').value.toUpperCase().trim();
  var currency=document.getElementById('ghCurrency').value;
  var guarantee=document.getElementById('ghGuarantee').value.toUpperCase().trim();
  var si=document.getElementById('ghSI').value.toUpperCase().trim();
  var cf=document.getElementById('ghCF').value.toUpperCase().trim();
  var multi=segments.length>1;

  var missing=[];
  if(!hotel)missing.push('hotel name');
  if(!city)missing.push('city code');
  if(!provider)missing.push('provider');
  if(!cf)missing.push('confirmation number');

  // Validate segments
  var segErrors=[];
  segments.forEach(function(seg,i){
    var label=multi?(' (segment '+suffixLetter(i)+')'):' ';
    if(!seg.rooms||parseInt(seg.rooms)<1)segErrors.push('rooms'+label);
    if(!seg.checkin)segErrors.push('check-in'+label);
    if(!seg.checkout)segErrors.push('check-out'+label);
    if(!seg.rate||parseFloat(seg.rate)<=0)segErrors.push('rate'+label);
    if(seg.checkin&&seg.checkout&&seg.checkout<=seg.checkin)segErrors.push('check-out must be after check-in'+label);
  });

  var allMissing=missing.concat(segErrors);
  var prev=document.getElementById('ghPreview');
  var btn=document.getElementById('ghSendBtn');

  if(allMissing.length){
    prev.textContent='Still needed: '+allMissing.join(', ')+'.';
    btn.disabled=true;
    builtLines=[];
    return;
  }

  var lines=[];
  segments.forEach(function(seg,i){
    var total=(parseFloat(seg.rate)*parseInt(seg.rooms)).toFixed(2);
    var cfStr=cf+(multi?suffixLetter(i):'');
    var gPart=guarantee?guarantee:'';
    var siStr=si;
    var line='0HHTYYGK'+seg.rooms+city+'IN'+fmtDate(seg.checkin)+'-OUT'+fmtDate(seg.checkout)
      +'/'+hotel
      +'/'+roomType
      +'/'+total+currency
      +'/W-'+provider
      +'/CRS-'+crs
      +'/SI-'+siStr
      +'/G-'+gPart
      +'/CF-'+cfStr;
    lines.push(line);
  });

  builtLines=lines;
  prev.textContent=lines.join('\n');
  btn.disabled=false;
  updateGrandTotal();
}

// ── Send to Sabre ─────────────────────────────────────────────────────────────
document.getElementById('ghSendBtn').addEventListener('click',function(){
  if(!builtLines.length)return;
  var btn=this;
  var status=document.getElementById('ghStatus');
  btn.disabled=true;btn.classList.add('sending');
  status.textContent='';

  var i=0;
  function sendNext(){
    if(i>=builtLines.length){
      btn.textContent='Done!';
      status.textContent='✓ All '+builtLines.length+' command'+(builtLines.length>1?'s':'')+' sent';
      setTimeout(function(){
        btn.disabled=false;btn.classList.remove('sending');
        btn.textContent='Send to Sabre';status.textContent='';
      },2500);
      return;
    }
    btn.textContent='Sending '+(i+1)+' of '+builtLines.length+'...';
    status.textContent='✓ '+(i)+' sent';
    sendSabreCommand(builtLines[i],function(){
      i++;sendNext();
    });
  }
  sendNext();
});

// ── Init ──────────────────────────────────────────────────────────────────────
renderSegments();
buildPreview();

})();
