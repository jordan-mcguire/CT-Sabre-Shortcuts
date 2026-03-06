(function(){
if(document.getElementById('sabreShortcutsMenu')){
document.getElementById('sabreShortcutsMenu').remove();
return;
}

if(document.getElementById('sabreShortcutsIcon')){
document.getElementById('sabreShortcutsIcon').remove();
return;
}

// ── Refund page ──────────────────────────────────────────────────────────────
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
if(gdsDropdown){
gdsDropdown.value='Sabre';
gdsDropdown.dispatchEvent(new Event('change',{bubbles:true}));
}

const tmsCheckbox=document.querySelector('input#ConsultantDetails_TmsClient[type="checkbox"]');
if(tmsCheckbox){
tmsCheckbox.checked=true;
tmsCheckbox.dispatchEvent(new Event('change',{bubbles:true}));
}

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

var copyButtonWrapper=buttons[1].parentElement;
actionButtons.insertBefore(tidyButton,copyButtonWrapper);

tidyButton.querySelector('button').addEventListener('click',function(){
var script=document.createElement('script');
script.src='https://cdn.jsdelivr.net/gh/jordan-mcguire/CT-Sabre-Shortcuts@main/trip-proposal.js';
document.body.appendChild(script);
});
}

var proposalObserver=new MutationObserver(function(){injectTidyButton();});
if(document.body)proposalObserver.observe(document.body,{childList:true,subtree:true});
setTimeout(injectTidyButton,500);

// ── State ────────────────────────────────────────────────────────────────────
var isCollapsed=false;
var currentTicketView='default';
var ticketsInView=[];
var cameFromTicketList=false;
var cachedPNR='';
var cachedTraveler='';
var cachedTicketContext=null;
var lastKnownPNR='';
var userActionInProgress=false;

// ── Helpers ──────────────────────────────────────────────────────────────────

// Return today as DDMON e.g. 06MAR
function todayDDMON(){
var d=new Date();
var dd=String(d.getDate()).padStart(2,'0');
var months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
return dd+months[d.getMonth()];
}

// Send a command to the Sabre command bar and press Enter
function executeSabreCommand(command,callback){
var cmdInput=document.querySelector('input.command-line-input[name="cmdln"]');
var sendButton=document.querySelector('button.send-button');
if(!cmdInput||!sendButton){
alert('Could not find command input or send button');
return;
}
userActionInProgress=true;
cmdInput.value=command;
cmdInput.focus();
cmdInput.dispatchEvent(new Event('input',{bubbles:true}));
setTimeout(function(){
sendButton.click();
setTimeout(function(){
userActionInProgress=false;
if(typeof callback==='function')callback();
},1500);
},100);
}

// ── Ticket extraction ────────────────────────────────────────────────────────
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

// ── Name parsing ─────────────────────────────────────────────────────────────
// Extract just the first passenger's raw name token (e.g. "LEE/DELWYN MS")
// stopping before any "2.1" or next pax marker
function extractFirstPaxRaw(bodyText){
// Match 1.1 followed by name, stopping at newline or before \d+\.\d+ (next pax)
var m=bodyText.match(/1\.1([^\n]+)/);
if(!m)return '';
// Cut off at the start of the next pax marker e.g. " 2.1"
var raw=m[1].replace(/\s+\d+\.\d+.*$/,'').trim();
return raw;
}

// Format traveller for display: show as "SURNAME/FIRSTNAME TITLE"
// (same as PNR, just without the leading 1.1)
function formatTravellerDisplay(raw){
return raw; // keep as-is from PNR
}

// Copy-name format: as it appears in the PNR (no number prefix)
// e.g.  LEE/DELWYN MS
function formatNameForCopy(raw){
return raw;
}

// ── Core extraction ──────────────────────────────────────────────────────────
function extractBookingInfo(){
var responseElement=document.querySelector('.app.responses.text.views.Text.text');
var bodyText=responseElement?responseElement.innerText:document.body.innerText;
var lines=document.querySelectorAll('.dn-line.text-line');

var info={
pnr:'',traveller:'',surname:'',firstname:'',
company:'',luminaId:'',booker:'',
method:'',methodLine:0,approved:false,
notes:[],email:'',phone:'',
hasEticket:false,
ticketInfo:{ticketNo:'',paxName:'',pnr:''},
tickets:[],isGraphicalView:false
};

// ── Graphical view ──
var isGraphicalView=document.querySelector('.pnr-record-locator')!==null;
if(isGraphicalView){
var pnrElement=document.querySelector('.pnr-record-locator');
if(pnrElement)info.pnr=pnrElement.textContent.trim();

var travelerElement=document.querySelector('.pnr-pax');
if(travelerElement)info.traveller=travelerElement.textContent.trim();

var classicTicketEls=document.querySelectorAll('.pay-ticket-segment-ticketing .docNumber');
classicTicketEls.forEach(function(el){
var t=el.textContent.trim();
if(t&&t.match(/^\d{13,17}$/))info.tickets.push({ticketNo:t,type:'regular',isNDC:false,isEMD:false,source:'graphical'});
});

var ndcSection=document.querySelector('#ticketing-list');
if(ndcSection){
ndcSection.querySelectorAll('.number-col .itinerary-segment-value').forEach(function(el){
var t=el.textContent.trim();
if(t&&t.match(/^\d{13,17}$/))info.tickets.push({ticketNo:t,type:'ndc',isNDC:true,isEMD:false,source:'graphical'});
});
}

info.isGraphicalView=true;
ticketsInView=info.tickets;
currentTicketView=info.tickets.length>0?'list':'default';
return info;
}

// ── Classic text view ──
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

// PNR: look for 6-letter code before first pax line
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

// Traveller: first pax only, stop before any "2.1" etc.
var rawPax=extractFirstPaxRaw(bodyText);
info.traveller=rawPax;

// Parse surname/firstname from e.g. LEE/DELWYN MS
if(rawPax){
var nameParts=rawPax.split('/');
if(nameParts.length>=2){
info.surname=nameParts[0].trim();
info.firstname=nameParts[1].trim();
}
}

var companyMatch=bodyText.match(/L¥COMPANY ID-([^\s\n]+)/);
if(companyMatch)info.company=companyMatch[1].trim();

var luminaMatch=bodyText.match(/L¥LUMINA ID-(\d+)/);
if(luminaMatch)info.luminaId=luminaMatch[1].trim();

var bookerMatch=bodyText.match(/L¥BKG MADE-([^\/\n]+)/);
if(bookerMatch)info.booker=bookerMatch[1].trim();

var methodMatch=bodyText.match(/\s*(\d+)\.L¥METHOD-([WMET])/);
if(methodMatch){info.methodLine=parseInt(methodMatch[1]);info.method=methodMatch[2];}

// Approval
if(bodyText.indexOf('B¥BOOKING REJECTED')>-1)info.approved='rejected';
else if(bodyText.toUpperCase().indexOf('PENDING CANCELLATION')>-1)info.approved='cancellation';
else if(bodyText.indexOf('B¥BOOKING AUTHORISED')>-1)info.approved=true;
else info.approved=false;

// Notes – exclude NDC CANCELLED FLIGHTS remarks
var noteMatches=bodyText.matchAll(/\d+\.H-N-(.+?)(?=\n|$)/g);
for(var nm of noteMatches){
var noteText=nm[1].trim();
if(!/NDC CANCELLED FLIGHTS/i.test(noteText))info.notes.push(noteText);
}

var emailMatch=bodyText.match(/E¥PAX-([^\n]+)/);
if(emailMatch)info.email=emailMatch[1].replace(/\.\./g,'_').replace(/¤/g,'@').trim();

var phoneMatch=bodyText.match(/P¥PAX-([^\n]+)/);
if(phoneMatch)info.phone=phoneMatch[1].trim();

// E-ticket details
if(info.hasEticket){
var tktMatch=bodyText.match(/TKT:(\d{13,17}(?:\/\d{1,3})?)/);
if(tktMatch){
var ticketNo=tktMatch[1];
if(ticketNo.includes('/')){
var parts=ticketNo.split('/');
var mainPart=parts[0];var conjPart=parts[1];
var repeatDigit=mainPart[mainPart.length-2];
ticketNo=mainPart+'-'+repeatDigit+conjPart;
}
info.ticketInfo.ticketNo=ticketNo;
}
var nameMatch=bodyText.match(/NAME:([^\n]+?)(?:\s{3,}|\n)/);
if(nameMatch)info.ticketInfo.paxName=nameMatch[1].trim();
var pnrMatch=bodyText.match(/PNR:([A-Z0-9]{6})/);
if(pnrMatch)info.ticketInfo.pnr=pnrMatch[1];
}

return info;
}

var currentBookingInfo=extractBookingInfo();
lastKnownPNR=currentBookingInfo.pnr;
if(currentBookingInfo.pnr&&currentBookingInfo.pnr.length===6)cachedPNR=currentBookingInfo.pnr;
if(currentBookingInfo.traveller)cachedTraveler=currentBookingInfo.traveller;

// ── HTML builders ────────────────────────────────────────────────────────────
function buildTicketListHTML(info){
var displayPNR=info.pnr||cachedPNR||'TBA';
var displayTraveler=info.traveller||cachedTraveler||'Not Found';
var html='';

if(displayPNR!=='TBA'||displayTraveler!=='Not Found'){
html+='<div class="booking-info">';
html+='<div class="booking-info-header"><span class="booking-info-title">📋 Current Booking</span></div>';
if(displayPNR&&displayPNR!=='TBA')html+='<div class="info-row"><span class="info-label">Sabre PNR:</span> <span class="info-value">'+displayPNR+'</span></div>';
if(displayTraveler&&displayTraveler!=='Not Found')html+='<div class="info-row"><span class="info-label">Traveller:</span> <span class="info-value">'+displayTraveler+'</span></div>';
html+='</div>';
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
if(displayPNR!=='TBA'||displayName!=='Not Found'){
html+='<div class="booking-info">';
html+='<div class="booking-info-header"><span class="booking-info-title">📋 Current Booking</span></div>';
if(displayPNR&&displayPNR!=='TBA')html+='<div class="info-row"><span class="info-label">Sabre PNR:</span> <span class="info-value">'+displayPNR+'</span></div>';
if(displayName&&displayName!=='Not Found')html+='<div class="info-row"><span class="info-label">Traveller:</span> <span class="info-value">'+displayName+'</span></div>';
html+='</div>';
}

html+='<div class="ticket-info-container">';
html+='<div class="ticket-info-header">🎫 TICKET INFO</div>';
html+='<div class="ticket-info-content">';
html+='<div class="ticket-copy-row">';
html+='<a href="#" class="ticket-copy-btn" data-action="copyTicketNo">TKT NO</a>';
html+='<a href="#" class="ticket-copy-btn" data-action="copyTicketName">NAME</a>';
html+='<a href="#" class="ticket-copy-btn" data-action="copyTicketPNR">PNR</a>';
html+='</div>';
html+='<div class="ticket-action-row">';
html+='<a href="#" class="ticket-action-btn" data-action="copyAllTicket">COPY ALL</a>';
html+='<a href="#" class="ticket-action-btn" data-action="refundTicket">REFUND</a>';
html+='</div>';
html+='</div></div>';

if(cameFromTicketList&&ticketsInView.length>1){
html+='<div class="back-to-list-container">';
html+='<a href="#" class="back-to-list-btn" data-action="backToList">← Back to Ticket List</a>';
html+='</div>';
}
return html;
}

function buildMenuHTML(info){
if(currentTicketView==='list'){
return '<div class="menu-header"><button class="collapse-btn" title="Collapse">▼</button><span class="menu-header-title">CT SABRE SHORTCUTS</span><div class="close-btn">×</div></div>'
+'<div class="menu-content">'+buildTicketListHTML(info)+'</div>';
}
if(currentTicketView==='eticket'){
return '<div class="menu-header"><button class="collapse-btn" title="Collapse">▼</button><span class="menu-header-title">CT SABRE SHORTCUTS</span><div class="close-btn">×</div></div>'
+'<div class="menu-content">'+buildETicketViewHTML(info)+'</div>';
}

// ── Default PNR view ──
var approvalHTML='';
if(info.booker){
if(info.approved==='rejected')approvalHTML='<div class="approval-status rejected">🚫 REJECTED</div>';
else if(info.approved==='cancellation')approvalHTML='<div class="approval-status cancellation">⚠️ PENDING CANCELLATION</div>';
else if(info.approved===true)approvalHTML='<div class="approval-status approved">✓ APPROVED</div>';
else approvalHTML='<div class="approval-status pending">⏳ PENDING</div>';
}

var bookingInfoHTML='';
if(info.pnr||info.traveller||info.company){
bookingInfoHTML='<div class="booking-info"><div class="booking-info-header"><span class="booking-info-title">📋 Current Booking</span><span class="copy-btn">Copy</span></div>';
if(info.pnr&&info.pnr.length===6)bookingInfoHTML+='<div class="info-row"><span class="info-label">Sabre PNR:</span> <span class="info-value">'+info.pnr+'</span></div>';
if(info.luminaId)bookingInfoHTML+='<div class="info-row"><span class="info-label">Lumina ID:</span> <span class="info-value">'+info.luminaId+'</span></div>';
if(info.pnr||info.luminaId)bookingInfoHTML+='<div class="info-divider"></div>';
if(info.traveller)bookingInfoHTML+='<div class="info-row"><span class="info-label">Traveller:</span> <span class="info-value">'+info.traveller+'</span></div>';
if(info.company)bookingInfoHTML+='<div class="info-row"><span class="info-label">Company:</span> <span class="info-value">'+info.company+'</span></div>';
if(info.booker)bookingInfoHTML+='<div class="info-row"><span class="info-label">Booker:</span> <span class="info-value">'+info.booker+'</span></div>';
if(info.method){
bookingInfoHTML+='<div class="info-row method-row"><span class="info-label">Method:</span>'
+'<select class="method-dropdown" data-line="'+info.methodLine+'">'
+'<option value="W"'+(info.method==='W'?' selected':'')+'>Web</option>'
+'<option value="M"'+(info.method==='M'?' selected':'')+'>Mixed</option>'
+'<option value="E"'+(info.method==='E'?' selected':'')+'>Email</option>'
+'<option value="T"'+(info.method==='T'?' selected':'')+'>Telephone</option>'
+'</select></div>';
}
bookingInfoHTML+=approvalHTML+'</div>';
}

var notesHTML='';
if(info.notes.length>0){
notesHTML='<div class="notes-container">'
+'<a href="#" class="menu-item menu-item-alert" data-action="toggleNotes">⚠️ Notes to Agent Found</a>'
+'<div class="notes-collapsible"><div class="notes-collapsible-content">'+info.notes.join('<br>')+'</div></div>'
+'</div>';
}

var copyRowHTML='<div class="copy-row"><span class="copy-row-label">COPY:</span>'
+'<a href="#" class="copy-row-btn" data-action="copyPNR">📋 PNR</a>'
+'<a href="#" class="copy-row-btn" data-action="copyLuminaId">☑️ Lumina</a>';
if(info.email||info.phone)copyRowHTML+='<a href="#" class="copy-row-btn" data-action="toggleContact">📞 Contact</a>';
copyRowHTML+='</div>';

var contactSubmenuHTML='';
if(info.email||info.phone){
contactSubmenuHTML='<div class="contact-submenu" style="display:none;">'
+'<a href="#" class="copy-row-btn" data-action="copyName">Name</a>'
+'<a href="#" class="copy-row-btn" data-action="copyMobile">Mobile</a>'
+'<a href="#" class="copy-row-btn" data-action="copyEmail">Email</a>'
+'<a href="#" class="copy-row-btn" data-action="copyAllContact">Copy All</a>'
+'</div>';
}

// Action buttons row: View in Serko + View in YourCT
var actionButtonsHTML='<div class="button-row">'
+'<a href="#" class="menu-item menu-item-half" data-action="viewSerko">View in Serko</a>'
+'<a href="#" class="menu-item menu-item-half" data-action="masquerade">View in YourCT</a>'
+'</div>';

// Update TTL + Queue to Serko row (replaces old Trip Proposal Tidy button)
var ttlQueueHTML='<div class="button-row">'
+'<a href="#" class="menu-item menu-item-half" data-action="updateTTL">Update TTL</a>'
+'<a href="#" class="menu-item menu-item-half" data-action="queueSerko">Queue to Serko</a>'
+'</div>';

return '<div class="menu-header"><button class="collapse-btn" title="Collapse">▼</button><span class="menu-header-title">CT SABRE SHORTCUTS</span><div class="close-btn">×</div></div>'
+'<div class="menu-content">'
+bookingInfoHTML
+copyRowHTML
+contactSubmenuHTML
+notesHTML
+actionButtonsHTML
+ttlQueueHTML
+'</div>';
}

// ── Menu update ──────────────────────────────────────────────────────────────
function updateMenu(){
currentBookingInfo=extractBookingInfo();
var menu=document.getElementById('sabreShortcutsMenu');
if(menu){
// Preserve drag transform
var transform=menu.style.transform||'';
menu.innerHTML=buildMenuHTML(currentBookingInfo);
menu.style.transform=transform;
attachEventListeners();
}
}

// ── Observer ─────────────────────────────────────────────────────────────────
var observer=new MutationObserver(function(){
if(userActionInProgress)return;

var newInfo=extractBookingInfo();

// Cache valid data
if(newInfo.pnr&&newInfo.pnr.length===6)cachedPNR=newInfo.pnr;
if(newInfo.traveller&&newInfo.traveller.trim()!=='')cachedTraveler=newInfo.traveller;

var newView=newInfo.hasEticket?'eticket':(newInfo.tickets.length>0?'list':'default');
var viewChanged=newView!==currentTicketView;

if(newInfo.pnr&&newInfo.pnr!==lastKnownPNR){
// Different PNR – full reset
lastKnownPNR=newInfo.pnr;
currentBookingInfo=newInfo;
currentTicketView=newView;
cameFromTicketList=false;
cachedTicketContext=null;
updateMenu();
}else if(viewChanged&&!userActionInProgress){
currentBookingInfo=newInfo;
currentTicketView=newView;
updateMenu();
}
});

var responseArea=document.querySelector('.area-out');
if(responseArea)observer.observe(responseArea,{childList:true,subtree:true,characterData:true});

// ── Build initial menu ───────────────────────────────────────────────────────
var menu=document.createElement('div');
menu.id='sabreShortcutsMenu';
menu.innerHTML=buildMenuHTML(currentBookingInfo);
menu.style.bottom='20px';
menu.style.right='20px';
menu.style.top='auto';

// ── Styles ───────────────────────────────────────────────────────────────────
var style=document.createElement('style');
style.textContent=
'#sabreShortcutsMenu{position:fixed;bottom:60px;right:20px;width:280px;background:linear-gradient(135deg,#ff2e5f 0%,#ff6b9d 100%);border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.3);padding:0;z-index:999999;font-family:Aptos,Arial,sans-serif;max-height:90vh;cursor:move}'
+'.menu-header{color:white;font-size:10px;font-weight:bold;text-align:center;padding:12px;border-bottom:1px solid rgba(255,255,255,0.3);display:flex;justify-content:space-between;align-items:center;cursor:move;user-select:none;position:relative}'
+'.menu-header-title{flex:1;text-align:center}'
+'.collapse-btn{background:none;border:none;color:white;font-size:14px;cursor:pointer;padding:0;width:20px;height:20px;display:flex;align-items:center;justify-content:center;line-height:1}'
+'.collapse-btn:hover{opacity:0.8}'
+'.menu-content{padding:12px;max-height:calc(90vh - 60px);overflow-y:auto}'
+'.booking-info{background:rgba(255,255,255,0.95);border-radius:8px;padding:10px;margin-bottom:10px;font-size:10px;position:relative}'
+'.booking-info-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}'
+'.booking-info-title{font-weight:bold;color:#ff2e5f;font-size:11px}'
+'.copy-btn{background:#fff3cd;color:#ff2e5f;padding:4px 8px;border-radius:4px;font-size:10px;font-weight:600;cursor:pointer;border:1px solid #ffd700}'
+'.copy-btn:hover{background:#ffe066}'
+'.info-row{margin:4px 0;display:flex;justify-content:space-between;align-items:flex-start}'
+'.info-label{font-weight:600;color:#555;margin-right:8px;min-width:70px;font-size:10px}'
+'.info-value{color:#333;text-align:right;word-break:break-word;flex:1;font-size:10px}'
+'.info-divider{height:1px;background:#ddd;margin:8px 0}'
+'.method-row{align-items:center}'
+'.method-dropdown{flex:1;padding:4px;border-radius:4px;border:1px solid #ddd;font-size:10px;background:white;cursor:pointer}'
+'.method-dropdown:hover{border-color:#ff2e5f}'
+'.approval-status{margin-top:8px;padding:6px;border-radius:5px;text-align:center;font-weight:bold;font-size:10px}'
+'.approval-status.approved{background:#d4edda;color:#155724;border:1px solid #c3e6cb}'
+'.approval-status.pending{background:#fff3cd;color:#856404;border:1px solid #ffeaa7}'
+'.approval-status.cancellation{background:#ffebee;color:#c62828;border:1px solid #ef5350;font-weight:bold}'
+'.approval-status.rejected{background:#ff0000;color:white;border:1px solid #cc0000;font-weight:bold}'
+'.save-pnr-message{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#28a745;color:white;padding:15px 30px;border-radius:8px;z-index:1000000;font-size:14px;font-weight:bold;box-shadow:0 4px 20px rgba(0,0,0,0.3);animation:fadeOut 3s forwards}'
+'@keyframes fadeOut{0%{opacity:1}70%{opacity:1}100%{opacity:0}}'
+'.ticket-list{background:rgba(255,255,255,0.95);border-radius:8px;padding:10px;margin-bottom:10px}'
+'.ticket-list-header{font-weight:bold;color:#ff2e5f;font-size:11px;margin-bottom:8px;text-align:center}'
+'.ticket-list-item{display:block;padding:10px;margin:6px 0;background:white;color:#333;text-decoration:none;border-radius:5px;transition:all 0.3s ease;font-size:11px;text-align:center;font-weight:500;cursor:pointer;border:1px solid #ddd}'
+'.ticket-list-item:hover{background:#f0f0f0;transform:translateX(-3px);box-shadow:0 2px 8px rgba(0,0,0,0.2)}'
+'.ticket-list-note{margin-top:10px;padding-top:8px;border-top:1px solid #ddd;font-size:8px;color:#666;text-align:center;font-style:italic}'
+'.ndc-label{background:#ff2e5f;color:white;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:bold;margin-left:8px}'
+'.emd-label{background:#ffc107;color:#333;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:bold;margin-left:8px}'
+'.back-to-list-container{margin:10px 0}'
+'.back-to-list-btn{display:block;padding:8px 12px;background:#f0f0f0;color:#333;text-decoration:none;border-radius:5px;font-size:10px;text-align:center;font-weight:500;cursor:pointer;transition:all 0.2s ease}'
+'.back-to-list-btn:hover{background:#e0e0e0;transform:translateX(-2px)}'
+'.copy-row{display:flex;align-items:center;gap:4px;margin:6px 0;padding:6px;background:rgba(255,255,255,0.95);border-radius:5px}'
+'.copy-row-label{font-size:9px;font-weight:bold;color:#ff2e5f;margin-right:4px}'
+'.copy-row-btn{flex:1;padding:6px 4px;background:white;color:#333;text-decoration:none;border-radius:4px;font-size:9px;text-align:center;font-weight:500;cursor:pointer;border:1px solid #ddd;transition:all 0.2s ease}'
+'.copy-row-btn:hover{background:#f0f0f0;transform:scale(1.05);box-shadow:0 2px 4px rgba(0,0,0,0.1)}'
+'.copy-row-btn.expanded{background:#ffddee}'
+'.contact-submenu{display:flex;flex-direction:column;gap:4px;padding:6px;background:#ffe6f0;border-radius:5px;margin:6px 0}'
+'.ticket-info-container{background:rgba(255,255,255,0.95);border-radius:8px;padding:10px;margin:6px 0}'
+'.ticket-info-header{font-weight:bold;color:#ff2e5f;font-size:11px;margin-bottom:8px;text-align:center}'
+'.ticket-info-content{display:flex;flex-direction:column;gap:6px}'
+'.ticket-copy-row{display:flex;gap:4px}'
+'.ticket-copy-btn{flex:1;padding:6px 4px;background:white;color:#333;text-decoration:none;border-radius:4px;font-size:9px;text-align:center;font-weight:500;cursor:pointer;border:1px solid #ddd;transition:all 0.2s ease}'
+'.ticket-copy-btn:hover{background:#f0f0f0;transform:scale(1.05);box-shadow:0 2px 4px rgba(0,0,0,0.1)}'
+'.ticket-action-row{display:flex;gap:4px}'
+'.ticket-action-btn{flex:1;padding:8px 4px;background:#fff3cd;color:#ff2e5f;text-decoration:none;border-radius:4px;font-size:10px;text-align:center;font-weight:600;cursor:pointer;border:1px solid #ffd700;transition:all 0.2s ease}'
+'.ticket-action-btn:hover{background:#ffe066;transform:scale(1.05);box-shadow:0 2px 4px rgba(0,0,0,0.1)}'
+'.menu-item{display:block;padding:8px 12px;margin:6px 0;background:rgba(255,255,255,0.95);color:#333;text-decoration:none;border-radius:5px;transition:all 0.3s ease;font-size:11px;text-align:center;font-weight:500;cursor:pointer}'
+'.menu-item:hover{background:white;transform:translateX(-3px);box-shadow:0 2px 8px rgba(0,0,0,0.2)}'
+'.menu-item-alert{background:#fff3cd;border:2px solid #ff9800;font-weight:600;animation:pulse 2s infinite}'
+'@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.8}}'
+'.button-row{display:flex;gap:6px;margin:6px 0}'
+'.menu-item-half{flex:1;margin:0}'
+'.notes-container{margin:6px 0}'
+'.notes-collapsible{max-height:0;overflow:hidden;transition:max-height 0.3s ease-out}'
+'.notes-collapsible.expanded{max-height:500px}'
+'.notes-collapsible-content{background:#f8f9fa;padding:12px;margin-top:6px;border-radius:5px;border-left:4px solid #ff9800;font-size:11px;line-height:1.6;color:#333}'
+'.close-btn{color:white;font-size:20px;cursor:pointer;line-height:20px;width:20px;height:20px;display:flex;align-items:center;justify-content:center}'
+'.close-btn:hover{opacity:0.8}'
+'#sabreShortcutsIcon{position:fixed;bottom:20px;right:20px;width:50px;height:50px;background:linear-gradient(135deg,#ff2e5f 0%,#ff6b9d 100%);border-radius:50%;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:999999;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform 0.2s ease}'
+'#sabreShortcutsIcon:hover{transform:scale(1.1)}'
+'#sabreShortcutsIcon span{font-size:28px}';

document.head.appendChild(style);
document.body.appendChild(menu);

// ── Collapsed icon ───────────────────────────────────────────────────────────
function createCollapsedIcon(){
var icon=document.createElement('div');
icon.id='sabreShortcutsIcon';
icon.innerHTML='<span>⚡</span>';
icon.addEventListener('click',expandMenu);
document.body.appendChild(icon);
}

function collapseToIcon(){
isCollapsed=true;
var m=document.getElementById('sabreShortcutsMenu');
if(m)m.remove();
createCollapsedIcon();
}

function expandMenu(){
isCollapsed=false;
var icon=document.getElementById('sabreShortcutsIcon');
if(icon)icon.remove();
var m=document.createElement('div');
m.id='sabreShortcutsMenu';
m.innerHTML=buildMenuHTML(currentBookingInfo);
m.style.bottom='20px';
m.style.right='20px';
m.style.top='auto';
m.style.transform='translate3d(0px, 0px, 0)';
document.body.appendChild(m);
attachEventListeners();
}

// ── Ticket viewer ────────────────────────────────────────────────────────────
function executeViewEticket(ticketNo,ticketType){
cachedTicketContext={ticketNo:ticketNo,pnr:cachedPNR,traveler:cachedTraveler,type:ticketType};
if(ticketsInView.length>1)cameFromTicketList=true;

if(ticketType==='ndc'||ticketType==='ndc-emd'){
alert('This is an NDC ticket. Please view this document graphically in the Ticketing tab.\n\nTicket context has been cached for refund.');
return;
}

var cleanTicketNo=ticketNo.replace(/[\/-].*$/,'');
var command=(ticketType==='emd'?'WEMD*T':'WETR*T')+cleanTicketNo;

executeSabreCommand(command,function(){
// After command runs the observer will detect the eticket view and auto-update
// But force an update in case observer doesn't fire
updateMenu();
});
}

function executeViewTicketsCommand(){
// Cache BEFORE running *T
if(currentBookingInfo.pnr&&currentBookingInfo.pnr.length===6)cachedPNR=currentBookingInfo.pnr;
if(currentBookingInfo.traveller)cachedTraveler=currentBookingInfo.traveller;

executeSabreCommand('*T',function(){updateMenu();});
}

// ── Method change ────────────────────────────────────────────────────────────
function updateMethod(lineNumber,newMethod){
var cmdInput=document.querySelector('input.command-line-input[name="cmdln"]');
var sendButton=document.querySelector('button.send-button');
if(!cmdInput||!sendButton){alert('Could not find command input or send button');return;}
var command='5'+lineNumber+'¤L¥METHOD-'+newMethod;
cmdInput.value=command;
cmdInput.focus();
cmdInput.dispatchEvent(new Event('input',{bubbles:true}));
setTimeout(function(){sendButton.click();setTimeout(showSavePNRMessage,500);},100);
}

function showSavePNRMessage(){
var message=document.createElement('div');
message.className='save-pnr-message';
message.textContent='⚠️ Please save your PNR';
document.body.appendChild(message);
setTimeout(function(){message.remove();},3000);
}

// ── Clipboard helpers ────────────────────────────────────────────────────────
async function writeRichClipboard(htmlText,plainText){
try{
await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([htmlText],{type:'text/html'}),'text/plain':new Blob([plainText.trim()],{type:'text/plain'})})]);
}catch(err){
var temp=document.createElement('textarea');
temp.value=plainText.trim();
document.body.appendChild(temp);
temp.select();
document.execCommand('copy');
document.body.removeChild(temp);
}
}

