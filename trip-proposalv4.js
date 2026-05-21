(function(){

var ADDITIONAL_INFO='<table width="100%" style="margin-top:24px;border-collapse:collapse;font-family:Arial,sans-serif"><tr><td style="background:#f5f5f5;border:1px solid #e0e0e0;border-left:3px solid #ff2e5f;padding:14px 16px;border-radius:4px"><strong style="color:#ff2e5f;font-size:11px;display:block;margin-bottom:8px">ADDITIONAL INFORMATION</strong><p style="margin:0 0 6px;font-size:11px;color:#333;line-height:1.5">All passport and visa requirements are the responsibility of the traveller.</p><p style="margin:0 0 6px;font-size:11px;color:#333;line-height:1.5">If you need more information about visas, passports, health and security for each country, please visit: <a href="https://www.fctgtravelnews.com/" style="color:#ff2e5f">Travel News</a></p><p style="margin:0 0 6px;font-size:11px;color:#333;line-height:1.5">All prices indicated are subject to change and availability. In the event of a refund request, some taxes may not be refunded.</p><p style="margin:0;font-size:11px;color:#333;line-height:1.5">For more information on these topics, please contact your dedicated team.</p></td></tr></table>';

var IMPORTANT_NOTICE='<table width="100%" style="margin:16px 0;border-collapse:collapse"><tr><td><div style="background:#f5f5f5;border:1px solid #d0d0d0;border-left:3px solid #ff2e5f;padding:10px 14px;border-radius:4px"><strong style="color:#ff2e5f;font-size:11px;display:block;margin-bottom:6px">IMPORTANT NOTICE</strong><ul style="font-style:italic;font-size:10px;margin:0;padding-left:18px;color:#333;line-height:1.4"><li style="margin-bottom:4px">All prices quoted are subject to change until tickets are issued, even if tentatively holding.</li><li style="margin-bottom:4px">Airlines reserve the right to change surcharges, fare levels and taxes without notice.</li><li>Corporate Traveller fees are not included in your quote, as per schedule of fees, and will be charged at the time of invoicing.</li></ul></div></td></tr></table>';

var CAR_WARNING='<table width="100%" style="margin:16px 0;border-collapse:collapse"><tr><td><div style="background:#fff;border:2px solid #ff9800;border-radius:6px;padding:12px 14px"><strong style="color:#ff9800;font-size:11px;display:block;margin-bottom:6px">⚠️ CAR RENTAL IMPORTANT INFORMATION</strong><ul style="font-size:10px;color:#333;margin:0;padding-left:18px;line-height:1.4"><li style="margin-bottom:4px">You will need a PHYSICAL credit card (not debit) in the main driver\'s name upon pick up.</li><li style="margin-bottom:4px">Tolls cannot be charged back to Corporate Traveller for rentals with Avis or Budget.</li><li style="margin-bottom:4px">Bookings with personal memberships attached i.e. Hertz Gold/Avis Wizard will override any chargeback of the rental to Corporate Traveller and charge your card.</li><li>For international rentals: International drivers license may be required.</li></ul></div></td></tr></table>';

// ── Helpers ───────────────────────────────────────────────────────────────────
// Sabre runs our script inside a child iframe - all UI elements live in parent
var _pd=(window.parent&&window.parent.document)||document;
function getIframe(){return _pd.querySelector('.share-container iframe');}
function getSrcdoc(){var i=getIframe();return i?i.getAttribute('srcdoc'):null;}
function parseSrcdoc(html){return new DOMParser().parseFromString(html,'text/html');}
function getProposalType(doc){return doc.querySelector('[class*="proposal-compact"]')?'proposal-compact':'proposal-enhanced';}

function findOptions(doc,pType){
  var opts=[],seen={};
  doc.querySelectorAll('table[id]').forEach(function(t){
    var m=(t.id||'').match(/^proposal-(?:enhanced|compact)-(\d+)-(air|hotel|car)-option$/);
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
    opts.push({key:key,num:num,type:type,label:label,icon:icon,price:price});
  });
  return opts;
}

// ── DOM transforms ────────────────────────────────────────────────────────────
function applyTransforms(doc,pType,selectedKeys,priceOverrides,hasCarOption){

  // 1. Colour option titles
  ['air','hotel','car'].forEach(function(type){
    doc.querySelectorAll('[id*="-'+type+'-segment-title"]').forEach(function(el){el.style.color='#ff2e5f';});
  });
  doc.querySelectorAll('strong').forEach(function(el){
    if(/^(Flight|Hotel|Car) Option \d+$/.test(el.textContent.trim()))el.style.color='#ff2e5f';
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
        var pt=cells[0].textContent.trim();
        var qty=cells[4].textContent.trim().replace('x ','');
        if(pt&&qty)paxParts.push(qty+'x '+pt);
      });
      if(paxParts.length){
        var num=(optTable.id.match(/proposal-enhanced-(\d+)-air-option/)||[])[1];
        var headerTable=doc.getElementById('proposal-enhanced-'+num+'-air-header');
        if(headerTable){
          var fnRow=doc.createElement('tr');
          fnRow.innerHTML='<td colspan="2" style="padding:6px 16px 8px;font-size:10px;color:#666;border-top:1px solid #e5e5e5;text-align:right;">Quoted price includes: '+paxParts.join(' · ')+'</td>';
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

  // 6. Fix outer centering only - the body-level td that centers everything
  doc.querySelectorAll('td[align="center"][width="100%"]').forEach(function(el){
    el.setAttribute('align','left');
  });

  // 7. Apply price overrides
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

  // 8. Hide unselected options + spacers
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

  // 9. Max width
  var preview=doc.getElementById('trip-preview');
  if(preview){preview.setAttribute('width','1000');preview.style.maxWidth='1000px';}

  // 10. Important notice + car warning before options
  var bodyEl=doc.getElementById(pType==='proposal-compact'?'proposal-compact-body':'proposal-enhanced-body');
  if(bodyEl){
    var noticeRow=doc.createElement('tr');
    noticeRow.innerHTML='<td>'+IMPORTANT_NOTICE+(hasCarOption?CAR_WARNING:'')+'</td>';
    bodyEl.parentNode.insertBefore(noticeRow,bodyEl);
  }

  // 11. Passenger name block
  var paxEl=doc.getElementById(pType+'-passengers-list');
  if(paxEl&&paxEl.textContent.trim()){
    var paxRow=doc.createElement('tr');
    paxRow.innerHTML='<td><div style="background:#fff;border:1px solid #e0e0e0;border-radius:4px;padding:12px 16px;margin:8px 0"><strong style="color:#ff2e5f;font-size:11px;display:block;margin-bottom:6px">✈️ PASSENGER NAME AS PER PHOTO ID / PASSPORT:</strong><span style="font-size:11px;line-height:1.6">'+paxEl.textContent.trim()+'</span></div></td>';
    if(bodyEl)bodyEl.parentNode.insertBefore(paxRow,bodyEl);
  }

  // 12. Additional information before disclaimer
  var disclaimer=doc.getElementById(pType+'-agency-disclaimer-message');
  if(disclaimer){
    var aiRow=doc.createElement('tr');
    aiRow.innerHTML='<td>'+ADDITIONAL_INFO+'</td>';
    disclaimer.parentNode.insertBefore(aiRow,disclaimer);
  }

  // 13. Transform fare rules
  function chipHTML(text,bg,color){
    return'<span style="display:inline-block;background:'+bg+';color:'+color+';border-radius:4px;padding:2px 7px;font-size:9px;margin:2px 3px 2px 0;border:1px solid rgba(0,0,0,0.08)">'+text+'</span>';
  }
  function reformatFareValue(val,isExchange){
    if(!val)return'';
    val=val.trim();if(!val)return'';
    var parts=val.split(';').map(function(p){
      p=p.trim();if(!p)return null;
      // Non-refundable check - just highlight those words
      var hasNR=/non.?refundable|no refund/i.test(p);
      var m=p.match(/\(([^)]+)\)\s*([\d,.]+)\s*(AUD|USD|EUR|GBP|NZD)?/i);
      if(m){
        var descriptor=m[1].trim();
        var amount=m[2].trim();
        var currency=m[3]||'AUD';
        var label=amount+' '+currency+' ('+descriptor+')';
        if(hasNR)return chipHTML('<strong style="color:#d81525">NON REFUNDABLE</strong> '+label,'#fff0f0','#333');
        return chipHTML(label,'#f5f5f5','#444');
      }
      if(hasNR)return chipHTML('<strong style="color:#d81525">NON REFUNDABLE</strong>','#fff0f0','#333');
      return chipHTML(p,'#f5f5f5','#444');
    }).filter(Boolean);
    var html=parts.join('');
    if(isExchange)html+='<br><em style="font-size:9px;color:#999;margin-left:2px">Changes are subject to class availability and additional fare/tax difference applies.</em>';
    return html;
  }
  function reformatFlightConditions(val){
    if(!val)return'';
    return val.split(';').map(function(p){
      p=p.trim();if(!p)return null;
      var isTTL=/ticketing time limit/i.test(p);
      return chipHTML(
        isTTL?'<strong>⏰ '+p+'</strong>':p,
        isTTL?'#fff8e1':'#f0f4ff',
        isTTL?'#7a5800':'#334'
      );
    }).filter(Boolean).join('');
  }

  doc.querySelectorAll('[id*="-fare-rules"]').forEach(function(el){
    if(!el.id.match(/^proposal-(enhanced|compact)-fare-rules$/))return;
    var chips=[];

    var refundEl=el.querySelector('[id*="-penalties-refund-value"]');
    var refundVal=refundEl?refundEl.textContent.trim():'';
    if(refundVal){
      chips.push('<div style="margin-bottom:4px"><span style="font-size:9px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.4px;margin-right:4px">Cancellation:</span>'+reformatFareValue(refundVal,false)+'</div>');
    }

    var exchEl=el.querySelector('[id*="-penalties-exchange-value"]');
    var exchVal=exchEl?exchEl.textContent.trim():'';
    if(exchVal){
      chips.push('<div style="margin-bottom:4px"><span style="font-size:9px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.4px;margin-right:4px">Changes:</span>'+reformatFareValue(exchVal,true)+'</div>');
    }

    var condEl=el.querySelector('[id*="-flight-conditions-value"]');
    var condVal=condEl?condEl.textContent.trim():'';
    if(condVal){
      chips.push('<div style="margin-bottom:2px"><span style="font-size:9px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.4px;margin-right:4px">Conditions:</span>'+reformatFlightConditions(condVal)+'</div>');
    }

    if(!chips.length){el.style.display='none';return;}

    el.innerHTML='<tr><td style="padding:10px 16px;border-top:1px solid #e8e8e8">'
      +'<div style="font-size:9px;font-weight:800;color:#999;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">Fare Rules</div>'
      +chips.join('')
      +'</td></tr>';
  });

  // 13b. Aircraft/baggage - replace bold labels with icon inline format (both views)
  // Enhanced view - aircraft label/value pairs (seats/meal already removed, aircraft+baggage remain)
  doc.querySelectorAll('[id*="-aircraft-label"]').forEach(function(label){
    var aircraftSpan=label.nextElementSibling;
    // Find baggage label/value in same td
    var td=label.closest('td');
    if(!td)return;
    var baggageLabel=td.querySelector('[id*="-baggage-label"]');
    var baggageSpan=baggageLabel?baggageLabel.nextElementSibling:null;
    var aircraftText=aircraftSpan?aircraftSpan.textContent.trim():'';
    var baggageText=baggageSpan?baggageSpan.textContent.trim():'';
    // Build replacement
    var parts=[];
    if(aircraftText)parts.push('✈ '+aircraftText);
    if(baggageText)parts.push('🧳 '+baggageText);
    if(!parts.length)return;
    // Insert styled div before label, remove original elements
    var div=doc.createElement('div');
    div.style.cssText='font-size:10px;color:#888;font-style:italic;padding-top:4px;';
    div.textContent=parts.join(' · ');
    // Remove all the original label+span pairs for aircraft and baggage
    [label,aircraftSpan,baggageLabel,baggageSpan].forEach(function(el){
      if(el&&el.parentNode)el.parentNode.removeChild(el);
    });
    td.appendChild(div);
  });

  // 13c. Compact hotel rows - add small padding between each tr
  doc.querySelectorAll('[id*="-hotel-segment-"][id*="-content"] table table tr').forEach(function(tr){
    var td=tr.querySelector('td');
    if(td&&!td.getAttribute('style')){
      td.style.paddingBottom='4px';
    }else if(td){
      var s=td.getAttribute('style');
      if(s.indexOf('padding-bottom')===-1)td.setAttribute('style',s+';padding-bottom:4px');
    }
  });

  // 14. Outlook/email cleanup - remove role="presentation" and !important only
  // Do NOT strip box-sizing - removing it causes padding to collapse in email clients
  doc.querySelectorAll('[role="presentation"]').forEach(function(el){el.removeAttribute('role');});
  doc.querySelectorAll('[style]').forEach(function(el){
    var s=el.getAttribute('style');
    s=s.replace(/\s*!important/g,'');
    el.setAttribute('style',s);
  });

  // 14. Inject Outlook-safe padding overrides to compensate for box-sizing removal
  // and generally ensure comfortable spacing when pasted into email clients
  var outlookStyle=doc.createElement('style');
  outlookStyle.textContent=
    '.proposal-enhanced-padding{padding-top:8px;padding-right:16px;padding-bottom:8px;}'
    +'.proposal-enhanced-padding-left-48px{padding-left:48px;}'
    +'.proposal-enhanced-product-details-left-row{padding-top:8px;padding-bottom:8px;}'
    +'.proposal-enhanced-product-details-left-bottom-row{padding-bottom:8px;padding-right:16px;padding-left:48px;}'
    +'.proposal-enhanced-segment-header{padding:8px 16px;}'
    +'.proposal-enhanced-segment-header-small{padding:8px 16px;}'
    +'.proposal-enhanced-rate-breakdown{padding:8px 48px;}'
    +'.proposal-enhanced-policy{padding:8px 16px 8px 48px;}'
    +'.proposal-enhanced-agency-message-info{padding:8px 8px 8px 0;}'
    +'.proposal-enhanced-agency-disclaimer-message-info{padding:0 16px 8px 16px;}'
    +'.proposal-enhanced-main-header-padding{padding-left:16px;}'
    +'.proposal-enhanced-price-break-down-table-wrapper{padding:8px 16px 8px 48px;}'
    +'.proposal-enhanced-fare-rules-table{padding:0 16px 8px 48px;}'
    +'.proposal-compact-product-details{padding:8px 16px;}'
    +'.proposal-compact-segment-header{padding:8px 16px;}'
    +'table{border-spacing:0;}';
  doc.head.appendChild(outlookStyle);

  // 15. Print CSS
  var ps=doc.createElement('style');
  ps.textContent='@media print{body{margin:0}@page{margin:1cm}.proposal-enhanced-page-break,.proposal-compact-page-break{page-break-inside:avoid}}';
  doc.head.appendChild(ps);
}

function serializeDoc(doc){
  // Serialize just the body innerHTML for cleaner email pasting
  return doc.body.innerHTML;
}

// ── Styles ────────────────────────────────────────────────────────────────────
function injectStyles(){
  if(_pd.getElementById('ctTidyStyle'))return;
  var ts=_pd.createElement('style');ts.id='ctTidyStyle';
  ts.textContent=
    '.ct-tidy-btn{background-color:#ff2e5f!important;color:#fff!important;}'

    // Panel sits above modal footer, full width, inside modal
    +'#ctTidyPanel{'
    +'position:absolute;left:0;right:0;bottom:56px;'
    +'background:#fff;border-top:2px solid #ff2e5f;'
    +'box-shadow:0 -4px 16px rgba(0,0,0,.12);'
    +'font-family:Aptos,Arial,sans-serif;font-size:11px;'
    +'z-index:9999;}'

    // Header bar - always visible
    +'#ctTidyHeader{'
    +'display:flex;align-items:center;justify-content:space-between;'
    +'background:linear-gradient(135deg,#ff2e5f,#ff6b9d);'
    +'padding:7px 14px;cursor:pointer;}'
    +'#ctTidyHeader .ct-htitle{'
    +'color:#fff;font-size:10px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;}'
    +'#ctTidyHeader .ct-hbtns{display:flex;gap:8px;align-items:center;}'
    +'#ctTidyHeader button{'
    +'background:rgba(255,255,255,.2);border:none;color:#fff;'
    +'border-radius:4px;padding:2px 8px;font-size:11px;cursor:pointer;'
    +'font-family:inherit;}'
    +'#ctTidyHeader button:hover{background:rgba(255,255,255,.35);}'

    // Collapsible body
    +'#ctTidyBody{display:block;}'
    +'#ctTidyBody.ct-collapsed{display:none;}'

    // Scrollable options area
    +'#ctTidyOpts{'
    +'max-height:160px;overflow-y:auto;'
    +'padding:8px 14px;border-bottom:1px solid #f0d0d8;}'

    +'#ctTidyPanel .ct-or{display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid #fce8ee;}'
    +'#ctTidyPanel .ct-or:last-child{border-bottom:none;}'
    +'#ctTidyPanel .ct-or input[type=checkbox]{accent-color:#ff2e5f;width:13px;height:13px;flex-shrink:0;cursor:pointer;}'
    +'#ctTidyPanel .ct-ol{flex:1;font-weight:600;color:#333;cursor:pointer;font-size:10.5px;}'
    +'#ctTidyPanel .ct-pi{border:1px solid #ddd;border-radius:4px;padding:3px 6px;font-size:10px;width:75px;text-align:right;font-family:Arial,sans-serif;}'
    +'#ctTidyPanel .ct-pi:focus{border-color:#ff2e5f;outline:none;}'
    +'#ctTidyPanel .ct-ml{font-size:9px;color:#999;white-space:nowrap;}'
    +'#ctTidyPanel .ct-mi{border:1px solid #ffccd5;border-radius:4px;padding:3px 6px;font-size:10px;width:55px;text-align:right;font-family:Arial,sans-serif;background:#fff9fa;}'
    +'#ctTidyPanel .ct-mi:focus{border-color:#ff2e5f;outline:none;}'

    // Action buttons row
    +'#ctTidyFooter{display:flex;gap:8px;padding:8px 14px;}'
    +'#ctTidyPanel .ct-ab{flex:1;padding:7px;border:none;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;font-family:Aptos,Arial,sans-serif;}'
    +'#ctTidyPanel .ct-cb{background:#ff2e5f;color:#fff;}'
    +'#ctTidyPanel .ct-cb:hover{background:#d4234e;}'
    +'#ctTidyPanel .ct-pb{background:#f5f5f5;color:#333;border:1px solid #ddd;}'
    +'#ctTidyPanel .ct-pb:hover{background:#e8e8e8;}';
  _pd.head.appendChild(ts);
}

// ── Inject TIDY button ────────────────────────────────────────────────────────
function injectTidyButton(){
  var modal=_pd.querySelector('.trip-proposal-share-modal');
  if(!modal||_pd.getElementById('ctTidyButton'))return;
  var actionButtons=modal.querySelector('.modal-footer .action-buttons');
  if(!actionButtons)return;
  var buttons=actionButtons.querySelectorAll('button');
  if(buttons.length<2)return;
  injectStyles();
  var wrap=_pd.createElement('div');
  wrap.className='scope-wrapper sabre-ngv-themes-components-form';
  wrap.id='ctTidyButton';
  wrap.innerHTML='<button class="force-inline-block-wrapper button regular primary ct-tidy-btn" type="button">TIDY</button>';
  actionButtons.insertBefore(wrap,buttons[1].parentElement);
  wrap.querySelector('button').addEventListener('click',showPanel);
}

var _opts=[];
var _collapsed=false;

function showPanel(){
  // If panel exists, toggle collapse
  if(_pd.getElementById('ctTidyPanel')){
    toggleCollapse();
    return;
  }

  var srcdoc=getSrcdoc();
  if(!srcdoc){alert('Could not find proposal. Click Share first.');return;}
  var doc=parseSrcdoc(srcdoc);
  var pType=getProposalType(doc);
  _opts=findOptions(doc,pType);
  if(!_opts.length){alert('No options found in proposal.');return;}
  _collapsed=false;

  var modal=_pd.querySelector('.trip-proposal-share-modal .modal-content');
  if(!modal)return;
  modal.style.position='relative';

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

  var panel=_pd.createElement('div');
  panel.id='ctTidyPanel';
  panel.innerHTML=
    '<div id="ctTidyHeader">'
      +'<span class="ct-htitle">⚙ TIDY OPTIONS</span>'
      +'<div class="ct-hbtns">'
        +'<button id="ctTogglePanel">▼</button>'
        +'<button id="ctClosePanel">✕</button>'
      +'</div>'
    +'</div>'
    +'<div id="ctTidyBody">'
      +'<div id="ctTidyOpts">'+rows+'</div>'
      +'<div id="ctTidyFooter">'
        +'<button class="ct-ab ct-cb" id="ctDoCopy">📋 Apply</button>'
        +'<button class="ct-ab ct-pb" id="ctDoPDF">🖨 Print / Save PDF</button>'
      +'</div>'
    +'</div>';

  modal.appendChild(panel);

  _pd.getElementById('ctTidyHeader').addEventListener('click',function(e){
    // Only toggle if not clicking a button
    if(e.target.tagName!=='BUTTON')toggleCollapse();
  });
  _pd.getElementById('ctTogglePanel').addEventListener('click',toggleCollapse);
  _pd.getElementById('ctClosePanel').addEventListener('click',function(){panel.remove();});
  _pd.getElementById('ctDoCopy').addEventListener('click',function(){runTidy('copy');});
  _pd.getElementById('ctDoPDF').addEventListener('click',function(){runTidy('pdf');});

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
}

function toggleCollapse(){
  _collapsed=!_collapsed;
  var body=_pd.getElementById('ctTidyBody');
  var btn=_pd.getElementById('ctTogglePanel');
  if(body)body.classList.toggle('ct-collapsed',_collapsed);
  if(btn)btn.textContent=_collapsed?'▲':'▼';
}

// ── Core ──────────────────────────────────────────────────────────────────────
function runTidy(mode){
  var srcdoc=getSrcdoc();
  if(!srcdoc){alert('Could not find proposal.');return;}

  var panel=_pd.getElementById('ctTidyPanel');
  var selectedKeys={};
  panel.querySelectorAll('.ct-ck').forEach(function(cb){
    if(cb.checked)selectedKeys[cb.dataset.key]=true;
  });
  if(!Object.keys(selectedKeys).length){alert('Please select at least one option.');return;}

  var priceOverrides={};
  panel.querySelectorAll('.ct-pi').forEach(function(inp){
    var v=inp.value.trim();if(v)priceOverrides[inp.dataset.pf]=v;
  });

  var doc=parseSrcdoc(srcdoc);
  var pType=getProposalType(doc);
  var hasCarOption=!!doc.querySelector('[id*="-car-option"]');
  applyTransforms(doc,pType,selectedKeys,priceOverrides,hasCarOption);

  if(mode==='pdf'){
    // For PDF use full document
    var fullOut='<!DOCTYPE html>'+doc.documentElement.outerHTML;
    var win=window.open('','_blank','width=900,height=900,scrollbars=yes');
    if(!win){alert('Please allow popups for this site.');return;}
    win.document.open();win.document.write(fullOut);win.document.close();
    setTimeout(function(){win.print();},800);
    return;
  }

  // Write transformed HTML back to iframe - user then clicks Sabre's Copy button
  var iframe=getIframe();
  if(!iframe){alert('Could not find proposal iframe.');return;}

  var btn=_pd.getElementById('ctDoCopy');
  if(btn){btn.textContent='⏳ Applying...';btn.disabled=true;}

  var transformedHTML='<!DOCTYPE html>'+doc.documentElement.outerHTML;

  iframe.addEventListener('load',function onLoad(){
    iframe.removeEventListener('load',onLoad);
    if(btn){
      btn.textContent='✓ Applied! Click Copy >';
      btn.style.background='#28a745';
      btn.disabled=false;
      setTimeout(function(){
        btn.textContent='📋 Apply';
        btn.style.background='';
      },6000);
    }
  },{once:true});

  iframe.setAttribute('srcdoc',transformedHTML);
}

// ── Observer ──────────────────────────────────────────────────────────────────
var _obs=new MutationObserver(function(){injectTidyButton();});
if(_pd.body)_obs.observe(_pd.body,{childList:true,subtree:true});
setTimeout(injectTidyButton,500);

})();
