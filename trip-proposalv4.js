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
function parseSrcdoc(html){
  return new DOMParser().parseFromString(html,'text/html');
}
function getProposalType(doc){
  return doc.querySelector('[class*="proposal-compact"]')?'proposal-compact':'proposal-enhanced';
}

function findOptions(doc,pType){
  var opts=[],seen={};
  doc.querySelectorAll('table[id]').forEach(function(t){
    var id=t.id||'';
    var m=id.match(/^proposal-(?:enhanced|compact)-(\d+)-(air|hotel|car)-option$/);
    if(!m)return;
    var num=m[1],type=m[2],key=num+'-'+type;
    if(seen[key])return;
    seen[key]=true;
    var icon=type==='air'?'✈':type==='hotel'?'🏨':'🚗';
    var displayType=type==='air'?'Flight':type==='hotel'?'Hotel':'Car';
    var titleEl=doc.getElementById(pType+'-'+num+'-'+type+'-segment-title');
    var label=(titleEl?titleEl.textContent.trim():'')||(displayType+' Option '+num);
    var priceEl=doc.getElementById(pType+'-'+num+'-'+type+'-total-price');
    var price='';
    if(priceEl){var pm=priceEl.textContent.replace(/\s+/g,' ').trim().match(/([\d,]+\.\d{2})/);if(pm)price=pm[1];}
    opts.push({key:key,num:num,type:type,label:label,icon:icon,price:price,el:t});
  });
  return opts;
}

