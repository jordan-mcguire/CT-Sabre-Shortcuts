(function(){
if(document.getElementById('sabreShortcutsMenu')){
document.getElementById('sabreShortcutsMenu').remove();
return;
}

if(document.getElementById('sabreShortcutsIcon')){
document.getElementById('sabreShortcutsIcon').remove();
return;
}

// Check if we're on the refund page
if(window.location.href.includes('auoasisservices.au.fcl.internal/OasisWeb/RefundApplication/Create')){
// Show PASTE FROM SABRE button
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
if(line.includes('TICKET:')){
data.ticketNo=line.split('TICKET:')[1].trim();
}
if(line.includes('NAME:')){
data.paxName=line.split('NAME:')[1].trim();
}
if(line.includes('PNR:')){
data.pnr=line.split('PNR:')[1].trim();
}
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
const event=new Event('change',{bubbles:true});
gdsDropdown.dispatchEvent(event);
}

const tmsCheckbox=document.querySelector('input#ConsultantDetails_TmsClient[type="checkbox"]');
if(tmsCheckbox){
tmsCheckbox.checked=true;
const event=new Event('change',{bubbles:true});
tmsCheckbox.dispatchEvent(event);
}

this.textContent='✓ PASTED!';
this.style.background='#28a745';
setTimeout(function(){
document.getElementById('sabrePasteButton').remove();
},2000);
}else{
alert('No refund data found in clipboard. Please click REFUND in Sabre first.');
}
}catch(err){
alert('Could not read clipboard. Please ensure you clicked REFUND in Sabre first.');
}
});
return;
}

// Trip Proposal TIDY button injection
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

var closeButtonWrapper=buttons[0].parentElement;
var copyButtonWrapper=buttons[1].parentElement;

actionButtons.insertBefore(tidyButton,copyButtonWrapper);

tidyButton.querySelector('button').addEventListener('click',function(){
var script=document.createElement('script');
script.src='https://cdn.jsdelivr.net/gh/jordan-mcguire/CT-Sabre-Shortcuts@main/trip-proposal.js';
document.body.appendChild(script);
});
}

var proposalObserver=new MutationObserver(function(mutations){
injectTidyButton();
});

var sabreBody=document.body;
if(sabreBody){
proposalObserver.observe(sabreBody,{childList:true,subtree:true});
}

setTimeout(injectTidyButton,500);
  
let isCollapsed = false;
let currentTicketView = 'default'; // 'default', 'list', or 'eticket'
let ticketsInView = [];
let cameFromTicketList = false;

// Helper: Get PNR from sidebar first, fallback to response text
function getPNRFromSidebar(){
// Try sidebar locations
const pnrRecordLocator = document.querySelector('.pnr-record-locator');
if(pnrRecordLocator && pnrRecordLocator.textContent.trim()){
return pnrRecordLocator.textContent.trim();
}

const boxHeaderPNR = document.querySelector('.box-header-title span:last-child');
if(boxHeaderPNR && boxHeaderPNR.textContent.trim() && boxHeaderPNR.textContent.trim().length === 6){
return boxHeaderPNR.textContent.trim();
}

return null;
}

// Helper: Get traveler name from sidebar first, fallback to response text
function getTravelerFromSidebar(){
const paxSpan = document.querySelector('.pnr-pax');
if(paxSpan && paxSpan.textContent.trim()){
let name = paxSpan.textContent.trim();
// Format: "MACLAREN, MR  BRUCE" -> "MACLAREN/BRUCE MR"
const parts = name.split(',');
if(parts.length >= 2){
const surname = parts[0].trim();
const rest = parts[1].trim().split(/\s+/);
// Rearrange: title might be before or after first name
let firstname = '';
let title = '';
if(rest.length >= 2){
// Check if first word is a title
if(['MR','MRS','MS','MISS','DR'].includes(rest[0].toUpperCase())){
title = rest[0];
firstname = rest.slice(1).join(' ');
}else{
firstname = rest[0];
title = rest.slice(1).join(' ');
}
}else{
firstname = rest.join(' ');
}
return surname + '/' + firstname + (title ? ' ' + title : '');
}
}
return null;
}

// NEW: Extract tickets from sidebar Trip Summary only
function extractTicketsFromSidebar(){
let tickets = [];
  
// Check if Trip Summary sidebar is expanded
const ticketsSectionExpanded = document.querySelector('.expandable-box.tickets-section .box-container.expanded');
  
if(!ticketsSectionExpanded){
// Sidebar collapsed or not available
return null; // Return null to indicate fallback needed
}
  
// Extract from sidebar
const ticketRows = document.querySelectorAll('.expandable-box.tickets-section .box-row.qa-tickets-box-row');
  
ticketRows.forEach(function(row){
const dataDiv = row.querySelector('.data-grow.text-small.text-ellipsis');
if(dataDiv){
const text = dataDiv.textContent.trim();
// Pattern: "TE 0816041513557-AU TINDA/R KR5I*AWT"
// Match: (TE|TO|ME|MO) followed by 13-17 digit ticket number
const match = text.match(/^\s*(TE|TO|ME|MO)\s+(\d{13,17})/);
if(match){
const prefix = match[1];
const ticketNo = match[2];
        
let type = 'regular';
let isNDC = false;
let isEMD = false;
        
if(prefix === 'TO'){
type = 'ndc';
isNDC = true;
}else if(prefix === 'ME'){
type = 'emd';
isEMD = true;
}else if(prefix === 'MO'){
type = 'ndc-emd';
isNDC = true;
isEMD = true;
}
        
tickets.push({
type: type,
ticketNo: ticketNo,
isNDC: isNDC,
isEMD: isEMD,
source: 'sidebar'
});
}
}
});
  
return tickets;
}