async function copyBookingInfoRich(){
var html='<div>';var plain='';
if(currentBookingInfo.pnr&&currentBookingInfo.pnr.length===6){html+='<p><strong>GDS Reference:</strong> '+currentBookingInfo.pnr+'</p>';plain+='GDS Reference: '+currentBookingInfo.pnr+'\n';}
if(currentBookingInfo.luminaId){html+='<p><strong>Booking #:</strong> '+currentBookingInfo.luminaId+'</p>';plain+='Booking #: '+currentBookingInfo.luminaId+'\n';}
// Name as it appears in the PNR
if(currentBookingInfo.traveller){html+='<p><strong>Traveller:</strong> '+currentBookingInfo.traveller+'</p>';plain+='Traveller: '+currentBookingInfo.traveller+'\n';}
html+='</div>';
await writeRichClipboard(html,plain);
}

async function copyContactDetailsRich(){
var html='<div>';
html+='<p><strong>Guest Surname:</strong> '+(currentBookingInfo.surname||'Not Found')+'</p>';
html+='<p><strong>Guest First Name:</strong> '+(currentBookingInfo.firstname||'Not Found')+'</p>';
html+='<p><strong>Phone Number:</strong> '+(currentBookingInfo.phone||'Not Found')+'</p>';
html+='<p><strong>Email Address:</strong> '+(currentBookingInfo.email||'Not Found')+'</p>';
html+='</div>';
var plain='Guest Surname: '+(currentBookingInfo.surname||'Not Found')+'\nGuest First Name: '+(currentBookingInfo.firstname||'Not Found')+'\nPhone Number: '+(currentBookingInfo.phone||'Not Found')+'\nEmail Address: '+(currentBookingInfo.email||'Not Found')+'\n';
await writeRichClipboard(html,plain);
}

