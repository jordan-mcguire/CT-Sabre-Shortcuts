(function(){

var ADDITIONAL_INFO='<table width="100%" style="margin-top:24px;border-collapse:collapse;font-family:Arial,sans-serif"><tr><td style="background:#f5f5f5;border:1px solid #e0e0e0;border-left:3px solid #ff2e5f;padding:14px 16px;border-radius:4px"><strong style="color:#ff2e5f;font-size:11px;display:block;margin-bottom:8px">ADDITIONAL INFORMATION</strong><p style="margin:0 0 6px;font-size:11px;color:#333;line-height:1.5">All passport and visa requirements are the responsibility of the traveller.</p><p style="margin:0 0 6px;font-size:11px;color:#333;line-height:1.5">If you need more information about visas, passports, health and security for each country, please visit: <a href="https://www.fctgtravelnews.com/" style="color:#ff2e5f">Travel News</a></p><p style="margin:0 0 6px;font-size:11px;color:#333;line-height:1.5">All prices indicated are subject to change and availability. In the event of a refund request, some taxes may not be refunded.</p><p style="margin:0;font-size:11px;color:#333;line-height:1.5">For more information on these topics, please contact your dedicated team.</p></td></tr></table>';

var ADDITIONAL_INFO_DOMESTIC='<table width="100%" style="margin-top:24px;border-collapse:collapse;font-family:Arial,sans-serif"><tr><td style="background:#f5f5f5;border:1px solid #e0e0e0;border-left:3px solid #ff2e5f;padding:14px 16px;border-radius:4px"><strong style="color:#ff2e5f;font-size:11px;display:block;margin-bottom:8px">ADDITIONAL INFORMATION</strong><p style="margin:0 0 4px;font-size:10px;color:#333;line-height:1.35">All prices indicated are subject to change and availability.</p><p style="margin:0 0 4px;font-size:10px;color:#333;line-height:1.35">All standard domestic airfares are non refundable, unless a refundable fare is specified / requested (i.e. Flex.)</p><p style="margin:0 0 4px;font-size:10px;color:#333;line-height:1.35">Airline change fees for domestic flights range from $50-110 per person, per flight, and are in addition to fare/tax difference.</p><p style="margin:0 0 4px;font-size:10px;color:#333;line-height:1.35">Jetstar flights and Virgin Lite fares cannot be cancelled or held in credit.</p><p style="margin:0;font-size:10px;color:#333;line-height:1.35">For more information on these topics, please contact your dedicated team.</p></td></tr></table>';

var IMPORTANT_NOTICE='<table width="100%" style="margin:8px 0 20px 0;border-collapse:collapse"><tr><td style="padding:7px 12px;border:1px solid #e0e0e0;border-radius:3px;background:#fafafa"><span style="font-size:9px;color:#999;line-height:1.8;font-family:Arial,sans-serif">· All prices are subject to change until tickets are issued, even if tentatively holding.<br>· Airlines reserve the right to change surcharges, fare levels and taxes without notice.<br>· Corporate Traveller fees are not included in your quote and will be charged at time of invoicing per schedule of fees.</span></td></tr></table>';

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
function applyTransforms(doc,pType,selectedKeys,priceOverrides,hasCarOption,tripType){

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

  // 9b. Restyle header - minimal: small logo left, proposal ID chip right
  var headerRow=doc.querySelector('.proposal-enhanced-main-header-row,.proposal-compact-main-header-row');
  if(headerRow){
    // Get existing logo img src
    var logoImg=doc.getElementById(pType+'-agency-logo-header');
    var logoSrc=logoImg?logoImg.querySelector('img')?logoImg.querySelector('img').getAttribute('src'):'':'';
    // Get proposal ID
    var propIdEl=doc.getElementById(pType+'-proposal-id');
    var propId=propIdEl?propIdEl.textContent.trim():'';
    // Build clean header
    headerRow.innerHTML='<td style="padding:10px 16px;border-bottom:1px solid #ebebeb">'
      +'<table width="100%" border="0" cellpadding="0" cellspacing="0"><tr>'
      +'<td style="vertical-align:middle">'
      +(logoSrc?'<img src="'+logoSrc+'" style="height:48px;width:auto;display:block" alt="Corporate Traveller"/>':'')
      +'</td>'
      +'<td style="vertical-align:middle;text-align:right">'
      +(propId?'<span style="display:inline-block;border:1px solid #e0e0e0;border-radius:4px;padding:2px 10px;font-size:9px;color:#666;font-family:Arial,sans-serif">Trip Proposal ID: <strong style="color:#333">'+propId+'</strong></span>':'')
      +'</td>'
      +'</tr></table>'
      +'</td>';
  }
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
    aiRow.innerHTML='<td>'+(tripType==='domestic'?ADDITIONAL_INFO_DOMESTIC:ADDITIONAL_INFO)+'</td>';
    disclaimer.parentNode.insertBefore(aiRow,disclaimer);
  }

  // 13. Transform fare rules
  function chipHTML(text,bg,color,border){
    return'<span style="display:inline-block;background:'+bg+';color:'+color+';border-radius:3px;padding:1px 5px;font-size:9px;margin:1px 2px 1px 0;border:1px solid '+(border||'rgba(0,0,0,0.08)')+'">'+text+'</span>';
  }
  function sectionLabel(text){
    return'<span style="font-size:8.5px;font-weight:800;color:#888;text-transform:uppercase;letter-spacing:.4px;margin-right:3px;margin-left:6px">'+text+'</span>';
  }
  function reformatFareValue(val){
    if(!val)return'';
    val=val.trim();if(!val)return'';
    return val.split(';').map(function(p){
      p=p.trim();if(!p)return null;
      var hasNR=/non.?refundable|no refund/i.test(p);
      var m=p.match(/\(([^)]+)\)\s*([\d,.]+)\s*(AUD|USD|EUR|GBP|NZD)?/i);
      if(m){
        var label=m[2]+(m[3]?' '+m[3]:'')+' ('+m[1].trim()+')';
        if(hasNR)return chipHTML('<strong style="color:#d81525">NON REFUNDABLE</strong> '+label,'#fff0f0','#333','#f5c6c6');
        return chipHTML(label,'#f5f5f5','#555');
      }
      if(hasNR)return chipHTML('<strong style="color:#d81525">NON REFUNDABLE</strong>','#fff0f0','#333','#f5c6c6');
      return chipHTML(p,'#f5f5f5','#555');
    }).filter(Boolean).join('');
  }
  function reformatConditions(val){
    if(!val)return'';
    return val.split(';').map(function(p){
      p=p.trim();if(!p)return null;
      var isTTL=/ticketing time limit/i.test(p);
      return chipHTML(isTTL?'⏰ <strong>'+p+'</strong>':p,isTTL?'#fff8e1':'#f0f4ff',isTTL?'#7a5800':'#334',isTTL?'#ffe082':'#d0d8f0');
    }).filter(Boolean).join('');
  }

  doc.querySelectorAll('[id*="-fare-rules"]').forEach(function(el){
    if(!el.id.match(/^proposal-(enhanced|compact)-fare-rules$/))return;
    var inline='';

    var refundEl=el.querySelector('[id*="-penalties-refund-value"]');
    var refundVal=refundEl?refundEl.textContent.trim():'';
    if(refundVal)inline+=sectionLabel('Cancellation:')+reformatFareValue(refundVal);

    var exchEl=el.querySelector('[id*="-penalties-exchange-value"]');
    var exchVal=exchEl?exchEl.textContent.trim():'';
    if(exchVal)inline+=sectionLabel('Changes:')+reformatFareValue(exchVal);

    var condEl=el.querySelector('[id*="-flight-conditions-value"]');
    var condVal=condEl?condEl.textContent.trim():'';
    if(condVal)inline+=sectionLabel('Conditions:')+reformatConditions(condVal);

    if(!inline){el.style.display='none';return;}

    var exchNote=exchVal?'<div style="font-size:8.5px;color:#aaa;font-style:italic;margin-top:3px;padding-left:2px">Changes are subject to class availability and additional fare/tax difference applies.</div>':'';

    el.innerHTML='<tr><td style="padding:8px 16px;border-top:1px solid #ebebeb">'
      +'<div style="font-size:8.5px;font-weight:800;color:#bbb;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Fare Rules</div>'
      +'<div style="line-height:1.8">'+inline+'</div>'
      +exchNote
      +'</td></tr>';
  });

  // 13b. Aircraft/baggage - replace bold labels with icon inline format
  doc.querySelectorAll('[id*="-aircraft-label"]').forEach(function(label){
    var aircraftSpan=label.nextElementSibling;
    var td=label.closest('td');
    if(!td)return;
    var baggageLabel=td.querySelector('[id*="-baggage-label"]');
    var baggageSpan=baggageLabel?baggageLabel.nextElementSibling:null;
    var aircraftText=aircraftSpan?aircraftSpan.textContent.trim():'';
    var baggageText=baggageSpan?baggageSpan.textContent.trim():'';
    var parts=[];
    if(aircraftText)parts.push('✈ '+aircraftText);
    if(baggageText)parts.push('🧳 '+baggageText);
    if(!parts.length)return;
    var div=doc.createElement('div');
    div.style.cssText='font-size:10px;color:#888;font-style:italic;padding-top:4px;';
    div.textContent=parts.join(' · ');
    [label,aircraftSpan,baggageLabel,baggageSpan].forEach(function(el){
      if(el&&el.parentNode)el.parentNode.removeChild(el);
    });
    td.appendChild(div);
  });

  // 13c. Compact hotel rows - padding between each tr
  doc.querySelectorAll('[id*="-hotel-segment-"][id*="-content"] table table tr').forEach(function(tr){
    var td=tr.querySelector('td');
    if(!td)return;
    var s=td.getAttribute('style')||'';
    if(s.indexOf('padding-bottom')===-1)td.setAttribute('style',s+(s?';':'')+'padding-bottom:8px');
  });

  // 14c. Remove cellpadding="0" from all tables so inline padding survives Outlook
  doc.querySelectorAll('table[cellpadding="0"]').forEach(function(t){
    t.removeAttribute('cellpadding');
  });

  // 14. Outlook/email cleanup - remove role="presentation" and !important only
  doc.querySelectorAll('[role="presentation"]').forEach(function(el){el.removeAttribute('role');});
  doc.querySelectorAll('[style]').forEach(function(el){
    var s=el.getAttribute('style');
    s=s.replace(/([^:]+):\s*[^;]+\s*!important\s*;?/g,function(m,prop){
      if(/height/i.test(prop))return m;
      return m.replace(/\s*!important/,'');
    });
    el.setAttribute('style',s);
  });

  // 14b. Apply padding inline directly to elements (survives Outlook stripping stylesheets)
  var paddingMap=[
    ['.proposal-enhanced-padding','padding-top:8px;padding-right:16px;padding-bottom:8px'],
    ['.proposal-enhanced-padding-left-48px','padding-left:48px'],
    ['.proposal-enhanced-product-details-left-row','padding-top:8px;padding-bottom:8px'],
    ['.proposal-enhanced-product-details-left-bottom-row','padding-bottom:8px;padding-right:16px;padding-left:48px'],
    ['.proposal-enhanced-segment-header','padding:12px 16px'],
    ['.proposal-enhanced-segment-header-small','padding:12px 16px'],
    ['.proposal-enhanced-rate-breakdown','padding:8px 48px'],
    ['.proposal-enhanced-policy','padding:8px 16px 8px 48px'],
    ['.proposal-enhanced-agency-message-info','padding:8px 8px 8px 0'],
    ['.proposal-enhanced-agency-disclaimer-message-info','padding:0 16px 8px 16px'],
    ['.proposal-enhanced-main-header-padding','padding-left:16px'],
    ['.proposal-enhanced-fare-rules-table','padding:0 16px 8px 48px'],
    ['.proposal-compact-product-details','padding:8px 16px'],
    ['.proposal-compact-segment-header','padding:8px 16px'],
    ['.proposal-compact-fare-rules-table','padding:0 16px 8px 16px'],
    ['.proposal-enhanced-layover-clock-icon','padding:8px 12px 8px 20px'],
    ['.proposal-enhanced-air-segment-icon','padding:8px 8px 8px 16px'],
    ['.proposal-enhanced-segment-icon','padding:10px 8px 8px 16px'],
  ];
  paddingMap.forEach(function(pair){
    try{
      doc.querySelectorAll(pair[0]).forEach(function(el){
        var existing=el.getAttribute('style')||'';
        // Only add if not already inlined
        el.setAttribute('style',existing+(existing&&!existing.endsWith(';')?';':'')+pair[1]+';');
      });
    }catch(e){}
  });

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
  if(_pd.getElementById('ctTidyPanelStyle'))return;
  var ts=_pd.createElement('style');ts.id='ctTidyPanelStyle';
  ts.textContent=
    '.ct-tidy-btn{background-color:#ff2e5f!important;color:#fff!important;}'
    +'#ctTidyPanel{'
    +'position:absolute;right:0;bottom:56px;'
    +'width:440px;'
    +'background:#fff;border-top:2px solid #ff2e5f;border-left:1px solid #f0d0d8;'
    +'box-shadow:-4px -4px 16px rgba(0,0,0,.1);'
    +'font-family:Aptos,Arial,sans-serif;font-size:11px;z-index:9999;}'
    +'#ctTidyHeader{'
    +'display:flex;align-items:center;justify-content:space-between;'
    +'background:linear-gradient(135deg,#ff2e5f,#ff6b9d);'
    +'padding:6px 10px;cursor:pointer;}'
    +'#ctTidyHeader .ct-htitle{color:#fff;font-size:10px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;}'
    +'#ctTidyHeader .ct-hbtns{display:flex;gap:6px;align-items:center;}'
    +'#ctTidyHeader button{background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:4px;padding:2px 7px;font-size:10px;cursor:pointer;font-family:inherit;}'
    +'#ctTidyHeader button:hover{background:rgba(255,255,255,.35);}'
    +'#ctTidyBody{display:block;}'
    +'#ctTidyBody.ct-collapsed{display:none;}'
    // Mode tabs
    +'#ctTidyTabs{display:flex;border-bottom:1px solid #f0d0d8;}'
    +'#ctTidyTabs .ct-tab{flex:1;padding:5px;font-size:9.5px;font-weight:700;text-align:center;cursor:pointer;color:#999;border:none;background:none;font-family:inherit;}'
    +'#ctTidyTabs .ct-tab.active{color:#ff2e5f;border-bottom:2px solid #ff2e5f;}'
    // Options area
    +'#ctTidyOpts{max-height:230px;overflow-y:auto;padding:6px 10px;}'
    +'#ctTidyPanel .ct-or{display:flex;align-items:center;gap:4px;padding:3px 0;border-bottom:1px solid #fce8ee;flex-wrap:nowrap;}'
    +'#ctTidyPanel .ct-or:last-child{border-bottom:none;}'
    +'#ctTidyPanel .ct-or input[type=checkbox]{accent-color:#ff2e5f;width:12px;height:12px;flex-shrink:0;cursor:pointer;}'
    +'#ctTidyPanel .ct-ol-input{flex:1;font-weight:600;color:#333;font-size:10px;border:1px solid #eee;border-radius:3px;padding:2px 4px;font-family:inherit;background:#fafafa;min-width:0;}'
    +'#ctTidyPanel .ct-ol-input:focus{border-color:#ff2e5f;outline:none;background:#fff;}'
    +'#ctTidyPanel .ct-pi{border:1px solid #ddd;border-radius:4px;padding:2px 5px;font-size:10px;width:68px;text-align:right;font-family:Arial,sans-serif;}'
    +'#ctTidyPanel .ct-pi:focus{border-color:#ff2e5f;outline:none;}'
    +'#ctTidyPanel .ct-ml{font-size:9px;color:#bbb;white-space:nowrap;}'
    +'#ctTidyPanel .ct-mi{border:1px solid #ffccd5;border-radius:4px;padding:2px 5px;font-size:10px;width:45px;text-align:right;font-family:Arial,sans-serif;background:#fff9fa;}'
    +'#ctTidyPanel .ct-mi:focus{border-color:#ff2e5f;outline:none;}'
    +'#ctTidyPanel .ct-hp{width:16px;height:16px;cursor:pointer;accent-color:#ff2e5f;flex-shrink:0;}'
    +'#ctTidyPanel .ct-hpl{font-size:8px;color:#bbb;white-space:nowrap;}'
    // Merch-all row
    +'#ctMerchAll{display:flex;align-items:center;gap:6px;padding:5px 10px;border-top:1px solid #f0d0d8;background:#fff9fa;}'
    +'#ctMerchAll label{font-size:9px;color:#999;flex:1;}'
    +'#ctMerchAll input{border:1px solid #ffccd5;border-radius:4px;padding:2px 5px;font-size:10px;width:50px;text-align:right;font-family:Arial,sans-serif;}'
    +'#ctMerchAll button{background:#ff2e5f;color:#fff;border:none;border-radius:4px;padding:2px 8px;font-size:9px;font-weight:700;cursor:pointer;font-family:inherit;}'
    // Package mode
    +'#ctPkgArea{padding:6px 10px;}'
    +'#ctPkgArea .ct-pkg-row{display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid #fce8ee;}'
    +'#ctPkgArea .ct-pkg-row:last-of-type{border-bottom:none;}'
    +'#ctPkgArea .ct-pkg-row input[type=checkbox]{accent-color:#ff2e5f;width:12px;height:12px;flex-shrink:0;}'
    +'#ctPkgArea .ct-pkg-label{flex:1;font-size:10px;color:#333;font-weight:600;}'
    +'#ctPkgArea .ct-pkg-inputs{padding:6px 0;border-top:1px solid #f0d0d8;}'
    +'#ctPkgArea .ct-pkg-inputs input[type=text]{border:1px solid #ddd;border-radius:4px;padding:3px 6px;font-size:10px;font-family:Arial,sans-serif;width:100%;box-sizing:border-box;margin-bottom:4px;}'
    +'#ctPkgArea .ct-pkg-inputs input[type=text]:focus{border-color:#ff2e5f;outline:none;}'
    +'#ctPkgArea .ct-pkg-note{font-size:9px;color:#999;font-style:italic;}'
    // Footer
    +'#ctTidyTripType{display:flex;gap:12px;padding:5px 10px;border-top:1px solid #f0d0d8;background:#fff9fa;}'
    +'.ct-tt-opt{font-size:9.5px;color:#666;display:flex;align-items:center;gap:4px;cursor:pointer;}'
    +'.ct-tt-opt input{accent-color:#ff2e5f;width:11px;height:11px;}'
    +'#ctTidyFooter{display:flex;gap:6px;padding:7px 10px;border-top:1px solid #f0d0d8;}'
    +'#ctTidyPanel .ct-ab{flex:1;padding:6px;border:none;border-radius:5px;font-size:10.5px;font-weight:700;cursor:pointer;font-family:Aptos,Arial,sans-serif;}'
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
var _mode='normal'; // 'normal' or 'package'
var _tripType='international';

function showPanel(){
  injectStyles();
  if(_pd.getElementById('ctTidyPanel')){toggleCollapse();return;}
  var srcdoc=getSrcdoc();
  if(!srcdoc){alert('Could not find proposal. Click Share first.');return;}
  var doc=parseSrcdoc(srcdoc);
  var pType=getProposalType(doc);
  _opts=findOptions(doc,pType);
  if(!_opts.length){alert('No options found in proposal.');return;}
  _collapsed=false;_mode='normal';_tripType='international';

  var modal=_pd.querySelector('.trip-proposal-share-modal .modal-content');
  if(!modal)return;
  modal.style.position='relative';

  var panel=_pd.createElement('div');
  panel.id='ctTidyPanel';
  panel.innerHTML=
    '<div id="ctTidyHeader">'
      +'<span class="ct-htitle">⚙ TIDY</span>'
      +'<div class="ct-hbtns">'
        +'<button id="ctTogglePanel">▼</button>'
        +'<button id="ctClosePanel">✕</button>'
      +'</div>'
    +'</div>'
    +'<div id="ctTidyBody">'
      +'<div id="ctTidyTabs">'
        +'<button class="ct-tab active" id="ctTabNormal">Normal</button>'
        +'<button class="ct-tab" id="ctTabPkg">Package</button>'
      +'</div>'
      +'<div id="ctNormalMode">'
        +'<div id="ctTidyOpts">'+buildNormalRows()+'</div>'
        +'<div id="ctMerchAll">'
          +'<label>Apply merch to all flights: +$</label>'
          +'<input type="text" id="ctMerchAllInput" placeholder="0.00">'
          +'<button id="ctMerchAllBtn">Apply</button>'
        +'</div>'
      +'</div>'
      +'<div id="ctPkgMode" style="display:none">'
        +'<div id="ctPkgArea">'+buildPkgRows()+'</div>'
      +'</div>'
      +'<div id="ctTidyTripType">'
        +'<label class="ct-tt-opt"><input type="radio" name="ctTripType" value="international" checked> 🌏 International</label>'
        +'<label class="ct-tt-opt"><input type="radio" name="ctTripType" value="domestic"> 🏠 Domestic</label>'
      +'</div>'
      +'<div id="ctTidyFooter">'
        +'<button class="ct-ab ct-cb" id="ctDoCopy">📋 Apply</button>'
        +'<button class="ct-ab ct-pb" id="ctDoPDF">🖨 PDF</button>'
      +'</div>'
    +'</div>';

  modal.appendChild(panel);

  // Header events
  _pd.getElementById('ctTidyHeader').addEventListener('click',function(e){if(e.target.tagName!=='BUTTON')toggleCollapse();});
  _pd.getElementById('ctTogglePanel').addEventListener('click',toggleCollapse);
  _pd.getElementById('ctClosePanel').addEventListener('click',function(){panel.remove();});
  _pd.getElementById('ctDoCopy').addEventListener('click',function(){runTidy('copy');});
  _pd.getElementById('ctDoPDF').addEventListener('click',function(){runTidy('pdf');});
  panel.querySelectorAll('input[name="ctTripType"]').forEach(function(r){
    r.addEventListener('change',function(){_tripType=this.value;});
  });

  // Tab switching
  _pd.getElementById('ctTabNormal').addEventListener('click',function(){
    _mode='normal';
    this.classList.add('active');_pd.getElementById('ctTabPkg').classList.remove('active');
    _pd.getElementById('ctNormalMode').style.display='';
    _pd.getElementById('ctPkgMode').style.display='none';
  });
  _pd.getElementById('ctTabPkg').addEventListener('click',function(){
    _mode='package';
    this.classList.add('active');_pd.getElementById('ctTabNormal').classList.remove('active');
    _pd.getElementById('ctNormalMode').style.display='none';
    _pd.getElementById('ctPkgMode').style.display='';
  });

  // Merch inputs
  panel.querySelectorAll('.ct-mi').forEach(function(mi){
    mi.addEventListener('input',function(){
      var key=mi.dataset.mf;
      var pi=panel.querySelector('.ct-pi[data-pf="'+key+'"]');
      if(!pi)return;
      pi.value=(parseFloat(pi.dataset.base)||0)+(parseFloat(mi.value)||0);
      pi.value=parseFloat(pi.value).toFixed(2);
    });
  });

  // Wire package mode live total
  function updatePkgTotal(){
    var total=0;
    panel.querySelectorAll('.ct-pkg-ck:checked').forEach(function(cb){
      var key=cb.dataset.key;
      var pi=panel.querySelector('.ct-pkg-pi[data-pf="'+key+'"]');
      var mi=panel.querySelector('.ct-pkg-mi[data-mf="'+key+'"]');
      total+=pi?parseFloat(pi.value)||0:parseFloat(cb.dataset.base)||0;
    });
    var pkgMerch=parseFloat((_pd.getElementById('ctPkgMerch')||{}).value)||0;
    total+=pkgMerch;
    var totalEl=_pd.getElementById('ctPkgTotal');
    if(totalEl)totalEl.textContent=total>0?'AUD '+total.toFixed(2):'—';
  }
  panel.addEventListener('change',function(e){
    if(e.target.classList.contains('ct-pkg-ck')||e.target.classList.contains('ct-pkg-hide'))updatePkgTotal();
  });
  panel.addEventListener('input',function(e){
    if(e.target.classList.contains('ct-pkg-pi')||e.target.classList.contains('ct-pkg-mi')||e.target.id==='ctPkgMerch')updatePkgTotal();
  });

  // Wire pkg-mi to update pkg-pi live
  panel.querySelectorAll('.ct-pkg-mi').forEach(function(mi){
    mi.addEventListener('input',function(){
      var key=mi.dataset.mf;
      var pi=panel.querySelector('.ct-pkg-pi[data-pf="'+key+'"]');
      if(!pi)return;
      pi.value=((parseFloat(pi.dataset.base)||0)+(parseFloat(mi.value)||0)).toFixed(2);
    });
  });

  // Apply merch to all flights
  _pd.getElementById('ctMerchAllBtn').addEventListener('click',function(){
    var val=parseFloat(_pd.getElementById('ctMerchAllInput').value)||0;
    panel.querySelectorAll('.ct-mi').forEach(function(mi){
      if(mi.dataset.mf&&mi.dataset.mf.indexOf('air')!==-1){
        mi.value=val.toFixed(2);
        var pi=panel.querySelector('.ct-pi[data-pf="'+mi.dataset.mf+'"]');
        if(pi)pi.value=((parseFloat(pi.dataset.base)||0)+val).toFixed(2);
      }
    });
  });
}

function buildNormalRows(){
  return _opts.map(function(o){
    var isAir=o.type==='air';
    return '<div class="ct-or">'
      +'<input type="checkbox" checked class="ct-ck" data-key="'+o.key+'" id="ctck'+o.key+'">'
      +'<input class="ct-ol-input" type="text" value="'+o.label+'" data-lf="'+o.key+'" title="Edit label">'
      +(o.price
        ?'<input class="ct-pi" type="text" value="'+o.price+'" data-pf="'+o.key+'" data-base="'+o.price+'" placeholder="Price">'
         +(isAir?'<span class="ct-ml">+$</span><input class="ct-mi" type="text" value="" data-mf="'+o.key+'" placeholder="0">':'')
         +'<input type="checkbox" class="ct-hp" title="Hide price" data-hpf="'+o.key+'">'
         +'<span class="ct-hpl">hide</span>'
         +(isAir?'<input type="checkbox" class="ct-chg" title="Change option" data-cgf="'+o.key+'">'
           +'<span class="ct-hpl">chg</span>'
           +'<input type="checkbox" class="ct-alt" title="Alternative option" data-alf="'+o.key+'">'
           +'<span class="ct-hpl">alt</span>':'')
        :'')
      +'</div>';
  }).join('');
}

function buildPkgRows(){
  var flightOpts=_opts.filter(function(o){return o.type==='air';});
  if(!flightOpts.length)return'<div style="font-size:10px;color:#999;padding:8px 0">No flight options found.</div>';
  var rows=flightOpts.map(function(o){
    return'<div class="ct-pkg-row">'
      +'<input type="checkbox" class="ct-pkg-ck" data-key="'+o.key+'" data-base="'+o.price+'" id="ctpkg'+o.key+'">'
      +'<input class="ct-ol-input ct-pkg-lbl" type="text" value="'+o.label+'" data-lf="'+o.key+'" title="Edit label" style="flex:1;min-width:0;">'
      +(o.price
        ?'<input type="text" class="ct-pkg-pi" data-pf="'+o.key+'" data-base="'+o.price+'" value="'+o.price+'" style="width:60px;font-size:10px;border:1px solid #ddd;border-radius:3px;padding:2px 4px;text-align:right;font-family:Arial">'
         +'<span style="font-size:9px;color:#bbb;margin:0 1px">+$</span>'
         +'<input type="text" class="ct-pkg-mi" data-mf="'+o.key+'" value="" placeholder="0" style="width:36px;font-size:10px;border:1px solid #ffccd5;border-radius:3px;padding:2px 4px;text-align:right;font-family:Arial;background:#fff9fa">'
        :'')
      +'<input type="checkbox" class="ct-pkg-alt" data-af="'+o.key+'" title="Alternative option" style="accent-color:#ff2e5f;width:11px;height:11px;flex-shrink:0;">'
      +'<span style="font-size:8px;color:#bbb;white-space:nowrap">alt</span>'
      +'<input type="checkbox" class="ct-pkg-hide" data-hf="'+o.key+'" title="Hide from output" style="accent-color:#888;width:11px;height:11px;flex-shrink:0;">'
      +'<span style="font-size:8px;color:#bbb;white-space:nowrap">hide</span>'
      +'</div>';
  }).join('');
  rows+='<div class="ct-pkg-inputs">'
    +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">'
      +'<label style="font-size:9px;color:#999;flex:1">Package label:</label>'
      +'<input type="text" id="ctPkgLabel" placeholder="e.g. Flight Package" style="flex:2">'
    +'</div>'
    +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">'
      +'<label style="font-size:9px;color:#999;flex:1">Package merch +$:</label>'
      +'<input type="text" id="ctPkgMerch" placeholder="0.00" style="flex:2">'
    +'</div>'
    +'<div style="display:flex;align-items:center;justify-content:space-between;padding-top:4px;border-top:1px solid #f0d0d8">'
      +'<span style="font-size:9px;color:#666;font-weight:700">Package total:</span>'
      +'<span id="ctPkgTotal" style="font-size:11px;font-weight:800;color:#ff2e5f">—</span>'
    +'</div>'
    +'<div class="ct-pkg-note">checked = in package &middot; unchecked = standalone &middot; hide = omitted</div>'
    +'</div>';
  return rows;
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
  var priceOverrides={};
  var hidePriceKeys={};
  var labelOverrides={};
  var chgKeys={};
  var packageData=null;

  var altKeys={};
  if(_mode==='package'){
    var pkgChecked=[];
    var pkgHidden=[];
    panel.querySelectorAll('.ct-pkg-ck:checked').forEach(function(cb){pkgChecked.push(cb.dataset.key);});
    panel.querySelectorAll('.ct-pkg-hide:checked').forEach(function(cb){pkgHidden.push(cb.dataset.hf);});
    panel.querySelectorAll('.ct-pkg-alt:checked').forEach(function(cb){altKeys[cb.dataset.af]=true;});
    _opts.forEach(function(o){
      if(pkgHidden.indexOf(o.key)===-1)selectedKeys[o.key]=true;
    });
    var pkgLabel=(_pd.getElementById('ctPkgLabel').value.trim())||'Flight Package';
    var pkgMerch=parseFloat((_pd.getElementById('ctPkgMerch')||{}).value)||0;
    var pkgTotal=pkgMerch;
    pkgChecked.forEach(function(key){
      var pi=panel.querySelector('.ct-pkg-pi[data-pf="'+key+'"]');
      pkgTotal+=pi?parseFloat(pi.value)||0:0;
    });
    _opts.forEach(function(o){
      if(pkgChecked.indexOf(o.key)===-1&&pkgHidden.indexOf(o.key)===-1){
        var pi=panel.querySelector('.ct-pkg-pi[data-pf="'+o.key+'"]');
        if(pi)priceOverrides[o.key]=pi.value;
      }
    });
    panel.querySelectorAll('.ct-pkg-lbl').forEach(function(inp){
      var v=inp.value.trim();if(v)labelOverrides[inp.dataset.lf]=v;
    });
    if(pkgChecked.length){
      packageData={keys:pkgChecked,label:pkgLabel,price:pkgTotal.toFixed(2)};
    }
  }else{
    // Normal mode
    panel.querySelectorAll('.ct-ck').forEach(function(cb){
      if(cb.checked)selectedKeys[cb.dataset.key]=true;
    });
    if(!Object.keys(selectedKeys).length){alert('Please select at least one option.');return;}
    panel.querySelectorAll('.ct-pi').forEach(function(inp){
      var v=inp.value.trim();if(v)priceOverrides[inp.dataset.pf]=v;
    });
    panel.querySelectorAll('.ct-hp:checked').forEach(function(cb){
      hidePriceKeys[cb.dataset.hpf]=true;
    });
    panel.querySelectorAll('.ct-ol-input').forEach(function(inp){
      var v=inp.value.trim();if(v)labelOverrides[inp.dataset.lf]=v;
    });
    panel.querySelectorAll('.ct-chg:checked').forEach(function(cb){
      chgKeys[cb.dataset.cgf]=true;
    });
    panel.querySelectorAll('.ct-alt:checked').forEach(function(cb){
      altKeys[cb.dataset.alf]=true;
    });
  }

  var doc=parseSrcdoc(srcdoc);
  var pType=getProposalType(doc);
  var hasCarOption=!!doc.querySelector('[id*="-car-option"]');
  applyTransforms(doc,pType,selectedKeys,priceOverrides,hasCarOption,_tripType);

  // Apply label overrides
  Object.keys(labelOverrides).forEach(function(key){
    var parts=key.split('-'),num=parts[0],type=parts[1];
    var titleEl=doc.getElementById(pType+'-'+num+'-'+type+'-segment-title');
    if(titleEl)titleEl.innerHTML='<strong style="color:#ff2e5f">'+labelOverrides[key]+'</strong>';
  });

  // Apply CHG - add yellow "Change" chip next to title, append "additional cost" after price
  Object.keys(chgKeys).forEach(function(key){
    var parts=key.split('-'),num=parts[0],type=parts[1];
    // Add chip next to title
    var titleEl=doc.getElementById(pType+'-'+num+'-'+type+'-segment-title');
    if(titleEl){
      var chip=doc.createElement('span');
      chip.style.cssText='display:inline-block;background:#fff8e1;color:#7a5800;border:1px solid #ffe082;border-radius:3px;padding:1px 7px;font-size:10px;font-weight:700;margin-left:8px;vertical-align:middle;white-space:nowrap;';
      chip.textContent='Change';
      titleEl.querySelector('strong').appendChild(chip);
    }
    // Add "additional cost" after price - only if price not hidden
    if(!hidePriceKeys[key]){
      var priceEl=doc.getElementById(pType+'-'+num+'-'+type+'-total-price');
      if(priceEl){
        var ac=doc.createElement('span');
        ac.style.cssText='font-size:11px;font-style:italic;font-weight:700;color:#555;margin-left:8px;white-space:nowrap;vertical-align:middle;';
        ac.textContent='additional cost';
        priceEl.querySelector('strong')?priceEl.querySelector('strong').appendChild(ac):priceEl.appendChild(ac);
      }
    }
  });

  // Apply ALT chip
  Object.keys(altKeys).forEach(function(key){
    var parts=key.split('-'),num=parts[0],type=parts[1];
    var titleEl=doc.getElementById(pType+'-'+num+'-'+type+'-segment-title');
    if(titleEl&&titleEl.querySelector('strong')){
      var chip=doc.createElement('span');
      chip.style.cssText='display:inline-block;background:#fce8ee;color:#c0174a;border:1px solid #f0a0b8;border-radius:3px;padding:1px 7px;font-size:10px;font-weight:700;margin-left:8px;vertical-align:middle;white-space:nowrap;';
      chip.textContent='Alternative';
      titleEl.querySelector('strong').appendChild(chip);
    }
  });

  // Apply hide price
  Object.keys(hidePriceKeys).forEach(function(key){
    var parts=key.split('-');
    var priceEl=doc.getElementById(pType+'-'+parts[0]+'-'+parts[1]+'-total-price');
    if(priceEl)priceEl.style.display='none';
    // Also hide the currency span
    var header=doc.getElementById(pType+'-'+parts[0]+'-'+parts[1]+'-header');
    if(header){
      var priceCell=header.querySelector('[id*="-total-price"]');
      if(priceCell)priceCell.style.visibility='hidden';
    }
  });

  // Apply package
  if(packageData&&packageData.keys.length){
    packageData.keys.forEach(function(key,idx){
      var parts=key.split('-'),num=parts[0],type=parts[1];
      var headerTable=doc.getElementById(pType+'-'+num+'-'+type+'-header');
      if(!headerTable)return;
      if(idx===0){
        // First: set label and price
        var titleEl=doc.getElementById(pType+'-'+num+'-'+type+'-segment-title');
        if(titleEl)titleEl.innerHTML='<strong style="color:#ff2e5f">'+packageData.label+'</strong>';
        var priceEl=doc.getElementById(pType+'-'+num+'-'+type+'-total-price');
        if(priceEl){
          var walker=doc.createTreeWalker(priceEl,NodeFilter.SHOW_TEXT,null,false);
          var node,last=null;
          while((node=walker.nextNode())){if(/[\d,]+\.\d{2}/.test(node.nodeValue))last=node;}
          if(last)last.nodeValue=last.nodeValue.replace(/[\d,]+\.\d{2}/,packageData.price);
        }
      }else{
        // Rest: hide entire header table
        headerTable.style.display='none';
      }
    });
  }

  if(mode==='pdf'){
    var fullOut='<!DOCTYPE html>'+doc.documentElement.outerHTML;
    var win=window.open('','_blank','width=900,height=900,scrollbars=yes');
    if(!win){alert('Please allow popups for this site.');return;}
    win.document.open();win.document.write(fullOut);win.document.close();
    setTimeout(function(){win.print();},800);
    return;
  }

  var iframe=getIframe();
  if(!iframe){alert('Could not find proposal iframe.');return;}
  var btn=_pd.getElementById('ctDoCopy');
  if(btn){btn.textContent='⏳ Applying...';btn.disabled=true;}

  iframe.addEventListener('load',function onLoad(){
    iframe.removeEventListener('load',onLoad);
    if(btn){
      btn.textContent='✓ Applied! Click Copy >';
      btn.style.background='#28a745';
      btn.disabled=false;
      setTimeout(function(){btn.textContent='📋 Apply';btn.style.background='';},6000);
    }
  },{once:true});

  iframe.setAttribute('srcdoc','<!DOCTYPE html>'+doc.documentElement.outerHTML);
}

// ── Observer ──────────────────────────────────────────────────────────────────
var _obs=new MutationObserver(function(){injectTidyButton();});
if(_pd.body)_obs.observe(_pd.body,{childList:true,subtree:true});
setTimeout(injectTidyButton,500);

if(_pd.querySelector('.trip-proposal-share-modal'))showPanel();
})();