// ── DOM transforms ────────────────────────────────────────────────────────────
function applyTransforms(doc,pType,selectedKeys,priceOverrides,hasCarOption){
  // 1. Colour option titles
  ['air','hotel','car'].forEach(function(type){
    doc.querySelectorAll('[id*="-'+type+'-segment-title"]').forEach(function(el){el.style.color='#ff2e5f';});
  });

  // 2. Remove emission, seats, meal labels
  doc.querySelectorAll('[id*="-emission-label"],[id*="-seats-label"],[id*="-meal-label"]').forEach(function(el){
    var next=el.nextSibling;
    while(next&&next.nodeType===3)next=next.nextSibling;
    if(next&&next.tagName==='SPAN')next.parentNode.removeChild(next);
    el.parentNode.removeChild(el);
  });

  // 3. Extract passenger summary then remove price breakdown (enhanced only)
  doc.querySelectorAll('.proposal-enhanced-price-break-down-table-wrapper').forEach(function(wrapper){
    var optTable=wrapper;
    while(optTable&&!(/proposal-enhanced-\d+-(air|hotel|car)-option/.test(optTable.id||'')))optTable=optTable.parentNode;
    if(optTable&&/proposal-enhanced-\d+-air-option/.test(optTable.id||'')){
      var paxParts=[];
      wrapper.querySelectorAll('[id*="price-break-down-table-"][id$="-row"]').forEach(function(row){
        var cells=row.querySelectorAll('td');
        if(cells.length<5)return;
        var pType2=cells[0].textContent.trim();
        var qty=cells[4].textContent.trim().replace('x ','');
        if(pType2&&qty)paxParts.push(qty+'x '+pType2);
      });
      if(paxParts.length){
        var num=(optTable.id.match(/proposal-enhanced-(\d+)-air-option/)||[])[1];
        var headerTable=doc.getElementById('proposal-enhanced-'+num+'-air-header');
        if(headerTable){
          var fnRow=doc.createElement('tr');
          fnRow.innerHTML='<td colspan="2" style="padding:6px 16px 8px;font-size:10px;color:#666;border-top:1px solid #e5e5e5;">Includes: '+paxParts.join(' · ')+'</td>';
          var tbody=headerTable.querySelector('tbody')||headerTable;
          tbody.appendChild(fnRow);
        }
      }
    }
    var tr=wrapper;while(tr&&tr.tagName!=='TR')tr=tr.parentNode;
    if(tr)tr.parentNode.removeChild(tr);
  });

  // 4. Remove hotel images
  doc.querySelectorAll('[id*="-hotel-images"]').forEach(function(el){
    var tr=el;while(tr&&tr.tagName!=='TR')tr=tr.parentNode;
    if(tr)tr.parentNode.removeChild(tr);
  });

  // 5. Remove emission rows for compact
  if(pType==='proposal-compact'){
    doc.querySelectorAll('[id*="-emission"]').forEach(function(el){
      var tr=el;while(tr&&tr.tagName!=='TR')tr=tr.parentNode;
      if(tr)tr.parentNode.removeChild(tr);
    });
  }

  // 6. Fix alignment - ONLY the outer body-level centering td, not inner cells
  // The proposal wraps everything in <td align="center" valign="top" width="100%">
  // which causes Outlook to center the whole thing. Fix only those.
  doc.querySelectorAll('td[align="center"][width="100%"]').forEach(function(el){
    el.setAttribute('align','left');
  });

  // 7. Colour option title strongs
  doc.querySelectorAll('strong').forEach(function(el){
    if(/^(Flight|Hotel|Car) Option \d+$/.test(el.textContent.trim()))el.style.color='#ff2e5f';
  });

  // 8. Apply price overrides - use a TreeWalker on the parsed doc's context
  Object.keys(priceOverrides).forEach(function(key){
    var newPrice=priceOverrides[key];
    if(!newPrice)return;
    var parts=key.split('-'),num=parts[0],type=parts[1];
    var priceEl=doc.getElementById(pType+'-'+num+'-'+type+'-total-price');
    if(!priceEl)return;
    var walker=doc.createTreeWalker(priceEl,NodeFilter.SHOW_TEXT,null,false);
    var node,last=null;
    while((node=walker.nextNode())){if(/[\d,]+\.\d{2}/.test(node.nodeValue))last=node;}
    if(last)last.nodeValue=last.nodeValue.replace(/[\d,]+\.\d{2}/,newPrice);
  });

  // 9. Hide unselected options + their spacers
  doc.querySelectorAll('table[id]').forEach(function(t){
    var m=(t.id||'').match(/^proposal-(?:enhanced|compact)-(\d+)-(air|hotel|car)-option$/);
    if(!m)return;
    if(!selectedKeys[m[1]+'-'+m[2]]){
      t.style.display='none';
      var next=t.nextSibling;
      while(next&&next.nodeType===3)next=next.nextSibling;
      if(next&&next.getAttribute&&next.getAttribute('role')==='none')next.style.display='none';
    }
  });

  // 10. Max width on outer table
  var preview=doc.getElementById('trip-preview');
  if(preview){preview.setAttribute('width','1000');preview.style.maxWidth='1000px';}

  // 11. Insert Important Notice + car warning before options body
  var bodyEl=doc.getElementById(pType==='proposal-compact'?'proposal-compact-body':'proposal-enhanced-body');
  if(bodyEl){
    var noticeRow=doc.createElement('tr');
    noticeRow.innerHTML='<td>'+IMPORTANT_NOTICE+(hasCarOption?CAR_WARNING:'')+'</td>';
    bodyEl.parentNode.insertBefore(noticeRow,bodyEl);
  }

  // 12. Style passenger name block
  var paxEl=doc.getElementById(pType+'-passengers-list');
  if(paxEl&&paxEl.textContent.trim()){
    var paxRow=doc.createElement('tr');
    paxRow.innerHTML='<td><div style="background:#fff;border:1px solid #e0e0e0;border-radius:4px;padding:12px 16px;margin:8px 0"><strong style="color:#ff2e5f;font-size:11px;display:block;margin-bottom:6px">✈️ PASSENGER NAME AS PER PHOTO ID / PASSPORT:</strong><span style="font-size:11px;line-height:1.6">'+paxEl.textContent.trim()+'</span></div></td>';
    if(bodyEl)bodyEl.parentNode.insertBefore(paxRow,bodyEl);
  }

  // 13. Append Additional Information before disclaimer
  var disclaimer=doc.getElementById(pType+'-agency-disclaimer-message');
  if(disclaimer){
    var aiRow=doc.createElement('tr');
    aiRow.innerHTML='<td>'+ADDITIONAL_INFO+'</td>';
    disclaimer.parentNode.insertBefore(aiRow,disclaimer);
  }

  // 14. Print CSS
  var ps=doc.createElement('style');
  ps.textContent='@media print{body{margin:0}table{max-width:1000px!important}@page{margin:1cm}.proposal-enhanced-page-break,.proposal-compact-page-break{page-break-inside:avoid}}';
  doc.head.appendChild(ps);
}

function serializeDoc(doc){
  return '<!DOCTYPE html>'+doc.documentElement.outerHTML;
}

