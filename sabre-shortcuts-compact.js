(function(){
if(document.getElementById('ctToolbar')){
document.getElementById('ctToolbar').remove();
}
['ctNotesBanner','ctCopyPopup','ctActionsPopup','ctTicketPanel','ctShortcutsPopup','ctSabreToast'].forEach(function(id){
var el=document.getElementById(id);if(el)el.remove();
});
var existingIcon=document.getElementById('ctToolbarIcon');
if(existingIcon)existingIcon.remove();

// ── Refund page ───────────────────────────────────────────────────────────────
if(window.location.href.includes('auoasisservices.au.fcl.internal/OasisWeb/RefundApplication/Create')){
var pasteButton=document.createElement('div');
pasteButton.id='sabrePasteButton';
pasteButton.innerHTML='<button id="pasteFromSabreBtn">📋 PASTE FROM SABRE</button>';
pasteButton.style.cssText='position:fixed;top:20px;right:20px;z-index:999999;';
document.body.appendChild(pasteButton);
var btnStyle=document.createElement('style');
btnStyle.textContent='#pasteFromSabreBtn{background:linear-gradient(135deg,#ff2e5f 0%,#ff6b9d 100%);color:white;border:none;padding:15px 25px;font-size:14px;font-weight:bold;border-radius:8px;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.3);font-family:Aptos,Arial,sans-serif;transition:transform 0.2s ease;}#pasteFromSabreBtn:hover{transform:scale(1.05);}';
document.head.appendChild(btnStyle);
document.getElementById('pasteFromSabreBtn').addEventListener('click',async function(){
try{
const clipboardText=await navigator.clipboard.readText();
if(clipboardText.startsWith('##SABRE_REFUND##')){
const lines=clipboardText.split('\n');let data={};
lines.forEach(function(line){
if(line.includes('TICKET:'))data.ticketNo=line.split('TICKET:')[1].trim();
if(line.includes('NAME:'))data.paxName=line.split('NAME:')[1].trim();
if(line.includes('PNR:'))data.pnr=line.split('PNR:')[1].trim();
});
const pnrField=document.querySelector('input[id*="RefundApplication_PNRNo"]');
if(pnrField&&data.pnr)pnrField.value=data.pnr;
const nameField=document.querySelector('input[id*="PaxName"]');
if(nameField&&data.paxName)nameField.value=data.paxName;
const ticketField=document.querySelector('input[id*="TicketNo"]:not([id*="Duplicate"])');
if(ticketField&&data.ticketNo)ticketField.value=data.ticketNo;
const gdsDropdown=document.querySelector('select#RefundApplication_GDS');
if(gdsDropdown){gdsDropdown.value='Sabre';gdsDropdown.dispatchEvent(new Event('change',{bubbles:true}));}
const tmsCheckbox=document.querySelector('input#ConsultantDetails_TmsClient[type="checkbox"]');
if(tmsCheckbox){tmsCheckbox.checked=true;tmsCheckbox.dispatchEvent(new Event('change',{bubbles:true}));}
this.textContent='✓ PASTED!';this.style.background='#28a745';
setTimeout(function(){document.getElementById('sabrePasteButton').remove();},2000);
}else{alert('No refund data found in clipboard. Please click REFUND in Sabre first.');}
}catch(err){alert('Could not read clipboard. Please ensure you clicked REFUND in Sabre first.');}
});
return;
}

// ── Trip Proposal TIDY injection ──────────────────────────────────────────────
function injectTidyButton(){
var modal=document.querySelector('.trip-proposal-share-modal');
if(!modal)return;
var actionButtons=modal.querySelector('.modal-footer .action-buttons');
if(!actionButtons||document.getElementById('ctTidyButton'))return;
var buttons=actionButtons.querySelectorAll('button');
if(buttons.length<2)return;
var tidyButton=document.createElement('div');
tidyButton.className='scope-wrapper sabre-ngv-themes-components-form';
tidyButton.id='ctTidyButton';
tidyButton.innerHTML='<button class="force-inline-block-wrapper button regular primary ct-tidy-btn" type="button">TIDY</button>';
if(!document.getElementById('ctTidyStyle')){
var tidyStyle=document.createElement('style');tidyStyle.id='ctTidyStyle';
tidyStyle.textContent='.ct-tidy-btn{background-color:#ff2e5f !important;color:white !important;}';
document.head.appendChild(tidyStyle);
}
actionButtons.insertBefore(tidyButton,buttons[1].parentElement);
tidyButton.querySelector('button').addEventListener('click',function(){
var script=document.createElement('script');
script.src='https://cdn.jsdelivr.net/gh/jordan-mcguire/CT-Sabre-Shortcuts@main/trip-proposal.js';
document.body.appendChild(script);
});
}
var proposalObserver=new MutationObserver(function(){injectTidyButton();});
if(document.body)proposalObserver.observe(document.body,{childList:true,subtree:true});
setTimeout(injectTidyButton,500);

// ── State ─────────────────────────────────────────────────────────────────────
var isCollapsed=false;
var currentTicketView='default';
var ticketsInView=[];
var cameFromTicketList=false;
var cachedPNR='';
var cachedTraveler='';
var cachedTicketContext=null;
var lastKnownPNR='';
var pendingCommandPoll=null;
var openPopup=null;
var notesExpanded=false;

// ── Keyboard shortcuts map ────────────────────────────────────────────────────
// Each entry: [key, modifier, label, action]
var SHORTCUTS=[
['P','Alt','Copy PNR','copyPNR'],
['L','Alt','Copy Lumina ID','copyLuminaId'],
['B','Alt','Copy Booking Info','copyBookingInfo'],
['N','Alt','Copy Name','copyName'],
['M','Alt','Copy Mobile','copyMobile'],
['E','Alt','Copy Email','copyEmail'],
['T','Alt','Copy All Contact','copyAllContact'],
['K','Alt','Toggle Notes','toggleNotes'],
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayDDMON(){
var d=new Date();
var dd=String(d.getDate()).padStart(2,'0');
var months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
return dd+months[d.getMonth()];
}

function flashCopied(el){
if(!el)return;
var orig=el.textContent;
el.textContent='✓';el.style.background='#28a745';el.style.color='white';el.style.borderColor='#28a745';
setTimeout(function(){el.textContent=orig;el.style.background='';el.style.color='';el.style.borderColor='';},900);
}

function showToast(msg){
var existing=document.getElementById('ctSabreToast');if(existing)existing.remove();
var t=document.createElement('div');t.id='ctSabreToast';t.textContent=msg;
t.style.cssText='position:fixed;bottom:90px;right:24px;background:#28a745;color:white;'
+'font-family:Aptos,Arial,sans-serif;font-size:12px;font-weight:600;'
+'padding:8px 16px;border-radius:6px;box-shadow:0 3px 12px rgba(0,0,0,0.25);'
+'z-index:1000002;opacity:1;transition:opacity 0.4s ease;pointer-events:none;';
document.body.appendChild(t);
setTimeout(function(){t.style.opacity='0';setTimeout(function(){t.remove();},420);},1400);
}

function closeAllPopups(){
['ctCopyPopup','ctActionsPopup','ctTicketPanel','ctShortcutsPopup'].forEach(function(id){
var el=document.getElementById(id);
if(el){el.style.opacity='0';el.style.transform='translateY(6px)';setTimeout(function(){el.remove();},150);}
});
openPopup=null;
}

// ── Approval helpers ──────────────────────────────────────────────────────────
function approvalBorderColor(approved){
if(approved==='rejected')return '#ff3333';
if(approved==='cancellation')return '#ff9800';
if(approved===true)return '#28a745';
if(approved===false&&currentBookingInfo&&currentBookingInfo.booker)return '#ffc107';
return 'rgba(255,255,255,0.25)';
}

function approvalChipHTML(approved){
if(approved==='rejected')return '<span class="ct-chip ct-chip-rejected">🚫 REJECTED</span>';
if(approved==='cancellation')return '<span class="ct-chip ct-chip-cancellation">⚠️ PENDING CXLD</span>';
if(approved===true)return '<span class="ct-chip ct-chip-approved">✓ APPROVED</span>';
if(approved===false&&currentBookingInfo&&currentBookingInfo.booker)return '<span class="ct-chip ct-chip-pending">⏳ PENDING</span>';
return '';
}

// ── Smart post-command polling ────────────────────────────────────────────────
function waitForView(expectedView,callback){
if(pendingCommandPoll)clearInterval(pendingCommandPoll);
var attempts=0;
pendingCommandPoll=setInterval(function(){
attempts++;
var info=extractBookingInfo();
var detectedView=info.hasEticket?'eticket':(info.tickets.length>0?'list':'default');
if(detectedView===expectedView||attempts>=20){
clearInterval(pendingCommandPoll);pendingCommandPoll=null;
if(info.pnr&&info.pnr.length===6)cachedPNR=info.pnr;
if(info.traveller&&info.traveller.trim()!=='')cachedTraveler=info.traveller;
currentBookingInfo=info;currentTicketView=detectedView;
updateAll();
if(detectedView==='eticket'||detectedView==='list'){
setTimeout(function(){
var btn=document.getElementById('ctBtnTicket');
if(btn)showPopup('ctTicketPanel',buildTicketPanel(currentBookingInfo),btn);
},80);
}
if(typeof callback==='function')callback();
}
},200);
}

function executeSabreCommand(command,expectedView,callback){
var cmdInput=document.querySelector('input.command-line-input[name="cmdln"]');
var sendButton=document.querySelector('button.send-button');
if(!cmdInput||!sendButton){alert('Could not find command input or send button');return;}
cmdInput.value=command;cmdInput.focus();
cmdInput.dispatchEvent(new Event('input',{bubbles:true}));
setTimeout(function(){
sendButton.click();
if(expectedView)waitForView(expectedView,callback);
else if(typeof callback==='function')setTimeout(callback,800);
},100);
}

// ── Extraction ────────────────────────────────────────────────────────────────
function extractClassicTickets(bodyText){
var tickets=[];
if(!bodyText.includes('TKT/TIME LIMIT'))return tickets;
var lines=bodyText.split('\n');var inTicketSection=false;
for(var i=0;i<lines.length;i++){
var line=lines[i].trim();
if(line==='TKT/TIME LIMIT'){inTicketSection=true;continue;}
if(inTicketSection){
var match=line.match(/^.*(TE|TO|ME|MO)\s+(\d{13,17})/);
if(match){
var prefix=match[1];var ticketNo=match[2];
var type='regular';var isNDC=false;var isEMD=false;
if(prefix==='TO'){type='ndc';isNDC=true;}
else if(prefix==='ME'){type='emd';isEMD=true;}
else if(prefix==='MO'){type='ndc-emd';isNDC=true;isEMD=true;}
tickets.push({type:type,ticketNo:ticketNo,isNDC:isNDC,isEMD:isEMD,source:'classic'});
}
if(line===''||line.match(/^[A-Z]+$/))break;
}
}
return tickets;
}

function isViewingIndividualETicket(bodyText){return bodyText.indexOf('ELECTRONIC TICKET RECORD')>-1;}

function extractFirstPaxRaw(bodyText){
var m=bodyText.match(/1\.1([^\n]+)/);
if(!m)return '';
return m[1].replace(/\s+\d+\.\d+.*$/,'').trim();
}

function extractBookingInfo(){
var responseElement=document.querySelector('.app.responses.text.views.Text.text');
var bodyText=responseElement?responseElement.innerText:document.body.innerText;
var lines=document.querySelectorAll('.dn-line.text-line');
var info={pnr:'',traveller:'',surname:'',firstname:'',company:'',luminaId:'',booker:'',
method:'',methodLine:0,approved:false,notes:[],email:'',phone:'',
hasEticket:false,ticketInfo:{ticketNo:'',paxName:'',pnr:''},tickets:[],isGraphicalView:false};

var isGraphicalView=document.querySelector('.pnr-record-locator')!==null;
if(isGraphicalView){
var pnrEl=document.querySelector('.pnr-record-locator');if(pnrEl)info.pnr=pnrEl.textContent.trim();
var travEl=document.querySelector('.pnr-pax');if(travEl)info.traveller=travEl.textContent.trim();
document.querySelectorAll('.pay-ticket-segment-ticketing .docNumber').forEach(function(el){
var t=el.textContent.trim();
if(t&&t.match(/^\d{13,17}$/))info.tickets.push({ticketNo:t,type:'regular',isNDC:false,isEMD:false,source:'graphical'});
});
var ndcSec=document.querySelector('#ticketing-list');
if(ndcSec){ndcSec.querySelectorAll('.number-col .itinerary-segment-value').forEach(function(el){
var t=el.textContent.trim();
if(t&&t.match(/^\d{13,17}$/))info.tickets.push({ticketNo:t,type:'ndc',isNDC:true,isEMD:false,source:'graphical'});
});}
info.isGraphicalView=true;ticketsInView=info.tickets;
currentTicketView=info.tickets.length>0?'list':'default';return info;
}

var viewingETicket=isViewingIndividualETicket(bodyText);
var classicTickets=extractClassicTickets(bodyText);
if(viewingETicket){currentTicketView='eticket';info.hasEticket=true;}
else if(classicTickets.length>0){currentTicketView='list';info.tickets=classicTickets;ticketsInView=classicTickets;}
else{currentTicketView='default';}

var passengerLineIndex=-1;
for(var i=0;i<lines.length;i++){if(lines[i].innerText.trim().startsWith('1.1')){passengerLineIndex=i;break;}}
if(passengerLineIndex>0){
for(var j=0;j<passengerLineIndex;j++){
var t=lines[j].innerText.trim();
if(t.length===6&&/^[A-Z]{6}$/i.test(t)){info.pnr=t;break;}
}
}

var rawPax=extractFirstPaxRaw(bodyText);
info.traveller=rawPax;
if(rawPax){var np=rawPax.split('/');if(np.length>=2){info.surname=np[0].trim();info.firstname=np[1].trim();}}
var cm=bodyText.match(/L¥COMPANY ID-([^\s\n]+)/);if(cm)info.company=cm[1].trim();
var lm=bodyText.match(/L¥LUMINA ID-(\d+)/);if(lm)info.luminaId=lm[1].trim();
var bm=bodyText.match(/L¥BKG MADE-([^\/\n]+)/);if(bm)info.booker=bm[1].trim();
var mm=bodyText.match(/\s*(\d+)\.L¥METHOD-([WMET])/);if(mm){info.methodLine=parseInt(mm[1]);info.method=mm[2];}

if(bodyText.indexOf('B¥BOOKING REJECTED')>-1)info.approved='rejected';
else if(bodyText.indexOf('A¥BOOKING STATUS CHANGED TO PENDING CANCELLATION')>-1)info.approved='cancellation';
else if(bodyText.indexOf('B¥BOOKING AUTHORISED')>-1)info.approved=true;
else info.approved=false;

var noteMatches=bodyText.matchAll(/\d+\.H-N-(.+?)(?=\n|$)/g);
for(var nm of noteMatches){var nt=nm[1].trim();if(!/NDC AIRLINE CANCELLED FLIGHTS/i.test(nt))info.notes.push(nt);}

var em=bodyText.match(/E¥PAX-([^\n]+)/);if(em)info.email=em[1].replace(/\.\./g,'_').replace(/¤/g,'@').trim();
var pm=bodyText.match(/P¥PAX-([^\n]+)/);if(pm)info.phone=pm[1].trim();

if(info.hasEticket){
var tktM=bodyText.match(/TKT:(\d{13,17}(?:\/\d{1,3})?)/);
if(tktM){var tn=tktM[1];if(tn.includes('/')){var tp=tn.split('/');tn=tp[0]+'-'+tp[0][tp[0].length-2]+tp[1];}info.ticketInfo.ticketNo=tn;}
var nM=bodyText.match(/NAME:([^\n]+?)(?:\s{3,}|\n)/);if(nM)info.ticketInfo.paxName=nM[1].trim();
var pM=bodyText.match(/PNR:([A-Z0-9]{6})/);if(pM)info.ticketInfo.pnr=pM[1];
}
return info;
}

var currentBookingInfo=extractBookingInfo();
lastKnownPNR=currentBookingInfo.pnr;
if(currentBookingInfo.pnr&&currentBookingInfo.pnr.length===6)cachedPNR=currentBookingInfo.pnr;
if(currentBookingInfo.traveller)cachedTraveler=currentBookingInfo.traveller;

// ── Truncate ──────────────────────────────────────────────────────────────────
function trunc(str,max){
if(!str)return '';var s=String(str);
return s.length>max?'<span title="'+s.replace(/"/g,'&quot;')+'">'+s.substring(0,max)+'…</span>':s;
}

// ── Notes banner ──────────────────────────────────────────────────────────────
// Always floats directly above the toolbar when notes exist.
// Click to expand/collapse the note text.
function buildNotesBanner(notes){
if(!notes||notes.length===0)return null;
var banner=document.createElement('div');
banner.id='ctNotesBanner';
renderNotesBanner(banner,notes);
return banner;
}

function renderNotesBanner(banner,notes){
var expanded=notesExpanded;
// Banner is 300px wide to fit ~42 chars per note line comfortably
banner.innerHTML=
'<div class="ct-banner-header">'
+'<span class="ct-banner-icon">⚠️</span>'
+'<span class="ct-banner-title">'+notes.length+' Note'+(notes.length>1?'s':'')+' to Agent</span>'
+'<span class="ct-banner-toggle">'+(expanded?'▾':'▸')+'</span>'
+'</div>'
+(expanded
? '<div class="ct-banner-notes">'
+notes.map(function(n){return '<div class="ct-banner-note-line">'+n+'</div>';}).join('')
+'</div>'
: '');
banner.onclick=function(e){
e.stopPropagation();
notesExpanded=!notesExpanded;
renderNotesBanner(banner,notes);
repositionBanner();
};
}

function repositionBanner(){
var tb=document.getElementById('ctToolbar');
var banner=document.getElementById('ctNotesBanner');
if(!tb||!banner)return;
var tbRect=tb.getBoundingClientRect();
var bannerHeight=banner.offsetHeight;
banner.style.bottom=(window.innerHeight-tbRect.top+6)+'px';
banner.style.right=(window.innerWidth-tbRect.right)+'px';
}

function syncNotesBanner(info){
var existing=document.getElementById('ctNotesBanner');
if(info.notes&&info.notes.length>0){
if(!existing){
var banner=buildNotesBanner(info.notes);
if(banner){document.body.appendChild(banner);repositionBanner();}
}else{
// Update note content but keep expanded state
renderNotesBanner(existing,info.notes);
repositionBanner();
}
}else{
if(existing)existing.remove();
notesExpanded=false;
}
}

// ── Build toolbar ─────────────────────────────────────────────────────────────
function buildToolbarHTML(info){
var traveller=info.traveller||cachedTraveler||'';
var approved=info.approved;
var borderColor=approvalBorderColor(approved);
var chip=approvalChipHTML(approved);
var hasTickets=currentTicketView==='list'||currentTicketView==='eticket';
var notesBadge=info.notes&&info.notes.length>0
?'<span class="ct-notes-dot">'+info.notes.length+'</span>':'' ;

var html='<div id="ctToolbarInner" style="border-left:3px solid '+borderColor+';">';
// Left: name + approval chip
html+='<div class="ct-name-area" title="Drag to move">';
html+='<span class="ct-plane">✈</span>';
html+='<div class="ct-name-block">';
if(traveller){
html+='<span class="ct-traveller">'+trunc(traveller,24)+'</span>';
}else{
html+='<span class="ct-traveller ct-dim">No booking</span>';
}
if(chip)html+='<div class="ct-chip-row">'+chip+'</div>';
html+='</div>';
html+='</div>';
// Right: icon buttons
html+='<div class="ct-icon-btns">';
html+='<button class="ct-icon-btn" id="ctBtnCopy" title="Copy (Alt+…)">📋</button>';
if(hasTickets){
html+='<button class="ct-icon-btn" id="ctBtnTicket" title="Ticket actions">🎫</button>';
}
html+='<button class="ct-icon-btn ct-actions-btn" id="ctBtnActions" title="Actions">⚡'+notesBadge+'</button>';
html+='<button class="ct-icon-btn ct-shortcuts-btn" id="ctBtnShortcuts" title="Keyboard shortcuts">?</button>';
html+='<button class="ct-icon-btn ct-collapse-btn" id="ctBtnCollapse" title="Collapse">−</button>';
html+='</div>';
html+='</div>';
return html;
}

// ── Build popups ──────────────────────────────────────────────────────────────
function buildCopyPopupHTML(info){
var hasContact=info.email||info.phone;
var html='<div class="ct-popup-section-label">COPY</div>';
html+='<button class="ct-popup-btn" data-action="copyPNR">📋 PNR <kbd>Alt+P</kbd></button>';
html+='<button class="ct-popup-btn" data-action="copyLuminaId">📋 Lumina ID <kbd>Alt+L</kbd></button>';
html+='<button class="ct-popup-btn" data-action="copyBookingInfo">📋 Full Booking Info <kbd>Alt+B</kbd></button>';
if(hasContact){
html+='<div class="ct-popup-divider"></div>';
html+='<div class="ct-popup-section-label">CONTACT</div>';
html+='<button class="ct-popup-btn" data-action="copyName">👤 Name <kbd>Alt+N</kbd></button>';
html+='<button class="ct-popup-btn" data-action="copyMobile">📱 Mobile <kbd>Alt+M</kbd></button>';
html+='<button class="ct-popup-btn" data-action="copyEmail">✉️ Email <kbd>Alt+E</kbd></button>';
html+='<button class="ct-popup-btn" data-action="copyAllContact">📋 Copy All Contact <kbd>Alt+T</kbd></button>';
}
return html;
}

function buildActionsPopupHTML(info){
var html='';
html+='<div class="ct-popup-section-label">NAVIGATE</div>';
html+='<button class="ct-popup-btn" data-action="viewSerko">🔗 View in Serko</button>';
html+='<button class="ct-popup-btn" data-action="masquerade">👤 View in YourCT</button>';
html+='<div class="ct-popup-divider"></div>';
html+='<div class="ct-popup-section-label">COMMANDS</div>';
html+='<button class="ct-popup-btn" data-action="updateTTL">⏱ Update TTL ('+todayDDMON()+')</button>';
html+='<button class="ct-popup-btn" data-action="queueSerko">📤 Queue to Serko</button>';
if(info.method){
html+='<div class="ct-popup-divider"></div>';
html+='<div class="ct-popup-section-label">BOOKING METHOD</div>';
html+='<select class="ct-method-select" data-line="'+info.methodLine+'">'
+'<option value="W"'+(info.method==='W'?' selected':'')+'>Web</option>'
+'<option value="M"'+(info.method==='M'?' selected':'')+'>Mixed</option>'
+'<option value="E"'+(info.method==='E'?' selected':'')+'>Email</option>'
+'<option value="T"'+(info.method==='T'?' selected':'')+'>Telephone</option>'
+'</select>';
}
return html;
}

function buildTicketPanelHTML(info){
var html='';
if(currentTicketView==='list'&&info.tickets&&info.tickets.length>0){
html+='<div class="ct-popup-section-label">🎫 SELECT TICKET</div>';
info.tickets.forEach(function(ticket){
var labels='';
if(ticket.isNDC)labels+=' <span class="ndc-label">NDC</span>';
if(ticket.isEMD)labels+=' <span class="emd-label">EMD</span>';
html+='<button class="ct-popup-btn ct-ticket-item" data-ticket-no="'+ticket.ticketNo+'" data-type="'+ticket.type+'">'+ticket.ticketNo+labels+'</button>';
});
html+='<div class="ct-ticket-note">NDC tickets require graphical view in Ticketing tab.</div>';
}else if(currentTicketView==='eticket'){
html+='<div class="ct-popup-section-label">🎫 TICKET ACTIONS</div>';
html+='<div class="ct-ticket-btn-row">';
html+='<button class="ct-popup-btn" data-action="copyTicketNo">TKT NO</button>';
html+='<button class="ct-popup-btn" data-action="copyTicketName">NAME</button>';
html+='<button class="ct-popup-btn" data-action="copyTicketPNR">PNR</button>';
html+='</div>';
html+='<button class="ct-popup-btn ct-highlight-btn" data-action="copyAllTicket">📋 Copy All Ticket Info</button>';
html+='<button class="ct-popup-btn ct-highlight-btn" data-action="refundTicket">↩️ Refund Ticket</button>';
if(cameFromTicketList&&ticketsInView.length>1){
html+='<div class="ct-popup-divider"></div>';
html+='<button class="ct-popup-btn" data-action="backToList">← Back to Ticket List</button>';
}
}
return html;
}

function buildShortcutsPopupHTML(){
var html='<div class="ct-popup-section-label">⌨️ KEYBOARD SHORTCUTS</div>';
html+='<table class="ct-shortcuts-table">';
SHORTCUTS.forEach(function(s){
html+='<tr><td><kbd>'+s[1]+'+'+s[0]+'</kbd></td><td>'+s[2]+'</td></tr>';
});
html+='</table>';
return html;
}

// ── Popup factory ─────────────────────────────────────────────────────────────
function showPopup(id,contentHTML,anchorBtn){
closeAllPopups();
if(openPopup===id){openPopup=null;return;}
var popup=document.createElement('div');
popup.id=id;popup.className='ct-popup';
popup.innerHTML=contentHTML;
document.body.appendChild(popup);
var rect=anchorBtn.getBoundingClientRect();
popup.style.right=(window.innerWidth-rect.right)+'px';
popup.style.bottom=(window.innerHeight-rect.top+6)+'px';
requestAnimationFrame(function(){popup.style.opacity='1';popup.style.transform='translateY(0)';});
openPopup=id;
attachPopupHandlers(popup);
}

// ── Popup handlers ────────────────────────────────────────────────────────────
function attachPopupHandlers(popup){
var methodSelect=popup.querySelector('.ct-method-select');
if(methodSelect){
methodSelect.addEventListener('change',function(){
updateMethod(this.getAttribute('data-line'),this.value);
});
}
popup.querySelectorAll('.ct-ticket-item').forEach(function(btn){
btn.addEventListener('click',function(e){
e.stopPropagation();
executeViewEticket(this.getAttribute('data-ticket-no'),this.getAttribute('data-type'));
closeAllPopups();
});
});
popup.querySelectorAll('[data-action]').forEach(function(btn){
btn.addEventListener('click',function(e){
e.preventDefault();e.stopPropagation();
handleAction(this.getAttribute('data-action'),this);
});
});
}

// ── Centralised action handler ────────────────────────────────────────────────
function handleAction(action,el){
switch(action){
case 'copyPNR':
if(currentBookingInfo.pnr&&currentBookingInfo.pnr.length===6){navigator.clipboard.writeText(currentBookingInfo.pnr);if(el)flashCopied(el);else showToast('✓ PNR copied');}
break;
case 'copyLuminaId':
if(currentBookingInfo.luminaId){navigator.clipboard.writeText(currentBookingInfo.luminaId);if(el)flashCopied(el);else showToast('✓ Lumina ID copied');}
break;
case 'copyBookingInfo':
copyBookingInfoRich().then(function(){showToast('✓ Booking info copied');});
break;
case 'copyName':
var rawName=currentBookingInfo.traveller||cachedTraveler||'';
if(rawName){navigator.clipboard.writeText(rawName);if(el)flashCopied(el);else showToast('✓ Name copied');}
break;
case 'copyMobile':
if(currentBookingInfo.phone){navigator.clipboard.writeText(currentBookingInfo.phone);if(el)flashCopied(el);else showToast('✓ Mobile copied');}
break;
case 'copyEmail':
if(currentBookingInfo.email){navigator.clipboard.writeText(currentBookingInfo.email);if(el)flashCopied(el);else showToast('✓ Email copied');}
break;
case 'copyAllContact':
copyContactDetailsRich().then(function(){showToast('✓ Contact copied');closeAllPopups();});
break;
case 'toggleNotes':
notesExpanded=!notesExpanded;
var banner=document.getElementById('ctNotesBanner');
if(banner)renderNotesBanner(banner,currentBookingInfo.notes);
repositionBanner();
break;
case 'copyTicketNo':
var tkt=currentBookingInfo.ticketInfo.ticketNo||(cachedTicketContext&&cachedTicketContext.ticketNo)||'';
if(tkt){navigator.clipboard.writeText(tkt);if(el)flashCopied(el);else showToast('✓ Ticket No copied');}
break;
case 'copyTicketName':
var tname=currentBookingInfo.ticketInfo.paxName||(cachedTicketContext&&cachedTicketContext.traveler)||cachedTraveler||'';
if(tname){navigator.clipboard.writeText(tname);if(el)flashCopied(el);else showToast('✓ Name copied');}
break;
case 'copyTicketPNR':
var tpnr=currentBookingInfo.ticketInfo.pnr||(cachedTicketContext&&cachedTicketContext.pnr)||cachedPNR||'';
if(tpnr){navigator.clipboard.writeText(tpnr);if(el)flashCopied(el);else showToast('✓ PNR copied');}
break;
case 'copyAllTicket':
copyAllTicketInfo().then(function(){showToast('✓ Ticket details copied');});
break;
case 'refundTicket':
copyRefundData();closeAllPopups();
break;
case 'backToList':
cameFromTicketList=false;cachedTicketContext=null;currentTicketView='list';
updateAll();
setTimeout(function(){var btn=document.getElementById('ctBtnTicket');if(btn)showPopup('ctTicketPanel',buildTicketPanelHTML(currentBookingInfo),btn);},80);
break;
case 'viewSerko':
var smatch=document.body.innerText.match(/Q¥QUOTE NUMBER\s*-\s*(\d+)/);
if(smatch&&smatch[1])window.open('https://serko.corporatetraveller.com.au/Web/Booking/Detail/'+smatch[1],'_blank');
else alert('Quote number not found!');
break;
case 'masquerade':
var mmatch=document.body.innerText.match(/U62-([A-F0-9-]+)/i);
if(mmatch&&mmatch[1])window.open('https://agentport.fcm.travel/SamlService/AgentToClientSsoTraveler/'+mmatch[1],'_blank');
else alert('Agentport or YourCT profile not found.');
break;
case 'updateTTL':
executeSabreCommand('7TAW/'+todayDDMON(),null);showToast('✓ TTL command sent');closeAllPopups();
break;
case 'queueSerko':
executeSabreCommand('QP/90/1',null);showToast('✓ Queue command sent');closeAllPopups();
break;
}
}

// ── Keyboard shortcut listener ────────────────────────────────────────────────
document.addEventListener('keydown',function(e){
if(!document.getElementById('ctToolbar'))return;
// Don't fire if agent is typing in the Sabre command input
if(document.activeElement&&document.activeElement.matches('input,textarea,select'))return;
SHORTCUTS.forEach(function(s){
if(e.altKey&&e.key.toUpperCase()===s[0]){
e.preventDefault();
handleAction(s[3],null);
}
});
});

// ── Update everything ─────────────────────────────────────────────────────────
function updateAll(){
var tb=document.getElementById('ctToolbar');
if(tb){
tb.innerHTML=buildToolbarHTML(currentBookingInfo);
attachToolbarHandlers();
}
syncNotesBanner(currentBookingInfo);
}

// ── Collapse / expand ─────────────────────────────────────────────────────────
function collapseToolbar(){
isCollapsed=true;
closeAllPopups();
var banner=document.getElementById('ctNotesBanner');if(banner)banner.remove();
var tb=document.getElementById('ctToolbar');
if(tb){
tb.style.opacity='0';tb.style.transform='scale(0.8)';
setTimeout(function(){
tb.remove();
createCollapsedIcon();
},180);
}
}

function createCollapsedIcon(){
var icon=document.createElement('div');
icon.id='ctToolbarIcon';
var hasNotes=currentBookingInfo&&currentBookingInfo.notes&&currentBookingInfo.notes.length>0;
icon.innerHTML='<span>✈</span>'+(hasNotes?'<span class="ct-icon-notes-dot">'+currentBookingInfo.notes.length+'</span>':'');
icon.title='CT Sabre Shortcuts'+(hasNotes?' — '+currentBookingInfo.notes.length+' note(s) to agent':'');
icon.addEventListener('click',expandToolbar);
document.body.appendChild(icon);
}

function expandToolbar(){
isCollapsed=false;
var icon=document.getElementById('ctToolbarIcon');if(icon)icon.remove();
var tb=document.createElement('div');
tb.id='ctToolbar';
tb.innerHTML=buildToolbarHTML(currentBookingInfo);
document.body.appendChild(tb);
attachToolbarHandlers();
syncNotesBanner(currentBookingInfo);
// Reposition banner after toolbar renders
setTimeout(repositionBanner,50);
}

// ── Toolbar button handlers ───────────────────────────────────────────────────
function attachToolbarHandlers(){
var tb=document.getElementById('ctToolbar');
if(!tb)return;

document.getElementById('ctBtnCopy')&&document.getElementById('ctBtnCopy').addEventListener('click',function(e){
e.stopPropagation();showPopup('ctCopyPopup',buildCopyPopupHTML(currentBookingInfo),this);
});
document.getElementById('ctBtnActions')&&document.getElementById('ctBtnActions').addEventListener('click',function(e){
e.stopPropagation();showPopup('ctActionsPopup',buildActionsPopupHTML(currentBookingInfo),this);
});
document.getElementById('ctBtnTicket')&&document.getElementById('ctBtnTicket').addEventListener('click',function(e){
e.stopPropagation();showPopup('ctTicketPanel',buildTicketPanelHTML(currentBookingInfo),this);
});
document.getElementById('ctBtnShortcuts')&&document.getElementById('ctBtnShortcuts').addEventListener('click',function(e){
e.stopPropagation();showPopup('ctShortcutsPopup',buildShortcutsPopupHTML(),this);
});
document.getElementById('ctBtnCollapse')&&document.getElementById('ctBtnCollapse').addEventListener('click',function(e){
e.stopPropagation();collapseToolbar();
});

// Drag on name area
var isDragging=false,startX,startY,origRight,origBottom;
var nameArea=tb.querySelector('.ct-name-area');
if(nameArea){
nameArea.addEventListener('mousedown',function(e){
isDragging=true;startX=e.clientX;startY=e.clientY;
var cs=window.getComputedStyle(tb);
origRight=parseInt(cs.right)||20;origBottom=parseInt(cs.bottom)||20;
e.preventDefault();
});
}
document.addEventListener('mousemove',function(e){
if(!isDragging)return;
var dx=e.clientX-startX;var dy=e.clientY-startY;
var tbEl=document.getElementById('ctToolbar');
if(tbEl){
var nr=origRight-dx;var nb=origBottom-dy;
tbEl.style.right=nr+'px';tbEl.style.bottom=nb+'px';
repositionBanner();
}
});
document.addEventListener('mouseup',function(){isDragging=false;});
}

// ── Observer ──────────────────────────────────────────────────────────────────
var observer=new MutationObserver(function(){
if(pendingCommandPoll)return;
var newInfo=extractBookingInfo();
if(newInfo.pnr&&newInfo.pnr.length===6)cachedPNR=newInfo.pnr;
if(newInfo.traveller&&newInfo.traveller.trim()!=='')cachedTraveler=newInfo.traveller;
var newView=newInfo.hasEticket?'eticket':(newInfo.tickets.length>0?'list':'default');
if(newInfo.pnr&&newInfo.pnr!==lastKnownPNR){
lastKnownPNR=newInfo.pnr;currentBookingInfo=newInfo;currentTicketView=newView;
cameFromTicketList=false;cachedTicketContext=null;notesExpanded=false;
closeAllPopups();updateAll();
}else if(newView!==currentTicketView){
currentBookingInfo=newInfo;currentTicketView=newView;updateAll();
}else{
// Still update notes banner even if view/pnr unchanged (notes may have changed)
syncNotesBanner(newInfo);
}
});
var responseArea=document.querySelector('.area-out');
if(responseArea)observer.observe(responseArea,{childList:true,subtree:true,characterData:true});

// Close popups on outside click
document.addEventListener('click',function(e){
if(!openPopup)return;
var popup=document.getElementById(openPopup);
var tb=document.getElementById('ctToolbar');
if(popup&&!popup.contains(e.target)&&(!tb||!tb.contains(e.target))){
closeAllPopups();
}
},{capture:true});

// ── Clipboard helpers ─────────────────────────────────────────────────────────
async function writeRichClipboard(htmlText,plainText){
try{
await navigator.clipboard.write([new ClipboardItem({
'text/html':new Blob([htmlText],{type:'text/html'}),
'text/plain':new Blob([plainText.trim()],{type:'text/plain'})
})]);
}catch(err){
var temp=document.createElement('textarea');temp.value=plainText.trim();
document.body.appendChild(temp);temp.select();document.execCommand('copy');document.body.removeChild(temp);
}
}

function buildEmailTable(title,rows){
var rowsHTML=rows.map(function(r,i){
var bg=i%2===0?'white':'#fafafa';
return '<tr style="background:'+bg+';">'
+'<td style="padding:5px 12px;color:#888;font-size:11px;white-space:nowrap;border-right:1px solid #f0f0f0;">'+r[0]+'</td>'
+'<td style="padding:5px 12px;font-size:11px;color:#222;'+(r[2]?'font-family:monospace;':'')+'">'+r[1]+'</td>'
+'</tr>';
}).join('');
return '<table style="border-collapse:collapse;border:1px solid #e0e0e0;font-family:Arial,sans-serif;min-width:280px;">'
+'<thead><tr><td colspan="2" style="background:#ff2e5f;color:white;font-weight:700;font-size:11px;padding:8px 12px;letter-spacing:0.5px;">'+title+'</td></tr></thead>'
+'<tbody>'+rowsHTML+'</tbody></table>';
}

async function copyBookingInfoRich(){
var pnr=currentBookingInfo.pnr&&currentBookingInfo.pnr.length===6?currentBookingInfo.pnr:'';
var traveller=currentBookingInfo.traveller||cachedTraveler||'';
var rows=[];
if(pnr)rows.push(['GDS Reference',pnr,true]);
if(currentBookingInfo.luminaId)rows.push(['CT Booking Number',currentBookingInfo.luminaId,true]);
if(traveller)rows.push(['Traveller',traveller,false]);
if(!rows.length)return;
var plain=rows.map(function(r){return r[0]+': '+r[1];}).join('\n');
await writeRichClipboard(buildEmailTable('BOOKING REFERENCE',rows),plain);
}

async function copyContactDetailsRich(){
var fullName=currentBookingInfo.traveller||cachedTraveler||'Not Found';
var rows=[
['Name',fullName,false],
['Mobile',currentBookingInfo.phone||'Not Found',false],
['Email',currentBookingInfo.email||'Not Found',false]
];
var plain=rows.map(function(r){return r[0]+': '+r[1];}).join('\n');
await writeRichClipboard(buildEmailTable('PASSENGER CONTACT',rows),plain);
}

async function copyAllTicketInfo(){
var displayTicket,displayName,displayPNR;
if(currentBookingInfo.ticketInfo.ticketNo){
displayTicket=currentBookingInfo.ticketInfo.ticketNo;displayName=currentBookingInfo.ticketInfo.paxName;displayPNR=currentBookingInfo.ticketInfo.pnr;
}else if(cachedTicketContext){
displayTicket=cachedTicketContext.ticketNo;displayName=cachedTicketContext.traveler;displayPNR=cachedTicketContext.pnr;
}else{displayTicket='Not Found';displayName=cachedTraveler||'Not Found';displayPNR=cachedPNR||'TBA';}
var rows=[['Ticket No',displayTicket,true],['Passenger',displayName,false],['PNR',displayPNR,true]];
await writeRichClipboard(buildEmailTable('TICKET DETAILS',rows),rows.map(function(r){return r[0]+': '+r[1];}).join('\n'));
}

async function copyRefundData(){
var displayTicket,displayName,displayPNR;
if(currentBookingInfo.ticketInfo.ticketNo){
displayTicket=currentBookingInfo.ticketInfo.ticketNo;displayName=currentBookingInfo.ticketInfo.paxName;displayPNR=currentBookingInfo.ticketInfo.pnr;
}else if(cachedTicketContext){
displayTicket=cachedTicketContext.ticketNo;displayName=cachedTicketContext.traveler;displayPNR=cachedTicketContext.pnr;
}else{displayTicket='Not Found';displayName=cachedTraveler||'Not Found';displayPNR=cachedPNR||'TBA';}
try{
await navigator.clipboard.writeText('##SABRE_REFUND##\nTICKET: '+displayTicket+'\nNAME: '+displayName+'\nPNR: '+displayPNR+'\n');
window.open('https://auoasisservices.au.fcl.internal/OasisWeb/RefundApplication/Create','_blank');
}catch(err){alert('Could not copy refund data to clipboard');}
}

// ── Ticket commands ───────────────────────────────────────────────────────────
function executeViewEticket(ticketNo,ticketType){
cachedTicketContext={ticketNo:ticketNo,pnr:cachedPNR,traveler:cachedTraveler,type:ticketType};
if(ticketsInView.length>1)cameFromTicketList=true;
if(ticketType==='ndc'||ticketType==='ndc-emd'){
alert('NDC ticket — view graphically in Ticketing tab. Context cached for refund.');return;
}
var cleanTicketNo=ticketNo.replace(/[\/-].*$/,'');
executeSabreCommand((ticketType==='emd'?'WEMD*T':'WETR*T')+cleanTicketNo,'eticket');
}

function executeViewTicketsCommand(){
if(currentBookingInfo.pnr&&currentBookingInfo.pnr.length===6)cachedPNR=currentBookingInfo.pnr;
if(currentBookingInfo.traveller)cachedTraveler=currentBookingInfo.traveller;
executeSabreCommand('*T','list');
}

function updateMethod(lineNumber,newMethod){
var cmdInput=document.querySelector('input.command-line-input[name="cmdln"]');
var sendButton=document.querySelector('button.send-button');
if(!cmdInput||!sendButton){alert('Could not find command input or send button');return;}
cmdInput.value='5'+lineNumber+'¤L¥METHOD-'+newMethod;cmdInput.focus();
cmdInput.dispatchEvent(new Event('input',{bubbles:true}));
setTimeout(function(){sendButton.click();setTimeout(function(){showToast('✅ Method updated — save PNR');},600);},100);
}

// ── Styles ────────────────────────────────────────────────────────────────────
var style=document.createElement('style');
style.textContent=
// Toolbar
'#ctToolbar{'
+'position:fixed;bottom:20px;right:20px;z-index:999999;'
+'font-family:Aptos,Arial,sans-serif;'
+'transition:opacity 0.18s,transform 0.18s;'
+'animation:ctPopIn 0.2s ease-out;}'
+'@keyframes ctPopIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}'

+'#ctToolbarInner{'
+'display:flex;align-items:stretch;'
+'background:linear-gradient(135deg,#c4103a 0%,#ff2e5f 60%,#d41a4a 100%);'
+'border-radius:28px;'
+'box-shadow:0 6px 22px rgba(0,0,0,0.4);'
+'border-left:4px solid #28a745;'
+'overflow:hidden;'
+'min-height:44px;}'  // roomier than before

// Name / drag area
+'.ct-name-area{'
+'display:flex;align-items:center;gap:8px;'
+'padding:8px 14px 8px 12px;'
+'cursor:move;user-select:none;'
+'border-right:1px solid rgba(255,255,255,0.18);'
+'min-width:0;max-width:220px;}'
+'.ct-plane{font-size:15px;flex-shrink:0;line-height:1;}'
+'.ct-name-block{display:flex;flex-direction:column;gap:3px;min-width:0;}'
+'.ct-traveller{font-size:11.5px;font-weight:700;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2;}'
+'.ct-dim{opacity:0.55;font-weight:400;}'
+'.ct-chip-row{display:flex;}'

// Approval chips
+'.ct-chip{font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;white-space:nowrap;}'
+'.ct-chip-approved{background:#d4edda;color:#155724;}'
+'.ct-chip-pending{background:#fff3cd;color:#856404;}'
+'.ct-chip-cancellation{background:#ffebee;color:#c62828;}'
+'.ct-chip-rejected{background:#ff0000;color:white;}'

// Icon buttons
+'.ct-icon-btns{display:flex;align-items:center;}'
+'.ct-icon-btn{'
+'background:none;border:none;color:white;'
+'font-size:16px;cursor:pointer;'
+'min-width:38px;height:100%;'
+'display:flex;align-items:center;justify-content:center;'
+'position:relative;padding:0 6px;'
+'transition:background 0.15s;font-family:inherit;}'
+'.ct-icon-btn:hover{background:rgba(255,255,255,0.15);}'
+'.ct-shortcuts-btn{font-size:13px;font-weight:800;opacity:0.85;}'
+'.ct-shortcuts-btn:hover{opacity:1;}'
+'.ct-collapse-btn{font-size:20px;opacity:0.7;border-left:1px solid rgba(255,255,255,0.18);min-width:34px;}'
+'.ct-collapse-btn:hover{opacity:1;background:rgba(0,0,0,0.2);}'

// Orange notes dot on ⚡ button
+'.ct-notes-dot{'
+'position:absolute;top:6px;right:4px;'
+'background:#ff9800;color:white;'
+'font-size:8px;font-weight:800;'
+'min-width:14px;height:14px;border-radius:7px;'
+'display:flex;align-items:center;justify-content:center;'
+'padding:0 3px;border:1.5px solid #ff2e5f;line-height:1;}'

// Collapsed icon bubble
+'#ctToolbarIcon{'
+'position:fixed;bottom:20px;right:20px;'
+'width:52px;height:52px;'
+'background:linear-gradient(135deg,#ff2e5f 0%,#ff6b9d 100%);'
+'border-radius:50%;'
+'box-shadow:0 4px 18px rgba(0,0,0,0.35);'
+'z-index:999999;display:flex;align-items:center;justify-content:center;'
+'cursor:pointer;position:fixed;'
+'animation:ctPopIn 0.2s ease-out;}'
+'#ctToolbarIcon:hover{transform:scale(1.08);}'
+'#ctToolbarIcon span:first-child{font-size:24px;}'
+'.ct-icon-notes-dot{'
+'position:absolute;top:2px;right:2px;'
+'background:#ff9800;color:white;font-size:8px;font-weight:800;'
+'min-width:15px;height:15px;border-radius:8px;'
+'display:flex;align-items:center;justify-content:center;'
+'padding:0 3px;border:2px solid white;line-height:1;}'

// Notes banner — floats above toolbar, 300px wide
+'#ctNotesBanner{'
+'position:fixed;z-index:999998;'
+'width:300px;'
+'background:#fffbf0;'
+'border:1px solid #ffcc80;'
+'border-left:4px solid #ff9800;'
+'border-radius:10px;'
+'box-shadow:0 4px 16px rgba(0,0,0,0.18);'
+'font-family:Aptos,Arial,sans-serif;'
+'cursor:pointer;'
+'overflow:hidden;'
+'animation:ctPopIn 0.2s ease-out;}'
+'.ct-banner-header{'
+'display:flex;align-items:center;gap:8px;'
+'padding:9px 12px;'
+'background:#fff3e0;}'
+'.ct-banner-icon{font-size:14px;flex-shrink:0;}'
+'.ct-banner-title{font-size:11px;font-weight:700;color:#e65100;flex:1;}'
+'.ct-banner-toggle{font-size:12px;color:#e65100;flex-shrink:0;}'
+'.ct-banner-notes{'
+'padding:8px 12px 10px;'
+'border-top:1px solid #ffcc80;}'
+'.ct-banner-note-line{'
+'font-size:10.5px;line-height:1.6;color:#333;'
+'padding:3px 0;'
+'word-break:break-word;white-space:pre-wrap;'
+'border-bottom:1px dotted rgba(255,152,0,0.3);}'
+'.ct-banner-note-line:last-child{border-bottom:none;}'

// Popup
+'.ct-popup{'
+'position:fixed;z-index:1000001;'
+'width:220px;'
+'background:white;'
+'border-radius:10px;'
+'box-shadow:0 8px 28px rgba(0,0,0,0.22);'
+'border:1px solid #f0e0e5;'
+'padding:8px;'
+'opacity:0;transform:translateY(6px);'
+'transition:opacity 0.15s ease,transform 0.15s ease;}'
+'.ct-popup-section-label{'
+'font-size:8px;font-weight:800;color:#ff2e5f;'
+'text-transform:uppercase;letter-spacing:0.6px;'
+'padding:4px 6px;margin-top:2px;}'
+'.ct-popup-btn{'
+'display:block;width:100%;text-align:left;'
+'padding:7px 10px;margin:2px 0;'
+'background:#fff8fa;color:#222;'
+'border:1px solid #f0e0e5;border-radius:6px;'
+'font-size:10.5px;font-weight:500;cursor:pointer;'
+'font-family:Aptos,Arial,sans-serif;'
+'transition:background 0.12s,color 0.12s;}'
+'.ct-popup-btn:hover{background:#ffe0ea;color:#ff2e5f;border-color:#ffb3c6;}'
+'.ct-highlight-btn{background:#fff3cd;border-color:#ffd700;font-weight:600;}'
+'.ct-highlight-btn:hover{background:#ffe066;color:#333;}'
+'.ct-popup-divider{height:1px;background:#f0e0e5;margin:6px 0;}'
+'.ct-ticket-note{font-size:8px;color:#999;font-style:italic;text-align:center;padding:4px 0;}'
+'.ct-ticket-btn-row{display:flex;gap:4px;margin:4px 0;}'
+'.ct-ticket-btn-row .ct-popup-btn{flex:1;text-align:center;padding:7px 2px;font-size:9.5px;}'
+'.ndc-label{background:#ff2e5f;color:white;padding:2px 5px;border-radius:3px;font-size:8px;font-weight:bold;margin-left:5px;}'
+'.emd-label{background:#ffc107;color:#333;padding:2px 5px;border-radius:3px;font-size:8px;font-weight:bold;margin-left:5px;}'
+'.ct-method-select{width:100%;padding:6px 8px;border-radius:5px;border:1px solid #f0e0e5;font-size:10.5px;background:white;cursor:pointer;font-family:Aptos,Arial,sans-serif;margin-top:4px;}'
+'.ct-method-select:hover{border-color:#ff2e5f;}'

// Keyboard shortcut table
+'.ct-shortcuts-table{width:100%;border-collapse:collapse;margin-top:4px;}'
+'.ct-shortcuts-table tr:hover{background:#fff0f4;}'
+'.ct-shortcuts-table td{padding:5px 6px;font-size:10px;color:#333;}'
+'.ct-shortcuts-table td:first-child{white-space:nowrap;padding-right:10px;}'
+'kbd{background:#f0f0f0;border:1px solid #ccc;border-radius:3px;'
+'padding:1px 5px;font-size:9px;font-family:monospace;color:#333;}'

// Toast
+'.save-pnr-message{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);'
+'background:#28a745;color:white;padding:15px 30px;border-radius:8px;z-index:1000003;'
+'font-size:14px;font-weight:bold;box-shadow:0 4px 20px rgba(0,0,0,0.3);animation:ctFadeOut 3s forwards;}'
+'@keyframes ctFadeOut{0%{opacity:1}70%{opacity:1}100%{opacity:0}}';

document.head.appendChild(style);

// ── Mount ─────────────────────────────────────────────────────────────────────
var toolbar=document.createElement('div');
toolbar.id='ctToolbar';
toolbar.innerHTML=buildToolbarHTML(currentBookingInfo);
document.body.appendChild(toolbar);
attachToolbarHandlers();
syncNotesBanner(currentBookingInfo);
setTimeout(repositionBanner,50);

})();