// NEW: Extract tickets from Classic *T view
function extractClassicTickets(){
let tickets = [];
const bodyText = document.body.innerText;
  
// Only proceed if we see the header
if(!bodyText.includes('TKT/TIME LIMIT')) return tickets;
  
// Match lines like: "2.TE 0815467943373-AU WOOD/M..."
// Pattern: line number, then TE or TO, then 13-17 digit number
const lines = bodyText.split('\n');
let inTicketSection = false;
  
for(let i = 0; i < lines.length; i++){
const line = lines[i].trim();
    
if(line === 'TKT/TIME LIMIT'){
inTicketSection = true;
continue;
}
    
if(inTicketSection){
// Match pattern: "2.TE 0815467943373" or "3.TO 0816338094723"
const match = line.match(/^\d+\.(TE|TO|ME|MO)\s+(\d{13,17})/);
if(match){
const prefix = match[1];
const ticketNo = match[2];
        
let type = 'regular';
let isNDC = false;
let isEMD = false;
        
if(prefix === 'TO'){
type = 'ndc';
isNDC = true;
}else if(prefix === 'ME'){
type = 'emd';
isEMD = true;
}else if(prefix === 'MO'){
type = 'ndc-emd';
isNDC = true;
isEMD = true;
}
        
tickets.push({
type: type,
ticketNo: ticketNo,
isNDC: isNDC,
isEMD: isEMD,
source: 'classic'
});
}
      
// Stop if we hit an empty line or non-ticket line after starting
if(line === '' || (!line.match(/^\d+\./) && line !== 'TKT/TIME LIMIT')){
break;
}
}
}
  
return tickets;
}

// NEW: Detect if we're viewing individual e-ticket
function isViewingIndividualETicket(){
const bodyText = document.body.innerText;
return bodyText.indexOf('ELECTRONIC TICKET RECORD') > -1;
}