// ── Inject TIDY button ────────────────────────────────────────────────────────
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

      // Panel - fixed, flush to right of modal
      +'#ctTidyPanel{'
      +'position:fixed;top:80px;z-index:1000010;'
      +'background:#fff;border:1.5px solid #f0d0d8;border-radius:10px 0 0 10px;'
      +'box-shadow:-4px 4px 18px rgba(0,0,0,.18);'
      +'font-family:Aptos,Arial,sans-serif;font-size:11px;'
      +'width:260px;transition:width 0.2s ease;overflow:hidden;}'
      +'#ctTidyPanel.ct-minimized{width:36px;}'

      +'#ctTidyPanelInner{padding:12px 14px;}'
      +'#ctTidyPanel.ct-minimized #ctTidyPanelInner{display:none;}'

      // Minimize tab - always visible on left edge
      +'#ctTidyTab{'
      +'position:absolute;left:0;top:0;bottom:0;width:36px;'
      +'display:flex;flex-direction:column;align-items:center;justify-content:center;'
      +'cursor:pointer;background:linear-gradient(135deg,#ff2e5f,#ff6b9d);'
      +'border-radius:8px 0 0 8px;gap:4px;}'
      +'#ctTidyTab span{color:#fff;font-size:9px;font-weight:800;writing-mode:vertical-rl;'
      +'text-orientation:mixed;transform:rotate(180deg);letter-spacing:.5px;text-transform:uppercase;}'
      +'#ctTidyTab .ct-tabarrow{color:rgba(255,255,255,.8);font-size:12px;}'

      +'#ctTidyPanelInner{padding:10px 12px 12px 48px;}'

      +'#ctTidyPanel .ct-pt{font-size:9px;font-weight:800;color:#ff2e5f;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;}'
      +'#ctTidyPanel .ct-or{display:flex;align-items:center;gap:6px;margin-bottom:5px;}'
      +'#ctTidyPanel .ct-or input[type=checkbox]{accent-color:#ff2e5f;width:12px;height:12px;flex-shrink:0;cursor:pointer;}'
      +'#ctTidyPanel .ct-ol{flex:1;font-weight:600;color:#333;cursor:pointer;font-size:10.5px;}'
      +'#ctTidyPanel .ct-pi{border:1px solid #ddd;border-radius:4px;padding:3px 6px;font-size:10px;width:70px;text-align:right;font-family:Arial,sans-serif;}'
      +'#ctTidyPanel .ct-pi:focus{border-color:#ff2e5f;outline:none;}'
      +'#ctTidyPanel .ct-ml{font-size:9px;color:#999;white-space:nowrap;}'
      +'#ctTidyPanel .ct-mi{border:1px solid #ffccd5;border-radius:4px;padding:3px 6px;font-size:10px;width:50px;text-align:right;font-family:Arial,sans-serif;background:#fff9fa;}'
      +'#ctTidyPanel .ct-mi:focus{border-color:#ff2e5f;outline:none;}'
      +'#ctTidyPanel .ct-div{height:1px;background:#f0d0d8;margin:8px 0;}'
      +'#ctTidyPanel .ct-br{display:flex;flex-direction:column;gap:6px;margin-top:10px;}'
      +'#ctTidyPanel .ct-ab{width:100%;padding:7px;border:none;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;font-family:Aptos,Arial,sans-serif;text-align:center;}'
      +'#ctTidyPanel .ct-cb{background:#ff2e5f;color:#fff;}'
      +'#ctTidyPanel .ct-cb:hover{background:#d4234e;}'
      +'#ctTidyPanel .ct-pb{background:#f5f5f5;color:#333;border:1px solid #ddd;}'
      +'#ctTidyPanel .ct-pb:hover{background:#e8e8e8;}';
    document.head.appendChild(ts);
  }

  var wrap=document.createElement('div');
  wrap.className='scope-wrapper sabre-ngv-themes-components-form';
  wrap.id='ctTidyButton';
  wrap.innerHTML='<button class="force-inline-block-wrapper button regular primary ct-tidy-btn" type="button">TIDY</button>';
  actionButtons.insertBefore(wrap,buttons[1].parentElement);
  wrap.querySelector('button').addEventListener('click',showPanel);
}

// Position panel flush to right edge of modal
function positionPanel(){
  var panel=document.getElementById('ctTidyPanel');
  if(!panel)return;
  var modal=document.querySelector('.trip-proposal-share-modal');
  if(!modal)return;
  var rect=modal.getBoundingClientRect();
  panel.style.left=(rect.right)+'px';
}

var _opts=[];
var _minimized=false;

