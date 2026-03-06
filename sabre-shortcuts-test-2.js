(function(){
if(document.getElementById('sabreShortcutsMenu')){
document.getElementById('sabreShortcutsMenu').remove();
return;
}
if(document.getElementById('sabreShortcutsIcon')){
document.getElementById('sabreShortcutsIcon').remove();
return;
}

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
const lines=clipboardText.split('\n');
let data={};
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
this.textContent='✓ PASTED!';
this.style.background='#28a745';
setTimeout(function(){document.getElementById('sabrePasteButton').remove();},2000);
}else{
alert('No refund data found in clipboard. Please click REFUND in Sabre first.');
}
}catch(err){
alert('Could not read clipboard. Please ensure you clicked REFUND in Sabre first.');
}
});
return;
}

// ── Trip Proposal TIDY button injection ──────────────────────────────────────
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
var tidyStyle=document.createElement('style');
tidyStyle.id='ctTidyStyle';
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
// userActionInProgress is NO LONGER used to block the observer —
// instead we use waitForView() polling so the observer always stays live
var pendingCommandPoll=null;

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayDDMON(){
var d=new Date();
var dd=String(d.getDate()).padStart(2,'0');
var months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
return dd+months[d.getMonth()];
}

// Flash a copy button green for 900ms then restore it
function flashCopied(el){
if(!el)return;
var orig=el.textContent;
var origStyle=el.getAttribute('style')||'';
el.textContent='✓';
el.style.background='#28a745';
el.style.color='white';
el.style.borderColor='#28a745';
setTimeout(function(){
el.textContent=orig;
el.setAttribute('style',origStyle);
},900);
}

// Show a brief branded toast in bottom-right
function showToast(msg){
var existing=document.getElementById('ctSabreToast');
if(existing)existing.remove();
var t=document.createElement('div');
t.id='ctSabreToast';
t.textContent=msg;
t.style.cssText='position:fixed;bottom:80px;right:24px;background:#28a745;color:white;'
+'font-family:Aptos,Arial,sans-serif;font-size:12px;font-weight:600;'
+'padding:8px 16px;border-radius:6px;box-shadow:0 3px 12px rgba(0,0,0,0.25);'
+'z-index:1000002;opacity:1;transition:opacity 0.4s ease;pointer-events:none;';
document.body.appendChild(t);
setTimeout(function(){t.style.opacity='0';setTimeout(function(){t.remove();},420);},1400);
}

// ── Smart post-command polling ────────────────────────────────────────────────
// After sending a Sabre command, poll the response area every 200ms until
// the expected content appears (max 4s), then update the menu.
// This completely replaces the fixed-timeout + userActionInProgress approach.
function waitForView(expectedView,callback){
if(pendingCommandPoll)clearInterval(pendingCommandPoll);
var attempts=0;
var maxAttempts=20; // 20 × 200ms = 4s max
pendingCommandPoll=setInterval(function(){
attempts++;
var info=extractBookingInfo();
var detectedView=info.hasEticket?'eticket':(info.tickets.length>0?'list':'default');
if(detectedView===expectedView||attempts>=maxAttempts){
clearInterval(pendingCommandPoll);
pendingCommandPoll=null;
// Cache any identity data found
if(info.pnr&&info.pnr.length===6)cachedPNR=info.pnr;
if(info.traveller&&info.traveller.trim()!=='')cachedTraveler=info.traveller;
currentBookingInfo=info;
currentTicketView=detectedView;
updateMenu();
if(typeof callback==='function')callback();
}
},200);
}

function executeSabreCommand(command,expectedView,callback){
var cmdInput=document.querySelector('input.command-line-input[name="cmdln"]');
var sendButton=document.querySelector('button.send-button');
if(!cmdInput||!sendButton){alert('Could not find command input or send button');return;}
cmdInput.value=command;
cmdInput.focus();
cmdInput.dispatchEvent(new Event('input',{bubbles:true}));
setTimeout(function(){
sendButton.click();
if(expectedView){
waitForView(expectedView,callback);
}else if(typeof callback==='function'){
setTimeout(callback,800);
}
},100);
}