function extractBookingInfo(){
const bodyText=document.body.innerText;
const lines=document.querySelectorAll('.dn-line.text-line');
let info={pnr:'',traveller:'',surname:'',firstname:'',company:'',luminaId:'',booker:'',approved:false,notes:[],email:'',phone:'',hasEticket:false,ticketInfo:{ticketNo:'',paxName:'',pnr:''},tickets:[]};

// Determine current view
const viewingETicket = isViewingIndividualETicket();
const classicTickets = extractClassicTickets();
const sidebarTickets = extractTicketsFromSidebar();

// Set view state
if(viewingETicket){
currentTicketView = 'eticket';
info.hasEticket = true;
}else if(classicTickets.length > 0 || (sidebarTickets && sidebarTickets.length > 0)){
currentTicketView = 'list';
// Combine tickets from both sources (deduplicate by ticket number)
let allTickets = [];
let ticketNumbers = new Set();
  
if(sidebarTickets && sidebarTickets.length > 0){
sidebarTickets.forEach(function(ticket){
if(!ticketNumbers.has(ticket.ticketNo)){
allTickets.push(ticket);
ticketNumbers.add(ticket.ticketNo);
}
});
}
  
classicTickets.forEach(function(ticket){
if(!ticketNumbers.has(ticket.ticketNo)){
allTickets.push(ticket);
ticketNumbers.add(ticket.ticketNo);
}
});
  
info.tickets = allTickets;
ticketsInView = allTickets;
}else{
currentTicketView = 'default';
}

// Always try to get PNR from sidebar first
info.pnr = getPNRFromSidebar();

// Fallback: Get PNR from response text
if(!info.pnr){
let passengerLineIndex=-1;
for(let i=0;i<lines.length;i++){
const text=lines[i].innerText.trim();
if(text.startsWith('1.1')){
passengerLineIndex=i;
break;
}
}

if(passengerLineIndex>0){
for(let i=0;i<passengerLineIndex;i++){
const text=lines[i].innerText.trim();
if(text.length===6&&/^[A-Z]{6}$/i.test(text)){
info.pnr=text;
break;
}
}
}
}

// Last resort
if(!info.pnr||info.pnr===''){
info.pnr='TBA';
}

// Always try to get traveler from sidebar first
info.traveller = getTravelerFromSidebar();

// Fallback: Get from response text
if(!info.traveller){
const travellerMatch=bodyText.match(/1\.1(.+?)(?=\n|$)/);
if(travellerMatch){
info.traveller=travellerMatch[1].trim();
}
}

// Parse name parts if we have traveller
if(info.traveller){
const nameParts=info.traveller.split('/');
if(nameParts.length>=2){
info.surname=nameParts[0].trim();
info.firstname=nameParts[1].trim();
}else{
// Try comma format
const commaParts=info.traveller.split(',');
if(commaParts.length>=2){
info.surname=commaParts[0].trim();
const rest = commaParts[1].trim().split(/\s+/);
if(rest.length >= 2){
if(['MR','MRS','MS','MISS','DR'].includes(rest[0].toUpperCase())){
info.firstname = rest.slice(1).join(' ') + ' ' + rest[0];
}
  else{
info.firstname = rest.join(' ');
}
}else{
info.firstname = rest.join(' ');
}
}
}
}

const companyMatch=bodyText.match(/L¥COMPANY ID-([^\s\n]+)/);
if(companyMatch)info.company=companyMatch[1].trim();

const luminaMatch=bodyText.match(/L¥LUMINA ID-(\d+)/);
if(luminaMatch)info.luminaId=luminaMatch[1].trim();

const bookerMatch=bodyText.match(/L¥BKG MADE-([^\/\n]+)/);
if(bookerMatch)info.booker=bookerMatch[1].trim();

// Check booking status in priority order
if(bodyText.toUpperCase().indexOf('PENDING CANCELLATION')>-1){
info.approved='cancellation';
}else if(bodyText.indexOf('B¥BOOKING AUTHORISED')>-1){
info.approved=true;
}else{
info.approved=false;
}
  
const noteMatches=bodyText.matchAll(/\d+\.H-N-(.+?)(?=\n|$)/g);
for(const match of noteMatches)info.notes.push(match[1].trim());

const emailMatch=bodyText.match(/E¥PAX-([^\n]+)/);
if(emailMatch){
info.email=emailMatch[1].replace(/\.\./g,'_').replace(/¤/g,'@').trim();
}

const phoneMatch=bodyText.match(/P¥PAX-([^\n]+)/);
if(phoneMatch){
info.phone=phoneMatch[1].trim();
}

// Extract individual e-ticket info if viewing one
if(info.hasEticket){
const tktMatch=bodyText.match(/TKT:(\d{13,17}(?:\/\d{1,3})?)/);
if(tktMatch){
let ticketNo=tktMatch[1];
if(ticketNo.includes('/')){
const parts=ticketNo.split('/');
const mainPart=parts[0];
const conjPart=parts[1];
const repeatDigit=mainPart[mainPart.length-2];
ticketNo=mainPart+'-'+repeatDigit+conjPart;
}
info.ticketInfo.ticketNo=ticketNo;
}

const nameMatch=bodyText.match(/NAME:([^\n]+?)(?:\s{3,}|\n)/);
if(nameMatch){
info.ticketInfo.paxName=nameMatch[1].trim();
}else{
// Use sidebar traveler name
info.ticketInfo.paxName = info.traveller;
}

const pnrMatch=bodyText.match(/PNR:([A-Z0-9]{6})/);
if(pnrMatch){
info.ticketInfo.pnr=pnrMatch[1];
}else{
// Use sidebar PNR if not in e-ticket text
info.ticketInfo.pnr = info.pnr;
}
}

return info;
}

let currentBookingInfo=extractBookingInfo();
let lastKnownPNR=currentBookingInfo.pnr;

// NEW: Build ticket list menu (with View Tickets fallback)
function buildTicketListHTML(info){
let html = '<div class="booking-info">';
html += '<div class="booking-info-header"><span class="booking-info-title">📋 Current Booking</span></div>';

if(info.pnr && info.pnr !== 'TBA'){
html += '<div class="info-row"><span class="info-label">Sabre PNR:</span> <span class="info-value">'+info.pnr+'</span></div>';
}
if(info.traveller){
html += '<div class="info-row"><span class="info-label">Traveller:</span> <span class="info-value">'+info.traveller+'</span></div>';
}
html += '</div>';

// Check if we have tickets
if(info.tickets && info.tickets.length > 0){
html += '<div class="ticket-list">';
html += '<div class="ticket-list-header">🎫 SELECT TICKET TO VIEW</div>';

info.tickets.forEach(function(ticket, index){
const displayNo = ticket.ticketNo;
let labels = '';
if(ticket.isNDC){
labels += ' <span class="ndc-label">NDC</span>';
}
if(ticket.isEMD){
labels += ' <span class="emd-label">EMD</span>';
}
html += '<a href="#" class="ticket-list-item" data-ticket-index="'+index+'" data-ticket-no="'+displayNo+'">'+displayNo+labels+'</a>';
});

html += '</div>';
}else{
// Fallback: Show "View Tickets" button
html += '<div class="ticket-fallback">';
html += '<a href="#" class="menu-item" data-action="viewTickets">🎫 View Tickets (*T)</a>';
html += '</div>';
}

return html;
}