async function copyAllTicketInfo(){
var displayTicket,displayName,displayPNR;
if(currentBookingInfo.ticketInfo.ticketNo){
displayTicket=currentBookingInfo.ticketInfo.ticketNo;displayName=currentBookingInfo.ticketInfo.paxName;displayPNR=currentBookingInfo.ticketInfo.pnr;
}else if(cachedTicketContext){
displayTicket=cachedTicketContext.ticketNo;displayName=cachedTicketContext.traveler;displayPNR=cachedTicketContext.pnr;
}else{
displayTicket='Not Found';displayName=cachedTraveler||'Not Found';displayPNR=cachedPNR||'TBA';
}
var html='<div><p><strong>Ticket Number:</strong> '+displayTicket+'</p><p><strong>Passenger Name:</strong> '+displayName+'</p><p><strong>PNR:</strong> '+displayPNR+'</p></div>';
var plain='Ticket Number: '+displayTicket+'\nPassenger Name: '+displayName+'\nPNR: '+displayPNR+'\n';
await writeRichClipboard(html,plain);
}

async function copyRefundData(){
var displayTicket,displayName,displayPNR;
if(currentBookingInfo.ticketInfo.ticketNo){
displayTicket=currentBookingInfo.ticketInfo.ticketNo;displayName=currentBookingInfo.ticketInfo.paxName;displayPNR=currentBookingInfo.ticketInfo.pnr;
}else if(cachedTicketContext){
displayTicket=cachedTicketContext.ticketNo;displayName=cachedTicketContext.traveler;displayPNR=cachedTicketContext.pnr;
}else{
displayTicket='Not Found';displayName=cachedTraveler||'Not Found';displayPNR=cachedPNR||'TBA';
}
var refundData='##SABRE_REFUND##\nTICKET: '+displayTicket+'\nNAME: '+displayName+'\nPNR: '+displayPNR+'\n';
try{
await navigator.clipboard.writeText(refundData);
window.open('https://auoasisservices.au.fcl.internal/OasisWeb/RefundApplication/Create','_blank');
}catch(err){
alert('Could not copy refund data to clipboard');
}
}

