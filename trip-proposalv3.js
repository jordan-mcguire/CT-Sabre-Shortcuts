(function(){

var ADDITIONAL_INFO='<table width="100%" style="margin-top:24px;border-collapse:collapse;font-family:Arial,sans-serif"><tr><td style="background:#f5f5f5;border:1px solid #e0e0e0;border-left:3px solid #ff2e5f;padding:14px 16px;border-radius:4px"><strong style="color:#ff2e5f;font-size:11px;display:block;margin-bottom:8px">ADDITIONAL INFORMATION</strong><p style="margin:0 0 6px;font-size:11px;color:#333;line-height:1.5">All passport and visa requirements are the responsibility of the traveller.</p><p style="margin:0 0 6px;font-size:11px;color:#333;line-height:1.5">If you need more information about visas, passports, health and security for each country, please visit: <a href="https://www.fctgtravelnews.com/" style="color:#ff2e5f">Travel News</a></p><p style="margin:0 0 6px;font-size:11px;color:#333;line-height:1.5">All prices indicated are subject to change and availability. In the event of a refund request, some taxes may not be refunded.</p><p style="margin:0;font-size:11px;color:#333;line-height:1.5">For more information on these topics, please contact your dedicated team.</p></td></tr></table>';

var IMPORTANT_NOTICE='<table width="100%" style="margin:16px 0;border-collapse:collapse"><tr><td><div style="background:#f5f5f5;border:1px solid #d0d0d0;border-left:3px solid #ff2e5f;padding:10px 14px;border-radius:4px"><strong style="color:#ff2e5f;font-size:11px;display:block;margin-bottom:6px">IMPORTANT NOTICE</strong><ul style="font-style:italic;font-size:10px;margin:0;padding-left:18px;color:#333;line-height:1.4"><li style="margin-bottom:4px">All prices quoted are subject to change until tickets are issued, even if tentatively holding.</li><li style="margin-bottom:4px">Airlines reserve the right to change surcharges, fare levels and taxes without notice.</li><li>Corporate Traveller fees are not included in your quote, as per schedule of fees, and will be charged at the time of invoicing.</li></ul></div></td></tr></table>';

var CAR_WARNING='<table width="100%" style="margin:16px 0;border-collapse:collapse"><tr><td><div style="background:#fff;border:2px solid #ff9800;border-radius:6px;padding:12px 14px"><strong style="color:#ff9800;font-size:11px;display:block;margin-bottom:6px">⚠️ CAR RENTAL IMPORTANT INFORMATION</strong><ul style="font-size:10px;color:#333;margin:0;padding-left:18px;line-height:1.4"><li style="margin-bottom:4px">You will need a PHYSICAL credit card (not debit) in the main driver\'s name upon pick up.</li><li style="margin-bottom:4px">Tolls cannot be charged back to Corporate Traveller for rentals with Avis or Budget.</li><li style="margin-bottom:4px">Bookings with personal memberships attached i.e. Hertz Gold/Avis Wizard will override any chargeback of the rental to Corporate Traveller and charge your card.</li><li>For international rentals: International drivers license may be required.</li></ul></div></td></tr></table>';

// ── Helpers ───────────────────────────────────────────────────────────────────
function getIframe(){
  return document.querySelector('.share-container iframe');
}

function getSrcdoc(){
  var iframe=getIframe();
  return iframe?iframe.getAttribute('srcdoc'):null;
}

// Parse srcdoc into a live DOM document
function parseSrcdoc(html){
  var parser=new DOMParser();
  // srcdoc is HTML-entity-encoded in the attribute - the browser already decoded it for getAttribute
  return parser.parseFromString(html,'text/html');
}

// Detect proposal type from doc
function getProposalType(doc){
  return doc.querySelector('[class*="proposal-compact"]')?'proposal-compact':'proposal-enhanced';
}

// Find all option tables in order, return array of {key, num, type, label, icon, el}
function findOptions(doc, pType){
  var opts=[];
  var seen={};
  // querySelectorAll returns in DOM order
  var tables=doc.querySelectorAll('table[id]');
  tables.forEach(function(t){
    var id=t.id||'';
    // Match: proposal-enhanced-3-car-option OR proposal-compact-1-hotel-option
    var m=id.match(/^proposal-(?:enhanced|compact)-(\d+)-(air|hotel|car)-option$/);
    if(!m)return;
    var num=m[1],type=m[2],key=num+'-'+type;
    if(seen[key])return;
    seen[key]=true;
    var icon=type==='air'?'✈':type==='hotel'?'🏨':'🚗';
    var displayType=type==='air'?'Flight':type==='hotel'?'Hotel':'Car';
    // Read display label from the title cell if present
    var titleEl=doc.getElementById(pType+'-'+num+'-'+type+'-segment-title');
    var rawLabel=titleEl?titleEl.textContent.trim():'';
    // e.g. "Hotel Option 1" -> "Hotel Option 1", fallback to constructed
    var label=rawLabel||(displayType+' Option '+num);
    // Extract price
    var priceEl=doc.getElementById(pType+'-'+num+'-'+type+'-total-price');
    var price='';
    if(priceEl){
      var txt=priceEl.textContent.replace(/\s+/g,' ').trim();
      var pm=txt.match(/([\d,]+\.\d{2})/);
      if(pm)price=pm[1];
    }
    opts.push({key:key,num:num,type:type,label:label,icon:icon,price:price,el:t});
  });
  return opts;
}

// ── DOM transforms ────────────────────────────────────────────────────────────
function applyTransforms(doc, pType, selectedKeys, priceOverrides, hasCarOption){
  // 1. Remove role="presentation" (Outlook compat) - skip, harmless to leave
  // 2. Colour option titles
  ['air','hotel','car'].forEach(function(type){
    doc.querySelectorAll('[id*="-'+type+'-segment-title"]').forEach(function(el){
      el.style.color='#ff2e5f';
    });
  });

  // 3. Remove emission, seats, meal labels (enhanced only - compact doesn't have them)
  doc.querySelectorAll('[id*="-emission-label"],[id*="-seats-label"],[id*="-meal-label"]').forEach(function(el){
    // Remove the label strong and its following span
    var next=el.nextSibling;
    while(next&&next.nodeType===3)next=next.nextSibling; // skip text nodes
    if(next&&next.tagName==='SPAN')next.parentNode.removeChild(next);
    el.parentNode.removeChild(el);
  });

  // 4. Remove price breakdown tables (enhanced)
  doc.querySelectorAll('.proposal-enhanced-price-break-down-table-wrapper').forEach(function(el){
    // Walk up to the containing <tr> and remove it
    var tr=el;
    while(tr&&tr.tagName!=='TR')tr=tr.parentNode;
    if(tr)tr.parentNode.removeChild(tr);
  });

  // 5. Remove hotel images
  doc.querySelectorAll('[id*="-hotel-images"]').forEach(function(el){
    var tr=el;
    while(tr&&tr.tagName!=='TR')tr=tr.parentNode;
    if(tr)tr.parentNode.removeChild(tr);
  });

  // 6. Remove emission rows for compact
  if(pType==='proposal-compact'){
    doc.querySelectorAll('[id*="-emission"]').forEach(function(el){
      var tr=el;while(tr&&tr.tagName!=='TR')tr=tr.parentNode;
      if(tr)tr.parentNode.removeChild(tr);
    });
  }

  // 7. Fix alignment - remove align=center from top-level td
  doc.querySelectorAll('td[align="center"]').forEach(function(el){
    el.setAttribute('align','left');
  });

  // 8. Colour "Flight/Hotel/Car Option N" text in headers
  doc.querySelectorAll('strong').forEach(function(el){
    var txt=el.textContent.trim();
    if(/^(Flight|Hotel|Car) Option \d+$/.test(txt)){
      el.style.color='#ff2e5f';
    }
  });

  // 9. Apply price overrides
  Object.keys(priceOverrides).forEach(function(key){
    var newPrice=priceOverrides[key];
    if(!newPrice)return;
    var parts=key.split('-');var num=parts[0],type=parts[1];
    var priceEl=doc.getElementById(pType+'-'+num+'-'+type+'-total-price');
    if(!priceEl)return;
    // Find the price text node - it's inside nested spans
    // The structure is: <span class="text-style-info-4">...<span>&nbsp;15179.26</span></span>
    // We replace the last text node that looks like a price
    var walker=document.createTreeWalker(priceEl,NodeFilter.SHOW_TEXT,null,false);
    var node,last=null;
    while((node=walker.nextNode())){
      if(/[\d,]+\.\d{2}/.test(node.nodeValue))last=node;
    }
    if(last)last.nodeValue=last.nodeValue.replace(/[\d,]+\.\d{2}/,newPrice);
  });

  // 10. Hide unselected options (keep DOM intact so CSS still works)
  doc.querySelectorAll('table[id]').forEach(function(t){
    var id=t.id||'';
    var m=id.match(/^proposal-(?:enhanced|compact)-(\d+)-(air|hotel|car)-option$/);
    if(!m)return;
    var key=m[1]+'-'+m[2];
    if(!selectedKeys[key]){
      t.style.display='none';
      // Also hide the spacer that follows (enhanced only - role="none" table)
      var next=t.nextSibling;
      while(next&&next.nodeType===3)next=next.nextSibling;
      if(next&&next.getAttribute&&next.getAttribute('role')==='none')next.style.display='none';
    }
  });

  // 11. Strip box-sizing and !important from inline styles (Outlook compat)
  doc.querySelectorAll('[style]').forEach(function(el){
    var s=el.getAttribute('style');
    s=s.replace(/box-sizing:[^;]+;?/g,'').replace(/\s*!important/g,'');
    el.setAttribute('style',s);
  });

  // 12. Set max-width on outermost table
  var preview=doc.getElementById('trip-preview');
  if(preview){
    preview.setAttribute('width','700');
    preview.style.maxWidth='700px';
    preview.style.margin='0 auto';
  }

  // 13. Insert Important Notice after header row, before first option
  var body=doc.getElementById(pType===('proposal-compact')?'proposal-compact-body':'proposal-enhanced-body');
  if(body){
    var noticeDiv=doc.createElement('tr');
    noticeDiv.innerHTML='<td>'+IMPORTANT_NOTICE+(hasCarOption?CAR_WARNING:'')+'</td>';
    body.parentNode.insertBefore(noticeDiv,body);
  }

  // 14. Style passenger block
  var paxEl=doc.getElementById(pType+'-passengers-list');
  if(paxEl&&paxEl.textContent.trim()){
    var paxName=paxEl.textContent.trim();
    var paxContainer=paxEl.closest('td');
    if(paxContainer){
      // Insert styled pax block before the body options
      var paxRow=doc.createElement('tr');
      paxRow.innerHTML='<td><div style="background:#fff;border:1px solid #e0e0e0;border-radius:4px;padding:12px 14px;margin:8px 0"><strong style="color:#ff2e5f;font-size:11px;display:block;margin-bottom:6px">✈️ PASSENGER NAME AS PER PHOTO ID / PASSPORT:</strong><span style="font-size:11px;line-height:1.6">'+paxName+'</span></div></td>';
      if(body)body.parentNode.insertBefore(paxRow,body);
    }
  }

  // 15. Append Additional Information at bottom
  var disclaimer=doc.getElementById(pType+'-agency-disclaimer-message');
  if(disclaimer){
    var aiRow=doc.createElement('tr');
    aiRow.innerHTML='<td>'+ADDITIONAL_INFO+'</td>';
    disclaimer.parentNode.insertBefore(aiRow,disclaimer);
  }

  // 16. Add print CSS
  var printStyle=doc.createElement('style');
  printStyle.textContent='@media print{body{margin:0}table{max-width:700px!important}@page{margin:1cm}.proposal-enhanced-page-break,.proposal-compact-page-break{page-break-inside:avoid}}';
  doc.head.appendChild(printStyle);
}

// Serialize doc back to HTML string
function serializeDoc(doc){
  return '<!DOCTYPE html>'+doc.documentElement.outerHTML;
}

// ── Panel UI ──────────────────────────────────────────────────────────────────
function injectTidyButton(){
  var modal=document.querySelector('.trip-proposal-share-modal');
  if(!modal||document.getElementById('ctTidyButton'))return;
  var actionButtons=modal.querySelector('.modal-footer .action-buttons');
  if(!actionButtons)return;
  var buttons=actionButtons.querySelectorAll('button');
  if(buttons.length<2)return;

  if(!document.getElementById('ctTidyStyle')){
    var ts=document.createElement('style');ts.id='ctTidyStyle';
    ts.textContent=
      '.ct-tidy-btn{background-color:#ff2e5f!important;color:#fff!important;}'
      +'#ctTidyPanel{position:absolute;bottom:56px;left:0;right:0;background:#fff;'
      +'border-top:2px solid #ff2e5f;padding:12px 16px;z-index:9999;'
      +'font-family:Arial,sans-serif;font-size:11px;box-shadow:0 -4px 12px rgba(0,0,0,.15);}'
      +'#ctTidyPanel .ct-pt{font-size:10px;font-weight:800;color:#ff2e5f;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;}'
      +'#ctTidyPanel .ct-or{display:flex;align-items:center;gap:8px;margin-bottom:5px;}'
      +'#ctTidyPanel .ct-or input[type=checkbox]{accent-color:#ff2e5f;width:13px;height:13px;flex-shrink:0;cursor:pointer;}'
      +'#ctTidyPanel .ct-ol{flex:1;font-weight:600;color:#333;cursor:pointer;}'
      +'#ctTidyPanel .ct-pi{border:1px solid #ddd;border-radius:4px;padding:3px 7px;font-size:11px;width:85px;text-align:right;font-family:Arial,sans-serif;}'
      +'#ctTidyPanel .ct-pi:focus{border-color:#ff2e5f;outline:none;}'
      +'#ctTidyPanel .ct-br{display:flex;gap:8px;margin-top:10px;}'
      +'#ctTidyPanel .ct-ab{flex:1;padding:7px;border:none;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif;}'
      +'#ctTidyPanel .ct-cb{background:#ff2e5f;color:#fff;}'
      +'#ctTidyPanel .ct-cb:hover{background:#d4234e;}'
      +'#ctTidyPanel .ct-pb{background:#f5f5f5;color:#333;border:1px solid #ddd;}'
      +'#ctTidyPanel .ct-pb:hover{background:#e8e8e8;}'
      +'#ctTidyPanel .ct-xb{position:absolute;top:8px;right:10px;background:none;border:none;font-size:16px;cursor:pointer;color:#999;padding:0;line-height:1;}';
    document.head.appendChild(ts);
  }

  var wrap=document.createElement('div');
  wrap.className='scope-wrapper sabre-ngv-themes-components-form';
  wrap.id='ctTidyButton';
  wrap.innerHTML='<button class="force-inline-block-wrapper button regular primary ct-tidy-btn" type="button">TIDY</button>';
  actionButtons.insertBefore(wrap,buttons[1].parentElement);
  wrap.querySelector('button').addEventListener('click',showPanel);
}

var _opts=[];

function showPanel(){
  if(document.getElementById('ctTidyPanel'))return;
  var srcdoc=getSrcdoc();
  if(!srcdoc){alert('Could not find proposal. Click Share first.');return;}
  var doc=parseSrcdoc(srcdoc);
  var pType=getProposalType(doc);
  _opts=findOptions(doc,pType);
  if(!_opts.length){alert('No options found in proposal.');return;}

  var modal=document.querySelector('.trip-proposal-share-modal .modal-content');
  if(!modal)return;
  modal.style.position='relative';

  var rows=_opts.map(function(o){
    return '<div class="ct-or">'
      +'<input type="checkbox" checked class="ct-ck" data-key="'+o.key+'" id="ctck'+o.key+'">'
      +'<label class="ct-ol" for="ctck'+o.key+'">'+o.icon+' '+o.label+'</label>'
      +(o.price?'<input class="ct-pi" type="text" value="'+o.price+'" data-pf="'+o.key+'" placeholder="Price">':'')
      +'</div>';
  }).join('');

  var panel=document.createElement('div');
  panel.id='ctTidyPanel';
  panel.innerHTML='<button class="ct-xb" id="ctXPanel">&times;</button>'
    +'<div class="ct-pt">Options to include</div>'
    +rows
    +'<div class="ct-br">'
    +'<button class="ct-ab ct-cb" id="ctDoCopy">📋 Copy to Clipboard</button>'
    +'<button class="ct-ab ct-pb" id="ctDoPDF">🖨 Print / Save PDF</button>'
    +'</div>';

  modal.appendChild(panel);
  document.getElementById('ctXPanel').onclick=function(){panel.remove();};
  document.getElementById('ctDoCopy').onclick=function(){runTidy('copy');};
  document.getElementById('ctDoPDF').onclick=function(){runTidy('pdf');};
}

// ── Core ──────────────────────────────────────────────────────────────────────
function runTidy(mode){
  var srcdoc=getSrcdoc();
  if(!srcdoc){alert('Could not find proposal.');return;}

  var panel=document.getElementById('ctTidyPanel');

  // Collect selections
  var selectedKeys={};
  panel.querySelectorAll('.ct-ck').forEach(function(cb){
    if(cb.checked)selectedKeys[cb.dataset.key]=true;
  });
  if(!Object.keys(selectedKeys).length){alert('Please select at least one option.');return;}

  // Collect price overrides
  var priceOverrides={};
  panel.querySelectorAll('.ct-pi').forEach(function(inp){
    var v=inp.value.trim();
    if(v)priceOverrides[inp.dataset.pf]=v;
  });

  // Parse fresh doc each time
  var doc=parseSrcdoc(srcdoc);
  var pType=getProposalType(doc);

  // Detect car
  var hasCarOption=!!doc.querySelector('[id*="-car-option"]');

  // Apply all transforms
  applyTransforms(doc,pType,selectedKeys,priceOverrides,hasCarOption);

  var out=serializeDoc(doc);

  if(mode==='pdf'){
    var win=window.open('','_blank','width=800,height=900,scrollbars=yes');
    if(!win){alert('Please allow popups for this site.');return;}
    win.document.open();
    win.document.write(out);
    win.document.close();
    // Small delay to let images/styles load
    setTimeout(function(){win.print();},800);
    return;
  }

  // Copy to clipboard
  try{
    navigator.clipboard.write([new ClipboardItem({
      'text/html':new Blob([out],{type:'text/html'}),
'text/plain':new Blob(['Trip Proposal'],{type:'text/plain'})
    })]).then(function(){
      var btn=document.getElementById('ctDoCopy');
      if(!btn)return;
      var orig=btn.textContent;
      btn.textContent='✓ Copied!';
      btn.style.background='#28a745';
      setTimeout(function(){btn.textContent=orig;btn.style.background='';},2000);
    }).catch(function(e){
      fallbackCopy(out);
    });
  }catch(e){
    fallbackCopy(out);
  }
}

function fallbackCopy(html){
  var ta=document.createElement('textarea');
  ta.value=html;
  ta.style.cssText='position:fixed;top:-9999px';
  document.body.appendChild(ta);
  ta.select();
  try{document.execCommand('copy');alert('Copied (plain text fallback - rich copy not supported in this browser).');}
  catch(e){alert('Copy failed: '+e.message);}
  document.body.removeChild(ta);
}

// ── Observer ──────────────────────────────────────────────────────────────────
var _obs=new MutationObserver(function(){injectTidyButton();});
if(document.body)_obs.observe(document.body,{childList:true,subtree:true});
setTimeout(injectTidyButton,500);

})();
