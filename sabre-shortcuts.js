(function(){
if(document.getElementById('sabreShortcutsMenu')){
document.getElementById('sabreShortcutsMenu').remove();
return;
}

function extractBookingInfo(){
const bodyText=document.body.innerText;
const lines=document.querySelectorAll('.dn-line.text-line');
let info={pnr:'',traveller:'',company:'',luminaId:'',booker:'',approved:false,notes:[],email:'',phone:''};

for(let i=0;i<lines.length;i++){
const text=lines[i].innerText.trim();
if(text.length===6&&/^[A-Z]{6}$/i.test(text)){
info.pnr=text;
break;
}
}

const travellerMatch=bodyText.match(/1\.1(.+?)(?=\n|$)/);
if(travellerMatch)info.traveller=travellerMatch[1].trim();

const companyMatch=bodyText.match(/L¥COMPANY ID-([^\s\n]+)/);
if(companyMatch)info.company=companyMatch[1].trim();

const luminaMatch=bodyText.match(/L¥LUMINA ID-(\d+)/);
if(luminaMatch)info.luminaId=luminaMatch[1].trim();

const bookerMatch=bodyText.match(/L¥BKG MADE-([^\/\n]+)/);
if(bookerMatch)info.booker=bookerMatch[1].trim();

if(bodyText.indexOf('B¥BOOKING AUTHORISED')>-1)info.approved=true;

const noteMatches=bodyText.matchAll(/\d+\.H-N-(.+?)(?=\n|$)/g);
for(const match of noteMatches)info.notes.push(match[1].trim());

const emailMatch=bodyText.match(/APE-([^\s\n]+)/);
if(emailMatch){
info.email=emailMatch[1].replace(/¥/g,'@').replace(/§/g,'.').trim();
}

const phoneMatch=bodyText.match(/APM-([^\s\n]+)/);
if(phoneMatch){
info.phone=phoneMatch[1].replace(/-/g,' ').trim();
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
+'<div class="booking-info-title">📋 Current Booking <span class="copy-hover-btn" title="Copy booking info">📋</span></div>'
+(info.pnr?'<div class="info-row"><span class="info-label">Sabre PNR:</span> <span class="info-value">'+info.pnr+'</span></div>':'')
+(info.luminaId?'<div class="info-row"><span class="info-label">Lumina ID:</span> <span class="info-value">'+info.luminaId+'</span></div>':'')
+(info.pnr||info.luminaId?'<div class="info-divider"></div>':'')
+(info.traveller?'<div class="info-row"><span class="info-label">Traveller:</span> <span class="info-value">'+info.traveller+'</span></div>':'')
+(info.company?'<div class="info-row"><span class="info-label">Company:</span> <span class="info-value">'+info.company+'</span></div>':'')
+(info.booker?'<div class="info-row"><span class="info-label">Booker:</span> <span class="info-value">'+info.booker+'</span></div>':'')
+approvalHTML
+'</div>';
}

let notesButtonHTML='';
if(info.notes.length>0){
notesButtonHTML='<div class="notes-container"><a href="#" class="menu-item menu-item-alert" data-action="viewNotes">⚠️ Notes to Agent Found</a><div class="notes-dropdown" style="display:none;"><div class="notes-dropdown-content">'+info.notes.join('<br>')+'</div></div></div>';
}

let travellerDetailsHTML='';
if(info.email||info.phone){
travellerDetailsHTML='<a href="#" class="menu-item" data-action="copyTravellerDetails">Copy Traveller Details</a>';
}

return '<div class="menu-header-spacer"></div>'
+bookingInfoHTML
+travellerDetailsHTML
+notesButtonHTML
+'<div class="button-row">'
+'<a href="#" class="menu-item menu-item-half" data-action="copyPNR">Copy PNR</a>'
+(info.luminaId?'<a href="#" class="menu-item menu-item-half" data-action="copyLuminaId">Copy Lumina ID</a>':'')
+'</div>'
+'<div class="button-row">'
+'<a href="#" class="menu-item menu-item-half" data-action="viewSerko">View in Serko</a>'
+'<a href="#" class="menu-item menu-item-half" data-action="masquerade">View in YourCT</a>'
+'</div>'
+'<a href="#" class="menu-item" data-action="tripProposal">Trip Proposal Tidy</a>'
+'<div class="close-btn">×</div>';
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
});

const responseArea=document.querySelector('.area-out');
if(responseArea){
observer.observe(responseArea,{childList:true,subtree:true,characterData:true});
}

var menu=document.createElement('div');
menu.id='sabreShortcutsMenu';
menu.innerHTML=buildMenuHTML(currentBookingInfo);

var style=document.createElement('style');
style.textContent='#sabreShortcutsMenu{position:fixed;top:20px;right:20px;width:280px;background:#00434e;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.3);padding:12px;z-index:999999;font-family:Arial,sans-serif;max-height:90vh;overflow-y:auto;cursor:move}'
+'.menu-header-spacer{height:20px;position:relative}'
+'.booking-info{background:rgba(255,255,255,0.95);border-radius:8px;padding:10px;margin-bottom:10px;font-size:10px;position:relative}'
+'.booking-info-title{font-weight:bold;color:#00434e;margin-bottom:8px;font-size:11px;text-align:center;position:relative}'
+'.copy-hover-btn{position:absolute;right:0;top:50%;transform:translateY(-50%);cursor:pointer;opacity:0;transition:opacity 0.3s;font-size:14px}'
+'.booking-info-title:hover .copy-hover-btn{opacity:1}'
+'.copy-hover-btn:hover{transform:translateY(-50%) scale(1.2)}'
+'.info-row{margin:4px 0;display:flex;justify-content:space-between;align-items:flex-start}'
+'.info-label{font-weight:600;color:#555;margin-right:8px;min-width:70px;font-size:10px}'
+'.info-value{color:#333;text-align:right;word-break:break-word;flex:1;font-size:10px}'
+'.info-divider{height:1px;background:#ddd;margin:8px 0}'
+'.approval-status{margin-top:8px;padding:6px;border-radius:5px;text-align:center;font-weight:bold;font-size:10px}'
+'.approval-status.approved{background:#d4edda;color:#155724;border:1px solid #c3e6cb}'
+'.approval-status.pending{background:#fff3cd;color:#856404;border:1px solid #ffeaa7}'
+'.menu-item{display:block;padding:8px 12px;margin:6px 0;background:rgba(255,255,255,0.95);color:#333;text-decoration:none;border-radius:5px;transition:all 0.3s ease;font-size:11px;text-align:center;font-weight:500;cursor:pointer}'
+'.menu-item:hover{background:white;transform:translateX(-3px);box-shadow:0 2px 8px rgba(0,0,0,0.2)}'
+'.menu-item-alert{background:#fff3cd;border:2px solid #ff9800;font-weight:600;animation:pulse 2s infinite;position:relative}'
+'@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.8}}'
+'.button-row{display:flex;gap:6px;margin:6px 0}'
+'.menu-item-half{flex:1;margin:0}'
+'.notes-container{position:relative}'
+'.notes-dropdown{position:absolute;top:100%;left:0;right:0;background:white;border-radius:5px;box-shadow:0 4px 12px rgba(0,0,0,0.2);z-index:10;margin-top:4px}'
+'.notes-dropdown-content{padding:12px;background:#f8f9fa;border-radius:5px;border-left:4px solid #ff9800;font-size:11px;line-height:1.5;color:#333;max-height:200px;overflow-y:auto}'
+'.close-btn{position:absolute;top:5px;right:10px;color:white;font-size:20px;cursor:pointer;line-height:20px;z-index:10}'
+'.close-btn:hover{color:#ffeb3b}';

document.head.appendChild(style);
document.body.appendChild(menu);
    function attachEventListeners(){
var isDragging=false,currentX,currentY,initialX,initialY,xOffset=0,yOffset=0;
var menuElement=document.getElementById('sabreShortcutsMenu');

menuElement.addEventListener('mousedown',function(e){
if(e.target.classList.contains('close-btn')||e.target.classList.contains('menu-item')||e.target.classList.contains('copy-hover-btn'))return;
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
closeBtn.addEventListener('click',function(){menuElement.remove();});
}

var copyHoverBtn=menuElement.querySelector('.copy-hover-btn');
if(copyHoverBtn){
copyHoverBtn.addEventListener('click',function(e){
e.stopPropagation();
copyBookingInfo();
});
}

function copyBookingInfo(){
let text='';
if(currentBookingInfo.pnr)text+='Sabre PNR: '+currentBookingInfo.pnr+'\n';
if(currentBookingInfo.traveller)text+='Traveller: '+currentBookingInfo.traveller+'\n';
if(currentBookingInfo.company)text+='Company: '+currentBookingInfo.company+'\n';
if(currentBookingInfo.luminaId)text+='Lumina ID: '+currentBookingInfo.luminaId+'\n';
if(currentBookingInfo.booker)text+='Booker: '+currentBookingInfo.booker+'\n';
if(currentBookingInfo.booker)text+='Approval Status: '+(currentBookingInfo.approved?'APPROVED':'PENDING')+'\n';
var temp=document.createElement('textarea');
temp.value=text;
document.body.appendChild(temp);
temp.select();
document.execCommand('copy');
document.body.removeChild(temp);
}

function copyTravellerDetails(){
let text='';
if(currentBookingInfo.traveller)text+='Name: '+currentBookingInfo.traveller+'\n';
if(currentBookingInfo.email)text+='Email: '+currentBookingInfo.email+'\n';
if(currentBookingInfo.phone)text+='Phone: '+currentBookingInfo.phone+'\n';
var temp=document.createElement('textarea');
temp.value=text.trim();
document.body.appendChild(temp);
temp.select();
document.execCommand('copy');
document.body.removeChild(temp);
}

var notesButton=menuElement.querySelector('[data-action="viewNotes"]');
if(notesButton){
notesButton.addEventListener('click',function(e){
e.preventDefault();
e.stopPropagation();
var dropdown=this.parentElement.querySelector('.notes-dropdown');
if(dropdown){
dropdown.style.display=dropdown.style.display==='none'?'block':'none';
}
});
}

document.addEventListener('click',function(e){
var notesDropdown=menuElement.querySelector('.notes-dropdown');
if(notesDropdown&&!e.target.closest('.notes-container')){
notesDropdown.style.display='none';
}
});

menuElement.querySelectorAll('.menu-item').forEach(function(item){
item.addEventListener('click',function(e){
e.preventDefault();
var action=this.getAttribute('data-action');

if(action==='copyTravellerDetails'){
copyTravellerDetails();
}else if(action==='viewNotes'){
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
alert('Lumina ID not found');
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
