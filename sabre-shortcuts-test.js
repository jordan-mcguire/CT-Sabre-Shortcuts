(function(){
if(document.getElementById('sabreShortcutsMenu')){
document.getElementById('sabreShortcutsMenu').remove();
return;
}

if(document.getElementById('sabreShortcutsIcon')){
document.getElementById('sabreShortcutsIcon').remove();
return;
}

// Track collapse state in memory
let isCollapsed = false;

function extractBookingInfo(){
const bodyText=document.body.innerText;
const lines=document.querySelectorAll('.dn-line.text-line');
let info={pnr:'',traveller:'',surname:'',firstname:'',company:'',luminaId:'',booker:'',approved:false,notes:[],email:'',phone:'',hasEticket:false,ticketInfo:{ticketNo:'',paxName:'',pnr:''}};

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

if(!info.pnr||info.pnr===''){
info.pnr='TBA';
}

const travellerMatch=bodyText.match(/1\.1(.+?)(?=\n|$)/);
if(travellerMatch){
info.traveller=travellerMatch[1].trim();
const nameParts=info.traveller.split('/');
if(nameParts.length>=2){
info.surname=nameParts[0].trim();
info.firstname=nameParts[1].trim();
}
}

const companyMatch=bodyText.match(/L¥COMPANY ID-([^\s\n]+)/);
if(companyMatch)info.company=companyMatch[1].trim();

const luminaMatch=bodyText.match(/L¥LUMINA ID-(\d+)/);
if(luminaMatch)info.luminaId=luminaMatch[1].trim();

const bookerMatch=bodyText.match(/L¥BKG MADE-([^\/\n]+)/);
if(bookerMatch)info.booker=bookerMatch[1].trim();

if(bodyText.indexOf('B¥BOOKING AUTHORISED')>-1)info.approved=true;

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

// Check for e-ticket
if(bodyText.indexOf('ELECTRONIC TICKET RECORD')>-1){
info.hasEticket=true;

// Extract ticket number
const tktMatch=bodyText.match(/TKT:(\d+(?:\/\d{1,3})?)/);
if(tktMatch){
let ticketNo=tktMatch[1];
// Handle conjunction tickets
if(ticketNo.includes('/')){
const parts=ticketNo.split('/');
const mainPart=parts[0];
const conjPart=parts[1];
const repeatDigit=mainPart[mainPart.length-2];
ticketNo=mainPart+'-'+repeatDigit+conjPart;
}
info.ticketInfo.ticketNo=ticketNo;
}

// Extract passenger name (stop at 3+ spaces)
const nameMatch=bodyText.match(/NAME:([^\n]+?)(?:\s{3,}|\n)/);
if(nameMatch){
info.ticketInfo.paxName=nameMatch[1].trim();
}

// Extract PNR
const pnrMatch=bodyText.match(/PNR:([A-Z0-9]{6})/);
if(pnrMatch){
info.ticketInfo.pnr=pnrMatch[1];
}
}

return info;
}

let currentBookingInfo=extractBookingInfo();
let lastKnownPNR=currentBookingInfo.pnr;

function buildMenuHTML(info){
let approvalHTML='';
if(info.booker){
approvalHTML=info.approved?'<div class="approval-status approved">✓ APPROVED</div>':'<div class="approval-status pending">⏳ PENDING</div>';
}

let bookingInfoHTML='';
if(info.pnr||info.traveller||info.company){
bookingInfoHTML='<div class="booking-info">'
+'<div class="booking-info-header"><span class="booking-info-title">📋 Current Booking</span><span class="copy-btn">Copy</span></div>'
+(info.pnr?'<div class="info-row"><span class="info-label">Sabre PNR:</span> <span class="info-value">'+info.pnr+'</span></div>':'')
+(info.luminaId?'<div class="info-row"><span class="info-label">Lumina ID:</span> <span class="info-value">'+info.luminaId+'</span></div>':'')
+(info.pnr||info.luminaId?'<div class="info-divider"></div>':'')
+(info.traveller?'<div class="info-row"><span class="info-label">Traveller:</span> <span class="info-value">'+info.traveller+'</span></div>':'')
+(info.company?'<div class="info-row"><span class="info-label">Company:</span> <span class="info-value">'+info.company+'</span></div>':'')
+(info.booker?'<div class="info-row"><span class="info-label">Booker:</span> <span class="info-value">'+info.booker+'</span></div>':'')
+approvalHTML
+'</div>';
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

let ticketInfoHTML='';
if(info.hasEticket){
ticketInfoHTML='<div class="ticket-info-container">'
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

return '<div class="menu-header">'
+'<button class="collapse-btn" title="Collapse">▼</button>'
+'<span class="menu-header-title">CT SABRE SHORTCUTS</span>'
+'<div class="close-btn">×</div>'
+'</div>'
+'<div class="menu-content">'
+bookingInfoHTML
+copyRowHTML
+contactSubmenuHTML
+ticketInfoHTML
+notesHTML
+'<div class="button-row">'
+'<a href="#" class="menu-item menu-item-half" data-action="viewSerko">View in Serko</a>'
+'<a href="#" class="menu-item menu-item-half" data-action="masquerade">View in YourCT</a>'
+'</div>'
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

const observer=new MutationObserver(function(mutations){
const newInfo=extractBookingInfo();
if(newInfo.pnr&&newInfo.pnr!==lastKnownPNR){
console.log('PNR changed from',lastKnownPNR,'to',newInfo.pnr);
lastKnownPNR=newInfo.pnr;
updateMenu();
}
if(newInfo.hasEticket!==currentBookingInfo.hasEticket){
updateMenu();
}
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
style.textContent='#sabreShortcutsMenu{position:fixed;bottom:20px;right:20px;width:280px;background:linear-gradient(135deg,#ff2e5f 0%,#ff6b9d 100%);border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.3);padding:0;z-index:999999;font-family:Aptos,Arial,sans-serif;max-height:90vh;cursor:move}'
+'.menu-header{color:white;font-size:10px;font-weight:bold;text-align:center;padding:12px;border-bottom:1px solid rgba(255,255,255,0.3);display:flex;justify-content:space-between;align-items:center;cursor:move;user-select:none;position:relative}'
+'.menu-header-title{flex:1;text-align:center}'
+'.collapse-btn{background:none;border:none;color:white;font-size:14px;cursor:pointer;padding:0;width:20px;height:20px;display:flex;align-items:center;justify-content:center;line-height:1}'
+'.collapse-btn:hover{opacity:0.8}'
+'.menu-content{padding:12px}'
+'.booking-info{background:rgba(255,255,255,0.95);border-radius:8px;padding:10px;margin-bottom:10px;font-size:10px;position:relative}'
+'.booking-info-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}'
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

// Smart paste detection for refund page
if(window.location.href.includes('auoasisservices.au.fcl.internal/OasisWeb/RefundApplication/Create')){
document.addEventListener('paste',function(e){
const pastedText=e.clipboardData.getData('text');
if(pastedText.startsWith('##SABRE_REFUND##')){
e.preventDefault();
const lines=pastedText.split('\n');
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
}
});
}

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

function attachEventListeners(){
var isDragging=false,currentX,currentY,initialX,initialY,xOffset=0,yOffset=0;
var menuElement=document.getElementById('sabreShortcutsMenu');

menuElement.addEventListener('mousedown',function(e){
if(e.target.classList.contains('close-btn')||e.target.classList.contains('collapse-btn')||e.target.classList.contains('menu-item')||e.target.classList.contains('copy-btn')||e.target.classList.contains('copy-row-btn')||e.target.classList.contains('ticket-copy-btn')||e.target.classList.contains('ticket-action-btn'))return;
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

async function copyBookingInfoRich(){
let htmlText='<div>';
if(currentBookingInfo.luminaId)htmlText+='<p><strong>Booking #:</strong> '+currentBookingInfo.luminaId+'</p>';
if(currentBookingInfo.pnr)htmlText+='<p><strong>GDS Reference:</strong> '+currentBookingInfo.pnr+'</p>';
if(currentBookingInfo.traveller)htmlText+='<p><strong>Traveller:</strong> '+currentBookingInfo.traveller+'</p>';
htmlText+='</div>';

let plainText='';
if(currentBookingInfo.luminaId)plainText+='Booking #: '+currentBookingInfo.luminaId+'\n';
if(currentBookingInfo.pnr)plainText+='GDS Reference: '+currentBookingInfo.pnr+'\n';
if(currentBookingInfo.traveller)plainText+='Traveller: '+currentBookingInfo.traveller+'\n';

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
htmlText+='<p><strong>PNR:</strong> '+currentBookingInfo.ticketInfo.pnr+'</p>';
htmlText+='</div>';

let plainText='';
plainText+='Ticket Number: '+currentBookingInfo.ticketInfo.ticketNo+'\n';
plainText+='Passenger Name: '+currentBookingInfo.ticketInfo.paxName+'\n';
plainText+='PNR: '+currentBookingInfo.ticketInfo.pnr+'\n';

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

menuElement.querySelectorAll('.copy-row-btn, .menu-item, .ticket-copy-btn, .ticket-action-btn').forEach(function(item){
item.addEventListener('click',function(e){
e.preventDefault();
var action=this.getAttribute('data-action');

if(action==='toggleContact'){
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
if(currentBookingInfo.ticketInfo.pnr){
var temp=document.createElement('textarea');
temp.value=currentBookingInfo.ticketInfo.pnr;
document.body.appendChild(temp);
temp.select();
document.execCommand('copy');
document.body.removeChild(temp);
}
}else if(action==='copyAllTicket'){
copyAllTicketInfo();
}else if(action==='refundTicket'){
var refundData='##SABRE_REFUND##\nTICKET: '+currentBookingInfo.ticketInfo.ticketNo+'\nNAME: '+currentBookingInfo.ticketInfo.paxName+'\nPNR: '+currentBookingInfo.ticketInfo.pnr;
var temp=document.createElement('textarea');
temp.value=refundData;
document.body.appendChild(temp);
temp.select();
document.execCommand('copy');
document.body.removeChild(temp);
window.open('https://auoasisservices.au.fcl.internal/OasisWeb/RefundApplication/Create','_blank');
}else if(action==='toggleNotes'){
// Handled above
}else if(action==='copyPNR'){
if(currentBookingInfo.pnr){
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
