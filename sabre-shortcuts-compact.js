(function(){
if(document.getElementById('ctToolbar')){
document.getElementById('ctToolbar').remove();
return;
}
// Also remove any open popups
['ctCopyPopup','ctActionsPopup','ctTicketPanel','ctSabreToast'].forEach(function(id){
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
var currentTicketView='default';
var ticketsInView=[];
var cameFromTicketList=false;
var cachedPNR='';
var cachedTraveler='';
var cachedTicketContext=null;
var lastKnownPNR='';
var pendingCommandPoll=null;
var openPopup=null; // tracks which popup is currently open

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
el.textContent='✓';
el.style.background='#28a745';el.style.color='white';el.style.borderColor='#28a745';
setTimeout(function(){
el.textContent=orig;
el.style.background='';el.style.color='';el.style.borderColor='';
},900);
}

function showToast(msg){
var existing=document.getElementById('ctSabreToast');
if(existing)existing.remove();
var t=document.createElement('div');
t.id='ctSabreToast';
t.textContent=msg;
t.style.cssText='position:fixed;bottom:72px;right:24px;background:#28a745;color:white;'
+'font-family:Aptos,Arial,sans-serif;font-size:12px;font-weight:600;'
+'padding:8px 16px;border-radius:6px;box-shadow:0 3px 12px rgba(0,0,0,0.25);'
+'z-index:1000002;opacity:1;transition:opacity 0.4s ease;pointer-events:none;';
document.body.appendChild(t);
setTimeout(function(){t.style.opacity='0';setTimeout(function(){t.remove();},420);},1400);
}

function closeAllPopups(){
['ctCopyPopup','ctActionsPopup','ctTicketPanel'].forEach(function(id){
var el=document.getElementById(id);
if(el){el.style.opacity='0';setTimeout(function(){el.remove();},150);}
});
openPopup=null;
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
updateToolbar();
// If we landed on eticket or list, open the ticket panel automatically
if(detectedView==='eticket'||detectedView==='list')openTicketPanel();
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

// ── Truncate helper ───────────────────────────────────────────────────────────
function trunc(str,max){
if(!str)return '';var s=String(str);
return s.length>max?'<span title="'+s.replace(/"/g,'&quot;')+'">'+s.substring(0,max)+'…</span>':s;
}

// ── Approval colour for toolbar left-border ───────────────────────────────────
function approvalBorderColor(approved){
if(approved==='rejected')return '#ff0000';
if(approved==='cancellation')return '#ff9800';
if(approved===true)return '#28a745';
if(approved===false&&currentBookingInfo.booker)return '#ffc107';
return 'rgba(255,255,255,0.3)';
}

function approvalLabel(approved){
if(approved==='rejected')return '<span class="ct-status-badge ct-rejected">🚫 REJECTED</span>';
if(approved==='cancellation')return '<span class="ct-status-badge ct-cancellation">⚠️ CXLD</span>';
if(approved===true)return '<span class="ct-status-badge ct-approved">✓</span>';
if(approved===false&&currentBookingInfo.booker)return '<span class="ct-status-badge ct-pending">⏳</span>';
return '';
}

// ── Build toolbar pill ────────────────────────────────────────────────────────
function buildToolbar(info){
var traveller=info.traveller||cachedTraveler||'';
var approved=info.approved;
var borderColor=approvalBorderColor(approved);
var statusBadge=approvalLabel(approved);
var notesBadge=info.notes.length>0?'<span class="ct-notes-badge">'+info.notes.length+'</span>':'';
var hasTickets=currentTicketView==='list'||currentTicketView==='eticket';

// Toolbar pill: [✈ NAME  STATUS] [📋] [⚡ badge]
var html='<div id="ctToolbarInner" style="border-left:3px solid '+borderColor+';">';
// Name area
html+='<div class="ct-name-area">';
html+='<span class="ct-plane">✈</span>';
if(traveller){
html+='<span class="ct-traveller">'+trunc(traveller,22)+'</span>';
}else{
html+='<span class="ct-traveller ct-dim">No booking loaded</span>';
}
if(statusBadge)html+=statusBadge;
html+='</div>';
// Icon buttons
html+='<div class="ct-icon-btns">';
html+='<button class="ct-icon-btn" id="ctBtnCopy" title="Copy options">📋</button>';
if(hasTickets){
html+='<button class="ct-icon-btn ct-ticket-btn" id="ctBtnTicket" title="Ticket actions">🎫</button>';
}
html+='<button class="ct-icon-btn" id="ctBtnActions" title="Actions'+( info.notes.length>0?' — '+info.notes.length+' note'+(info.notes.length>1?'s':''):'')+'">';
html+='⚡'+notesBadge;
html+='</button>';
html+='<button class="ct-icon-btn ct-close-btn" id="ctBtnClose" title="Close">×</button>';
html+='</div>';
html+='</div>';
return html;
}

// ── Build copy popup ──────────────────────────────────────────────────────────
function buildCopyPopup(info){
var hasContact=info.email||info.phone;
var html='<div class="ct-popup-section-label">COPY</div>';
html+='<button class="ct-popup-btn" data-action="copyPNR">📋 PNR</button>';
html+='<button class="ct-popup-btn" data-action="copyLuminaId">📋 CT Booking No.</button>';
html+='<button class="ct-popup-btn" data-action="copyBookingInfo">📋 Full Booking Info</button>';
if(hasContact){
html+='<div class="ct-popup-divider"></div>';
html+='<div class="ct-popup-section-label">CONTACT</div>';
html+='<button class="ct-popup-btn" data-action="copyName">👤 Name</button>';
html+='<button class="ct-popup-btn" data-action="copyMobile">📱 Mobile</button>';
html+='<button class="ct-popup-btn" data-action="copyEmail">✉️ Email</button>';
html+='<button class="ct-popup-btn" data-action="copyAllContact">📋 Copy All Contact</button>';
}
return html;
}

// ── Build actions popup ───────────────────────────────────────────────────────
function buildActionsPopup(info){
var html='';

// Notes — shown at top if present
if(info.notes.length>0){
html+='<div class="ct-popup-section-label">⚠️ NOTES TO AGENT</div>';
html+='<div class="ct-notes-block">';
info.notes.forEach(function(n){html+='<div class="ct-note-line">'+n+'</div>';});
html+='</div>';
html+='<div class="ct-popup-divider"></div>';
}

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
html+='<div class="ct-method-row">';
html+='<select class="ct-method-select" data-line="'+info.methodLine+'">';
html+='<option value="W"'+(info.method==='W'?' selected':'')+'>Web</option>';
html+='<option value="M"'+(info.method==='M'?' selected':'')+'>Mixed</option>';
html+='<option value="E"'+(info.method==='E'?' selected':'')+'>Email</option>';
html+='<option value="T"'+(info.method==='T'?' selected':'')+'>Telephone</option>';
html+='</select></div>';
}
return html;
}

// ── Build ticket panel ────────────────────────────────────────────────────────
function buildTicketPanel(info){
var html='';
if(currentTicketView==='list'&&info.tickets&&info.tickets.length>0){
html+='<div class="ct-popup-section-label">🎫 SELECT TICKET</div>';
info.tickets.forEach(function(ticket,index){
var labels='';
if(ticket.isNDC)labels+=' <span class="ndc-label">NDC</span>';
if(ticket.isEMD)labels+=' <span class="emd-label">EMD</span>';
html+='<button class="ct-popup-btn ct-ticket-item" data-ticket-no="'+ticket.ticketNo+'" data-type="'+ticket.type+'">'+ticket.ticketNo+labels+'</button>';
});
html+='<div class="ct-ticket-note">NDC tickets: view graphically in Ticketing tab.</div>';
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

// ── Popup factory ─────────────────────────────────────────────────────────────
function showPopup(id,contentHTML,anchorBtn){
closeAllPopups();
if(openPopup===id){openPopup=null;return;} // toggle off
var popup=document.createElement('div');
popup.id=id;
popup.className='ct-popup';
popup.innerHTML=contentHTML;
document.body.appendChild(popup);

// Position above the anchor button
var rect=anchorBtn.getBoundingClientRect();
var popupWidth=200;
var left=rect.right-popupWidth;
if(left<4)left=4;
popup.style.right=(window.innerWidth-rect.right)+'px';
popup.style.bottom=(window.innerHeight-rect.top+6)+'px';

// Animate in
requestAnimationFrame(function(){popup.style.opacity='1';popup.style.transform='translateY(0)';});
openPopup=id;
attachPopupHandlers(popup);
}

// ── Popup event handlers ──────────────────────────────────────────────────────
function attachPopupHandlers(popup){
// Method dropdown in actions popup
var methodSelect=popup.querySelector('.ct-method-select');
if(methodSelect){
methodSelect.addEventListener('change',function(){
updateMethod(this.getAttribute('data-line'),this.value);
});
}

// Ticket list items
popup.querySelectorAll('.ct-ticket-item').forEach(function(btn){
btn.addEventListener('click',function(e){
e.stopPropagation();
executeViewEticket(this.getAttribute('data-ticket-no'),this.getAttribute('data-type'));
closeAllPopups();
});
});

// data-action buttons
popup.querySelectorAll('[data-action]').forEach(function(btn){
btn.addEventListener('click',function(e){
e.preventDefault();e.stopPropagation();
var action=this.getAttribute('data-action');
var self=this;
switch(action){
case 'copyPNR':
if(currentBookingInfo.pnr&&currentBookingInfo.pnr.length===6){
navigator.clipboard.writeText(currentBookingInfo.pnr);flashCopied(self);}
break;
case 'copyLuminaId':
if(currentBookingInfo.luminaId){navigator.clipboard.writeText(currentBookingInfo.luminaId);flashCopied(self);}
break;
case 'copyBookingInfo':
copyBookingInfoRich().then(function(){showToast('✓ Booking info copied');});
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
copyContactDetailsRich().then(function(){showToast('✓ Contact copied');closeAllPopups();});
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
copyRefundData();closeAllPopups();
break;
case 'backToList':
cameFromTicketList=false;cachedTicketContext=null;currentTicketView='list';
updateToolbar();openTicketPanel();
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
executeSabreCommand('7TAW'+todayDDMON()+'/',null);
showToast('✓ TTL command sent');closeAllPopups();
break;
case 'queueSerko':
executeSabreCommand('QP/90/1',null);
showToast('✓ Queue command sent');closeAllPopups();
break;
}
});
});
}

function openTicketPanel(){
var btn=document.getElementById('ctBtnTicket');
if(!btn)return;
showPopup('ctTicketPanel',buildTicketPanel(currentBookingInfo),btn);
}

// ── Toolbar update ────────────────────────────────────────────────────────────
function updateToolbar(){
var tb=document.getElementById('ctToolbar');
if(!tb)return;
tb.innerHTML=buildToolbar(currentBookingInfo);
// Update approval border
var inner=document.getElementById('ctToolbarInner');
if(inner)inner.style.borderLeftColor=approvalBorderColor(currentBookingInfo.approved);
attachToolbarHandlers();
}

// ── Toolbar button handlers ───────────────────────────────────────────────────
function attachToolbarHandlers(){
var btnCopy=document.getElementById('ctBtnCopy');
var btnActions=document.getElementById('ctBtnActions');
var btnTicket=document.getElementById('ctBtnTicket');
var btnClose=document.getElementById('ctBtnClose');

if(btnCopy){
btnCopy.addEventListener('click',function(e){
e.stopPropagation();
showPopup('ctCopyPopup',buildCopyPopup(currentBookingInfo),btnCopy);
});
}
if(btnActions){
btnActions.addEventListener('click',function(e){
e.stopPropagation();
showPopup('ctActionsPopup',buildActionsPopup(currentBookingInfo),btnActions);
});
}
if(btnTicket){
btnTicket.addEventListener('click',function(e){
e.stopPropagation();
showPopup('ctTicketPanel',buildTicketPanel(currentBookingInfo),btnTicket);
});
}
if(btnClose){
btnClose.addEventListener('click',function(e){
e.stopPropagation();
closeAllPopups();
var tb=document.getElementById('ctToolbar');if(tb)tb.remove();
});
}

// Drag on the name area
var tb=document.getElementById('ctToolbar');
var isDragging=false,startX,startY,origRight,origBottom;
var nameArea=tb?tb.querySelector('.ct-name-area'):null;
if(nameArea){
nameArea.addEventListener('mousedown',function(e){
isDragging=true;
startX=e.clientX;startY=e.clientY;
var style=window.getComputedStyle(tb);
origRight=parseInt(style.right)||20;
origBottom=parseInt(style.bottom)||20;
e.preventDefault();
});
}
document.addEventListener('mousemove',function(e){
if(!isDragging)return;
var dx=e.clientX-startX;var dy=e.clientY-startY;
var tb=document.getElementById('ctToolbar');
if(tb){tb.style.right=(origRight-dx)+'px';tb.style.bottom=(origBottom-dy)+'px';}
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
cameFromTicketList=false;cachedTicketContext=null;
closeAllPopups();updateToolbar();
}else if(newView!==currentTicketView){
currentBookingInfo=newInfo;currentTicketView=newView;updateToolbar();
}
});
var responseArea=document.querySelector('.area-out');
if(responseArea)observer.observe(responseArea,{childList:true,subtree:true,characterData:true});

// Close popups on outside click
document.addEventListener('click',function(e){
if(!openPopup)return;
var popup=document.getElementById(openPopup);
var tb=document.getElementById('ctToolbar');
if(popup&&!popup.contains(e.target)&&tb&&!tb.contains(e.target)){
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
var plain=rows.map(function(r){return r[0]+': '+r[1];}).join('\n');
await writeRichClipboard(buildEmailTable('TICKET DETAILS',rows),plain);
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
var command=(ticketType==='emd'?'WEMD*T':'WETR*T')+cleanTicketNo;
executeSabreCommand(command,'eticket');
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
// Toolbar pill
'#ctToolbar{'
+'position:fixed;bottom:20px;right:20px;z-index:999999;'
+'font-family:Aptos,Arial,sans-serif;'
+'animation:ctPopIn 0.2s ease-out;}'
+'@keyframes ctPopIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}'
+'#ctToolbarInner{'
+'display:flex;align-items:center;gap:0;'
+'background:linear-gradient(135deg,#ff2e5f 0%,#d41a4a 100%);'
+'border-radius:24px;'
+'box-shadow:0 4px 16px rgba(0,0,0,0.35);'
+'border-left:3px solid #28a745;'  // overwritten dynamically
+'overflow:hidden;'
+'height:34px;}'

// Name area — draggable
+'.ct-name-area{'
+'display:flex;align-items:center;gap:6px;'
+'padding:0 12px 0 10px;height:100%;cursor:move;'
+'border-right:1px solid rgba(255,255,255,0.2);'
+'min-width:0;max-width:200px;}'
+'.ct-plane{font-size:13px;flex-shrink:0;}'
+'.ct-traveller{font-size:10.5px;font-weight:700;color:white;letter-spacing:0.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
+'.ct-dim{opacity:0.6;font-weight:400;}'

// Status badges
+'.ct-status-badge{font-size:8px;font-weight:800;padding:2px 5px;border-radius:3px;white-space:nowrap;flex-shrink:0;}'
+'.ct-approved{background:#d4edda;color:#155724;}'
+'.ct-pending{background:#fff3cd;color:#856404;}'
+'.ct-cancellation{background:#fff3cd;color:#c62828;}'
+'.ct-rejected{background:#ff0000;color:white;}'

// Notes badge on ⚡ button
+'.ct-notes-badge{'
+'position:absolute;top:-4px;right:-4px;'
+'background:#ff9800;color:white;'
+'font-size:8px;font-weight:800;'
+'min-width:14px;height:14px;border-radius:7px;'
+'display:flex;align-items:center;justify-content:center;'
+'padding:0 3px;border:1.5px solid #ff2e5f;}'

// Icon buttons row
+'.ct-icon-btns{display:flex;align-items:center;height:100%;}'
+'.ct-icon-btn{'
+'background:none;border:none;color:white;'
+'font-size:15px;cursor:pointer;'
+'height:34px;width:34px;'
+'display:flex;align-items:center;justify-content:center;'
+'position:relative;'
+'transition:background 0.15s;}'
+'.ct-icon-btn:hover{background:rgba(255,255,255,0.15);}'
+'.ct-ticket-btn{font-size:14px;}'
+'.ct-close-btn{font-size:18px;opacity:0.7;border-left:1px solid rgba(255,255,255,0.2);}'
+'.ct-close-btn:hover{opacity:1;background:rgba(0,0,0,0.2);}'

// Popup shared styles — floats ABOVE toolbar
+'.ct-popup{'
+'position:fixed;z-index:1000001;'
+'width:210px;'
+'background:white;'
+'border-radius:10px;'
+'box-shadow:0 8px 28px rgba(0,0,0,0.22);'
+'border:1px solid #f0f0f0;'
+'padding:8px;'
+'opacity:0;transform:translateY(6px);'
+'transition:opacity 0.15s ease,transform 0.15s ease;}'

+'.ct-popup-section-label{'
+'font-size:8px;font-weight:800;color:#ff2e5f;'
+'text-transform:uppercase;letter-spacing:0.6px;'
+'padding:4px 6px 4px;margin-top:2px;}'

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
+'.ct-highlight-btn:hover{background:#ffe066;}'

+'.ct-popup-divider{height:1px;background:#f0e0e5;margin:6px 0;}'

// Notes block inside actions popup
+'.ct-notes-block{'
+'background:#fffbf0;border-left:3px solid #ff9800;'
+'border-radius:5px;padding:8px 10px;margin:4px 0 6px;'
+'max-height:140px;overflow-y:auto;}'
+'.ct-note-line{font-size:10px;line-height:1.55;color:#333;padding:2px 0;'
+'word-break:break-word;white-space:pre-wrap;border-bottom:1px dotted rgba(255,152,0,0.2);}'
+'.ct-note-line:last-child{border-bottom:none;}'

// Ticket items inside popup
+'.ct-ticket-note{font-size:8px;color:#888;font-style:italic;text-align:center;padding:4px;}'
+'.ct-ticket-btn-row{display:flex;gap:4px;margin:4px 0;}'
+'.ct-ticket-btn-row .ct-popup-btn{flex:1;text-align:center;padding:7px 4px;}'

// Ticket/NDC/EMD labels
+'.ndc-label{background:#ff2e5f;color:white;padding:2px 5px;border-radius:3px;font-size:8px;font-weight:bold;margin-left:6px;}'
+'.emd-label{background:#ffc107;color:#333;padding:2px 5px;border-radius:3px;font-size:8px;font-weight:bold;margin-left:6px;}'

// Method dropdown inside popup
+'.ct-method-row{padding:2px 0 4px;}'
+'.ct-method-select{width:100%;padding:6px 8px;border-radius:5px;border:1px solid #f0e0e5;font-size:10.5px;background:white;cursor:pointer;font-family:Aptos,Arial,sans-serif;}'
+'.ct-method-select:hover{border-color:#ff2e5f;}'

// Save toast
+'.save-pnr-message{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);'
+'background:#28a745;color:white;padding:15px 30px;border-radius:8px;z-index:1000003;'
+'font-size:14px;font-weight:bold;box-shadow:0 4px 20px rgba(0,0,0,0.3);animation:ctFadeOut 3s forwards;}'
+'@keyframes ctFadeOut{0%{opacity:1}70%{opacity:1}100%{opacity:0}}';

document.head.appendChild(style);

// ── Mount toolbar ─────────────────────────────────────────────────────────────
var toolbar=document.createElement('div');
toolbar.id='ctToolbar';
toolbar.innerHTML=buildToolbar(currentBookingInfo);
document.body.appendChild(toolbar);
attachToolbarHandlers();

})();