// ── Ticket extraction ─────────────────────────────────────────────────────────
function extractClassicTickets(bodyText){
var tickets=[];
if(!bodyText.includes('TKT/TIME LIMIT'))return tickets;
var lines=bodyText.split('\n');
var inTicketSection=false;
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

function isViewingIndividualETicket(bodyText){
return bodyText.indexOf('ELECTRONIC TICKET RECORD')>-1;
}

function extractFirstPaxRaw(bodyText){
var m=bodyText.match(/1\.1([^\n]+)/);
if(!m)return '';
return m[1].replace(/\s+\d+\.\d+.*$/,'').trim();
}

// ── Core extraction ───────────────────────────────────────────────────────────
function extractBookingInfo(){
var responseElement=document.querySelector('.app.responses.text.views.Text.text');
var bodyText=responseElement?responseElement.innerText:document.body.innerText;
var lines=document.querySelectorAll('.dn-line.text-line');

var info={
pnr:'',traveller:'',surname:'',firstname:'',
company:'',luminaId:'',booker:'',
method:'',methodLine:0,
approved:false,
notes:[],email:'',phone:'',
hasEticket:false,
ticketInfo:{ticketNo:'',paxName:'',pnr:''},
tickets:[],isGraphicalView:false
};

// Graphical view
var isGraphicalView=document.querySelector('.pnr-record-locator')!==null;
if(isGraphicalView){
var pnrEl=document.querySelector('.pnr-record-locator');
if(pnrEl)info.pnr=pnrEl.textContent.trim();
var travEl=document.querySelector('.pnr-pax');
if(travEl)info.traveller=travEl.textContent.trim();
document.querySelectorAll('.pay-ticket-segment-ticketing .docNumber').forEach(function(el){
var t=el.textContent.trim();
if(t&&t.match(/^\d{13,17}$/))info.tickets.push({ticketNo:t,type:'regular',isNDC:false,isEMD:false,source:'graphical'});
});
var ndcSec=document.querySelector('#ticketing-list');
if(ndcSec){
ndcSec.querySelectorAll('.number-col .itinerary-segment-value').forEach(function(el){
var t=el.textContent.trim();
if(t&&t.match(/^\d{13,17}$/))info.tickets.push({ticketNo:t,type:'ndc',isNDC:true,isEMD:false,source:'graphical'});
});
}
info.isGraphicalView=true;
ticketsInView=info.tickets;
currentTicketView=info.tickets.length>0?'list':'default';
return info;
}

// Classic text view
var viewingETicket=isViewingIndividualETicket(bodyText);
var classicTickets=extractClassicTickets(bodyText);
if(viewingETicket){
currentTicketView='eticket';
info.hasEticket=true;
}else if(classicTickets.length>0){
currentTicketView='list';
info.tickets=classicTickets;
ticketsInView=classicTickets;
}else{
currentTicketView='default';
}

// PNR
var passengerLineIndex=-1;
for(var i=0;i<lines.length;i++){
if(lines[i].innerText.trim().startsWith('1.1')){passengerLineIndex=i;break;}
}
if(passengerLineIndex>0){
for(var j=0;j<passengerLineIndex;j++){
var t=lines[j].innerText.trim();
if(t.length===6&&/^[A-Z]{6}$/i.test(t)){info.pnr=t;break;}
}
}

// Traveller
var rawPax=extractFirstPaxRaw(bodyText);
info.traveller=rawPax;
if(rawPax){
var np=rawPax.split('/');
if(np.length>=2){info.surname=np[0].trim();info.firstname=np[1].trim();}
}

var cm=bodyText.match(/L¥COMPANY ID-([^\s\n]+)/);
if(cm)info.company=cm[1].trim();
var lm=bodyText.match(/L¥LUMINA ID-(\d+)/);
if(lm)info.luminaId=lm[1].trim();
var bm=bodyText.match(/L¥BKG MADE-([^\/\n]+)/);
if(bm)info.booker=bm[1].trim();
var mm=bodyText.match(/\s*(\d+)\.L¥METHOD-([WMET])/);
if(mm){info.methodLine=parseInt(mm[1]);info.method=mm[2];}

// Approval — derived fresh from bodyText only, never cached
if(bodyText.indexOf('B¥BOOKING REJECTED')>-1){
info.approved='rejected';
}else if(bodyText.indexOf('A¥BOOKING STATUS CHANGED TO PENDING CANCELLATION')>-1){
info.approved='cancellation';
}else if(bodyText.indexOf('B¥BOOKING AUTHORISED')>-1){
info.approved=true;
}else{
info.approved=false;
}

// Notes — exclude NDC AIRLINE CANCELLED FLIGHTS
var noteMatches=bodyText.matchAll(/\d+\.H-N-(.+?)(?=\n|$)/g);
for(var nm of noteMatches){
var noteText=nm[1].trim();
if(!/NDC AIRLINE CANCELLED FLIGHTS/i.test(noteText))info.notes.push(noteText);
}

var em=bodyText.match(/E¥PAX-([^\n]+)/);
if(em)info.email=em[1].replace(/\.\./g,'_').replace(/¤/g,'@').trim();
var pm=bodyText.match(/P¥PAX-([^\n]+)/);
if(pm)info.phone=pm[1].trim();

// E-ticket detail
if(info.hasEticket){
var tktM=bodyText.match(/TKT:(\d{13,17}(?:\/\d{1,3})?)/);
if(tktM){
var tn=tktM[1];
if(tn.includes('/')){
var tp=tn.split('/');
tn=tp[0]+'-'+tp[0][tp[0].length-2]+tp[1];
}
info.ticketInfo.ticketNo=tn;
}
var nM=bodyText.match(/NAME:([^\n]+?)(?:\s{3,}|\n)/);
if(nM)info.ticketInfo.paxName=nM[1].trim();
var pM=bodyText.match(/PNR:([A-Z0-9]{6})/);
if(pM)info.ticketInfo.pnr=pM[1];
}

return info;
}

var currentBookingInfo=extractBookingInfo();
lastKnownPNR=currentBookingInfo.pnr;
if(currentBookingInfo.pnr&&currentBookingInfo.pnr.length===6)cachedPNR=currentBookingInfo.pnr;
if(currentBookingInfo.traveller)cachedTraveler=currentBookingInfo.traveller;

// ── Approval pill for header ──────────────────────────────────────────────────
function approvalPillHTML(approved){
if(approved==='rejected')return '<span class="header-approval rejected">🚫 REJECTED</span>';
if(approved==='cancellation')return '<span class="header-approval cancellation">⚠️ CXLD</span>';
if(approved===true)return '<span class="header-approval approved">✓</span>';
if(approved===false&&currentBookingInfo.booker)return '<span class="header-approval pending">⏳</span>';
return '';
}

// ── HTML builders ─────────────────────────────────────────────────────────────
function buildCopyBarHTML(info){
var hasContact=info.email||info.phone;
var html='<div class="copy-bar-wrapper">';
html+='<div class="copy-bar">';
html+='<span class="copy-bar-label">COPY</span>';
html+='<a href="#" class="copy-bar-btn" data-action="copyPNR">PNR</a>';
html+='<a href="#" class="copy-bar-btn" data-action="copyLuminaId">Lumina</a>';
html+='<a href="#" class="copy-bar-btn" data-action="copyBookingInfo">Booking</a>';
if(hasContact)html+='<a href="#" class="copy-bar-btn copy-bar-contact-toggle" data-action="toggleContact">Contact ▾</a>';
html+='</div>';
if(hasContact){
html+='<div class="contact-popup" id="ctContactPopup" style="display:none;">'
+'<div class="contact-popup-header">📞 Copy Contact</div>'
+'<a href="#" class="contact-popup-btn" data-action="copyName">Name</a>'
+'<a href="#" class="contact-popup-btn" data-action="copyMobile">Mobile</a>'
+'<a href="#" class="contact-popup-btn" data-action="copyEmail">Email</a>'
+'<a href="#" class="contact-popup-btn" data-action="copyAllContact">Copy All</a>'
+'</div>';
}
html+='</div>';
return html;
}

// Truncate long strings for display but keep full value in title attribute
function tn(str,max){
if(!str)return '';
var s=String(str);
return s.length>max
?'<span title="'+s.replace(/"/g,'&quot;')+'">'+s.substring(0,max)+'…</span>'
:s;
}

function buildBookingCardHTML(info){
if(!info.traveller&&!info.company&&!info.booker&&!info.method&&info.approved===false)return '';
var approvalHTML='';
if(info.booker){
if(info.approved==='rejected')approvalHTML='<div class="approval-status rejected">🚫 REJECTED</div>';
else if(info.approved==='cancellation')approvalHTML='<div class="approval-status cancellation">⚠️ PENDING CANCELLATION</div>';
else if(info.approved===true)approvalHTML='<div class="approval-status approved">✓ APPROVED</div>';
else approvalHTML='<div class="approval-status pending">⏳ PENDING</div>';
}
var html='<div class="booking-card">';
if(info.company)html+='<div class="booking-company">'+tn(info.company,34)+'</div>';
if(info.traveller){
html+='<div class="booking-detail-row">'
+'<span class="booking-detail-icon">✈</span>'
+'<span class="booking-detail-text">'+tn(info.traveller,36)+'</span>'
+'</div>';
}
if(info.booker){
html+='<div class="booking-detail-row">'
+'<span class="booking-detail-icon">👤</span>'
+'<span class="booking-detail-text">'+tn(info.booker,36)+'</span>'
+'</div>';
}
if(info.method){
html+='<div class="booking-detail-row method-row">'
+'<span class="booking-detail-icon">🔖</span>'
+'<select class="method-dropdown" data-line="'+info.methodLine+'">'
+'<option value="W"'+(info.method==='W'?' selected':'')+'>Web</option>'
+'<option value="M"'+(info.method==='M'?' selected':'')+'>Mixed</option>'
+'<option value="E"'+(info.method==='E'?' selected':'')+'>Email</option>'
+'<option value="T"'+(info.method==='T'?' selected':'')+'>Telephone</option>'
+'</select></div>';
}
html+=approvalHTML+'</div>';
return html;
}

function buildTicketListHTML(info){
var displayTraveler=info.traveller||cachedTraveler||'Not Found';
var html='';
if(displayTraveler!=='Not Found'){
html+='<div class="booking-card"><div class="booking-detail-row"><span class="booking-detail-icon">✈</span><span class="booking-detail-text">'+tn(displayTraveler,36)+'</span></div></div>';
}
if(info.tickets&&info.tickets.length>0){
html+='<div class="ticket-list">';
html+='<div class="ticket-list-header">🎫 SELECT TICKET TO VIEW</div>';
info.tickets.forEach(function(ticket,index){
var labels='';
if(ticket.isNDC)labels+=' <span class="ndc-label">NDC</span>';
if(ticket.isEMD)labels+=' <span class="emd-label">EMD</span>';
html+='<a href="#" class="ticket-list-item" data-ticket-index="'+index+'" data-ticket-no="'+ticket.ticketNo+'" data-type="'+ticket.type+'">'+ticket.ticketNo+labels+'</a>';
});
html+='<div class="ticket-list-note">NOTE: NDC documents may require you to view graphically.</div>';
html+='</div>';
}
return html;
}

function buildETicketViewHTML(info){
var displayPNR,displayName,displayTicket;
if(info.ticketInfo.pnr){
displayPNR=info.ticketInfo.pnr;displayName=info.ticketInfo.paxName;displayTicket=info.ticketInfo.ticketNo;
}else if(cachedTicketContext){
displayPNR=cachedTicketContext.pnr;displayName=cachedTicketContext.traveler;displayTicket=cachedTicketContext.ticketNo;
}else{
displayPNR=cachedPNR||'TBA';displayName=cachedTraveler||'Not Found';displayTicket='Not Found';
}
var html='';
if(displayName!=='Not Found'){
html+='<div class="booking-card"><div class="booking-detail-row"><span class="booking-detail-icon">✈</span><span class="booking-detail-text">'+tn(displayName,36)+'</span></div></div>';
}
html+='<div class="ticket-info-container">'
+'<div class="ticket-info-header">🎫 TICKET INFO</div>'
+'<div class="ticket-info-content">'
+'<div class="ticket-copy-row">'
+'<a href="#" class="ticket-copy-btn" data-action="copyTicketNo">TKT NO</a>'
+'<a href="#" class="ticket-copy-btn" data-action="copyTicketName">NAME</a>'
+'<a href="#" class="ticket-copy-btn" data-action="copyTicketPNR">PNR</a>'
+'</div>'
+'<div class="ticket-action-row">'
+'<a href="#" class="ticket-action-btn" data-action="copyAllTicket">COPY ALL</a>'
+'<a href="#" class="ticket-action-btn" data-action="refundTicket">REFUND</a>'
+'</div>'
+'</div></div>';
if(cameFromTicketList&&ticketsInView.length>1){
html+='<div class="back-to-list-container"><a href="#" class="back-to-list-btn" data-action="backToList">← Back to Ticket List</a></div>';
}
return html;
}

function buildMenuHTML(info){
var approval=info.approved!==false?info.approved:(currentBookingInfo.approved!==false?currentBookingInfo.approved:false);
var headerPill=approvalPillHTML(approval);

var header='<div class="menu-header">'
+'<button class="collapse-btn" title="Collapse">▼</button>'
+'<span class="menu-header-title">CT SABRE SHORTCUTS'+( headerPill?' '+headerPill:'')+'</span>'
+'<div class="close-btn">×</div>'
+'</div>';

if(currentTicketView==='list'){
return header+'<div class="menu-content">'+buildTicketListHTML(info)+'</div>';
}
if(currentTicketView==='eticket'){
return header+'<div class="menu-content">'+buildETicketViewHTML(info)+'</div>';
}

var notesHTML='';
if(info.notes.length>0){
notesHTML='<div class="section-divider"></div>'
+'<div class="notes-container">'
+'<a href="#" class="menu-item menu-item-alert" data-action="toggleNotes">⚠️ Notes to Agent ('+info.notes.length+')</a>'
+'<div class="notes-collapsible">'
+'<div class="notes-collapsible-content">'
+info.notes.map(function(n){return '<div class="note-line">'+n+'</div>';}).join('')
+'</div></div></div>';
}

return header
+'<div class="menu-content">'
+buildCopyBarHTML(info)
+'<div class="section-divider"></div>'
+buildBookingCardHTML(info)
+notesHTML
+'<div class="section-divider"></div>'
+'<div class="button-row">'
+'<a href="#" class="menu-item menu-item-half" data-action="viewSerko">View in Serko</a>'
+'<a href="#" class="menu-item menu-item-half" data-action="masquerade">View in YourCT</a>'
+'</div>'
+'<div class="button-row">'
+'<a href="#" class="menu-item menu-item-half" data-action="updateTTL">Update TTL</a>'
+'<a href="#" class="menu-item menu-item-half" data-action="queueSerko">Queue to Serko</a>'
+'</div>'
+'</div>';
}

// ── Menu update ───────────────────────────────────────────────────────────────
function updateMenu(){
currentBookingInfo=extractBookingInfo();
var menu=document.getElementById('sabreShortcutsMenu');
if(menu){
var transform=menu.style.transform||'';
menu.innerHTML=buildMenuHTML(currentBookingInfo);
menu.style.transform=transform;
attachEventListeners();
}
}

// ── Observer — always live, not blocked by commands ───────────────────────────
var observer=new MutationObserver(function(){
// If a poll is already running after a command, let it handle the update
if(pendingCommandPoll)return;
var newInfo=extractBookingInfo();
if(newInfo.pnr&&newInfo.pnr.length===6)cachedPNR=newInfo.pnr;
if(newInfo.traveller&&newInfo.traveller.trim()!=='')cachedTraveler=newInfo.traveller;
var newView=newInfo.hasEticket?'eticket':(newInfo.tickets.length>0?'list':'default');
if(newInfo.pnr&&newInfo.pnr!==lastKnownPNR){
lastKnownPNR=newInfo.pnr;
currentBookingInfo=newInfo;
currentTicketView=newView;
cameFromTicketList=false;
cachedTicketContext=null;
updateMenu();
}else if(newView!==currentTicketView){
currentBookingInfo=newInfo;
currentTicketView=newView;
updateMenu();
}
});
var responseArea=document.querySelector('.area-out');
if(responseArea)observer.observe(responseArea,{childList:true,subtree:true,characterData:true});

// ── Build initial menu ────────────────────────────────────────────────────────
var menu=document.createElement('div');
menu.id='sabreShortcutsMenu';
menu.innerHTML=buildMenuHTML(currentBookingInfo);
menu.style.cssText='position:fixed;bottom:60px;right:20px;top:auto;';

// ── Styles ────────────────────────────────────────────────────────────────────
var style=document.createElement('style');
style.textContent=
'#sabreShortcutsMenu{'
+'position:fixed;bottom:60px;right:20px;width:320px;'
+'background:linear-gradient(135deg,#ff2e5f 0%,#ff6b9d 100%);'
+'border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.3);'
+'padding:0;z-index:999999;font-family:Aptos,Arial,sans-serif;'
+'max-height:90vh;cursor:move;'
+'transform-origin:bottom right;}'

// Collapse animation — scale down to icon position
+'#sabreShortcutsMenu.collapsing{'
+'animation:collapseMenu 0.2s ease-in forwards;}'
+'@keyframes collapseMenu{'
+'0%{opacity:1;transform:scale(1);}'
+'100%{opacity:0;transform:scale(0.15) translate(60px,60px);}}'

+'.menu-header{color:white;font-size:10px;font-weight:bold;padding:10px 12px;'
+'border-bottom:1px solid rgba(255,255,255,0.25);display:flex;'
+'justify-content:space-between;align-items:center;cursor:move;user-select:none;gap:6px}'
+'.menu-header-title{flex:1;text-align:center;letter-spacing:0.4px;font-size:9.5px}'
+'.collapse-btn{background:none;border:none;color:white;font-size:13px;cursor:pointer;'
+'padding:0;width:18px;height:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0}'
+'.collapse-btn:hover{opacity:0.8}'
+'.close-btn{color:white;font-size:18px;cursor:pointer;width:18px;height:18px;'
+'display:flex;align-items:center;justify-content:center;flex-shrink:0}'
+'.close-btn:hover{opacity:0.8}'

// Approval pill in header
+'.header-approval{font-size:8px;font-weight:700;padding:2px 5px;border-radius:3px;'
+'white-space:nowrap;vertical-align:middle}'
+'.header-approval.approved{background:#d4edda;color:#155724}'
+'.header-approval.pending{background:#fff3cd;color:#856404}'
+'.header-approval.cancellation{background:#ffebee;color:#c62828}'
+'.header-approval.rejected{background:#ff0000;color:white}'

+'.menu-content{padding:10px;max-height:calc(90vh - 46px);overflow-y:auto}'

// Subtle section divider — no extra height, just 1px breathing line
+'.section-divider{height:1px;background:rgba(255,255,255,0.2);margin:6px 0}'

// Copy bar
+'.copy-bar-wrapper{position:relative;margin-bottom:0}'
+'.copy-bar{display:flex;align-items:center;gap:3px;padding:7px 8px;'
+'background:rgba(255,255,255,0.97);border-radius:7px}'
+'.copy-bar-label{font-size:8px;font-weight:800;color:#ff2e5f;text-transform:uppercase;'
+'letter-spacing:0.5px;margin-right:3px;white-space:nowrap}'
+'.copy-bar-btn{flex:1;padding:6px 3px;background:white;color:#333;text-decoration:none;'
+'border-radius:4px;font-size:9px;text-align:center;font-weight:600;cursor:pointer;'
+'border:1px solid #e0e0e0;transition:background 0.15s,color 0.15s,border-color 0.15s;white-space:nowrap}'
+'.copy-bar-btn:hover{background:#ffe0ea;border-color:#ff2e5f;color:#ff2e5f}'
+'.copy-bar-contact-toggle{background:#fff0f4;border-color:#ffb3c6}'

// Contact popup
+'.contact-popup{position:absolute;top:calc(100% + 2px);right:0;width:155px;'
+'background:white;border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,0.2);'
+'z-index:1000001;padding:6px;border:1px solid #ffb3c6}'
+'.contact-popup-header{font-size:9px;font-weight:800;color:#ff2e5f;text-transform:uppercase;'
+'letter-spacing:0.5px;padding:3px 6px 6px;border-bottom:1px solid #ffe0ea;margin-bottom:4px}'
+'.contact-popup-btn{display:block;padding:7px 10px;margin:3px 0;background:#fff8fa;color:#333;'
+'text-decoration:none;border-radius:5px;font-size:10px;font-weight:500;cursor:pointer;'
+'border:1px solid #ffe0ea;transition:background 0.15s,color 0.15s}'
+'.contact-popup-btn:hover{background:#ffe0ea;color:#ff2e5f;border-color:#ff2e5f}'

// Booking card
+'.booking-card{background:rgba(255,255,255,0.97);border-radius:8px;padding:10px 12px;margin-bottom:0}'
+'.booking-company{font-size:13px;font-weight:800;color:#ff2e5f;margin-bottom:7px;'
+'letter-spacing:0.2px;border-bottom:1px solid #ffe0ea;padding-bottom:6px;'
+'overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
+'.booking-detail-row{display:flex;align-items:baseline;gap:7px;margin:5px 0}'
+'.booking-detail-icon{font-size:10px;flex-shrink:0;width:14px;text-align:center;color:#bbb}'
+'.booking-detail-text{font-size:10px;color:#333;word-break:break-word;flex:1;line-height:1.4}'

// Approval badges (in card)
+'.approval-status{margin-top:8px;padding:5px;border-radius:5px;text-align:center;font-weight:bold;font-size:10px}'
+'.approval-status.approved{background:#d4edda;color:#155724;border:1px solid #c3e6cb}'
+'.approval-status.pending{background:#fff3cd;color:#856404;border:1px solid #ffeaa7}'
+'.approval-status.cancellation{background:#ffebee;color:#c62828;border:1px solid #ef5350}'
+'.approval-status.rejected{background:#ff0000;color:white;border:1px solid #cc0000}'

// Method dropdown
+'.method-row{align-items:center}'
+'.method-dropdown{flex:1;padding:4px;border-radius:4px;border:1px solid #ddd;font-size:10px;background:white;cursor:pointer}'
+'.method-dropdown:hover{border-color:#ff2e5f}'

// Notes
+'.notes-container{margin:0}'
+'.notes-collapsible{max-height:0;overflow:hidden;transition:max-height 0.3s ease-out}'
+'.notes-collapsible.expanded{max-height:600px}'
+'.notes-collapsible-content{background:#fffbf0;padding:10px 12px;margin-top:6px;border-radius:6px;border-left:4px solid #ff9800}'
+'.note-line{font-size:10.5px;line-height:1.55;color:#333;padding:4px 0;'
+'word-break:break-word;white-space:pre-wrap;border-bottom:1px dotted rgba(255,152,0,0.25)}'
+'.note-line:last-child{border-bottom:none}'

// Menu action items
+'.menu-item{display:block;padding:8px 12px;margin:5px 0;background:rgba(255,255,255,0.95);'
+'color:#333;text-decoration:none;border-radius:5px;transition:background 0.15s,transform 0.15s,box-shadow 0.15s;'
+'font-size:11px;text-align:center;font-weight:500;cursor:pointer}'
+'.menu-item:hover{background:white;transform:translateX(-2px);box-shadow:0 2px 8px rgba(0,0,0,0.12)}'
+'.menu-item-alert{background:#fff3cd;border:2px solid #ff9800;font-weight:600;animation:pulse 2s infinite}'
+'@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.85}}'
+'.button-row{display:flex;gap:6px;margin:5px 0}'
+'.menu-item-half{flex:1;margin:0;font-size:10px}'

// Ticket list
+'.ticket-list{background:rgba(255,255,255,0.95);border-radius:8px;padding:10px;margin-bottom:8px}'
+'.ticket-list-header{font-weight:bold;color:#ff2e5f;font-size:11px;margin-bottom:8px;text-align:center}'
+'.ticket-list-item{display:block;padding:10px;margin:5px 0;background:white;color:#333;'
+'text-decoration:none;border-radius:5px;transition:background 0.15s,transform 0.15s;'
+'font-size:11px;text-align:center;font-weight:500;cursor:pointer;border:1px solid #ddd}'
+'.ticket-list-item:hover{background:#f0f0f0;transform:translateX(-2px);box-shadow:0 2px 8px rgba(0,0,0,0.12)}'
+'.ticket-list-note{margin-top:8px;padding-top:6px;border-top:1px solid #ddd;font-size:8px;color:#888;text-align:center;font-style:italic}'
+'.ndc-label{background:#ff2e5f;color:white;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:bold;margin-left:8px}'
+'.emd-label{background:#ffc107;color:#333;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:bold;margin-left:8px}'
+'.back-to-list-container{margin:8px 0}'
+'.back-to-list-btn{display:block;padding:8px 12px;background:#f0f0f0;color:#333;'
+'text-decoration:none;border-radius:5px;font-size:10px;text-align:center;font-weight:500;cursor:pointer;transition:background 0.15s}'
+'.back-to-list-btn:hover{background:#e0e0e0}'

// E-ticket
+'.ticket-info-container{background:rgba(255,255,255,0.95);border-radius:8px;padding:10px;margin:6px 0}'
+'.ticket-info-header{font-weight:bold;color:#ff2e5f;font-size:11px;margin-bottom:8px;text-align:center}'
+'.ticket-info-content{display:flex;flex-direction:column;gap:6px}'
+'.ticket-copy-row{display:flex;gap:4px}'
+'.ticket-copy-btn{flex:1;padding:6px 4px;background:white;color:#333;text-decoration:none;'
+'border-radius:4px;font-size:9px;text-align:center;font-weight:500;cursor:pointer;'
+'border:1px solid #ddd;transition:background 0.15s,color 0.15s,border-color 0.15s}'
+'.ticket-copy-btn:hover{background:#ffe0ea;border-color:#ff2e5f;color:#ff2e5f}'
+'.ticket-action-row{display:flex;gap:4px}'
+'.ticket-action-btn{flex:1;padding:8px 4px;background:#fff3cd;color:#ff2e5f;text-decoration:none;'
+'border-radius:4px;font-size:10px;text-align:center;font-weight:600;cursor:pointer;'
+'border:1px solid #ffd700;transition:background 0.15s}'
+'.ticket-action-btn:hover{background:#ffe066}'

// Save reminder toast
+'.save-pnr-message{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);'
+'background:#28a745;color:white;padding:15px 30px;border-radius:8px;z-index:1000000;'
+'font-size:14px;font-weight:bold;box-shadow:0 4px 20px rgba(0,0,0,0.3);animation:fadeOut 3s forwards}'
+'@keyframes fadeOut{0%{opacity:1}70%{opacity:1}100%{opacity:0}}'

// Collapsed bubble
+'#sabreShortcutsIcon{position:fixed;bottom:20px;right:20px;width:50px;height:50px;'
+'background:linear-gradient(135deg,#ff2e5f 0%,#ff6b9d 100%);border-radius:50%;'
+'box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:999999;display:flex;'
+'align-items:center;justify-content:center;cursor:pointer;'
+'animation:popIn 0.2s ease-out;}'
+'@keyframes popIn{0%{opacity:0;transform:scale(0.3)}100%{opacity:1;transform:scale(1)}}'
+'#sabreShortcutsIcon:hover{transform:scale(1.1)}'
+'#sabreShortcutsIcon span{font-size:26px}';

document.head.appendChild(style);
document.body.appendChild(menu);

// ── Collapse / expand ─────────────────────────────────────────────────────────
function createCollapsedIcon(){
var icon=document.createElement('div');
icon.id='sabreShortcutsIcon';
icon.innerHTML='<span>✈</span>';
icon.title='CT Sabre Shortcuts';
icon.addEventListener('click',expandMenu);
document.body.appendChild(icon);
}

function collapseToIcon(){
isCollapsed=true;
var m=document.getElementById('sabreShortcutsMenu');
if(m){
m.classList.add('collapsing');
setTimeout(function(){m.remove();createCollapsedIcon();},200);
}else{
createCollapsedIcon();
}
}

function expandMenu(){
isCollapsed=false;
var icon=document.getElementById('sabreShortcutsIcon');
if(icon)icon.remove();
var m=document.createElement('div');
m.id='sabreShortcutsMenu';
m.innerHTML=buildMenuHTML(currentBookingInfo);
m.style.cssText='position:fixed;bottom:60px;right:20px;top:auto;transform:translate3d(0px,0px,0)';
document.body.appendChild(m);
attachEventListeners();
}

// ── Ticket commands ───────────────────────────────────────────────────────────
function executeViewEticket(ticketNo,ticketType){
cachedTicketContext={ticketNo:ticketNo,pnr:cachedPNR,traveler:cachedTraveler,type:ticketType};
if(ticketsInView.length>1)cameFromTicketList=true;
if(ticketType==='ndc'||ticketType==='ndc-emd'){
alert('This is an NDC ticket. Please view this document graphically in the Ticketing tab.\n\nTicket context has been cached for refund.');
return;
}
var cleanTicketNo=ticketNo.replace(/[\/-].*$/,'');
var command=(ticketType==='emd'?'WEMD*T':'WETR*T')+cleanTicketNo;
executeSabreCommand(command,'eticket');
}

function executeViewTicketsCommand(){
if(currentBookingInfo.pnr&&currentBookingInfo.pnr.length===6)cachedPNR=currentBookingInfo.pnr;
if(currentBookingInfo.traveller)cachedTraveler=currentBookingInfo.traveller;
executeSabreCommand('*T','list');
}

// ── Method change ─────────────────────────────────────────────────────────────
function updateMethod(lineNumber,newMethod){
var cmdInput=document.querySelector('input.command-line-input[name="cmdln"]');
var sendButton=document.querySelector('button.send-button');
if(!cmdInput||!sendButton){alert('Could not find command input or send button');return;}
cmdInput.value='5'+lineNumber+'¤L¥METHOD-'+newMethod;
cmdInput.focus();
cmdInput.dispatchEvent(new Event('input',{bubbles:true}));
setTimeout(function(){
sendButton.click();
// Show method updated confirmation after a moment
setTimeout(function(){showSavePNRMessage('✅ Method updated — please save PNR');},600);
},100);
}

function showSavePNRMessage(msg){
var message=document.createElement('div');
message.className='save-pnr-message';
message.textContent=msg||'⚠️ Please save your PNR';
document.body.appendChild(message);
setTimeout(function(){message.remove();},3000);
}

// ── Clipboard ─────────────────────────────────────────────────────────────────
async function writeRichClipboard(htmlText,plainText){
try{
await navigator.clipboard.write([new ClipboardItem({
'text/html':new Blob([htmlText],{type:'text/html'}),
'text/plain':new Blob([plainText.trim()],{type:'text/plain'})
})]);
}catch(err){
var temp=document.createElement('textarea');
temp.value=plainText.trim();
document.body.appendChild(temp);temp.select();
document.execCommand('copy');
document.body.removeChild(temp);
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
displayTicket=currentBookingInfo.ticketInfo.ticketNo;
displayName=currentBookingInfo.ticketInfo.paxName;
displayPNR=currentBookingInfo.ticketInfo.pnr;
}else if(cachedTicketContext){
displayTicket=cachedTicketContext.ticketNo;
displayName=cachedTicketContext.traveler;
displayPNR=cachedTicketContext.pnr;
}else{
displayTicket='Not Found';displayName=cachedTraveler||'Not Found';displayPNR=cachedPNR||'TBA';
}
var rows=[
['Ticket No',displayTicket,true],
['Passenger',displayName,false],
['PNR',displayPNR,true]
];
var plain=rows.map(function(r){return r[0]+': '+r[1];}).join('\n');
await writeRichClipboard(buildEmailTable('TICKET DETAILS',rows),plain);
}

async function copyRefundData(){
var displayTicket,displayName,displayPNR;
if(currentBookingInfo.ticketInfo.ticketNo){
displayTicket=currentBookingInfo.ticketInfo.ticketNo;
displayName=currentBookingInfo.ticketInfo.paxName;
displayPNR=currentBookingInfo.ticketInfo.pnr;
}else if(cachedTicketContext){
displayTicket=cachedTicketContext.ticketNo;
displayName=cachedTicketContext.traveler;
displayPNR=cachedTicketContext.pnr;
}else{
displayTicket='Not Found';displayName=cachedTraveler||'Not Found';displayPNR=cachedPNR||'TBA';
}
try{
await navigator.clipboard.writeText('##SABRE_REFUND##\nTICKET: '+displayTicket+'\nNAME: '+displayName+'\nPNR: '+displayPNR+'\n');
window.open('https://auoasisservices.au.fcl.internal/OasisWeb/RefundApplication/Create','_blank');
}catch(err){alert('Could not copy refund data to clipboard');}
}

// ── Ticket list handlers ──────────────────────────────────────────────────────
function attachTicketListHandlers(){
document.querySelectorAll('.ticket-list-item').forEach(function(item){
item.addEventListener('click',function(e){
e.preventDefault();
executeViewEticket(this.getAttribute('data-ticket-no'),this.getAttribute('data-type'));
});
});
}

// ── Main event listeners ──────────────────────────────────────────────────────
function attachEventListeners(){
var isDragging=false,currentX,currentY,initialX,initialY,xOffset=0,yOffset=0;
var menuElement=document.getElementById('sabreShortcutsMenu');
if(!menuElement)return;

var tMatch=(menuElement.style.transform||'').match(/translate3d\(([^,]+)px,\s*([^,]+)px/);
if(tMatch){xOffset=parseFloat(tMatch[1])||0;yOffset=parseFloat(tMatch[2])||0;}

var skipClasses=['close-btn','collapse-btn','menu-item','copy-bar-btn','copy-bar-contact-toggle',
'contact-popup-btn','ticket-copy-btn','ticket-action-btn','ticket-list-item',
'back-to-list-btn','method-dropdown'];

menuElement.addEventListener('mousedown',function(e){
if(skipClasses.some(function(c){return e.target.classList.contains(c);}))return;
initialX=e.clientX-xOffset;initialY=e.clientY-yOffset;isDragging=true;
});
document.addEventListener('mousemove',function(e){
if(!isDragging)return;
e.preventDefault();
currentX=e.clientX-initialX;currentY=e.clientY-initialY;
xOffset=currentX;yOffset=currentY;
menuElement.style.transform='translate3d('+currentX+'px,'+currentY+'px,0)';
});
document.addEventListener('mouseup',function(){isDragging=false;});

var closeBtn=menuElement.querySelector('.close-btn');
if(closeBtn){
closeBtn.addEventListener('click',function(e){
e.stopPropagation();
menuElement.remove();
var icon=document.getElementById('sabreShortcutsIcon');
if(icon)icon.remove();
});
}
var collapseBtn=menuElement.querySelector('.collapse-btn');
if(collapseBtn)collapseBtn.addEventListener('click',function(e){e.stopPropagation();collapseToIcon();});

var methodDropdown=menuElement.querySelector('.method-dropdown');
if(methodDropdown)methodDropdown.addEventListener('change',function(){updateMethod(this.getAttribute('data-line'),this.value);});

attachTicketListHandlers();

// Close contact popup on outside click
document.addEventListener('click',function(e){
var popup=document.getElementById('ctContactPopup');
if(popup&&popup.style.display!=='none'){
if(!popup.contains(e.target)&&!e.target.classList.contains('copy-bar-contact-toggle')){
popup.style.display='none';
}
}
},{capture:true});

// All data-action handlers
menuElement.querySelectorAll('[data-action]').forEach(function(item){
item.addEventListener('click',function(e){
e.preventDefault();
e.stopPropagation();
var action=this.getAttribute('data-action');
var self=this;

switch(action){

case 'toggleContact':
var popup=document.getElementById('ctContactPopup');
if(popup)popup.style.display=popup.style.display==='none'?'block':'none';
break;

case 'copyBookingInfo':
copyBookingInfoRich().then(function(){showToast('✓ Booking info copied');});
break;

case 'copyPNR':
if(currentBookingInfo.pnr&&currentBookingInfo.pnr.length===6){
navigator.clipboard.writeText(currentBookingInfo.pnr);
flashCopied(self);
}
break;

case 'copyLuminaId':
if(currentBookingInfo.luminaId){
navigator.clipboard.writeText(currentBookingInfo.luminaId);
flashCopied(self);
}
break;

case 'copyName':
var rawName=currentBookingInfo.traveller||cachedTraveler||'';
if(rawName){navigator.clipboard.writeText(rawName);flashCopied(self);}
break;

case 'copyMobile':
if(currentBookingInfo.phone){navigator.clipboard.writeText(currentBookingInfo.phone);flashCopied(self);}
break;

case 'copyEmail':
if(currentBookingInfo.email){navigator.clipboard.writeText(currentBookingInfo.email);flashCopied(self);}
break;

case 'copyAllContact':
copyContactDetailsRich().then(function(){
showToast('✓ Contact details copied');
var p=document.getElementById('ctContactPopup');
if(p)p.style.display='none';
});
break;

case 'copyTicketNo':
var tkt=currentBookingInfo.ticketInfo.ticketNo||(cachedTicketContext&&cachedTicketContext.ticketNo)||'';
if(tkt){navigator.clipboard.writeText(tkt);flashCopied(self);}
break;

case 'copyTicketName':
var tname=currentBookingInfo.ticketInfo.paxName||(cachedTicketContext&&cachedTicketContext.traveler)||cachedTraveler||'';
if(tname){navigator.clipboard.writeText(tname);flashCopied(self);}
break;

case 'copyTicketPNR':
var tpnr=currentBookingInfo.ticketInfo.pnr||(cachedTicketContext&&cachedTicketContext.pnr)||cachedPNR||'';
if(tpnr){navigator.clipboard.writeText(tpnr);flashCopied(self);}
break;

case 'copyAllTicket':
copyAllTicketInfo().then(function(){showToast('✓ Ticket details copied');});
break;

case 'refundTicket':
copyRefundData();
break;

case 'viewTickets':
if(currentTicketView==='default'){executeViewTicketsCommand();}
else{currentTicketView='list';updateMenu();}
break;

case 'backToList':
cameFromTicketList=false;cachedTicketContext=null;
currentTicketView='list';
updateMenu();
break;

case 'viewSerko':
var smatch=document.body.innerText.match(/Q¥QUOTE NUMBER\s*-\s*(\d+)/);
if(smatch&&smatch[1])window.open('https://serko.corporatetraveller.com.au/Web/Booking/Detail/'+smatch[1],'_blank');
else alert('Quote number not found!');
break;

case 'masquerade':
var mmatch=document.body.innerText.match(/U62-([A-F0-9-]+)/i);
if(mmatch&&mmatch[1])window.open('https://agentport.fcm.travel/SamlService/AgentToClientSsoTraveler/'+mmatch[1],'_blank');
else alert('Agentport or YourCT profile not found. This could be a profile that only exists in Lumina, or a guest traveller.');
break;

case 'toggleNotes':
var collapsible=menuElement.querySelector('.notes-collapsible');
if(collapsible)collapsible.classList.toggle('expanded');
break;

case 'updateTTL':
executeSabreCommand('7TAW'+todayDDMON()+'/',null);
showToast('✓ TTL UPDATED TO TODAY');
break;

case 'queueSerko':
executeSabreCommand('QP/90/1',null);
showToast('✓ Queued back to Serko/Savi');
break;
}
});
});
}

attachEventListeners();
})();
