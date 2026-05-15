(function(){
if(document.getElementById('ctToolbar'))document.getElementById('ctToolbar').remove();
if(document.getElementById('ctToolbarIcon'))document.getElementById('ctToolbarIcon').remove();
['ctNotesBanner','ctCopyPopup','ctViewPopup','ctActionsPopup','ctTicketPanel','ctShortcutsPopup','ctSabreToast'].forEach(function(id){
var el=document.getElementById(id);if(el)el.remove();
});

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
var ts=document.createElement('style');ts.id='ctTidyStyle';
ts.textContent='.ct-tidy-btn{background-color:#ff2e5f !important;color:white !important;}';
document.head.appendChild(ts);
}
actionButtons.insertBefore(tidyButton,buttons[1].parentElement);
tidyButton.querySelector('button').addEventListener('click',function(){
var s=document.createElement('script');
s.src='https://cdn.jsdelivr.net/gh/jordan-mcguire/CT-Sabre-Shortcuts@main/trip-proposal.js';
document.body.appendChild(s);
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

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
// Verified safe: no conflicts with Chrome/Edge/Windows standard shortcuts
var SHORTCUTS=[
['P','Alt','Copy PNR','copyPNR'],
['L','Alt','Copy Lumina ID','copyLuminaId'],
['B','Alt','Copy Booking Info','copyBookingInfo'],
['N','Alt','Copy Name','copyName'],
['M','Alt','Copy Mobile','copyMobile'],
['J','Alt','Copy Email','copyEmail'],
['C','Alt','Copy All Contact','copyAllContact'], // Alt+T = tab cycling in some configs
['K','Alt','Toggle Notes','toggleNotes'],
['S','Alt','View in Serko','viewSerko'],
['Y','Alt','View in YourCT','masquerade'],
['A','Alt','View in Agentport (Profile)','viewAgentportProfile'],
['G','Alt','View in Agentport (Company)','viewAgentportCompany'],
['U','Alt','Copy Email Subject','copyEmailSubject'],
['I','Alt','Update TTL','updateTTL'],       // Alt+I safe — no Chrome/Edge conflict
['Q','Alt','Queue to Serko','queueSerko'],
['X','Alt','Missed TTL (Mixed + TTL)','missedTTL'],
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayDDMON(){
var d=new Date();
var months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
return String(d.getDate()).padStart(2,'0')+months[d.getMonth()];
}

function flashCopied(el){
if(!el)return;
var orig=el.innerHTML;
var origBg=el.style.background||'';var origColor=el.style.color||'';
el.innerHTML='✓ Copied';el.style.background='#28a745';el.style.color='white';
setTimeout(function(){el.innerHTML=orig;el.style.background=origBg;el.style.color=origColor;},900);
}

function showToast(msg){
var ex=document.getElementById('ctSabreToast');if(ex)ex.remove();
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
return '#ff2e5f';
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
var detected=info.hasEticket?'eticket':(info.tickets.length>0?'list':'default');
if(detected===expectedView||attempts>=20){
clearInterval(pendingCommandPoll);pendingCommandPoll=null;
if(info.pnr&&info.pnr.length===6)cachedPNR=info.pnr;
if(info.traveller&&info.traveller.trim()!=='')cachedTraveler=info.traveller;
currentBookingInfo=info;currentTicketView=detected;
updateAll();
if(detected==='eticket'||detected==='list'){
setTimeout(function(){
var btn=document.getElementById('ctBtnTicket');
if(btn)showPopup('ctTicketPanel',buildTicketPanelHTML(currentBookingInfo),btn);
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

// Sends two commands sequentially: first changes method to M, then updates TTL
function executeMissedTTL(){
closeAllPopups();
// Step 1: update method to Mixed (M)
var methodLine=currentBookingInfo.methodLine;
if(!methodLine){showToast('⚠️ No method line found');return;}
executeSabreCommand('5'+methodLine+'¤L¥METHOD-M',null,function(){
// Step 2: update TTL to today
setTimeout(function(){
executeSabreCommand('7TAW'+todayDDMON()+'/',null,function(){
// Prompt agent to save and re-download
setTimeout(function(){
showSavePNRMessage('💾 Save PNR then re-download to Lumina (LDD)');
},400);
});
},600);
});
}

// ── Extraction ────────────────────────────────────────────────────────────────
function extractClassicTickets(bodyText){
var tickets=[];
if(!bodyText.includes('TKT/TIME LIMIT'))return tickets;
var lines=bodyText.split('\n');var inSection=false;
for(var i=0;i<lines.length;i++){
var line=lines[i].trim();
if(line==='TKT/TIME LIMIT'){inSection=true;continue;}
if(inSection){
var match=line.match(/^.*(TE|TO|ME|MO)\s+(\d{13,17})/);
if(match){
var p=match[1];var tn=match[2];
var type='regular';var isNDC=false;var isEMD=false;
if(p==='TO'){type='ndc';isNDC=true;}
else if(p==='ME'){type='emd';isEMD=true;}
else if(p==='MO'){type='ndc-emd';isNDC=true;isEMD=true;}
tickets.push({type:type,ticketNo:tn,isNDC:isNDC,isEMD:isEMD,source:'classic'});
}
if(line===''||line.match(/^[A-Z]+$/))break;
}
}
return tickets;
}

function isViewingIndividualETicket(t){return t.indexOf('ELECTRONIC TICKET RECORD')>-1;}

function extractFirstPaxRaw(t){
var m=t.match(/1\.1([^\n]+)/);if(!m)return '';
return m[1].replace(/\s+\d+\.\d+.*$/,'').trim();
}

function extractBookingInfo(){
var responseElement=document.querySelector('.dn-response-line:last-of-type .dn-line-group')
||document.querySelector('[class*="responses"]')
||document.querySelector('.dn-line-group');
var bodyText=responseElement?responseElement.innerText:document.body.innerText;
var lineScope=responseElement||document;
var lines=lineScope.querySelectorAll('.dn-line.text-line');
var info={pnr:'',traveller:'',surname:'',firstname:'',company:'',luminaId:'',booker:'',
method:'',methodLine:0,approved:false,notes:[],email:'',phone:'',
hasEticket:false,ticketInfo:{ticketNo:'',paxName:'',pnr:''},tickets:[],isGraphicalView:false};

var isGfx=document.querySelector('.pnr-record-locator')!==null;
if(isGfx){
var pnrEl=document.querySelector('.pnr-record-locator');if(pnrEl)info.pnr=pnrEl.textContent.trim();
var travEl=document.querySelector('.pnr-pax');if(travEl)info.traveller=travEl.textContent.trim();
document.querySelectorAll('.pay-ticket-segment-ticketing .docNumber').forEach(function(el){
var t=el.textContent.trim();
if(t&&t.match(/^\d{13,17}$/))info.tickets.push({ticketNo:t,type:'regular',isNDC:false,isEMD:false,source:'graphical'});
});
var ndcSec=document.querySelector('#ticketing-list');
if(ndcSec)ndcSec.querySelectorAll('.number-col .itinerary-segment-value').forEach(function(el){
var t=el.textContent.trim();
if(t&&t.match(/^\d{13,17}$/))info.tickets.push({ticketNo:t,type:'ndc',isNDC:true,isEMD:false,source:'graphical'});
});
info.isGraphicalView=true;ticketsInView=info.tickets;
return info;
}

var viewingET=isViewingIndividualETicket(bodyText);
var classicT=extractClassicTickets(bodyText);
if(viewingET){info.hasEticket=true;}
else if(classicT.length>0){info.tickets=classicT;ticketsInView=classicT;}

var paxIdx=-1;
for(var i=0;i<lines.length;i++){if(lines[i].innerText.trim().startsWith('1.1')){paxIdx=i;break;}}
if(paxIdx>0){
for(var j=0;j<paxIdx;j++){
var tv=lines[j].innerText.trim();
if(tv.length===6&&/^[A-Z]{6}$/i.test(tv)){info.pnr=tv;break;}
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
function renderNotesBanner(banner,notes){
banner.innerHTML=
'<div class="ct-banner-header">'
+'<span class="ct-banner-icon">⚠️</span>'
+'<span class="ct-banner-title">'+notes.length+' Note'+(notes.length>1?'s':'')+' to Agent</span>'
+'<span class="ct-banner-toggle">'+(notesExpanded?'▾':'▸')+'</span>'
+'</div>'
+(notesExpanded
?'<div class="ct-banner-notes">'
+notes.map(function(n){return '<div class="ct-banner-note-line">'+n+'</div>';}).join('')
+'</div>':'');
banner.onclick=function(e){
e.stopPropagation();notesExpanded=!notesExpanded;
renderNotesBanner(banner,notes);repositionBanner();
};
}

function repositionBanner(){
var tb=document.getElementById('ctToolbar');
var banner=document.getElementById('ctNotesBanner');
if(!tb||!banner)return;
var tbRect=tb.getBoundingClientRect();
banner.style.bottom=(window.innerHeight-tbRect.top+8)+'px';
banner.style.right=(window.innerWidth-tbRect.right)+'px';
}

function syncNotesBanner(info){
var existing=document.getElementById('ctNotesBanner');
if(info.notes&&info.notes.length>0){
if(!existing){
var banner=document.createElement('div');
banner.id='ctNotesBanner';
document.body.appendChild(banner);
}
renderNotesBanner(document.getElementById('ctNotesBanner'),info.notes);
repositionBanner();
}else{
if(existing)existing.remove();
notesExpanded=false;
}
}

// ── Build toolbar HTML ────────────────────────────────────────────────────────
function buildToolbarHTML(info){
var traveller=info.traveller||cachedTraveler||'';
var company=info.company||'';
var approved=info.approved;
var borderColor=approvalBorderColor(approved);
var chip=approvalChipHTML(approved);
var hasTickets=currentTicketView==='list'||currentTicketView==='eticket';
var notesDot=info.notes&&info.notes.length>0
?'<span class="ct-notes-dot">'+info.notes.length+'</span>':'';

return '<div id="ctToolbarInner" style="border-left:4px solid '+borderColor+';">'
// Info block — company + name stacked
+'<div class="ct-name-area" title="Drag to move">'
+'<div class="ct-name-block">'
+(company?'<div class="ct-company">'+trunc(company,22)+'</div>':'')
+(traveller
?'<div class="ct-traveller">✈ '+trunc(traveller,22)+'</div>'
:'<div class="ct-traveller ct-dim">No booking loaded</div>')
+(chip?'<div class="ct-chip-row">'+chip+'</div>':'')
+'</div>'
+'</div>'
// Button group
+'<div class="ct-btn-group">'
+'<button class="ct-tb-btn ct-btn-copy" id="ctBtnCopy" title="Copy options">📋 Copy</button>'
+'<button class="ct-tb-btn ct-btn-view" id="ctBtnView" title="View in external tools">👁 View</button>'
+(hasTickets?'<button class="ct-tb-btn ct-btn-ticket" id="ctBtnTicket" title="Ticket actions">🎫 Ticket</button>':'')
+'<button class="ct-tb-btn ct-btn-actions" id="ctBtnActions" title="Actions">⚡ Actions'+notesDot+'</button>'
+'<button class="ct-tb-btn ct-btn-shortcuts" id="ctBtnShortcuts" title="Keyboard shortcuts">⌨️</button>'
+'<button class="ct-tb-btn ct-btn-collapse" id="ctBtnCollapse" title="Collapse">−</button>'
+'</div>'
+'</div>';
}

// ── Popup content builders ────────────────────────────────────────────────────
function buildCopyPopupHTML(info){
var hasContact=info.email||info.phone;
var h='<div class="ct-popup-label">COPY</div>';
h+='<button class="ct-popup-btn" data-action="copyPNR">📋 PNR <kbd>Alt+P</kbd></button>';
h+='<button class="ct-popup-btn" data-action="copyLuminaId">📋 Lumina ID <kbd>Alt+L</kbd></button>';
h+='<button class="ct-popup-btn" data-action="copyBookingInfo">📋 Full Booking Info <kbd>Alt+B</kbd></button>';
h+='<button class="ct-popup-btn" data-action="copyEmailSubject">✉️ Email Subject <kbd>Alt+U</kbd></button>';
if(hasContact){
h+='<div class="ct-popup-divider"></div><div class="ct-popup-label">CONTACT</div>';
h+='<button class="ct-popup-btn" data-action="copyName">👤 Name <kbd>Alt+N</kbd></button>';
h+='<button class="ct-popup-btn" data-action="copyMobile">📱 Mobile <kbd>Alt+M</kbd></button>';
h+='<button class="ct-popup-btn" data-action="copyEmail">✉️ Email <kbd>Alt+J</kbd></button>';
h+='<button class="ct-popup-btn" data-action="copyAllContact">📋 Copy All Contact <kbd>Alt+C</kbd></button>';
}
return h;
}

function buildViewPopupHTML(info){
var h='<div class="ct-popup-label">VIEW</div>';
h+='<button class="ct-popup-btn" data-action="viewSerko">🔗 View in Serko <kbd>Alt+S</kbd></button>';
h+='<button class="ct-popup-btn" data-action="masquerade">👤 View in YourCT <kbd>Alt+Y</kbd></button>';
h+='<button class="ct-popup-btn" data-action="viewAgentportProfile">🧑 Agentport (Profile) <kbd>Alt+A</kbd></button>';
h+='<button class="ct-popup-btn" data-action="viewAgentportCompany">🏢 Agentport (Company) <kbd>Alt+G</kbd></button>';
return h;
}

function buildActionsPopupHTML(info){
var h='<div class="ct-popup-label">COMMANDS</div>';
h+='<button class="ct-popup-btn" data-action="updateTTL">⏱ Update TTL ('+todayDDMON()+') <kbd>Alt+I</kbd></button>';
h+='<button class="ct-popup-btn" data-action="queueSerko">📤 Queue to Serko <kbd>Alt+Q</kbd></button>';
h+='<button class="ct-popup-btn ct-missed-ttl-btn" data-action="missedTTL">⚠️ Missed TTL (Mixed + TTL) <kbd>Alt+X</kbd></button>';
h+='<button class="ct-popup-btn" data-action="changeCostCentre">💼 Change Cost Centre</button>';
h+='<div class="ct-popup-divider"></div><div class="ct-popup-label">TOOLS</div>';
h+='<button class="ct-popup-btn ct-tnw-btn" data-action="tnwPassives">\uD83C\uDFE8 TNW Passives</button>';
if(info.method){
h+='<div class="ct-popup-divider"></div><div class="ct-popup-label">BOOKING METHOD</div>';
h+='<select class="ct-method-select" data-line="'+info.methodLine+'">'
+'<option value="W"'+(info.method==='W'?' selected':'')+'>Web</option>'
+'<option value="M"'+(info.method==='M'?' selected':'')+'>Mixed</option>'
+'<option value="E"'+(info.method==='E'?' selected':'')+'>Email</option>'
+'<option value="T"'+(info.method==='T'?' selected':'')+'>Telephone</option>'
+'</select>';
}
return h;
}

function buildTicketPanelHTML(info){
var h='';
if(currentTicketView==='list'&&info.tickets&&info.tickets.length>0){
h+='<div class="ct-popup-label">🎫 SELECT TICKET</div>';
info.tickets.forEach(function(ticket){
var labels='';
if(ticket.isNDC)labels+=' <span class="ndc-label">NDC</span>';
if(ticket.isEMD)labels+=' <span class="emd-label">EMD</span>';
h+='<button class="ct-popup-btn ct-ticket-item" data-ticket-no="'+ticket.ticketNo+'" data-type="'+ticket.type+'">'+ticket.ticketNo+labels+'</button>';
});
h+='<div class="ct-ticket-note">NDC tickets require graphical view in Ticketing tab.</div>';
}else if(currentTicketView==='eticket'){
h+='<div class="ct-popup-label">🎫 TICKET ACTIONS</div>';
h+='<div class="ct-tkt-row">';
h+='<button class="ct-popup-btn" data-action="copyTicketNo">TKT NO</button>';
h+='<button class="ct-popup-btn" data-action="copyTicketName">NAME</button>';
h+='<button class="ct-popup-btn" data-action="copyTicketPNR">PNR</button>';
h+='</div>';
h+='<button class="ct-popup-btn ct-hl-btn" data-action="copyAllTicket">📋 Copy All Ticket Info</button>';
h+='<button class="ct-popup-btn ct-hl-btn" data-action="refundTicket">↩️ Refund Ticket</button>';
h+='<button class="ct-popup-btn" data-action="openTicketRegister">🔍 Open in Ticket Register</button>';
if(cameFromTicketList&&ticketsInView.length>1){
h+='<div class="ct-popup-divider"></div>';
h+='<button class="ct-popup-btn" data-action="backToList">← Back to Ticket List</button>';
}
}
return h;
}

function buildShortcutsPopupHTML(){
var h='<div class="ct-popup-label">⌨️ KEYBOARD SHORTCUTS</div>';
h+='<table class="ct-sc-table">';
SHORTCUTS.forEach(function(s){
h+='<tr><td><kbd>'+s[1]+'+'+s[0]+'</kbd></td><td>'+s[2]+'</td></tr>';
});
h+='</table>';
return h;
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
popup.style.bottom=(window.innerHeight-rect.top+8)+'px';
requestAnimationFrame(function(){popup.style.opacity='1';popup.style.transform='translateY(0)';});
openPopup=id;
attachPopupHandlers(popup);
}

// ── Popup handlers ────────────────────────────────────────────────────────────
function attachPopupHandlers(popup){
var ms=popup.querySelector('.ct-method-select');
if(ms)ms.addEventListener('change',function(){updateMethod(this.getAttribute('data-line'),this.value);});
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

// ── Central action handler ────────────────────────────────────────────────────
function handleAction(action,el){
switch(action){
case 'copyPNR':
if(currentBookingInfo.pnr&&currentBookingInfo.pnr.length===6){
navigator.clipboard.writeText(currentBookingInfo.pnr);
el?flashCopied(el):showToast('✓ PNR copied');}
break;
case 'copyLuminaId':
if(currentBookingInfo.luminaId){
navigator.clipboard.writeText(currentBookingInfo.luminaId);
el?flashCopied(el):showToast('✓ Lumina ID copied');}
break;
case 'copyBookingInfo':
copyBookingInfoRich().then(function(){showToast('✓ Booking info copied');});break;
case 'copyEmailSubject':
var esParts=[];
var esLumina=currentBookingInfo.luminaId;
var esPNR=currentBookingInfo.pnr&&currentBookingInfo.pnr.length===6?currentBookingInfo.pnr:(cachedPNR||'');
var esTraveller=currentBookingInfo.traveller||cachedTraveler||'';
var esCore='';
if(esLumina||esPNR){
esCore='CT Booking';
if(esLumina)esCore+=' '+esLumina;
if(esPNR)esCore+=' / '+esPNR;
if(esTraveller)esCore+=' - '+esTraveller;
}
if(esCore){
navigator.clipboard.writeText(esCore);
el?flashCopied(el):showToast('✓ Email subject copied');
}
break;
case 'copyName':
var rn=currentBookingInfo.traveller||cachedTraveler||'';
if(rn){navigator.clipboard.writeText(rn);el?flashCopied(el):showToast('✓ Name copied');}break;
case 'copyMobile':
if(currentBookingInfo.phone){navigator.clipboard.writeText(currentBookingInfo.phone);el?flashCopied(el):showToast('✓ Mobile copied');}break;
case 'copyEmail':
if(currentBookingInfo.email){navigator.clipboard.writeText(currentBookingInfo.email);el?flashCopied(el):showToast('✓ Email copied');}break;
case 'copyAllContact':
copyContactDetailsRich().then(function(){showToast('✓ Contact copied');closeAllPopups();});break;
case 'toggleNotes':
notesExpanded=!notesExpanded;
var bnr=document.getElementById('ctNotesBanner');
if(bnr)renderNotesBanner(bnr,currentBookingInfo.notes);repositionBanner();break;
case 'copyTicketNo':
var tkt=currentBookingInfo.ticketInfo.ticketNo||(cachedTicketContext&&cachedTicketContext.ticketNo)||'';
if(tkt){navigator.clipboard.writeText(tkt);el?flashCopied(el):showToast('✓ Ticket No copied');}break;
case 'copyTicketName':
var tnm=currentBookingInfo.ticketInfo.paxName||(cachedTicketContext&&cachedTicketContext.traveler)||cachedTraveler||'';
if(tnm){navigator.clipboard.writeText(tnm);el?flashCopied(el):showToast('✓ Name copied');}break;
case 'copyTicketPNR':
var tpnr=currentBookingInfo.ticketInfo.pnr||(cachedTicketContext&&cachedTicketContext.pnr)||cachedPNR||'';
if(tpnr){navigator.clipboard.writeText(tpnr);el?flashCopied(el):showToast('✓ PNR copied');}break;
case 'copyAllTicket':
copyAllTicketInfo().then(function(){showToast('✓ Ticket details copied');});break;
case 'refundTicket':
copyRefundData();closeAllPopups();break;
case 'backToList':
cameFromTicketList=false;cachedTicketContext=null;currentTicketView='list';
updateAll();
setTimeout(function(){var b=document.getElementById('ctBtnTicket');if(b)showPopup('ctTicketPanel',buildTicketPanelHTML(currentBookingInfo),b);},80);
break;
case 'viewSerko':
var sm=document.body.innerText.match(/Q¥QUOTE NUMBER\s*-\s*(\d+)/);
if(sm&&sm[1])window.open('https://serko.corporatetraveller.com.au/Web/Booking/Detail/'+sm[1],'_blank');
else alert('Quote number not found!');break;
case 'masquerade':
var ym=document.body.innerText.match(/U62-([A-F0-9-]+)/i);
if(ym&&ym[1])window.open('https://agentport.fcm.travel/SamlService/AgentToClientSsoTraveler/'+ym[1],'_blank');
else alert('YourCT profile not found.');break;
case 'viewAgentportProfile':
var apm=document.body.innerText.match(/U62-([A-F0-9-]+)/i);
if(apm&&apm[1])window.open('https://agentport.fcm.travel/Traveler/Edit/'+apm[1],'_blank');
else alert('Agentport profile ID (U62) not found in PNR.');break;
case 'viewAgentportCompany':
var acm=document.body.innerText.match(/U64-([A-F0-9-]+)/i);
if(acm&&acm[1])window.open('https://agentport.fcm.travel/ClientCenter/ProfileOverview/'+acm[1],'_blank');
else alert('Agentport company ID (U64) not found in PNR.');break;
case 'updateTTL':
executeSabreCommand('7TAW'+todayDDMON()+'/',null);showToast('✓ TTL command sent');closeAllPopups();break;
case 'queueSerko':
executeSabreCommand('QP/90/1',null);showToast('✓ Queue command sent');closeAllPopups();break;
case 'missedTTL':
executeMissedTTL();break;
case 'changeCostCentre':
var ccMatch=document.body.innerText.match(/(\d+)\.\s*L¥CC-([^\n]+)/);
  var ccLine=ccMatch?ccMatch[1]:'';
  var ccCurrent=ccMatch?ccMatch[2].trim():'';
  var ccExisting=document.getElementById('ctCostCentreBar');
  if(ccExisting){ccExisting.remove();break;}
  var tb=document.getElementById('ctToolbar');
  if(!tb)break;
  var ccBar=document.createElement('div');
  ccBar.id='ctCostCentreBar';
  var tbRect=tb.getBoundingClientRect();
  ccBar.style.cssText='position:fixed;z-index:1000005;'
    +'right:'+(window.innerWidth-tbRect.right)+'px;'
    +'bottom:'+(window.innerHeight-tbRect.top+8)+'px;'
    +'background:white;border:1.5px solid #f0d0d8;border-radius:10px;'
    +'box-shadow:0 4px 20px rgba(0,0,0,0.18);'
    +'padding:10px 12px;font-family:Aptos,Arial,sans-serif;width:300px;'
    +'animation:ctPopIn 0.2s ease-out;';
  ccBar.innerHTML='<div style="font-size:8px;font-weight:800;color:#ff2e5f;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px;">💼 CHANGE COST CENTRE'+(ccLine?' — Line '+ccLine:'')+'</div>'
    +'<input id="ctCCInput" type="text" value="'+ccCurrent+'" placeholder="NAME/NAME/NAME" '
    +'style="width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #f0d0d8;border-radius:5px;'
    +'font-size:11px;font-family:Aptos,Arial,sans-serif;margin-bottom:7px;outline:none;" />'
    +'<div style="display:flex;gap:6px;">'
    +'<button id="ctCCSubmit" style="flex:1;background:#ff2e5f;color:white;border:none;border-radius:5px;'
    +'padding:6px;font-size:11px;font-weight:700;cursor:pointer;font-family:Aptos,Arial,sans-serif;">Submit</button>'
    +'<button id="ctCCCancel" style="background:#f5f5f5;color:#555;border:1px solid #ddd;border-radius:5px;'
    +'padding:6px 10px;font-size:11px;cursor:pointer;font-family:Aptos,Arial,sans-serif;">Cancel</button>'
    +'</div>'
    +(!ccMatch?'<div style="font-size:9px;color:#e65100;margin-top:6px;">⚠️ No existing CC line found — will add as new remark</div>':'');
  document.body.appendChild(ccBar);
  closeAllPopups();
  var ccInput=document.getElementById('ctCCInput');
  ccInput.focus();ccInput.select();
  document.getElementById('ctCCCancel').addEventListener('click',function(){ccBar.remove();});
  document.getElementById('ctCCSubmit').addEventListener('click',function(){
    var newVal=document.getElementById('ctCCInput').value.trim();
    if(!newVal){showToast('⚠️ Cost centre cannot be empty');return;}
    var cmd=ccLine?('5'+ccLine+'¤L¥CC-'+newVal):('5L¥CC-'+newVal);
    executeSabreCommand(cmd,null,function(){showToast('✅ Cost centre updated — save PNR');});
    ccBar.remove();
  });
  ccInput.addEventListener('keydown',function(e){
    if(e.key==='Enter')document.getElementById('ctCCSubmit').click();
    if(e.key==='Escape')ccBar.remove();
  });
  break;

case 'openTicketRegister':
  var regRaw=(currentBookingInfo.ticketInfo.ticketNo
    ||(cachedTicketContext&&cachedTicketContext.ticketNo)
    ||'').replace(/-.*$/,'').replace(/\s/g,'');
  if(!regRaw||regRaw.length<4){showToast('⚠️ No ticket number found');break;}
  var regDesig=regRaw.slice(0,3);
  var regNum=regRaw.slice(3);
  var regUrl='https://corp-portal.au.fcl.internal/portal/portal/ticketRegister.srvlt'
    +'?action=edit&editTicketNumber='+regNum
    +'&editTicketDesignator='+regDesig
    +'&editTicketType=ETK';
  var regExisting=document.getElementById('ctTicketRegisterModal');
  if(regExisting){regExisting.remove();}
  var regBdExisting=document.getElementById('ctTicketRegisterBackdrop');
  if(regBdExisting){regBdExisting.remove();}
  var regModal=document.createElement('div');
  regModal.id='ctTicketRegisterModal';
  regModal.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);'
    +'width:80vw;height:80vh;background:white;z-index:1000010;'
    +'border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,0.4);'
    +'display:flex;flex-direction:column;overflow:hidden;';
  regModal.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;'
    +'padding:10px 16px;background:#ff2e5f;color:white;font-family:Aptos,Arial,sans-serif;flex-shrink:0;">'
    +'<span style="font-size:12px;font-weight:700;">🎫 Ticket Register — '+regDesig+' '+regNum+'</span>'
    +'<button id="ctTRClose" style="background:rgba(255,255,255,0.25);border:none;color:white;'
    +'font-size:16px;font-weight:bold;cursor:pointer;border-radius:4px;padding:2px 8px;line-height:1;">✕</button>'
    +'</div>'
    +'<iframe src="'+regUrl+'" style="flex:1;border:none;width:100%;"></iframe>'
    +'<div id="ctTRFallback" style="display:none;flex:1;align-items:center;justify-content:center;'
    +'flex-direction:column;gap:12px;font-family:Aptos,Arial,sans-serif;color:#555;">'
    +'<div style="font-size:13px;">Could not load in iframe.</div>'
    +'<button onclick="window.open(\''+regUrl+'\',\'_blank\')" style="background:#ff2e5f;color:white;'
    +'border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:700;">Open in New Tab</button>'
    +'</div>';
  var regBackdrop=document.createElement('div');
  regBackdrop.id='ctTicketRegisterBackdrop';
  regBackdrop.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:1000009;';
  regBackdrop.addEventListener('click',function(){
    var m=document.getElementById('ctTicketRegisterModal');if(m)m.remove();
    regBackdrop.remove();
  });
  document.body.appendChild(regBackdrop);
  document.body.appendChild(regModal);
  document.getElementById('ctTRClose').addEventListener('click',function(){
    document.getElementById('ctTicketRegisterModal').remove();
    document.getElementById('ctTicketRegisterBackdrop').remove();
  });
  closeAllPopups();
  break;
case 'tnwPassives':
  closeAllPopups();
  var s1=document.createElement('script');
  s1.src='https://cdn.jsdelivr.net/gh/jordan-mcguire/CT-Sabre-Shortcuts@main/hotel-data-2.js?v='+Date.now();
  s1.onload=function(){
    var s2=document.createElement('script');
    s2.src='https://cdn.jsdelivr.net/gh/jordan-mcguire/CT-Sabre-Shortcuts@main/hotel-generator.js?v='+Date.now();
    document.body.appendChild(s2);
  };
  document.body.appendChild(s1);
  break;
}
}

// ── Keyboard listener ─────────────────────────────────────────────────────────
document.addEventListener('keydown',function(e){
if(!document.getElementById('ctToolbar')&&!document.getElementById('ctToolbarIcon'))return;
if(document.activeElement&&document.activeElement.matches('input,textarea,select'))return;
if(!e.altKey)return;
SHORTCUTS.forEach(function(s){
if(e.key.toUpperCase()===s[0]){e.preventDefault();handleAction(s[3],null);}
});
});

// ── Update all ────────────────────────────────────────────────────────────────
function updateAll(){
var tb=document.getElementById('ctToolbar');
if(tb){tb.innerHTML=buildToolbarHTML(currentBookingInfo);attachToolbarHandlers();}
syncNotesBanner(currentBookingInfo);
}

// ── Collapse / expand ─────────────────────────────────────────────────────────
function collapseToolbar(){
isCollapsed=true;
closeAllPopups();
var banner=document.getElementById('ctNotesBanner');if(banner)banner.remove();
var tb=document.getElementById('ctToolbar');
if(tb){
tb.style.opacity='0';tb.style.transform='scale(0.85) translateY(4px)';
setTimeout(function(){tb.remove();createCollapsedPill();},180);
}
}

function createCollapsedPill(){
var info=currentBookingInfo;
var hasNotes=info.notes&&info.notes.length>0;
var borderColor=approvalBorderColor(info.approved);

var icon=document.createElement('div');
icon.id='ctToolbarIcon';
icon.title='CT Sabre Shortcuts — click to expand';
icon.innerHTML=
'<div class="ct-collapsed-bubble" style="border:3px solid '+borderColor+';">'
+'<span class="ct-collapsed-plane">✈</span>'
+(hasNotes?'<span class="ct-collapsed-notes-dot">'+info.notes.length+'</span>':'')
+'</div>';
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
setTimeout(repositionBanner,50);
}

// ── Toolbar handlers + drag ───────────────────────────────────────────────────
function attachToolbarHandlers(){
var tb=document.getElementById('ctToolbar');if(!tb)return;

function btn(id,popupId,buildFn){
var el=document.getElementById(id);
if(el)el.addEventListener('click',function(e){
e.stopPropagation();showPopup(popupId,buildFn(currentBookingInfo),this);
});
}
btn('ctBtnCopy','ctCopyPopup',buildCopyPopupHTML);
btn('ctBtnView','ctViewPopup',buildViewPopupHTML);
btn('ctBtnActions','ctActionsPopup',buildActionsPopupHTML);
btn('ctBtnTicket','ctTicketPanel',buildTicketPanelHTML);
  

var bs=document.getElementById('ctBtnShortcuts');
if(bs)bs.addEventListener('click',function(e){
e.stopPropagation();showPopup('ctShortcutsPopup',buildShortcutsPopupHTML(),this);
});
var bc=document.getElementById('ctBtnCollapse');
if(bc)bc.addEventListener('click',function(e){e.stopPropagation();collapseToolbar();});

// Drag from name area
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
var tbEl=document.getElementById('ctToolbar');
if(tbEl){
tbEl.style.right=(origRight-(e.clientX-startX))+'px';
tbEl.style.bottom=(origBottom-(e.clientY-startY))+'px';
repositionBanner();
}
});
document.addEventListener('mouseup',function(){isDragging=false;});
}

// ── Ticket commands ───────────────────────────────────────────────────────────
function executeViewEticket(ticketNo,ticketType){
cachedTicketContext={ticketNo:ticketNo,pnr:cachedPNR,traveler:cachedTraveler,type:ticketType};
if(ticketsInView.length>1)cameFromTicketList=true;
if(ticketType==='ndc'||ticketType==='ndc-emd'){
alert('NDC ticket — view graphically in Ticketing tab. Context cached for refund.');return;
}
executeSabreCommand((ticketType==='emd'?'WEMD*T':'WETR*T')+ticketNo.replace(/[\/-].*$/,''),'eticket');
}

function updateMethod(lineNumber,newMethod){
var ci=document.querySelector('input.command-line-input[name="cmdln"]');
var sb=document.querySelector('button.send-button');
if(!ci||!sb){alert('Could not find command input');return;}
ci.value='5'+lineNumber+'¤L¥METHOD-'+newMethod;ci.focus();
ci.dispatchEvent(new Event('input',{bubbles:true}));
setTimeout(function(){sb.click();setTimeout(function(){showToast('✅ Method updated — save PNR');},600);},100);
}

function showSavePNRMessage(msg){
var m=document.createElement('div');m.className='save-pnr-message';
m.textContent=msg||'⚠️ Please save your PNR';
document.body.appendChild(m);setTimeout(function(){m.remove();},4000);
}

// ── Observer + heartbeat ──────────────────────────────────────────────────────
// Dual approach: MutationObserver on the best available target, PLUS a
// polling heartbeat every 500ms as a guaranteed fallback.
// This ensures ticket list / e-ticket views are always caught regardless of
// how Sabre updates the DOM.

function handleViewChange(ni){
if(ni.pnr&&ni.pnr.length===6)cachedPNR=ni.pnr;
if(ni.traveller&&ni.traveller.trim()!=='')cachedTraveler=ni.traveller;
var nv=ni.hasEticket?'eticket':(ni.tickets.length>0?'list':'default');
var pnrChanged=ni.pnr&&ni.pnr!==lastKnownPNR;
var viewChanged=nv!==currentTicketView;

if(pnrChanged){
lastKnownPNR=ni.pnr;currentBookingInfo=ni;currentTicketView=nv;
cameFromTicketList=false;cachedTicketContext=null;notesExpanded=false;
closeAllPopups();updateAll();
}else if(viewChanged){
currentBookingInfo=ni;currentTicketView=nv;updateAll();
}else{
currentBookingInfo=ni;syncNotesBanner(ni);
}

// Auto-open ticket panel whenever we land on list or eticket view
if((pnrChanged||viewChanged)&&(nv==='list'||nv==='eticket')){
setTimeout(function(){
var btn=document.getElementById('ctBtnTicket');
if(btn&&openPopup!=='ctTicketPanel'){
showPopup('ctTicketPanel',buildTicketPanelHTML(currentBookingInfo),btn);
}
},120);
}
}

// Expose state + trigger on window so heartbeat closure is unambiguous
window.__ctState={
get currentTicketView(){return currentTicketView;},
set currentTicketView(v){currentTicketView=v;},
get lastKnownPNR(){return lastKnownPNR;},
get pendingCommandPoll(){return pendingCommandPoll;}
};
window.__ctTrigger=function(){
var ni=extractBookingInfo();
var nv=ni.hasEticket?'eticket':(ni.tickets.length>0?'list':'default');
var pnrChanged=ni.pnr&&ni.pnr!==lastKnownPNR;
var viewChanged=nv!==currentTicketView;
// DOM sync check: if state says tickets but toolbar has no ticket button, force re-render
var domDesynced=(currentTicketView==='list'||currentTicketView==='eticket')
&&!document.getElementById('ctBtnTicket');
if(pnrChanged||viewChanged||domDesynced)handleViewChange(ni);
return {nv:nv,currentTicketView:currentTicketView,pnrChanged:pnrChanged,viewChanged:viewChanged,domDesynced:domDesynced};
};

// Clear any previously registered heartbeat/observer from earlier bookmarklet runs
if(window.__ctHeartbeat)clearInterval(window.__ctHeartbeat);
if(window.__ctObserver)window.__ctObserver.disconnect();

// Observer — pinned to window
var observerDebounce=null;
window.__ctObserver=new MutationObserver(function(){
if(pendingCommandPoll)return;
if(observerDebounce)clearTimeout(observerDebounce);
observerDebounce=setTimeout(function(){
observerDebounce=null;
if(!document.getElementById('ctToolbar')&&!document.getElementById('ctToolbarIcon'))return;
window.__ctTrigger();
},300);
});
var obsTarget=document.querySelector('.area-out')||document.body;
window.__ctObserver.observe(obsTarget,{childList:true,subtree:true,characterData:true});

// Heartbeat — calls window.__ctTrigger so closure ambiguity is impossible
window.__ctHeartbeat=setInterval(function(){
if(!document.getElementById('ctToolbar')&&!document.getElementById('ctToolbarIcon'))return;
if(window.__ctState.pendingCommandPoll)return;
window.__ctTrigger();
},300);

document.addEventListener('click',function(e){
if(!openPopup)return;
var popup=document.getElementById(openPopup);
var tb=document.getElementById('ctToolbar');
if(popup&&!popup.contains(e.target)&&(!tb||!tb.contains(e.target)))closeAllPopups();
},{capture:true});

// ── Clipboard ─────────────────────────────────────────────────────────────────
async function writeRichClipboard(h,p){
try{
await navigator.clipboard.write([new ClipboardItem({
'text/html':new Blob([h],{type:'text/html'}),
'text/plain':new Blob([p.trim()],{type:'text/plain'})
})]);
}catch(err){
var t=document.createElement('textarea');t.value=p.trim();
document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);
}
}

function buildEmailTable(title,rows){
var rh=rows.map(function(r,i){
return '<tr style="background:'+(i%2===0?'white':'#fafafa')+';">'
+'<td style="padding:5px 12px;color:#888;font-size:11px;white-space:nowrap;border-right:1px solid #f0f0f0;">'+r[0]+'</td>'
+'<td style="padding:5px 12px;font-size:11px;color:#222;'+(r[2]?'font-family:monospace;':'')+'">'+r[1]+'</td>'
+'</tr>';
}).join('');
return '<table style="border-collapse:collapse;border:1px solid #e0e0e0;font-family:Arial,sans-serif;min-width:280px;">'
+'<thead><tr><td colspan="2" style="background:#ff2e5f;color:white;font-weight:700;font-size:11px;padding:8px 12px;letter-spacing:0.5px;">'+title+'</td></tr></thead>'
+'<tbody>'+rh+'</tbody></table>';
}

async function copyBookingInfoRich(){
var pnr=currentBookingInfo.pnr&&currentBookingInfo.pnr.length===6?currentBookingInfo.pnr:'';
var traveller=currentBookingInfo.traveller||cachedTraveler||'';
var rows=[];
if(pnr)rows.push(['GDS Reference',pnr,true]);
if(currentBookingInfo.luminaId)rows.push(['CT Booking Number',currentBookingInfo.luminaId,true]);
if(traveller)rows.push(['Traveller',traveller,false]);
if(!rows.length)return;
await writeRichClipboard(buildEmailTable('BOOKING REFERENCE',rows),rows.map(function(r){return r[0]+': '+r[1];}).join('\n'));
}

async function copyContactDetailsRich(){
var fullName=currentBookingInfo.traveller||cachedTraveler||'Not Found';
var rows=[['Name',fullName,false],['Mobile',currentBookingInfo.phone||'Not Found',false],['Email',currentBookingInfo.email||'Not Found',false]];
await writeRichClipboard(buildEmailTable('PASSENGER CONTACT',rows),rows.map(function(r){return r[0]+': '+r[1];}).join('\n'));
}

async function copyAllTicketInfo(){
var dt,dn,dp;
if(currentBookingInfo.ticketInfo.ticketNo){dt=currentBookingInfo.ticketInfo.ticketNo;dn=currentBookingInfo.ticketInfo.paxName;dp=currentBookingInfo.ticketInfo.pnr;}
else if(cachedTicketContext){dt=cachedTicketContext.ticketNo;dn=cachedTicketContext.traveler;dp=cachedTicketContext.pnr;}
else{dt='Not Found';dn=cachedTraveler||'Not Found';dp=cachedPNR||'TBA';}
var rows=[['Ticket No',dt,true],['Passenger',dn,false],['PNR',dp,true]];
await writeRichClipboard(buildEmailTable('TICKET DETAILS',rows),rows.map(function(r){return r[0]+': '+r[1];}).join('\n'));
}

async function copyRefundData(){
var dt,dn,dp;
if(currentBookingInfo.ticketInfo.ticketNo){dt=currentBookingInfo.ticketInfo.ticketNo;dn=currentBookingInfo.ticketInfo.paxName;dp=currentBookingInfo.ticketInfo.pnr;}
else if(cachedTicketContext){dt=cachedTicketContext.ticketNo;dn=cachedTicketContext.traveler;dp=cachedTicketContext.pnr;}
else{dt='Not Found';dn=cachedTraveler||'Not Found';dp=cachedPNR||'TBA';}
try{
await navigator.clipboard.writeText('##SABRE_REFUND##\nTICKET: '+dt+'\nNAME: '+dn+'\nPNR: '+dp+'\n');
window.open('https://auoasisservices.au.fcl.internal/OasisWeb/RefundApplication/Create','_blank');
}catch(err){alert('Could not copy refund data to clipboard');}
}

// ── Styles ────────────────────────────────────────────────────────────────────
var style=document.createElement('style');
style.textContent=
'#ctToolbar{position:fixed;bottom:20px;right:20px;z-index:999999;font-family:Aptos,Arial,sans-serif;'
+'transition:opacity 0.18s,transform 0.18s;animation:ctPopIn 0.2s ease-out;}'
+'@keyframes ctPopIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}'

+'#ctToolbarInner{'
+'display:flex;align-items:stretch;'
+'background:white;'
+'border-radius:12px;'
+'box-shadow:0 4px 20px rgba(0,0,0,0.18),0 1px 4px rgba(0,0,0,0.08);'
+'border:1.5px solid #f0d0d8;'
+'border-left:4px solid #ff2e5f;'
+'overflow:hidden;min-height:48px;}'

// Name / drag area — pink gradient background
+'.ct-name-area{'
+'display:flex;align-items:center;gap:8px;'
+'padding:8px 14px 8px 11px;'
+'cursor:move;user-select:none;'
+'background:linear-gradient(135deg,#ff2e5f 0%,#ff6b9d 100%);'
+'border-right:2px solid rgba(255,255,255,0.25);'
+'min-width:0;}'
+'.ct-name-block{display:flex;flex-direction:column;gap:2px;min-width:0;}'
+'.ct-company{font-size:9px;font-weight:800;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
+'.ct-traveller{font-size:11px;font-weight:700;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
+'.ct-dim{opacity:0.6;font-weight:400;}'
+'.ct-chip-row{display:flex;margin-top:3px;}'
+'.ct-chip{font-size:8.5px;font-weight:700;padding:2px 6px;border-radius:4px;white-space:nowrap;}'
+'.ct-chip-approved{background:#d4edda;color:#155724;}'
+'.ct-chip-pending{background:#fff3cd;color:#856404;}'
+'.ct-chip-cancellation{background:#ffebee;color:#c62828;}'
+'.ct-chip-rejected{background:#ff0000;color:white;}'

// Button group — clearly labelled, distinctly coloured
+'.ct-btn-group{display:flex;align-items:center;gap:0;}'

+'.ct-tb-btn{'
+'border:none;cursor:pointer;'
+'font-family:Aptos,Arial,sans-serif;'
+'font-size:10.5px;font-weight:700;'
+'height:100%;min-height:48px;'
+'padding:0 11px;'
+'display:flex;align-items:center;gap:5px;'
+'white-space:nowrap;'
+'transition:background 0.15s,color 0.15s;'
+'border-left:1px solid #f0d0d8;}'

  

// Each button a subtly different tint so they're visually distinct
+'.ct-btn-copy{background:#fff0f4;color:#cc1a45;}'
+'.ct-btn-copy:hover{background:#ff2e5f;color:white;}'
+'.ct-btn-ticket{background:#fff8e6;color:#b36b00;}'
+'.ct-btn-ticket:hover{background:#ff9800;color:white;}'
+'.ct-btn-actions{background:#f0f7ff;color:#1a5fcc;position:relative;}'
+'.ct-btn-actions:hover{background:#1a5fcc;color:white;}'
+'.ct-btn-shortcuts{background:#f5f5f5;color:#555;font-size:14px;padding:0 10px;}'
+'.ct-btn-shortcuts:hover{background:#555;color:white;}'
+'.ct-btn-collapse{background:#f5f5f5;color:#999;font-size:18px;padding:0 10px;}'
+'.ct-btn-collapse:hover{background:#eee;color:#555;}'
+'.ct-btn-view{background:#f0fff4;color:#1a7a3a;}'
+'.ct-btn-view:hover{background:#1a7a3a;color:white;}'

// Notes dot on Actions button
+'.ct-notes-dot{'
+'position:absolute;top:7px;right:5px;'
+'background:#ff9800;color:white;font-size:7.5px;font-weight:800;'
+'min-width:13px;height:13px;border-radius:7px;'
+'display:flex;align-items:center;justify-content:center;'
+'padding:0 2px;border:1.5px solid white;line-height:1;}'

// Collapsed pill — wider, two-line stacked
+'#ctToolbarIcon{position:fixed;bottom:20px;right:20px;z-index:999999;cursor:pointer;animation:ctPopIn 0.2s ease-out;}'
+'#ctToolbarIcon:hover .ct-collapsed-bubble{transform:scale(1.08);}'
+'.ct-collapsed-bubble{'
+'width:48px;height:48px;border-radius:50%;'
+'background:linear-gradient(135deg,#ff2e5f 0%,#ff6b9d 100%);'
+'box-shadow:0 4px 16px rgba(0,0,0,0.25);'
+'display:flex;align-items:center;justify-content:center;'
+'position:relative;transition:transform 0.15s;}'
+'.ct-collapsed-plane{font-size:22px;line-height:1;}'
+'.ct-collapsed-notes-dot{'
+'position:absolute;top:0;right:0;'
+'background:#ff9800;color:white;font-size:8px;font-weight:800;'
+'min-width:16px;height:16px;border-radius:8px;'
+'display:flex;align-items:center;justify-content:center;'
+'padding:0 3px;border:2px solid white;line-height:1;}'

// Notes banner
+'#ctNotesBanner{'
+'position:fixed;z-index:999998;width:300px;'
+'background:#fffbf0;border:1px solid #ffcc80;border-left:4px solid #ff9800;'
+'border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.15);'
+'font-family:Aptos,Arial,sans-serif;cursor:pointer;overflow:hidden;'
+'animation:ctPopIn 0.2s ease-out;}'
+'.ct-banner-header{display:flex;align-items:center;gap:8px;padding:9px 12px;background:#fff3e0;}'
+'.ct-banner-icon{font-size:14px;flex-shrink:0;}'
+'.ct-banner-title{font-size:11px;font-weight:700;color:#e65100;flex:1;}'
+'.ct-banner-toggle{font-size:12px;color:#e65100;flex-shrink:0;}'
+'.ct-banner-notes{padding:8px 12px 10px;border-top:1px solid #ffcc80;}'
+'.ct-banner-note-line{font-size:10.5px;line-height:1.6;color:#333;padding:3px 0;word-break:break-word;white-space:pre-wrap;border-bottom:1px dotted rgba(255,152,0,0.3);}'
+'.ct-banner-note-line:last-child{border-bottom:none;}'

// Popup
+'.ct-popup{position:fixed;z-index:1000001;width:230px;background:white;'
// The ticket panel and copy popup can stay at 230px, so give actions its own width.
// Add this rule AFTER the existing .ct-popup rule:
+'.ct-popup#ctActionsPopup{width:290px;}'
+'border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,0.2);border:1.5px solid #f0d0d8;'
+'padding:8px;opacity:0;transform:translateY(6px);transition:opacity 0.15s ease,transform 0.15s ease;}'
+'.ct-popup-label{font-size:8px;font-weight:800;color:#ff2e5f;text-transform:uppercase;letter-spacing:0.6px;padding:5px 6px 3px;}'
+'.ct-popup-btn{display:block;width:100%;text-align:left;padding:7px 10px;margin:2px 0;'
+'background:#fff8fa;color:#222;border:1px solid #f0d0d8;border-radius:6px;'
+'font-size:10.5px;font-weight:500;cursor:pointer;font-family:Aptos,Arial,sans-serif;'
+'transition:background 0.12s,color 0.12s;}'
+'.ct-popup-btn:hover{background:#ff2e5f;color:white;border-color:#ff2e5f;}'
+'.ct-hl-btn{background:#fff3cd;border-color:#ffd700;font-weight:600;}'
+'.ct-hl-btn:hover{background:#ff2e5f;color:white;border-color:#ff2e5f;}'
+'.ct-missed-ttl-btn{background:#ffebee;border-color:#ef9a9a;color:#b71c1c;font-weight:600;}'
+'.ct-missed-ttl-btn:hover{background:#ff2e5f;color:white;border-color:#ff2e5f;}'
+'.ct-popup-divider{height:1px;background:#f0d0d8;margin:6px 0;}'
+'.ct-ticket-note{font-size:8px;color:#999;font-style:italic;text-align:center;padding:4px 0;}'
+'.ct-tkt-row{display:flex;gap:4px;margin:4px 0;}'
+'.ct-tkt-row .ct-popup-btn{flex:1;text-align:center;padding:7px 2px;font-size:9.5px;}'
+'.ndc-label{background:#ff2e5f;color:white;padding:2px 5px;border-radius:3px;font-size:8px;font-weight:bold;margin-left:5px;}'
+'.emd-label{background:#ffc107;color:#333;padding:2px 5px;border-radius:3px;font-size:8px;font-weight:bold;margin-left:5px;}'
+'.ct-method-select{width:100%;padding:6px 8px;border-radius:5px;border:1px solid #f0d0d8;font-size:10.5px;background:white;cursor:pointer;font-family:Aptos,Arial,sans-serif;margin-top:4px;}'
+'.ct-method-select:hover{border-color:#ff2e5f;}'
+'.ct-sc-table{width:100%;border-collapse:collapse;margin-top:4px;}'
+'.ct-sc-table tr:hover{background:#fff0f4;}'
+'.ct-sc-table td{padding:5px 6px;font-size:10px;color:#333;}'
+'.ct-sc-table td:first-child{white-space:nowrap;padding-right:10px;}'
+'kbd{background:#f5f5f5;border:1px solid #ddd;border-radius:3px;padding:1px 5px;font-size:9px;font-family:monospace;color:#444;}'
+'.save-pnr-message{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);'
+'background:#1a5fcc;color:white;padding:16px 28px;border-radius:10px;z-index:1000003;'
+'font-size:13px;font-weight:bold;box-shadow:0 4px 20px rgba(0,0,0,0.3);'
+'text-align:center;max-width:300px;line-height:1.5;animation:ctFadeOut 4s forwards;}'
+'@keyframes ctFadeOut{0%{opacity:1}65%{opacity:1}100%{opacity:0}}'
+'.ct-tnw-btn{background:#00434e !important;color:#fff !important;border-color:#00434e !important;}'
+'.ct-tnw-btn:hover{background:#002d35 !important;}'
+'.ct-nav-row{display:flex;gap:4px;margin:2px 0;}'
+'.ct-nav-btn{flex:1;text-align:center;padding:7px 4px;font-size:9.5px;}';

  
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
