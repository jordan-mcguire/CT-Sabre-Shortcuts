(function(){

// ── Constants ────────────────────────────────────────────────────────────────
var BRAND='#ff2e5f';
var ADDITIONAL_INFO='<table width="100%" style="margin-top:24px;border-collapse:collapse;font-family:Arial,sans-serif"><tr><td style="background:#f5f5f5;border:1px solid #e0e0e0;border-left:3px solid #ff2e5f;padding:14px 16px;border-radius:4px"><strong style="color:#ff2e5f;font-size:11px;display:block;margin-bottom:8px">ADDITIONAL INFORMATION</strong><p style="margin:0 0 6px;font-size:11px;color:#333;line-height:1.5">All passport and visa requirements are the responsibility of the traveller.</p><p style="margin:0 0 6px;font-size:11px;color:#333;line-height:1.5">If you need more information about visas, passports, health and security for each country, please visit: <a href="https://www.fctgtravelnews.com/" style="color:#ff2e5f">Travel News</a></p><p style="margin:0 0 6px;font-size:11px;color:#333;line-height:1.5">All prices indicated are subject to change and availability. In the event of a refund request, some taxes may not be refunded.</p><p style="margin:0;font-size:11px;color:#333;line-height:1.5">For more information on these topics, please contact your dedicated team.</p></td></tr></table>';

var IMPORTANT_NOTICE='<table width="100%" style="margin:16px 0"><tr><td><div style="background:#f5f5f5;border:1px solid #d0d0d0;border-left:3px solid #ff2e5f;padding:10px 14px;border-radius:4px"><strong style="color:#ff2e5f;font-size:11px;display:block;margin-bottom:6px">IMPORTANT NOTICE</strong><ul style="font-style:italic;font-size:10px;margin:0;padding-left:18px;color:#333;line-height:1.4"><li style="margin-bottom:4px">All prices quoted are subject to change until tickets are issued, even if tentatively holding.</li><li style="margin-bottom:4px">Airlines reserve the right to change surcharges, fare levels and taxes without notice.</li><li>Corporate Traveller fees are not included in your quote, as per schedule of fees, and will be charged at the time of invoicing.</li></ul></div></td></tr></table>';

// ── Inject TIDY button into modal ────────────────────────────────────────────
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
      +'font-family:Arial,sans-serif;font-size:11px;box-shadow:0 -4px 12px rgba(0,0,0,.12);}'
      +'#ctTidyPanel .ct-panel-title{font-size:10px;font-weight:800;color:#ff2e5f;'
      +'text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;}'
      +'#ctTidyPanel .ct-opt-row{display:flex;align-items:center;gap:8px;margin-bottom:6px;}'
      +'#ctTidyPanel .ct-opt-row input[type=checkbox]{accent-color:#ff2e5f;width:13px;height:13px;}'
      +'#ctTidyPanel .ct-opt-label{flex:1;font-weight:600;color:#333;}'
      +'#ctTidyPanel .ct-price-input{border:1px solid #ddd;border-radius:4px;padding:3px 6px;'
      +'font-size:11px;width:90px;text-align:right;}'
      +'#ctTidyPanel .ct-price-input:focus{border-color:#ff2e5f;outline:none;}'
      +'#ctTidyPanel .ct-btn-row{display:flex;gap:8px;margin-top:10px;}'
      +'#ctTidyPanel .ct-action-btn{flex:1;padding:7px;border:none;border-radius:5px;'
      +'font-size:11px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif;}'
      +'#ctTidyPanel .ct-copy-btn{background:#ff2e5f;color:#fff;}'
      +'#ctTidyPanel .ct-copy-btn:hover{background:#d4234e;}'
      +'#ctTidyPanel .ct-pdf-btn{background:#f5f5f5;color:#333;border:1px solid #ddd;}'
      +'#ctTidyPanel .ct-pdf-btn:hover{background:#e8e8e8;}'
      +'#ctTidyPanel .ct-close-panel{position:absolute;top:8px;right:10px;background:none;'
      +'border:none;font-size:16px;cursor:pointer;color:#999;line-height:1;}';
    document.head.appendChild(ts);
  }

  var wrap=document.createElement('div');
  wrap.className='scope-wrapper sabre-ngv-themes-components-form';
  wrap.id='ctTidyButton';
  wrap.innerHTML='<button class="force-inline-block-wrapper button regular primary ct-tidy-btn" type="button">TIDY</button>';
  actionButtons.insertBefore(wrap,buttons[1].parentElement);
  wrap.querySelector('button').addEventListener('click',showPanel);
}

// ── Parse options from iframe ─────────────────────────────────────────────────
function getIframeHTML(){
  var iframe=document.querySelector('.share-container iframe');
  return iframe?iframe.getAttribute('srcdoc'):null;
}