// NEW: Build individual e-ticket view menu
function buildETicketViewHTML(info){
let html = '<div class="booking-info">';
html += '<div class="booking-info-header"><span class="booking-info-title">📋 Current Booking</span></div>';

if(info.ticketInfo.pnr || info.pnr){
const pnr = info.ticketInfo.pnr || info.pnr;
if(pnr && pnr !== 'TBA'){
html += '<div class="info-row"><span class="info-label">Sabre PNR:</span> <span class="info-value">'+pnr+'</span></div>';
}
}
if(info.ticketInfo.paxName || info.traveller){
const name = info.ticketInfo.paxName || info.traveller;
html += '<div class="info-row"><span class="info-label">Traveller:</span> <span class="info-value">'+name+'</span></div>';
}
html += '</div>';

html += '<div class="ticket-info-container">';
html += '<div class="ticket-info-header">🎫 TICKET INFO</div>';
html += '<div class="ticket-info-content">';
html += '<div class="ticket-copy-row">';
html += '<a href="#" class="ticket-copy-btn" data-action="copyTicketNo">TKT NO</a>';
html += '<a href="#" class="ticket-copy-btn" data-action="copyTicketName">NAME</a>';
html += '<a href="#" class="ticket-copy-btn" data-action="copyTicketPNR">PNR</a>';
html += '</div>';
html += '<div class="ticket-action-row">';
html += '<a href="#" class="ticket-action-btn" data-action="copyAllTicket">COPY ALL</a>';
html += '<a href="#" class="ticket-action-btn" data-action="refundTicket">REFUND</a>';
html += '</div>';
html += '</div>';
html += '</div>';

// Show back button ONLY if we came from ticket list (multiple tickets)
if(cameFromTicketList && ticketsInView.length > 1){
html += '<div class="back-to-list-container">';
html += '<a href="#" class="back-to-list-btn" data-action="backToList">← Back to Ticket List</a>';
html += '</div>';
}

return html;
}

function buildMenuHTML(info){
if(currentTicketView === 'list'){
return '<div class="menu-header">'
+'<button class="collapse-btn" title="Collapse">▼</button>'
+'<span class="menu-header-title">CT SABRE SHORTCUTS</span>'
+'<div class="close-btn">×</div>'
+'</div>'
+'<div class="menu-content">'
+buildTicketListHTML(info)
+'</div>';
}

if(currentTicketView === 'eticket'){
return '<div class="menu-header">'
+'<button class="collapse-btn" title="Collapse">▼</button>'
+'<span class="menu-header-title">CT SABRE SHORTCUTS</span>'
+'<div class="close-btn">×</div>'
+'</div>'
+'<div class="menu-content">'
+buildETicketViewHTML(info)
+'</div>';
}

// Default view (PNR view)
let approvalHTML='';
if(info.booker){
if(info.approved==='cancellation'){
approvalHTML='<div class="approval-status cancellation">⚠️ PENDING CANCELLATION</div>';
}else if(info.approved===true){
approvalHTML='<div class="approval-status approved">✓ APPROVED</div>';
}else{
approvalHTML='<div class="approval-status pending">⏳ PENDING</div>';
}
}

let bookingInfoHTML='';
if(info.pnr||info.traveller||info.company){
bookingInfoHTML='<div class="booking-info">'
+'<div class="booking-info-header"><span class="booking-info-title">📋 Current Booking</span><span class="copy-btn">Copy</span></div>';

if(info.pnr && info.pnr !== 'TBA')bookingInfoHTML+='<div class="info-row"><span class="info-label">Sabre PNR:</span> <span class="info-value">'+info.pnr+'</span></div>';
if(info.luminaId)bookingInfoHTML+='<div class="info-row"><span class="info-label">Lumina ID:</span> <span class="info-value">'+info.luminaId+'</span></div>';
if(info.pnr||info.luminaId)bookingInfoHTML+='<div class="info-divider"></div>';
if(info.traveller)bookingInfoHTML+='<div class="info-row"><span class="info-label">Traveller:</span> <span class="info-value">'+info.traveller+'</span></div>';
if(info.company)bookingInfoHTML+='<div class="info-row"><span class="info-label">Company:</span> <span class="info-value">'+info.company+'</span></div>';
if(info.booker)bookingInfoHTML+='<div class="info-row"><span class="info-label">Booker:</span> <span class="info-value">'+info.booker+'</span></div>';
bookingInfoHTML+=approvalHTML;

bookingInfoHTML+='</div>';
}

let notesHTML='';
if(info.notes.length>0){
notesHTML='<div class="notes-container">'
+'<a href="#" class="menu-item menu-item-alert" data-action="toggleNotes">⚠️ Notes to Agent Found</a>'
+'<div class="notes-collapsible">'
+'<div class="notes-collapsible-content">'+info.notes.join('<br>')+'</div>'
+'</div>'
+'</div>';
}

let copyRowHTML='<div class="copy-row"><span class="copy-row-label">COPY:</span>'
+'<a href="#" class="copy-row-btn" data-action="copyPNR">📋 PNR</a>'
+'<a href="#" class="copy-row-btn" data-action="copyLuminaId">☑️ Lumina</a>';
if(info.email||info.phone){
copyRowHTML+='<a href="#" class="copy-row-btn" data-action="toggleContact">📞 Contact</a>';
}
copyRowHTML+='</div>';

let contactSubmenuHTML='';
if(info.email||info.phone){
contactSubmenuHTML='<div class="contact-submenu" style="display:none;">'
+'<a href="#" class="copy-row-btn" data-action="copyName">Name</a>'
+'<a href="#" class="copy-row-btn" data-action="copyMobile">Mobile</a>'
+'<a href="#" class="copy-row-btn" data-action="copyEmail">Email</a>'
+'<a href="#" class="copy-row-btn" data-action="copyAllContact">Copy All</a>'
+'</div>';
}

let actionButtonsHTML='';
actionButtonsHTML='<div class="button-row">'
+'<a href="#" class="menu-item menu-item-half" data-action="viewSerko">View in Serko</a>'
+'<a href="#" class="menu-item menu-item-half" data-action="masquerade">View in YourCT</a>'
+'</div>';

return '<div class="menu-header">'
+'<button class="collapse-btn" title="Collapse">▼</button>'
+'<span class="menu-header-title">CT SABRE SHORTCUTS</span>'
+'<div class="close-btn">×</div>'
+'</div>'
+'<div class="menu-content">'
+bookingInfoHTML
+copyRowHTML
+contactSubmenuHTML
+notesHTML
+actionButtonsHTML
+'<a href="#" class="menu-item" data-action="tripProposal">Trip Proposal Tidy</a>'
+'</div>';
}