function showPanel(){
  if(document.getElementById('ctTidyPanel')){
    // Toggle minimize if already open
    toggleMinimize();
    return;
  }
  var srcdoc=getSrcdoc();
  if(!srcdoc){alert('Could not find proposal. Click Share first.');return;}
  var doc=parseSrcdoc(srcdoc);
  var pType=getProposalType(doc);
  _opts=findOptions(doc,pType);
  if(!_opts.length){alert('No options found in proposal.');return;}

  var rows=_opts.map(function(o){
    return '<div class="ct-or">'
      +'<input type="checkbox" checked class="ct-ck" data-key="'+o.key+'" id="ctck'+o.key+'">'
      +'<label class="ct-ol" for="ctck'+o.key+'">'+o.icon+' '+o.label+'</label>'
      +(o.price
        ?'<input class="ct-pi" type="text" value="'+o.price+'" data-pf="'+o.key+'" data-base="'+o.price+'" placeholder="Price">'
         +'<span class="ct-ml">+$</span>'
         +'<input class="ct-mi" type="text" value="" data-mf="'+o.key+'" placeholder="merch">'
        :'')
      +'</div>';
  }).join('');

  var panel=document.createElement('div');
  panel.id='ctTidyPanel';
  panel.innerHTML=
    '<div id="ctTidyTab">'
      +'<span class="ct-tabarrow" id="ctTabArrow">◀</span>'
      +'<span>TIDY</span>'
    +'</div>'
    +'<div id="ctTidyPanelInner">'
      +'<div class="ct-pt">Options to include</div>'
      +rows
      +'<div class="ct-div"></div>'
      +'<div class="ct-br">'
        +'<button class="ct-ab ct-cb" id="ctDoCopy">📋 Copy &amp; Apply</button>'
        +'<button class="ct-ab ct-pb" id="ctDoPDF">🖨 Print / Save PDF</button>'
      +'</div>'
    +'</div>';

  document.body.appendChild(panel);
  positionPanel();

  document.getElementById('ctTidyTab').addEventListener('click',toggleMinimize);
  document.getElementById('ctDoCopy').addEventListener('click',function(){runTidy('copy');});
  document.getElementById('ctDoPDF').addEventListener('click',function(){runTidy('pdf');});

  // Wire merch inputs
  panel.querySelectorAll('.ct-mi').forEach(function(mi){
    mi.addEventListener('input',function(){
      var key=mi.dataset.mf;
      var pi=panel.querySelector('.ct-pi[data-pf="'+key+'"]');
      if(!pi)return;
      var base=parseFloat(pi.dataset.base)||0;
      var merch=parseFloat(mi.value)||0;
      pi.value=(base+merch).toFixed(2);
    });
  });

  // Reposition on scroll/resize
  window.addEventListener('resize',positionPanel);
  window.addEventListener('scroll',positionPanel,true);
}

function toggleMinimize(){
  var panel=document.getElementById('ctTidyPanel');
  if(!panel)return;
  _minimized=!_minimized;
  panel.classList.toggle('ct-minimized',_minimized);
  var arrow=document.getElementById('ctTabArrow');
  if(arrow)arrow.textContent=_minimized?'▶':'◀';
}

// ── Core ──────────────────────────────────────────────────────────────────────
function runTidy(mode){
  var srcdoc=getSrcdoc();
  if(!srcdoc){alert('Could not find proposal.');return;}

  var panel=document.getElementById('ctTidyPanel');

  var selectedKeys={};
  panel.querySelectorAll('.ct-ck').forEach(function(cb){
    if(cb.checked)selectedKeys[cb.dataset.key]=true;
  });
  if(!Object.keys(selectedKeys).length){alert('Please select at least one option.');return;}

  var priceOverrides={};
  panel.querySelectorAll('.ct-pi').forEach(function(inp){
    var v=inp.value.trim();
    if(v)priceOverrides[inp.dataset.pf]=v;
  });

  var doc=parseSrcdoc(srcdoc);
  var pType=getProposalType(doc);
  var hasCarOption=!!doc.querySelector('[id*="-car-option"]');

  applyTransforms(doc,pType,selectedKeys,priceOverrides,hasCarOption);

  var out=serializeDoc(doc);

  if(mode==='pdf'){
    var win=window.open('','_blank','width=900,height=900,scrollbars=yes');
    if(!win){alert('Please allow popups for this site.');return;}
    win.document.open();win.document.write(out);win.document.close();
    setTimeout(function(){win.print();},800);
    return;
  }

  // Write transformed HTML back to iframe srcdoc, then trigger Sabre's Copy button
  var iframe=getIframe();
  if(!iframe){alert('Could not find proposal iframe.');return;}
  iframe.setAttribute('srcdoc',out);

  // Find Sabre's native Copy button and click it after a short delay
  setTimeout(function(){
    var sabreCopy=Array.from(
      document.querySelectorAll('.trip-proposal-share-modal .modal-footer .action-buttons button')
    ).find(function(b){return b.textContent.trim()==='Copy';});

    if(sabreCopy){
      sabreCopy.click();
      // Flash feedback on our button
      var btn=document.getElementById('ctDoCopy');
      if(btn){
        var orig=btn.textContent;
        btn.textContent='✓ Copied!';
        btn.style.background='#28a745';
        setTimeout(function(){btn.textContent=orig;btn.style.background='';},2000);
      }
    }else{
      alert('Could not find Sabre Copy button.');
    }
  },300);
}

// ── Observer ──────────────────────────────────────────────────────────────────
var _obs=new MutationObserver(function(){injectTidyButton();});
if(document.body)_obs.observe(document.body,{childList:true,subtree:true});
setTimeout(injectTidyButton,500);

})();
