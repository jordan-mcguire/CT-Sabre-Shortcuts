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
var P=document.createElement('div');P.id='_sf';
document.head.insertAdjacentHTML('beforeend','<style id="_sfs">.sfr{border-bottom:1px solid #f3f4f6}.sfr:hover{background:#f0f9fa!important}.sfc{padding:6px 7px}.sfth{padding:5px 7px;font-size:10px;color:#9ca3af;text-align:left}.sfi{width:46px;font-size:11px;padding:2px 3px;border:1px solid #fca5a5;border-radius:4px;text-align:center;color:#ff2e5f;font-weight:bold}</style>');
P.style.cssText='position:fixed;top:16px;right:16px;width:720px;max-height:460px;background:#fff;border:1px solid #d1d5db;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.18);z-index:999999;font-family:Arial,sans-serif;font-size:13px;display:flex;flex-direction:column;overflow:hidden;';
function gP(f){return(parseFloat(f.px)||0)+(parseFloat(M[f.i])||0);}
function bH(){
var sel=FL.filter(function(f){return S[f.i];});
if(!sel.length)return'';
var dv=document.getElementById('_sfd').value||D;
var h='<div style="max-width:600px;font-family:Arial,sans-serif"><p style="font-size:15px;font-weight:bold;color:#00434e;margin:0 0 12px">Flight Change Options &mdash; '+dv+'</p><table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:13px"><thead><tr style="background:#00434e;color:#fff"><th style="padding:8px 10px;text-align:left">Date</th><th style="padding:8px 10px;text-align:left">Flight</th><th style="padding:8px 10px;text-align:left">Dep</th><th style="padding:8px 10px;text-align:left">Arr</th><th style="padding:8px 10px;text-align:left">Route</th><th style="padding:8px 10px;text-align:left">Stops</th><th style="padding:8px 10px;text-align:left">Fare</th><th style="padding:8px 10px;text-align:left">Cost to change (AUD)</th></tr></thead><tbody>';
sel.forEach(function(f,i){var p=f.tm.split('-'),pv=gP(f).toFixed(2),ss=f.st+(f.via?' via '+f.via:''),bg=i%2?'#f0f9fa':'#fff';
h+='<tr style="background:'+bg+'"><td style="padding:8px 10px;font-size:12px;white-space:nowrap">'+f.dt+'</td><td style="padding:8px 10px;color:#00434e;font-weight:700">'+f.fn+'</td><td style="padding:8px 10px;white-space:nowrap">'+(p[0]||'').trim()+'</td><td style="padding:8px 10px;white-space:nowrap">'+(p[1]||'').trim()+'</td><td style="padding:8px 10px">'+f.rt+'</td><td style="padding:8px 10px">'+ss+'</td><td style="padding:8px 10px">'+f.fa+'</td><td style="padding:8px 10px;color:#ff2e5f;font-weight:700">'+f.cu+' '+pv+'</td></tr>';});
h+='</tbody></table><p style="font-size:11px;color:#9ca3af;margin:10px 0 0">All prices per person. Subject to availability.</p></div>';
return h;}
function rn(){
var cnt=FL.filter(function(f){return S[f.i];}).length,aA=FL.every(function(f){return S[f.i];});
P.innerHTML='<div style="background:#00434e;color:#fff;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0"><b style="font-size:13px">&#9992; NDC Change Quote</b><span style="cursor:pointer;font-size:20px;color:#9ca3af" onclick="document.getElementById(\'_sf\').remove()">&times;</span></div>'
+'<div style="padding:8px 12px;background:#f8fafb;border-bottom:1px solid #e5e7eb;display:flex;gap:8px;align-items:center;flex-wrap:wrap;flex-shrink:0">'
+'<label style="font-size:11px;color:#6b7280">Dest:</label><input id="_sfd" style="font-size:11px;padding:3px 7px;border:1px solid #d1d5db;border-radius:4px;width:140px;color:#00434e;font-weight:600" value="'+D+'"/>'
+'<label style="font-size:11px;color:#6b7280;margin-left:6px">Global merch:</label><input id="_sgm" type="number" step="1" min="0" placeholder="0" style="font-size:11px;padding:3px 6px;border:1px solid #fca5a5;border-radius:4px;width:54px;color:#ff2e5f;font-weight:bold;text-align:center"/>'
+'<button onclick="_sga()" style="background:#ff2e5f;color:#fff;border:none;padding:4px 9px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold">Apply all</button>'
+'<button onclick="_scp()" style="margin-left:auto;background:#ff2e5f;color:#fff;border:none;padding:5px 14px;border-radius:5px;cursor:pointer;font-size:12px;font-weight:bold">Copy ('+cnt+')</button>'
+'</div>'
+'<div style="padding:5px 12px;background:#f0f9fa;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:7px;flex-shrink:0">'
+'<input type="checkbox" id="_sfa" '+(aA?'checked':'')+' onchange="_sat(this)"/><label for="_sfa" style="font-size:11px;color:#6b7280">Select all</label>'
+'<span style="margin-left:auto;font-size:11px;color:#9ca3af">'+cnt+'/'+FL.length+' selected</span>'
+'</div>'
+'<div style="overflow-y:auto;flex:1;min-height:0"><table style="width:100%;border-collapse:collapse">'
+'<thead><tr style="background:#f0f9fa"><th class="sfth">&#10003;</th><th class="sfth">Date</th><th class="sfth">Flight</th><th class="sfth">Times</th><th class="sfth">Route</th><th class="sfth">Stops</th><th class="sfth">Fare</th><th class="sfth" style="text-align:right">Base</th><th class="sfth" style="text-align:center;color:#ff2e5f">Merch</th><th class="sfth" style="text-align:right;color:#ff2e5f">Cost AUD</th></tr></thead><tbody>'
+FL.map(function(f,i){var bg=S[f.i]?'#f0f9fa':(i%2?'#f9fafb':'#fff'),mv=parseFloat(M[f.i]||0),ss=f.st+(f.via?' <b style="color:#92400e;background:#fef3c7;padding:1px 4px;border-radius:4px;font-size:10px">via '+f.via+'</b>':'');
return'<tr class="sfr" style="background:'+bg+'"><td class="sfc" style="text-align:center"><input type="checkbox" '+(S[f.i]?'checked':'')+' onchange="_st('+f.i+',this)"/></td><td class="sfc" style="font-size:11px;white-space:nowrap">'+f.dt+'</td><td class="sfc"><b style="color:#00434e;font-size:12px">'+f.fn+'</b><br><span style="font-size:10px;color:#9ca3af">'+f.al+' &middot; '+f.ac+'</span></td><td class="sfc" style="font-size:11px;white-space:nowrap">'+f.tm+'</td><td class="sfc" style="font-size:11px">'+f.rt+'</td><td class="sfc" style="font-size:11px">'+ss+'</td><td class="sfc" style="font-size:11px">'+f.fa+'</td><td class="sfc" style="text-align:right;font-size:11px">'+parseFloat(f.px).toFixed(2)+'</td><td class="sfc" style="text-align:center"><input class="sfi" type="number" step="1" min="0" value="'+mv+'" placeholder="0" onchange="_sm('+f.i+',this.value)"/></td><td class="sfc" style="text-align:right;font-weight:bold;color:#ff2e5f;font-size:12px" id="_t'+f.i+'">'+gP(f).toFixed(2)+'</td></tr>';}).join('')
+'</tbody></table></div>'
+'<div id="_ss" style="padding:6px 12px;background:#f8fafb;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;flex-shrink:0">Select flights, set merch, then Copy.</div>';}
window._st=function(i,cb){S[i]=cb.checked;rn();};
window._sat=function(cb){FL.forEach(function(f){S[f.i]=cb.checked;});rn();};
window._sm=function(i,v){M[i]=parseFloat(v)||0;var t=document.getElementById('_t'+i);if(t)t.innerText=gP(FL[i]).toFixed(2);};
window._sga=function(){var v=parseFloat(document.getElementById('_sgm').value)||0;FL.forEach(function(f){M[f.i]=v;var inp=document.querySelector('#_sf input[onchange="_sm('+f.i+',this.value)"]');if(inp)inp.value=v;var t=document.getElementById('_t'+f.i);if(t)t.innerText=gP(f).toFixed(2);});};
window._scp=async function(){var h=bH();if(!h){document.getElementById('_ss').innerText='Select at least one flight.';return;}try{await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([h],{type:'text/html'}),'text/plain':new Blob([h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')],{type:'text/plain'})})]);var s=document.getElementById('_ss');s.style.color='#00434e';s.innerText='Copied!';setTimeout(function(){var x=document.getElementById('_ss');if(x){x.style.color='#9ca3af';x.innerText='Select flights, set merch, then Copy.';}},3000);}catch(e){try{await navigator.clipboard.writeText(bH().replace(/<[^>]+>/g,' ').replace(/\s+/g,' '));}catch(e2){document.getElementById('_ss').style.color='#ff2e5f';document.getElementById('_ss').innerText='Copy failed.';}}};
rn();document.body.appendChild(P);})();