function updateMenu(){
currentBookingInfo=extractBookingInfo();
var menu=document.getElementById('sabreShortcutsMenu');
if(menu){
menu.innerHTML=buildMenuHTML(currentBookingInfo);
attachEventListeners();
}
}

// Debounced observer - only check for PNR changes
let observerTimeout;
const observer=new MutationObserver(function(mutations){
clearTimeout(observerTimeout);
observerTimeout = setTimeout(function(){
const newInfo=extractBookingInfo();
if(newInfo.pnr&&newInfo.pnr!==lastKnownPNR){
console.log('PNR changed from',lastKnownPNR,'to',newInfo.pnr);
lastKnownPNR=newInfo.pnr;
updateMenu();
}
}, 500); // Debounce 500ms
});

const responseArea=document.querySelector('.area-out');
if(responseArea){
observer.observe(responseArea,{childList:true,subtree:true,characterData:true});
}

var menu=document.createElement('div');
menu.id='sabreShortcutsMenu';
menu.innerHTML=buildMenuHTML(currentBookingInfo);
menu.style.bottom='20px';
menu.style.right='20px';
menu.style.top='auto';

var style=document.createElement('style');
style.textContent='#sabreShortcutsMenu{position:fixed;bottom:60px;right:20px;width:280px;background:linear-gradient(135deg,#ff2e5f 0%,#ff6b9d 100%);border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.3);padding:0;z-index:999999;font-family:Aptos,Arial,sans-serif;max-height:90vh;cursor:move}'
+'.menu-header{color:white;font-size:10px;font-weight:bold;text-align:center;padding:12px;border-bottom:1px solid rgba(255,255,255,0.3);display:flex;justify-content:space-between;align-items:center;cursor:move;user-select:none;position:relative}'
+'.menu-header-title{flex:1;text-align:center}'
+'.collapse-btn{background:none;border:none;color:white;font-size:14px;cursor:pointer;padding:0;width:20px;height:20px;display:flex;align-items:center;justify-content:center;line-height:1}'
+'.collapse-btn:hover{opacity:0.8}'
+'.menu-content{padding:12px;max-height:calc(90vh - 60px);overflow-y:auto}'
+'.booking-info{background:rgba(255,255,255,0.95);border-radius:8px;padding:10px;margin-bottom:10px;font-size:10px;position:relative}'+'.booking-info-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}'
+'.booking-info-title{font-weight:bold;color:#ff2e5f;font-size:11px}'
+'.copy-btn{background:#fff3cd;color:#ff2e5f;padding:4px 8px;border-radius:4px;font-size:10px;font-weight:600;cursor:pointer;border:1px solid #ffd700}'
+'.copy-btn:hover{background:#ffe066}'
+'.info-row{margin:4px 0;display:flex;justify-content:space-between;align-items:flex-start}'
+'.info-label{font-weight:600;color:#555;margin-right:8px;min-width:70px;font-size:10px}'
+'.info-value{color:#333;text-align:right;word-break:break-word;flex:1;font-size:10px}'
+'.info-divider{height:1px;background:#ddd;margin:8px 0}'
+'.approval-status{margin-top:8px;padding:6px;border-radius:5px;text-align:center;font-weight:bold;font-size:10px}'
+'.approval-status.approved{background:#d4edda;color:#155724;border:1px solid #c3e6cb}'
+'.approval-status.pending{background:#fff3cd;color:#856404;border:1px solid #ffeaa7}'
+'.approval-status.cancellation{background:#ffebee;color:#c62828;border:1px solid #ef5350;font-weight:bold}'
+'.ticket-list{background:rgba(255,255,255,0.95);border-radius:8px;padding:10px;margin-bottom:10px}'
+'.ticket-list-header{font-weight:bold;color:#ff2e5f;font-size:11px;margin-bottom:8px;text-align:center}'
+'.ticket-list-item{display:block;padding:10px;margin:6px 0;background:white;color:#333;text-decoration:none;border-radius:5px;transition:all 0.3s ease;font-size:11px;text-align:center;font-weight:500;cursor:pointer;border:1px solid #ddd}'
+'.ticket-list-item:hover{background:#f0f0f0;transform:translateX(-3px);box-shadow:0 2px 8px rgba(0,0,0,0.2)}'
+'.ndc-label{background:#ff2e5f;color:white;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:bold;margin-left:8px}'
+'.emd-label{background:#ffc107;color:#333;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:bold;margin-left:8px}'
+'.ticket-fallback{margin:10px 0}'
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

