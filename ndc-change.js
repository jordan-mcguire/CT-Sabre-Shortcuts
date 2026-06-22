(function(){var E=document.getElementById('_sf');if(E){E.remove();return;}
var D='',de=document.querySelector('[data-name="flight-destination"]');
if(de)D=de.innerText.replace('Choose flight to','').trim();
var FL=[],S={},M={};
document.querySelectorAll('.react-row.expansion-row.sector-fare').forEach(function(r,i){
try{
var fn=Array.from(r.querySelectorAll('.flight-numbers strong')).map(function(e){return e.innerText.trim();}).join('+');
var ac=Array.from(r.querySelectorAll('.equipment .pointer-cursor')).map(function(e){return e.innerText.replace(/,\s*$/,'').trim();}).join('/');
var al=(r.querySelectorAll('.airlines-info-container .font-12')[0]||{}).innerText||'';
var tm=((r.querySelector('.TimeDateInfo .row-upper-item span')||{}).innerText||'').replace(/\s+/g,' ').trim();
var dt=Array.from(r.querySelectorAll('.TimeDateInfo .font-12 span')).map(function(s){return s.innerText.trim();}).join(' ').split('-')[0].trim().replace(/\u00a0/g,' ');
var rt=Array.from(r.querySelectorAll('.duration-location-info .font-12 span')).map(function(s){return s.innerText.trim();}).join('');
var st=((r.querySelector('.stops-info .row-upper-item')||{}).innerText||'').trim();
var via=((r.querySelector('.stops-info .decoded-value span')||{}).innerText||'').trim();
var fa=((r.querySelector('.bold-brand-name')||{}).innerText||'').trim();
var cu=((r.querySelector('.currency-label')||{}).innerText||'AUD').trim();
var px=((r.querySelector('.amount-label')||{}).innerText||'').trim();
FL.push({i:i,fn:fn,al:al.trim(),ac:ac,tm:tm,dt:dt,rt:rt,st:st,via:via,fa:fa,cu:cu,px:px});
M[i]=0;
}catch(e){}});
if(!FL.length){alert('No Sabre data found.');return;}
var _min=false;
var _sort='price-asc';
var _ns=false;
var P=document.createElement('div');P.id='_sf';
document.head.insertAdjacentHTML('beforeend','<style id="_sfs">.sfr{border-bottom:1px solid #f3f4f6}.sfr:hover{background:#d4eef5!important}.sfc{padding:4px 6px}.sfth{padding:4px 6px;font-size:10px;color:#9ca3af;text-align:left}.sfi{width:42px;font-size:11px;padding:2px 3px;border:1px solid #fca5a5;border-radius:4px;text-align:center;color:#ff2e5f;font-weight:bold}</style>');
P.style.cssText='position:fixed;top:16px;right:16px;width:650px;max-height:380px;background:#fff;border:1px solid #d1d5db;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.18);z-index:999999;font-family:Arial,sans-serif;font-size:13px;display:flex;flex-direction:column;overflow:hidden;';
function gP(f){return(parseFloat(f.px)||0)+(parseFloat(M[f.i])||0);}
function isNS(f){return f.st.toLowerCase().indexOf('nonstop')!==-1||f.st==='0'||f.st==='';}
function visibleFL(){
var arr=FL.filter(function(f){return _ns?isNS(f):true;});
if(_sort==='price-asc')arr.sort(function(a,b){return gP(a)-gP(b);});
else if(_sort==='price-desc')arr.sort(function(a,b){return gP(b)-gP(a);});
else if(_sort==='dep')arr.sort(function(a,b){return(a.tm||'').localeCompare(b.tm||'');});
return arr;
}
function bH(){
var sel=FL.filter(function(f){return S[f.i];});
if(!sel.length)return'';
var dv=document.getElementById('_sfd').value||D;
var h='<div style="width:600px;font-family:Arial,sans-serif"><p style="font-size:15px;font-weight:bold;color:#00434e;margin:0 0 12px">Flight Change Options &mdash; '+dv+'</p><table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:600px;table-layout:fixed;font-family:Arial,sans-serif;font-size:12px"><thead><tr style="background:#00434e;color:#fff"><th style="padding:8px 10px;text-align:left;width:80px">Date</th><th style="padding:8px 10px;text-align:left;width:70px">Flight</th><th style="padding:8px 10px;text-align:left;width:55px">Dep</th><th style="padding:8px 10px;text-align:left;width:55px">Arr</th><th style="padding:8px 10px;text-align:left;width:120px">Route</th><th style="padding:8px 10px;text-align:left;width:60px">Stops</th><th style="padding:8px 10px;text-align:left;width:70px">Fare</th><th style="padding:8px 10px;text-align:left;width:90px">Cost (AUD)</th></tr></thead><tbody>';
sel.forEach(function(f,i){var p=f.tm.split('-'),pv=gP(f).toFixed(2),ss=f.st+(f.via?' via '+f.via:''),bg=i%2?'#f0f9fa':'#fff';
h+='<tr style="background:'+bg+'"><td style="padding:8px 10px;font-size:11px;word-wrap:break-word">'+f.dt+'</td><td style="padding:8px 10px;color:#00434e;font-weight:700;word-wrap:break-word">'+f.fn+'</td><td style="padding:8px 10px;word-wrap:break-word">'+(p[0]||'').trim()+'</td><td style="padding:8px 10px;word-wrap:break-word">'+(p[1]||'').trim()+'</td><td style="padding:8px 10px;word-wrap:break-word">'+f.rt+'</td><td style="padding:8px 10px;word-wrap:break-word">'+ss+'</td><td style="padding:8px 10px;word-wrap:break-word">'+f.fa+'</td><td style="padding:8px 10px;color:#ff2e5f;font-weight:700;word-wrap:break-word">'+f.cu+' '+pv+'</td></tr>';});
h+='</tbody></table><p style="font-size:11px;color:#9ca3af;margin:10px 0 0">All prices per person. Subject to availability.</p></div>';
return h;}
function rn(){
var scroller=P.querySelector('div[style*="overflow-y:auto"]');
var scrollTop=scroller?scroller.scrollTop:0;
var vis=visibleFL();
var cnt=FL.filter(function(f){return S[f.i];}).length;
var aA=vis.length>0&&vis.every(function(f){return S[f.i];});
var sortOpts=[{v:'price-asc',l:'Price \u2191'},{v:'price-desc',l:'Price \u2193'},{v:'dep',l:'Dep time'}];
var sortSel=sortOpts.map(function(o){return'<option value="'+o.v+'"'+(_sort===o.v?' selected':'')+'>'+o.l+'</option>';}).join('');
P.innerHTML=''
+'<div id="_sfhdr" style="background:#00434e;color:#fff;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;cursor:move;user-select:none">'
+'<b style="font-size:13px">&#9992; NDC Change Quote</b>'
+'<div style="display:flex;align-items:center;gap:8px">'
+'<span onclick="_smin()" style="cursor:pointer;font-size:14px;color:#9ca3af;line-height:1;padding:2px 5px;border-radius:3px" title="Minimise">&#8722;</span>'
+'<span onclick="document.getElementById(\'_sf\').remove()" style="cursor:pointer;font-size:20px;color:#9ca3af;line-height:1">&times;</span>'
+'</div></div>'
+(_min?'':''
+'<div style="padding:6px 10px;background:#f8fafb;border-bottom:1px solid #e5e7eb;display:flex;gap:6px;align-items:center;flex-wrap:wrap;flex-shrink:0">'
+'<label style="font-size:11px;color:#6b7280">Dest:</label><input id="_sfd" style="font-size:11px;padding:2px 6px;border:1px solid #d1d5db;border-radius:4px;width:120px;color:#00434e;font-weight:600" value="'+D+'"/>'
+'<label style="font-size:11px;color:#6b7280;margin-left:4px">Merch:</label><input id="_sgm" type="number" step="1" min="0" placeholder="0" style="font-size:11px;padding:2px 5px;border:1px solid #fca5a5;border-radius:4px;width:48px;color:#ff2e5f;font-weight:bold;text-align:center"/>'
+'<button onclick="_sga()" style="background:#ff2e5f;color:#fff;border:none;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold">Apply</button>'
+'</div>'
+'<div style="padding:4px 10px;background:#f0f9fa;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:8px;flex-shrink:0">'
+'<input type="checkbox" id="_sfa" '+(aA?'checked':'')+' onchange="_sat(this)"/><label for="_sfa" style="font-size:11px;color:#6b7280">All</label>'
+'<input type="checkbox" id="_sns" '+(_ns?'checked':'')+' onchange="_sns_t(this)"/><label for="_sns" style="font-size:11px;color:#6b7280">Nonstop only</label>'
+'<label style="font-size:11px;color:#6b7280;margin-left:4px">Sort:</label>'
+'<select onchange="_ssort(this.value)" style="font-size:11px;padding:2px 5px;border:1px solid #d1d5db;border-radius:4px;color:#00434e">'+sortSel+'</select>'
+'<span style="margin-left:auto;font-size:11px;color:#9ca3af">'+cnt+' selected / '+vis.length+' shown</span>'
+'</div>'
+'<div style="overflow-y:auto;flex:1;min-height:0"><table style="width:100%;border-collapse:collapse">'
+'<thead><tr style="background:#f0f9fa"><th class="sfth" style="width:24px">&#10003;</th><th class="sfth">Date</th><th class="sfth">Flight</th><th class="sfth">Times</th><th class="sfth">Stops</th><th class="sfth" style="text-align:right">Base</th><th class="sfth" style="text-align:center;color:#ff2e5f">Merch</th><th class="sfth" style="text-align:right;color:#ff2e5f">AUD</th></tr></thead><tbody>'
+vis.map(function(f,i){
var sel=S[f.i];
var bg=sel?'#b2dfe7':(i%2?'#f9fafb':'#fff');
var mv=parseFloat(M[f.i]||0);
var ss=f.st+(f.via?' <b style="color:#92400e;background:#fef3c7;padding:1px 3px;border-radius:3px;font-size:10px">via '+f.via+'</b>':'');
return'<tr class="sfr" style="background:'+bg+'"><td class="sfc" style="text-align:center;width:24px"><input type="checkbox" '+(sel?'checked':'')+' onchange="_st('+f.i+',this)"/></td><td class="sfc" style="font-size:10px;white-space:nowrap">'+f.dt+'</td><td class="sfc"><b style="color:#00434e;font-size:11px">'+f.fn+'</b><br><span style="font-size:10px;color:#9ca3af">'+f.al+'</span></td><td class="sfc" style="font-size:10px;white-space:nowrap">'+f.tm+'</td><td class="sfc" style="font-size:10px">'+ss+'</td><td class="sfc" style="text-align:right;font-size:10px">'+parseFloat(f.px).toFixed(2)+'</td><td class="sfc" style="text-align:center"><input class="sfi" type="number" step="1" min="0" value="'+mv+'" placeholder="0" onchange="_sm('+f.i+',this.value)"/></td><td class="sfc" style="text-align:right;font-weight:bold;color:#ff2e5f;font-size:11px" id="_t'+f.i+'">'+gP(f).toFixed(2)+'</td></tr>';}).join('')
+'</tbody></table></div>'
+'<div id="_ss" style="padding:5px 10px;background:#f8fafb;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;flex-shrink:0;display:flex;align-items:center;justify-content:space-between">'
+'<span id="_sst">Select flights, set merch, then Copy.</span>'
+'<button onclick="_scp()" style="background:#ff2e5f;color:#fff;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold">Copy ('+cnt+')</button>'
+'</div>'
);
if(!_min){
P.style.maxHeight='380px';
var ns=P.querySelector('div[style*="overflow-y:auto"]');
if(ns)ns.scrollTop=scrollTop;
}else{
P.style.maxHeight='none';
}
}
window._st=function(i,cb){var sc=P.querySelector('div[style*="overflow-y:auto"]');var st=sc?sc.scrollTop:0;S[i]=cb.checked;rn();var sc2=P.querySelector('div[style*="overflow-y:auto"]');if(sc2)sc2.scrollTop=st;};
window._sat=function(cb){var vis=visibleFL();vis.forEach(function(f){S[f.i]=cb.checked;});rn();};
window._sm=function(i,v){M[i]=parseFloat(v)||0;var t=document.getElementById('_t'+i);if(t)t.innerText=gP(FL[i]).toFixed(2);};
window._sga=function(){var v=parseFloat(document.getElementById('_sgm').value)||0;FL.forEach(function(f){M[f.i]=v;var inp=document.querySelector('#_sf input[onchange="_sm('+f.i+',this.value)"]');if(inp)inp.value=v;var t=document.getElementById('_t'+f.i);if(t)t.innerText=gP(f).toFixed(2);});};
window._ssort=function(v){_sort=v;rn();};
window._smin=function(){_min=!_min;rn();};
window._sns_t=function(cb){_ns=cb.checked;rn();};
window._scp=async function(){var h=bH();if(!h){var st=document.getElementById('_sst');if(st){st.style.color='#ff2e5f';st.innerText='Select at least one flight.';}return;}try{await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([h],{type:'text/html'}),'text/plain':new Blob([h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')],{type:'text/plain'})})]);var s=document.getElementById('_sst');if(s){s.style.color='#00434e';s.innerText='Copied!';}setTimeout(function(){var x=document.getElementById('_sst');if(x){x.style.color='#9ca3af';x.innerText='Select flights, set merch, then Copy.';}},3000);}catch(e){try{await navigator.clipboard.writeText(bH().replace(/<[^>]+>/g,' ').replace(/\s+/g,' '));}catch(e2){var s2=document.getElementById('_sst');if(s2){s2.style.color='#ff2e5f';s2.innerText='Copy failed.';}}};};
rn();
document.body.appendChild(P);
(function(){
var dx=0,dy=0,mx=0,my=0;
function md(e){if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.target.tagName==='BUTTON'||e.target.tagName==='SPAN')return;e.preventDefault();mx=e.clientX;my=e.clientY;dx=P.offsetLeft;dy=P.offsetTop;document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);}
function mm(e){var nx=dx+(e.clientX-mx),ny=dy+(e.clientY-my);P.style.left=nx+'px';P.style.top=ny+'px';P.style.right='auto';}
function mu(){document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);}
var hdr=document.getElementById('_sfhdr');if(hdr)hdr.addEventListener('mousedown',md);
})();
})();