function parseOptions(html){
  var opts=[];
  // Match all option tables: proposal-enhanced-N-(air|hotel|car)-option
  var re=/<table[^>]+id="proposal-enhanced-(\d+)-(air|hotel|car)-option"[\s\S]*?(?=<table[^>]+id="proposal-enhanced-\d+-(air|hotel|car|none)-option"|<tr>\s*<td[^>]+proposal-enhanced-agency-disclaimer|$)/gi;
  var headerRe=/Flight Option|Hotel Option|Car Option/i;
  // Simpler: just detect how many options exist by id
  var idRe=/id="proposal-enhanced-(\d+)-(air|hotel|car)-option"/gi;
  var m;
  while((m=idRe.exec(html))!==null){
    var num=m[1],type=m[2];
    var icon=type==='air'?'✈':type==='hotel'?'🏨':'🚗';
    var label=icon+' '+(type.charAt(0).toUpperCase()+type.slice(1))+' Option '+num;
    // Extract price from this option's header
    var priceRe=new RegExp('id="proposal-enhanced-'+num+'-'+type+'-total-price"[\\s\\S]{1,400}?([\\d,]+\\.\\d{2})');
    var pm=priceRe.exec(html);
    opts.push({num:num,type:type,label:label,price:pm?pm[1]:''});
  }
  return opts;
}

// ── Show panel ────────────────────────────────────────────────────────────────
function showPanel(){
  if(document.getElementById('ctTidyPanel'))return;
  var html=getIframeHTML();
  if(!html){alert('Could not find proposal. Ensure you have clicked Share first.');return;}
  var opts=parseOptions(html);
  if(!opts.length){alert('No options found in proposal.');return;}

  var modal=document.querySelector('.trip-proposal-share-modal .modal-content');
  if(!modal)return;
  modal.style.position='relative';

  var panel=document.createElement('div');
  panel.id='ctTidyPanel';

  var rows=opts.map(function(o){
    return '<div class="ct-opt-row">'
      +'<input type="checkbox" checked data-num="'+o.num+'" data-type="'+o.type+'" id="ctOpt'+o.num+o.type+'">'
      +'<label class="ct-opt-label" for="ctOpt'+o.num+o.type+'">'+o.label+'</label>'
      +(o.price?'<input class="ct-price-input" type="text" value="'+o.price+'" data-price-for="'+o.num+'-'+o.type+'" placeholder="Price">':'')
      +'</div>';
  }).join('');

  panel.innerHTML='<button class="ct-close-panel" id="ctCloseTidyPanel">&times;</button>'
    +'<div class="ct-panel-title">Options to include</div>'
    +rows
    +'<div class="ct-btn-row">'
    +'<button class="ct-action-btn ct-copy-btn" id="ctDoCopy">📋 Copy to Clipboard</button>'
    +'<button class="ct-action-btn ct-pdf-btn" id="ctDoPDF">🖨 Print / Save PDF</button>'
    +'</div>';

  modal.appendChild(panel);

  document.getElementById('ctCloseTidyPanel').onclick=function(){panel.remove();};
  document.getElementById('ctDoCopy').onclick=function(){processAndOutput('copy');};
  document.getElementById('ctDoPDF').onclick=function(){processAndOutput('pdf');};
}