function createCollapsedIcon(){
var icon=document.createElement('div');
icon.id='sabreShortcutsIcon';
icon.innerHTML='<span>⚡</span>';
icon.addEventListener('click',function(){
expandMenu();
});
document.body.appendChild(icon);
}

function collapseToIcon(){
isCollapsed=true;
var menu=document.getElementById('sabreShortcutsMenu');
if(menu){
menu.remove();
}
createCollapsedIcon();
}

function expandMenu(){
isCollapsed=false;
var icon=document.getElementById('sabreShortcutsIcon');
if(icon){
icon.remove();
}
var menu=document.createElement('div');
menu.id='sabreShortcutsMenu';
menu.innerHTML=buildMenuHTML(currentBookingInfo);
menu.style.bottom='20px';
menu.style.right='20px';
menu.style.top='auto';
menu.style.transform='translate3d(0px, 0px, 0)';
document.body.appendChild(menu);
attachEventListeners();
}

// NEW: Function to auto-execute VIEW E-TICKET command
function executeViewEticket(ticketNo){
const cmdInput = document.querySelector('input.command-line-input[name="cmdln"]');
const sendButton = document.querySelector('button.send-button');
  
if(!cmdInput || !sendButton){
alert('Could not find command input or send button');
return;
}

// Strip conjunction suffix for VIEW command
const cleanTicketNo = ticketNo.replace(/[\/-].*$/, '');

// Set flag that we came from ticket list
if(ticketsInView.length > 1){
cameFromTicketList = true;
}

// Set the command
cmdInput.value = 'WETR*T' + cleanTicketNo;
cmdInput.focus();

// Trigger input event
const inputEvent = new Event('input', { bubbles: true });
cmdInput.dispatchEvent(inputEvent);

// Click send button
setTimeout(function(){
sendButton.click();
}, 100);
}

// NEW: Function to execute *T command
function executeViewTicketsCommand(){
const cmdInput = document.querySelector('input.command-line-input[name="cmdln"]');
const sendButton = document.querySelector('button.send-button');
  
if(!cmdInput || !sendButton){
alert('Could not find command input or send button');
return;
}

// Set the command
cmdInput.value = '*T';
cmdInput.focus();

// Trigger input event
const inputEvent = new Event('input', { bubbles: true });
cmdInput.dispatchEvent(inputEvent);

// Click send button
setTimeout(function(){
sendButton.click();
}, 100);
}

// NEW: Attach handlers to ticket list items
function attachTicketListHandlers(){
const ticketItems = document.querySelectorAll('.ticket-list-item');
ticketItems.forEach(function(item){
item.addEventListener('click', function(e){
e.preventDefault();
const ticketNo = this.getAttribute('data-ticket-no');
executeViewEticket(ticketNo);
});
});
}