// ── Ticket list click handlers ───────────────────────────────────────────────
function attachTicketListHandlers(){
document.querySelectorAll('.ticket-list-item').forEach(function(item){
item.addEventListener('click',function(e){
e.preventDefault();
executeViewEticket(this.getAttribute('data-ticket-no'),this.getAttribute('data-type'));
});
});
}

// ── Main event listeners ─────────────────────────────────────────────────────
function attachEventListeners(){
var isDragging=false,currentX,currentY,initialX,initialY,xOffset=0,yOffset=0;
var menuElement=document.getElementById('sabreShortcutsMenu');
if(!menuElement)return;

// Parse existing transform so drag doesn't reset position after updateMenu
var existingTransform=menuElement.style.transform||'';
var tMatch=existingTransform.match(/translate3d\(([^,]+)px,\s*([^,]+)px/);
if(tMatch){xOffset=parseFloat(tMatch[1])||0;yOffset=parseFloat(tMatch[2])||0;}

menuElement.addEventListener('mousedown',function(e){
var skipClasses=['close-btn','collapse-btn','menu-item','copy-btn','copy-row-btn','ticket-copy-btn','ticket-action-btn','ticket-list-item','back-to-list-btn','method-dropdown'];
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
if(collapseBtn){
collapseBtn.addEventListener('click',function(e){e.stopPropagation();collapseToIcon();});
}

var copyBtn=menuElement.querySelector('.copy-btn');
if(copyBtn){
copyBtn.addEventListener('click',function(e){e.stopPropagation();copyBookingInfoRich();});
}

var methodDropdown=menuElement.querySelector('.method-dropdown');
if(methodDropdown){
methodDropdown.addEventListener('change',function(){updateMethod(this.getAttribute('data-line'),this.value);});
}

attachTicketListHandlers();

// All data-action links
menuElement.querySelectorAll('[data-action]').forEach(function(item){
item.addEventListener('click',function(e){
e.preventDefault();
var action=this.getAttribute('data-action');

switch(action){
case 'viewTickets':
if(currentTicketView==='default'){executeViewTicketsCommand();}
else{userActionInProgress=true;updateMenu();setTimeout(function(){userActionInProgress=false;},1000);}
break;

case 'backToList':
userActionInProgress=true;
cameFromTicketList=false;cachedTicketContext=null;currentTicketView='list';
updateMenu();
setTimeout(function(){userActionInProgress=false;},1000);
break;

case 'copyTicketNo':
var tkt=currentBookingInfo.ticketInfo.ticketNo||(cachedTicketContext&&cachedTicketContext.ticketNo)||'';
if(tkt)navigator.clipboard.writeText(tkt);
break;

case 'copyTicketName':
var tname=currentBookingInfo.ticketInfo.paxName||(cachedTicketContext&&cachedTicketContext.traveler)||cachedTraveler||'';
if(tname)navigator.clipboard.writeText(tname);
break;

case 'copyTicketPNR':
var tpnr=currentBookingInfo.ticketInfo.pnr||(cachedTicketContext&&cachedTicketContext.pnr)||cachedPNR||'';
if(tpnr)navigator.clipboard.writeText(tpnr);
break;

case 'copyAllTicket':
copyAllTicketInfo();
break;

case 'refundTicket':
copyRefundData();
break;

case 'copyPNR':
if(currentBookingInfo.pnr&&currentBookingInfo.pnr.length===6)navigator.clipboard.writeText(currentBookingInfo.pnr);
break;

case 'copyLuminaId':
if(currentBookingInfo.luminaId)navigator.clipboard.writeText(currentBookingInfo.luminaId);
break;

case 'toggleContact':
var submenu=menuElement.querySelector('.contact-submenu');
if(submenu){
var showing=submenu.style.display!=='none';
submenu.style.display=showing?'none':'flex';
this.classList.toggle('expanded',!showing);
}
break;

case 'copyName':
// Copy name as it appears in the PNR (e.g. LEE/DELWYN MS) – no number prefix
var rawName=currentBookingInfo.traveller||cachedTraveler||'';
if(rawName)navigator.clipboard.writeText(rawName);
break;

case 'copyMobile':
if(currentBookingInfo.phone)navigator.clipboard.writeText(currentBookingInfo.phone);
break;

case 'copyEmail':
if(currentBookingInfo.email)navigator.clipboard.writeText(currentBookingInfo.email);
break;

case 'copyAllContact':
copyContactDetailsRich();
break;

case 'viewSerko':
var bodyText=document.body.innerText;
var smatch=bodyText.match(/Q¥QUOTE NUMBER\s*-\s*(\d+)/);
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
// 7TAW/ + today's date e.g. 06MAR
executeSabreCommand('7TAW/'+todayDDMON());
break;

case 'queueSerko':
executeSabreCommand('QP/90/1');
break;
}
});
});
}

attachEventListeners();
})();