// ── Core transform ────────────────────────────────────────────────────────────
function buildOutput(){
  var html=getIframeHTML();
  if(!html)return null;

  var panel=document.getElementById('ctTidyPanel');
  var checks=panel.querySelectorAll('input[type=checkbox]');
  var selectedKeys={};
  checks.forEach(function(cb){
    if(cb.checked)selectedKeys[cb.dataset.num+'-'+cb.dataset.type]=true;
  });

  // Collect price overrides
  var priceOverrides={};
  panel.querySelectorAll('.ct-price-input').forEach(function(inp){
    priceOverrides[inp.dataset.priceFor]=inp.value.trim();
  });

  // Extract CSS from srcdoc
  var cssMatch=html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  var css=cssMatch?cssMatch[1]:'';

  // Remove emissions, seats, meal labels
  html=html.replace(/<strong[^>]*-(seats|meal|emission)-label[^>]*>[^<]*<\/strong>\s*<span[^>]*>[^<]*<\/span>\s*/g,'');
  // Remove price breakdown
  html=html.replace(/<tr>\s*<td class="proposal-enhanced-price-break-down[\s\S]*?<\/tr>\s*(?=\s*<\/table>)/g,'');
  // Remove hotel images
  html=html.replace(/<tr>\s*<td width="100%">\s*<table id="proposal-enhanced-\d+-hotel-segment-\d+-hotel-images"[\s\S]{1,3000}?<\/table>\s*<\/td>\s*<\/tr>/g,'');
  html=html.replace(/<tr>\s*<td>\s*<img[^>]*class="proposal-enhanced-hotel-image"[^>]*>\s*<\/td>\s*<\/tr>/g,'');
  // Alignment + title colours
  html=html.replace(/align="center"/g,'align="left"');
  html=html.replace(/<strong id="proposal-enhanced-(\d+)-(air|hotel|car)-segment-title"/g,function(m,n,t){
    return '<strong id="proposal-enhanced-'+n+'-'+t+'-segment-title" style="color:#ff2e5f;"';
  });
  html=html.replace(/(<strong[^>]*>)(Flight|Hotel|Car) Option (\d+)(<\/strong>)/g,'$1<span style="color:#ff2e5f;">$2 Option $3</span>$4');
  // Remove role="presentation", box-sizing, !important
  html=html.replace(/\srole="presentation"/g,'');
  html=html.replace(/box-sizing:\s*[^;]+;?/g,'');
  html=html.replace(/\s*!important/g,'');

  // Apply price overrides
  Object.keys(priceOverrides).forEach(function(key){
    var newPrice=priceOverrides[key];
    if(!newPrice)return;
    var parts=key.split('-');var num=parts[0],type=parts[1];
    // Replace price in header total
    var re=new RegExp('(id="proposal-enhanced-'+num+'-'+type+'-total-price"[\\s\\S]{1,300}?)([\\d,]+\\.\\d{2})');
    html=html.replace(re,function(m,pre){return pre+newPrice;});
  });

  // Extract only selected option blocks
  var allOptRe=/<table[^>]+id="proposal-enhanced-(\d+)-(air|hotel|car)-option"[\s\S]*?<\/table>\s*(?:<table[^>]*>\s*<tr style="height:\s*10px[^<]*<\/tr>\s*<\/table>)?/gi;
  var selectedBlocks=[];
  var m;
  while((m=allOptRe.exec(html))!==null){
    var key=m[1]+'-'+m[2];
    if(selectedKeys[key])selectedBlocks.push(m[0]);
  }

  // Passenger name block
  var passengerRegex=/([\s\S]*?)(<span id="proposal-enhanced-passengers-list"[^>]*)>([\s\S]*?)<\/span>/;
  var passengerHTML='';
  var pm=html.match(/<span id="proposal-enhanced-passengers-list"[\s\S]{1,800}?<\/span>/);
  if(pm){
    passengerHTML='<br/><div style="background:#fff;border:1px solid #e0e0e0;border-radius:4px;padding:14px;margin:10px 0">'
      +'<strong style="color:#ff2e5f;font-size:11px;display:block;margin-bottom:10px">✈️ PASSENGER NAME AS PER PHOTO ID / PASSPORT:</strong>'
      +'<span style="font-size:10px;line-height:1.6;display:block">'+pm[0].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()+'</span>'
      +'</div>';
  }

  // Header block
  var headerMatch=html.match(/<tr class="proposal-enhanced-main-header-row"[\s\S]*?<\/tr>/);
  var headerHTML=headerMatch?headerMatch[0]:'';

  var body='<table id="trip-preview" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:700px;margin:0 auto;">'
    +(headerHTML?'<tr class="proposal-enhanced-main-header-row"><td>'+headerHTML+'</td></tr>':'')
    +'<tr><td>'
    +IMPORTANT_NOTICE
    +passengerHTML
    +selectedBlocks.join('<table><tr style="height:10px"></tr></table>')
    +ADDITIONAL_INFO
    +'</td></tr></table>';

  return '<!DOCTYPE html><html><head><meta charset="utf-8">'
    +'<style>'+css+' body{margin:0;font-family:Arial,sans-serif;} table{max-width:700px!important;}</style>'
    +'</head><body style="margin:0">'+body+'</body></html>';
}

// ── Output ────────────────────────────────────────────────────────────────────
function processAndOutput(mode){
  var out=buildOutput();
  if(!out){alert('Error processing proposal.');return;}

  if(mode==='pdf'){
    var win=window.open('','_blank');
    win.document.write(out);
    win.document.close();
    win.onload=function(){win.print();};
    return;
  }

  // Copy rich HTML to clipboard
  try{
    navigator.clipboard.write([new ClipboardItem({
      'text/html':new Blob([out],{type:'text/html'}),
      'text/plain':new Blob(['Trip Proposal'],{type:'text/plain'})
    })]).then(function(){
      var btn=document.getElementById('ctDoCopy');
      if(btn){var orig=btn.textContent;btn.textContent='✓ Copied!';setTimeout(function(){btn.textContent=orig;},1800);}
    });
  }catch(e){
    // Fallback
    var ta=document.createElement('textarea');ta.value=out;
    document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);
    alert('Copied (plain text fallback).');
  }
}

// ── Observer ──────────────────────────────────────────────────────────────────
var obs=new MutationObserver(function(){injectTidyButton();});
if(document.body)obs.observe(document.body,{childList:true,subtree:true});
setTimeout(injectTidyButton,500);

})();