function attachEventListeners(){
var isDragging=false,currentX,currentY,initialX,initialY,xOffset=0,yOffset=0;
var menuElement=document.getElementById('sabreShortcutsMenu');

menuElement.addEventListener('mousedown',function(e){
if(e.target.classList.contains('close-btn')||e.target.classList.contains('collapse-btn')||e.target.classList.contains('menu-item')||e.target.classList.contains('copy-btn')||e.target.classList.contains('copy-row-btn')||e.target.classList.contains('ticket-copy-btn')||e.target.classList.contains('ticket-action-btn')||e.target.classList.contains('ticket-list-item')||e.target.classList.contains('back-to-list-btn'))return;
initialX=e.clientX-xOffset;
initialY=e.clientY-yOffset;
isDragging=true;
});

document.addEventListener('mousemove',function(e){
if(isDragging){
e.preventDefault();
currentX=e.clientX-initialX;
currentY=e.clientY-initialY;
xOffset=currentX;
yOffset=currentY;
menuElement.style.transform='translate3d('+currentX+'px, '+currentY+'px, 0)';
}
});

document.addEventListener('mouseup',function(){isDragging=false;});

var closeBtn=menuElement.querySelector('.close-btn');
if(closeBtn){
closeBtn.addEventListener('click',function(e){
e.stopPropagation();
menuElement.remove();
var icon=document.getElementById('sabreShortcutsIcon');
if(icon){
icon.remove();
}
});
}

var collapseBtn=menuElement.querySelector('.collapse-btn');
if(collapseBtn){
collapseBtn.addEventListener('click',function(e){
e.stopPropagation();
collapseToIcon();
});
}

var copyBtn=menuElement.querySelector('.copy-btn');
if(copyBtn){
copyBtn.addEventListener('click',function(e){
e.stopPropagation();
copyBookingInfoRich();
});
}

// Attach ticket list handlers
attachTicketListHandlers();

async function copyBookingInfoRich(){
let htmlText='<div>';
let plainText='';

if(currentBookingInfo.pnr && currentBookingInfo.pnr !== 'TBA'){
htmlText+='<p><strong>GDS Reference:</strong> '+currentBookingInfo.pnr+'</p>';
plainText+='GDS Reference: '+currentBookingInfo.pnr+'\n';
}
if(currentBookingInfo.luminaId){
htmlText+='<p><strong>Booking #:</strong> '+currentBookingInfo.luminaId+'</p>';
plainText+='Booking #: '+currentBookingInfo.luminaId+'\n';
}
if(currentBookingInfo.traveller){
htmlText+='<p><strong>Traveller:</strong> '+currentBookingInfo.traveller+'</p>';
plainText+='Traveller: '+currentBookingInfo.traveller+'\n';
}
htmlText+='</div>';

try{
const blob=new Blob([htmlText],{type:'text/html'});
const blobPlain=new Blob([plainText.trim()],{type:'text/plain'});
await navigator.clipboard.write([
new ClipboardItem({
'text/html':blob,
'text/plain':blobPlain
})
]);
}catch(err){
var temp=document.createElement('textarea');
temp.value=plainText.trim();
document.body.appendChild(temp);
temp.select();
document.execCommand('copy');
document.body.removeChild(temp);
}
}

async function copyContactDetailsRich(){
let htmlText='<div>';
htmlText+='<p><strong>Guest Surname:</strong> '+(currentBookingInfo.surname||'Not Found')+'</p>';
htmlText+='<p><strong>Guest First Name:</strong> '+(currentBookingInfo.firstname||'Not Found')+'</p>';
htmlText+='<p><strong>Phone Number:</strong> '+(currentBookingInfo.phone||'Not Found')+'</p>';
htmlText+='<p><strong>Email Address:</strong> '+(currentBookingInfo.email||'Not Found')+'</p>';
htmlText+='</div>';

let plainText='';
plainText+='Guest Surname: '+(currentBookingInfo.surname||'Not Found')+'\n';
plainText+='Guest First Name: '+(currentBookingInfo.firstname||'Not Found')+'\n';
plainText+='Phone Number: '+(currentBookingInfo.phone||'Not Found')+'\n';
plainText+='Email Address: '+(currentBookingInfo.email||'Not Found')+'\n';

try{
const blob=new Blob([htmlText],{type:'text/html'});
const blobPlain=new Blob([plainText.trim()],{type:'text/plain'});
await navigator.clipboard.write([
new ClipboardItem({
'text/html':blob,
'text/plain':blobPlain
})
]);
}catch(err){
var temp=document.createElement('textarea');
temp.value=plainText.trim();
document.body.appendChild(temp);
temp.select();
document.execCommand('copy');
document.body.removeChild(temp);
}
}

async function copyAllTicketInfo(){
let htmlText='<div>';
htmlText+='<p><strong>Ticket Number:</strong> '+currentBookingInfo.ticketInfo.ticketNo+'</p>';
htmlText+='<p><strong>Passenger Name:</strong> '+currentBookingInfo.ticketInfo.paxName+'</p>';
htmlText+='<p><strong>PNR:</strong> '+(currentBookingInfo.ticketInfo.pnr || currentBookingInfo.pnr)+'</p>';
htmlText+='</div>';

let plainText='';
plainText+='Ticket Number: '+currentBookingInfo.ticketInfo.ticketNo+'\n';
plainText+='Passenger Name: '+currentBookingInfo.ticketInfo.paxName+'\n';
plainText+='PNR: '+(currentBookingInfo.ticketInfo.pnr || currentBookingInfo.pnr)+'\n';

try{
const blob=new Blob([htmlText],{type:'text/html'});
const blobPlain=new Blob([plainText.trim()],{type:'text/plain'});
await navigator.clipboard.write([
new ClipboardItem({
'text/html':blob,
'text/plain':blobPlain
})
]);
}catch(err){
var temp=document.createElement('textarea');
temp.value=plainText.trim();
document.body.appendChild(temp);
temp.select();
document.execCommand('copy');
document.body.removeChild(temp);
}
}

var toggleNotesBtn=menuElement.querySelector('[data-action="toggleNotes"]');
if(toggleNotesBtn){
toggleNotesBtn.addEventListener('click',function(e){
e.preventDefault();
var collapsible=this.parentElement.querySelector('.notes-collapsible');
if(collapsible){
collapsible.classList.toggle('expanded');
}
});
}

menuElement.querySelectorAll('.copy-row-btn, .menu-item, .ticket-copy-btn, .ticket-action-btn, .back-to-list-btn').forEach(function(item){
item.addEventListener('click',function(e){
e.preventDefault();
var action=this.getAttribute('data-action');

if(action==='viewTickets'){
executeViewTicketsCommand();
}else if(action==='backToList'){
cameFromTicketList = false;
// Execute *T command to go back to ticket list
executeViewTicketsCommand();
}else if(action==='toggleContact'){
var submenu=menuElement.querySelector('.contact-submenu');
if(submenu){
if(submenu.style.display==='none'){
submenu.style.display='flex';
this.classList.add('expanded');
}else{
submenu.style.display='none';
this.classList.remove('expanded');
}
}
}else if(action==='copyName'){
if(currentBookingInfo.traveller){
var temp=document.createElement('textarea');
temp.value=currentBookingInfo.traveller;
document.body.appendChild(temp);
temp.select();
document.execCommand('copy');
document.body.removeChild(temp);
}
}else if(action==='copyMobile'){
if(currentBookingInfo.phone){
var temp=document.createElement('textarea');
temp.value=currentBookingInfo.phone;
document.body.appendChild(temp);
temp.select();
document.execCommand('copy');
document.body.removeChild(temp);
}
}else if(action==='copyEmail'){
if(currentBookingInfo.email){
var temp=document.createElement('textarea');
temp.value=currentBookingInfo.email;
document.body.appendChild(temp);
temp.select();
document.execCommand('copy');
document.body.removeChild(temp);
}
}else if(action==='copyAllContact'){
copyContactDetailsRich();
}else if(action==='copyTicketNo'){
if(currentBookingInfo.ticketInfo.ticketNo){
var temp=document.createElement('textarea');
temp.value=currentBookingInfo.ticketInfo.ticketNo;
document.body.appendChild(temp);
temp.select();
document.execCommand('copy');
document.body.removeChild(temp);
}
}else if(action==='copyTicketName'){
if(currentBookingInfo.ticketInfo.paxName){
var temp=document.createElement('textarea');
temp.value=currentBookingInfo.ticketInfo.paxName;
document.body.appendChild(temp);
temp.select();
document.execCommand('copy');
document.body.removeChild(temp);
}
}else if(action==='copyTicketPNR'){
const pnr = currentBookingInfo.ticketInfo.pnr || currentBookingInfo.pnr;
if(pnr && pnr !== 'TBA'){
var temp=document.createElement('textarea');
temp.value=pnr;
document.body.appendChild(temp);
temp.select();
document.execCommand('copy');
document.body.removeChild(temp);
}
}else if(action==='copyAllTicket'){
copyAllTicketInfo();
}else if(action==='refundTicket'){
// Prepare refund data with proper name format (SURNAME/FIRST TITLE)
let ticketNo = currentBookingInfo.ticketInfo.ticketNo;
let paxName = currentBookingInfo.ticketInfo.paxName;
let pnr = currentBookingInfo.ticketInfo.pnr || currentBookingInfo.pnr;

// Ensure name is in correct format for refund
// If name is in "Surname, First Title" format, convert to "SURNAME/FIRST TITLE"
if(paxName && paxName.includes(',')){
const parts = paxName.split(',');
if(parts.length >= 2){
const surname = parts[0].trim().toUpperCase();
const rest = parts[1].trim().split(/\s+/);
const firstname = rest[0].toUpperCase();
const title = rest.slice(1).join(' ').toUpperCase();
paxName = surname + '/' + firstname + (title ? ' ' + title : '');
}
}

var refundData='##SABRE_REFUND##\nTICKET: '+ticketNo+'\nNAME: '+paxName+'\nPNR: '+pnr;
var temp=document.createElement('textarea');
temp.value=refundData;
document.body.appendChild(temp);
temp.select();
document.execCommand('copy');
document.body.removeChild(temp);
alert('Refund data copied!\n\nWhen the refund page opens:\n1. Click your Sabre Shortcuts bookmarklet again\n2. Click the "PASTE FROM SABRE" button\n\nThe fields will auto-fill!');
window.open('https://auoasisservices.au.fcl.internal/OasisWeb/RefundApplication/Create','_blank');
}else if(action==='toggleNotes'){
// Handled above
}else if(action==='copyPNR'){
if(currentBookingInfo.pnr && currentBookingInfo.pnr !== 'TBA'){
var temp=document.createElement('textarea');
temp.value=currentBookingInfo.pnr;
document.body.appendChild(temp);
temp.select();
document.execCommand('copy');
document.body.removeChild(temp);
}else{
alert('PNR not found');
}
}else if(action==='copyLuminaId'){
if(currentBookingInfo.luminaId){
var temp=document.createElement('textarea');
temp.value=currentBookingInfo.luminaId;
document.body.appendChild(temp);
temp.select();
document.execCommand('copy');
document.body.removeChild(temp);
}else{
alert('No Lumina ID found - please download your booking');
}
}else if(action==='viewSerko'){
const pattern=/Q¥QUOTE NUMBER\s*-\s*(\d+)/;
const bodyText=document.body.innerText;
const match=bodyText.match(pattern);
if(match&&match[1]){
const quoteNum=match[1];
const url='https://serko.au.fcm.travel/Web/Booking/Detail/'+quoteNum;
window.open(url,'_blank');
}else{
alert('Quote number not found!');
}
}else if(action==='masquerade'){
const pattern=/U62-([A-F0-9-]+)/i;
const bodyText=document.body.innerText;
const match=bodyText.match(pattern);
if(match&&match[1]){
const guid=match[1];
const url='https://agentport.fcm.travel/SamlService/AgentToClientSsoTraveler/'+guid;
window.open(url,'_blank');
}else{
alert('Agentport or YourCT profile not found. This could be a profile that only exists in Lumina, or a guest traveller.');
}
}else if(action==='tripProposal'){
var script=document.createElement('script');
script.src='https://cdn.jsdelivr.net/gh/jordan-mcguire/CT-Sabre-Shortcuts@main/trip-proposal.js';
document.body.appendChild(script);
}
});
});
}

attachEventListeners();
})();
