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
// Auto-select airline from designator (first 3 digits of ticket)
if(data.ticketNo){
var rawTkt=data.ticketNo.replace(/[^0-9]/g,'');
var desig=rawTkt.slice(0,3);
// Map: designator (zero-padded to 3 digits) -> option value
var desigMap={
'001':'AA','012':'NW','014':'AC','016':'UA','018':'HO','019':'9R',
'021':'V3','025':'RU','027':'AS','028':'VY','031':'PW','035':'4C',
'037':'US','038':'TQ','040':'LK','041':'JQ','042':'RG','044':'AR',
'045':'LA','047':'TP','048':'CY','050':'OA','053':'EI','054':'2D',
'055':'AZ','057':'AF','058':'IC','061':'HM','063':'SB','064':'OK',
'065':'SV','066':'8Q','068':'TM','071':'ET','072':'GF','074':'KL',
'075':'IB','076':'ME','077':'MS','078':'K2','079':'PR','080':'LO',
'081':'QF','082':'SN','083':'SA','086':'NZ','090':'IT','096':'IR',
'098':'AI','100':'EN','101':'EN','102':'2L','103':'D2','104':'EW',
'105':'AY','106':'BW','108':'FI','109':'UR','111':'UP','113':'QN',
'114':'LY','115':'JU','117':'SK','118':'DT','120':'JS','123':'ON',
'124':'AH','125':'BA','126':'GA','127':'G3','128':'UO','129':'MP',
'131':'JL','132':'MX','133':'LR','134':'AV','135':'VT','136':'CU',
'138':'ZN','139':'AM','140':'LI','141':'FZ','142':'KF','145':'UC',
'146':'XK','147':'AT','148':'LN','149':'LG','150':'UG','152':'VH',
'155':'ES','157':'QR','159':'LE','160':'CX','161':'MN','162':'OL',
'163':'A5','165':'JP','166':'FP','167':'QM','168':'UM','169':'HR',
'170':'GE','173':'HA','176':'EK','178':'OR','180':'KE','182':'MA',
'184':'4B','185':'GN','186':'SW','188':'K6','190':'TY','191':'IG',
'192':'PY','193':'IE','195':'FV','197':'TC','199':'TU','200':'SD',
'201':'JM','202':'TA','203':'5J','205':'NH','211':'2P','214':'PK',
'217':'TG','218':'NF','219':'YN','220':'LH','225':'5Z','226':'2J',
'228':'UK','229':'KU','230':'CM','231':'NG','232':'MH','235':'TK',
'238':'IZ','239':'MK','244':'TN','245':'7F','246':'ST','247':'O6',
'248':'6I','250':'HY','255':'FG','257':'OS','258':'MD','260':'FJ',
'261':'I5','262':'U6','263':'VE','264':'JH','266':'LT','269':'EQ',
'275':'GP','276':'TF','277':'XF','279':'B6','281':'RO','283':'HB',
'285':'RA','286':'4N','289':'OM','291':'R2','293':'DQ','294':'T7',
'295':'WM','297':'CI','298':'UT','299':'DR','302':'OO','303':'ZW',
'304':'C2','306':'9K','308':'V0','310':'SL','312':'6E','314':'K7',
'316':'5N','321':'9J','323':'QQ','324':'SC','325':'NP','328':'DY',
'330':'RF','331':'S4','334':'FN','337':'SY','339':'KS','342':'YQ',
'343':'VP','347':'WP','348':'KV','353':'NU','361':'QT','362':'7R',
'363':'RP','365':'W2','367':'IN','372':'L4','375':'3K','376':'BB',
'378':'KX','379':'ZG','384':'RQ','386':'B5','390':'A3','391':'2M',
'394':'AW','399':'QB','400':'4O','402':'J0','403':'PO','405':'FR',
'409':'YM','411':'5U','412':'VI','415':'MW','420':'GI','421':'S7',
'422':'F9','425':'DP','427':'TX','429':'TT','430':'9E','432':'NM',
'433':'P6','436':'KJ','437':'RM','439':'ZI','441':'FC','443':'P0',
'448':'VL','449':'3M','450':'9B','451':'PD','453':'YX','455':'NA',
'457':'Z2','459':'WB','461':'7W','462':'XL','464':'Z8','465':'KC',
'466':'3H','467':'T3','470':'K9','471':'VC','473':'SE','474':'NT',
'478':'OW','479':'ZH','481':'QX','483':'HF','486':'J9','487':'NK',
'492':'XW','495':'L6','496':'SM','501':'V2','502':'7J','503':'CD',
'504':'9X','510':'JF','512':'RJ','513':'IW','515':'SF','518':'5T',
'521':'ZQ','522':'LF','525':'B7','526':'WN','529':'3W','533':'YV',
'537':'W5','540':'TO','541':'Z4','542':'T5','544':'LP','546':'8U',
'547':'2K','550':'BL','555':'SU','557':'ZC','558':'5O','559':'K8',
'564':'XQ','566':'PS','568':'LW','570':'HT','572':'9U','577':'AD',
'581':'GM','583':'HQ','584':'X4','586':'RW','590':'W6','593':'XY',
'595':'HH','597':'SI','598':'HZ','599':'8M','601':'J7','602':'P9',
'603':'UL','604':'UY','605':'H2','606':'A9','607':'EY','608':'XR',
'609':'H8','610':'2A','613':'JB','615':'QY','616':'6A','618':'SQ',
'621':'MZ','622':'MO','623':'FB','624':'PC','626':'CG','627':'QV',
'628':'B2','629':'MI','631':'GL','632':'JV','633':'GQ','634':'9M',
'635':'IY','636':'BP','637':'B8','638':'PJ','639':'LV','642':'5D',
'643':'KM','649':'TS','653':'JY','656':'PX','657':'BT','663':'PE',
'664':'YC','665':'UB','666':'FU','667':'PE','668':'TR','669':'MJ',
'670':'GD','672':'BI','675':'NX','680':'JK','681':'T4','682':'LM',
'683':'CL','685':'NI','689':'WX','690':'LJ','692':'PZ','693':'4Y',
'694':'YW','695':'BR','696':'VR','701':'WF','702':'VB','705':'S2',
'706':'KQ','707':'ZJ','708':'JO','709':'6L','712':'V7','717':'R7',
'722':'TW','723':'QA','724':'LX','725':'W3','730':'GT','731':'MF',
'736':'GJ','737':'SP','738':'VN','739':'7V','740':'NL','741':'4Q',
'743':'M4','747':'YO','749':'4Z','751':'UW','752':'JZ','753':'LC',
'754':'BY','755':'GZ','758':'R8','759':'IH','760':'UU','761':'QU',
'763':'M5','769':'H9','770':'EO','771':'J2','772':'SX','774':'FM',
'778':'CW','781':'MU','783':'E9','784':'CZ','786':'B3','787':'KB',
'789':'9N','794':'6A','795':'VA','796':'BJ','797':'QS','801':'J8',
'803':'AE','806':'7C','807':'AK','809':'RE','810':'M6','814':'9F',
'815':'EP','816':'OD','818':'6H','819':'MY','820':'RS','823':'NN',
'825':'2W','826':'GS','828':'UF','829':'PG','831':'OU','836':'NS',
'838':'WS','841':'C5','843':'D7','845':'P5','847':'PN','848':'UD',
'849':'R3','850':'3C','851':'HX','853':'QP','856':'9H','859':'8L',
'862':'EV','863':'VZ','864':'ZS','870':'8B','876':'3U','877':'N3',
'878':'OQ','880':'HU','881':'DE','882':'NY','883':'BU','886':'OH',
'887':'SH','893':'DZ','894':'QE','898':'JD','899':'ZL','900':'FD',
'902':'AQ','903':'4D','904':'MV','905':'8P','910':'WY','911':'U7',
'914':'5H','916':'JE','918':'FY','922':'7G','923':'SS','924':'GR',
'926':'QH','927':'WJ','928':'UZ','929':'N6','930':'OB','932':'VS',
'935':'TL','937':'QJ','938':'ID','942':'VW','943':'VU','945':'WK',
'947':'L3','948':'R4','949':'LS','950':'XS','957':'JJ','960':'OV',
'961':'LQ','966':'U9','967':'PB','971':'B4','972':'LU','974':'ZB',
'975':'QZ','978':'VJ','979':'HV','980':'CE','982':'BX','983':'QK',
'984':'VX','988':'OZ','990':'JT','991':'D3','993':'BH','994':'ZE',
'995':'JA','996':'UX','997':'BG','999':'CA'
};
var airlineCode=desigMap[desig];
if(airlineCode){
var airlineDropdown=document.querySelector('select[id*="SelectedAirline"]');
if(airlineDropdown){
// Find option by text content matching airline code
var opts=airlineDropdown.querySelectorAll('option');
for(var i=0;i<opts.length;i++){
if(opts[i].text.trim()===airlineCode){
airlineDropdown.value=opts[i].value;
airlineDropdown.dispatchEvent(new Event('change',{bubbles:true}));
break;
}
}
}
}
}
this.textContent='✓ PASTED!';this.style.background='#28a745';
setTimeout(function(){document.getElementById('sabrePasteButton').remove();},2000);
}else{alert('No refund data found in clipboard. Please click REFUND in Sabre first.');}
}catch(err){alert('Could not read clipboard. Please ensure you clicked REFUND in Sabre first.');}
});
return;
}

  if(window.location.href.includes('booking.jetstar.com')){
  var jqBtn=document.createElement('div');
  jqBtn.id='jqPasteButton';
  jqBtn.innerHTML='<button id="pasteToJQBtn">✈️ PASTE TO JETSTAR</button>';
  jqBtn.style.cssText='position:fixed;top:20px;right:20px;z-index:999999;';
  document.body.appendChild(jqBtn);
  var jqBtnStyle=document.createElement('style');
  jqBtnStyle.textContent='#pasteToJQBtn{background:linear-gradient(135deg,#ff6600 0%,#ff9944 100%);color:white;border:none;padding:15px 25px;font-size:14px;font-weight:bold;border-radius:8px;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.3);font-family:Aptos,Arial,sans-serif;transition:transform 0.2s ease;}#pasteToJQBtn:hover{transform:scale(1.05);}';
  document.head.appendChild(jqBtnStyle);
  document.getElementById('pasteToJQBtn').addEventListener('click',async function(){
    try{
      var clip=await navigator.clipboard.readText();
      if(!clip.startsWith('##JQ_FILL##')){alert('No JQ data found. Click "Copy to JQ Portal" in Sabre first.');return;}
      var jqData={};
      clip.split('\n').forEach(function(l){
        if(l.includes('TITLE:'))jqData.title=l.split('TITLE:')[1].trim();
        if(l.includes('FIRST:'))jqData.first=l.split('FIRST:')[1].trim();
        if(l.includes('SURNAME:'))jqData.surname=l.split('SURNAME:')[1].trim();
        if(l.includes('EMAIL:'))jqData.email=l.split('EMAIL:')[1].trim();
        if(l.includes('PHONE:'))jqData.phone=l.split('PHONE:')[1].trim();
      });
      function setVal(el,val){el.value=val;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
      var titleSel=document.querySelector('select#passenger_title_0');
      if(titleSel)setVal(titleSel,jqData.title);
      var paxFirst=document.querySelector('input#passenger_Firstname_0');
      if(paxFirst)setVal(paxFirst,jqData.first);
      var paxLast=document.querySelector('input#passenger_Lastname_0');
      if(paxLast)setVal(paxLast,jqData.surname);
      var conFirst=document.querySelector('input#js-contact_Name_First');
      if(conFirst)setVal(conFirst,jqData.first);
      var conLast=document.querySelector('input#js-contact_Name_Last');
      if(conLast)setVal(conLast,jqData.surname);
      var emailEl=document.querySelector('input#contact_Email_Address');
      if(emailEl)setVal(emailEl,jqData.email);
      var phoneEl=document.querySelector('input#contact_Phone_Number');
      if(phoneEl)setVal(phoneEl,jqData.phone);
      document.getElementById('jqPasteButton').querySelector('button').textContent='✓ PASTED!';
      document.getElementById('jqPasteButton').querySelector('button').style.background='#28a745';
      setTimeout(function(){var b=document.getElementById('jqPasteButton');if(b)b.remove();},2000);
    }catch(err){alert('Could not read clipboard: '+err.message);}
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
    s.src='https://cdn.jsdelivr.net/gh/jordan-mcguire/CT-Sabre-Shortcuts@d4855b32d94ca82d03601b6d72ec19a7f17e4338/trip-proposalv4.js?v='+Date.now();
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
['ctCostCentreBar','ctLuminaBookingBar','ctLuminaItinBar'].forEach(function(id){
var el=document.getElementById(id);if(el)el.remove();
});
['ctCopyPopup','ctViewPopup','ctActionsPopup','ctTicketPanel','ctShortcutsPopup'].forEach(function(id){
var el=document.getElementById(id);
if(el){el.style.opacity='0';el.style.transform='translateY(6px)';setTimeout(function(){el.remove();},150);}
});
openPopup=null;
var bnr=document.getElementById('ctNotesBanner');if(bnr)bnr.style.display='';
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
method:'',methodLine:0,approved:false,notes:[],email:'',phone:'',profileId:'',
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
var pgm=bodyText.match(/L¥PROFILEGATE-(\d+)/);if(pgm)info.profileId=pgm[1].trim();
var bm=bodyText.match(/L¥BKG MADE-([^\/\n]+)/);if(bm)info.booker=bm[1].trim();
var mm=bodyText.match(/\s*(\d+)\.L¥METHOD-([WMET])/);if(mm){info.methodLine=parseInt(mm[1]);info.method=mm[2];}

if(bodyText.indexOf('B¥BOOKING REJECTED')>-1)info.approved='rejected';
else if(bodyText.indexOf('A¥BOOKING STATUS CHANGED TO PENDING CANCELLATION')>-1)info.approved='cancellation';
else if(bodyText.indexOf('B¥BOOKING AUTHORISED')>-1)info.approved=true;
else info.approved=false;

var noteMatches=bodyText.matchAll(/\d+\.H-N-([^\n]+)/g);
  var noteLines=[];
for(var nm of noteMatches){
var nt=nm[1].trim();
if(!/NDC AIRLINE CANCELLED FLIGHTS/i.test(nt)&&!/SPRQ SPECIAL REQUEST ADDED/i.test(nt))noteLines.push(nt);
}
if(noteLines.length>0)info.notes=[noteLines.join(' ')];

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
+'<span class="ct-banner-title">Notes to Agent</span>'
  +'<span class="ct-banner-toggle">'+(notesExpanded?'▾':'▸')+'</span>'
+'</div>'
+(notesExpanded
?'<div class="ct-banner-notes">'
+'<div class="ct-banner-note-line">'+notes[0]+'</div>'
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
h+='<button class="ct-popup-btn ct-jq-btn" data-action="copyToJQ">✈️ Copy to JQ Portal</button>';
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
h+='<button class="ct-popup-btn" data-action="changeLuminaBooking">🔢 Change Lumina Booking</button>';
h+='<button class="ct-popup-btn" data-action="saveLuminaItinerary">📄 Save Lumina Itinerary (PDF)</button>';
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
h+='<div style="display:flex;gap:4px;margin:2px 0;">'
+'<button class="ct-popup-btn ct-ticket-item" style="flex:1;" data-ticket-no="'+ticket.ticketNo+'" data-type="'+ticket.type+'">'+ticket.ticketNo+labels+'</button>'
+'<button class="ct-popup-btn ct-tr-list-btn" style="flex:0 0 auto;font-size:9px;padding:7px 6px;" data-action="openTicketRegister" data-ticket-no="'+ticket.ticketNo+'">🔍</button>'
+'</div>';
});
h+='<div class="ct-ticket-note">NDC tickets require graphical view in Ticketing tab.</div>';
}else if(currentTicketView==='eticket'){
var dispTkt=currentBookingInfo.ticketInfo.ticketNo||(cachedTicketContext&&cachedTicketContext.ticketNo)||'';
h+='<div class="ct-popup-label">🎫 '+(dispTkt||'TICKET ACTIONS')+'</div>';
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
var bnr=document.getElementById('ctNotesBanner');if(bnr)bnr.style.display='none';
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
var overrideTicket=this.getAttribute('data-ticket-no');
if(overrideTicket&&this.getAttribute('data-action')==='openTicketRegister'){
cachedTicketContext={ticketNo:overrideTicket,pnr:cachedPNR,traveler:cachedTraveler};
}
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
case 'saveLuminaItinerary':
  closeAllPopups();
  var bid=currentBookingInfo.luminaId;
  var pid=currentBookingInfo.profileId;
  if(!bid||!pid){showToast('⚠️ N/A - manual print required');break;}
  window.open('https://corp-portal.au.fcl.internal/portal/generateItinerary.srvlt?id='+bid+'&type=.PDF&preview=false&airFareDisplay=false&costingsDisplayFlag=false&feesDisplayFlag=false&hideOtherCostings=true&createIndividualItinerary=false&profileUnique='+pid,'_blank');
  break;
case 'changeLuminaBooking':
    var ccBar2=document.getElementById('ctCostCentreBar');if(ccBar2)ccBar2.remove();
  var lbMatch=document.body.innerText.match(/(\d+)\.\s*L¥LUMINA ID-(\d+)/);
  var lbLine=lbMatch?lbMatch[1]:'';
  var lbCurrent=lbMatch?lbMatch[2].trim():'';
  var lbExisting=document.getElementById('ctLuminaBookingBar');
  if(lbExisting){lbExisting.remove();break;}
  var lbTb=document.getElementById('ctToolbar');
  if(!lbTb)break;
  var lbBar=document.createElement('div');
  lbBar.id='ctLuminaBookingBar';
  var lbRect=lbTb.getBoundingClientRect();
  lbBar.style.cssText='position:fixed;z-index:1000005;'
    +'right:'+(window.innerWidth-lbRect.right)+'px;'
    +'bottom:'+(window.innerHeight-lbRect.top+8)+'px;'
    +'background:white;border:1.5px solid #f0d0d8;border-radius:10px;'
    +'box-shadow:0 4px 20px rgba(0,0,0,0.18);'
    +'padding:10px 12px;font-family:Aptos,Arial,sans-serif;width:300px;'
    +'animation:ctPopIn 0.2s ease-out;';
  lbBar.innerHTML='<div style="font-size:8px;font-weight:800;color:#ff2e5f;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px;">🔢 CHANGE LUMINA BOOKING'+(lbLine?' — Line '+lbLine:'')+'</div>'
    +'<input id="ctLBInput" type="text" value="'+lbCurrent+'" placeholder="Lumina Booking ID" '
    +'style="width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #f0d0d8;border-radius:5px;'
    +'font-size:11px;font-family:Aptos,Arial,sans-serif;margin-bottom:7px;outline:none;" />'
    +'<div style="display:flex;gap:6px;">'
    +'<button id="ctLBSubmit" style="flex:1;background:#ff2e5f;color:white;border:none;border-radius:5px;'
    +'padding:6px;font-size:11px;font-weight:700;cursor:pointer;font-family:Aptos,Arial,sans-serif;">Submit</button>'
    +'<button id="ctLBCancel" style="background:#f5f5f5;color:#555;border:1px solid #ddd;border-radius:5px;'
    +'padding:6px 10px;font-size:11px;cursor:pointer;font-family:Aptos,Arial,sans-serif;">Cancel</button>'
    +'</div>'
    +(!lbMatch?'<div style="font-size:9px;color:#e65100;margin-top:6px;">⚠️ No existing Lumina ID line found — will add as new remark</div>':'');
  document.body.appendChild(lbBar);
  var lbInput=document.getElementById('ctLBInput');
  lbInput.focus();lbInput.select();
  document.getElementById('ctLBCancel').addEventListener('click',function(){lbBar.remove();});
  document.getElementById('ctLBSubmit').addEventListener('click',function(){
    var newVal=document.getElementById('ctLBInput').value.trim();
    if(!newVal){showToast('⚠️ Lumina ID cannot be empty');return;}
    var cmd=lbLine?('5'+lbLine+'¤L¥LUMINA ID-'+newVal):('5L¥LUMINA ID-'+newVal);
    executeSabreCommand(cmd,null,function(){showToast('✅ Lumina ID updated — save PNR');});
    lbBar.remove();
  });
  lbInput.addEventListener('keydown',function(e){
    if(e.key==='Enter')document.getElementById('ctLBSubmit').click();
    if(e.key==='Escape')lbBar.remove();
  });
  break;
case 'changeCostCentre':
    var lbBar2=document.getElementById('ctLuminaBookingBar');if(lbBar2)lbBar2.remove();
var ccMatch=document.body.innerText.match(/(\d+)\.\s*L¥CC-(?!NAME|CARD|FOP)([^\n]+)/);
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
  window.open(regUrl,'_blank','width=1200,height=800,scrollbars=yes,resizable=yes');
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
case 'copyToJQ':
  var raw=currentBookingInfo.traveller||cachedTraveler||'';
  var jqM=raw.match(/^([^\/]+)\/(.+)\s+(MR|MRS|MS|MISS|DR|CAPT|PROF|REV)$/i);
  if(!jqM){showToast('⚠️ Could not parse name/title from PNR');break;}
  var jqSurname=jqM[1].trim();
  var jqFirst=jqM[2].trim();
  var jqTitle=jqM[3].toUpperCase();
  var jqPhone=currentBookingInfo.phone||'';
  var jqPhoneClean=jqPhone.replace(/\D/g,'').slice(-9);
  var jqEmail=currentBookingInfo.email||'';
  var jqPayload='##JQ_FILL##\nTITLE:'+jqTitle+'\nFIRST:'+jqFirst+'\nSURNAME:'+jqSurname+'\nEMAIL:'+jqEmail+'\nPHONE:'+jqPhoneClean;
  navigator.clipboard.writeText(jqPayload).then(function(){showToast('✓ Copied for JQ Portal');});
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
currentTicketView='eticket';
updateAll();
setTimeout(function(){
var btn=document.getElementById('ctBtnTicket');
if(btn)showPopup('ctTicketPanel',buildTicketPanelHTML(currentBookingInfo),btn);
},80);
return;
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
cachedTraveler='';cachedPNR='';
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
// Cheap pre-check: only run full extraction if response area text has changed
var obsEl=document.querySelector('.dn-response-line:last-of-type .dn-line-group')||document.querySelector('.dn-line-group');
var quickSnap=obsEl?obsEl.textContent.slice(0,120):'';
if(quickSnap&&quickSnap===window.__ctLastSnap&&currentTicketView===window.__ctLastView){return{};}
window.__ctLastSnap=quickSnap;window.__ctLastView=currentTicketView;
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
window.__ctObserver.observe(obsTarget,{childList:true,subtree:true});

// Heartbeat — safety net only; observer handles fast changes
window.__ctHeartbeat=setInterval(function(){
if(!document.getElementById('ctToolbar')&&!document.getElementById('ctToolbarIcon'))return;
if(window.__ctState.pendingCommandPoll)return;
window.__ctTrigger();
},1500);

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
+'.ct-tb-btn{border-bottom:3px solid transparent;}'
+'.ct-btn-copy{background:#fff5f7;color:#cc2255;}'
+'.ct-btn-copy:hover{background:#ffe0ea;color:#ff2e5f;border-bottom-color:#ff2e5f;}'
+'.ct-btn-ticket{background:#fff5f7;color:#cc2255;}'
+'.ct-btn-ticket:hover{background:#ffe0ea;color:#ff2e5f;border-bottom-color:#ff2e5f;}'
+'.ct-btn-view{background:#fff5f7;color:#cc2255;}'
+'.ct-btn-view:hover{background:#ffe0ea;color:#ff2e5f;border-bottom-color:#ff2e5f;}'
+'.ct-btn-actions{background:#fff5f7;color:#cc2255;position:relative;}'
+'.ct-btn-actions:hover{background:#ffe0ea;color:#ff2e5f;border-bottom-color:#ff2e5f;}'
+'.ct-btn-shortcuts{background:#fafafa;color:#bbb;font-size:14px;padding:0 10px;}'
+'.ct-btn-shortcuts:hover{background:#fff0f4;color:#ff2e5f;}'
+'.ct-btn-collapse{background:#fafafa;color:#bbb;font-size:18px;padding:0 10px;}'
+'.ct-btn-collapse:hover{background:#fff0f4;color:#ff2e5f;}'


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
+'background:#fff5f7;border:1px solid #f0d0d8;border-left:3px solid #ff2e5f;'
+'border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.12);'
+'font-family:Aptos,Arial,sans-serif;cursor:pointer;overflow:hidden;'
+'animation:ctPopIn 0.2s ease-out;}'
+'.ct-banner-header{display:flex;align-items:center;gap:8px;padding:9px 12px;background:#fff5f7;}'
+'.ct-banner-icon{font-size:14px;flex-shrink:0;color:#ff2e5f;}'
+'.ct-banner-title{font-size:11px;font-weight:700;color:#cc1a45;flex:1;}'
+'.ct-banner-toggle{font-size:12px;color:#cc1a45;flex-shrink:0;}'
+'.ct-banner-notes{padding:8px 12px 10px;border-top:1px solid #f0d0d8;}'
+'.ct-banner-note-line{font-size:10.5px;line-height:1.6;color:#444;padding:3px 0;word-break:break-word;white-space:pre-wrap;}'

// Popup
+'.ct-popup{position:fixed;z-index:1000001;width:230px;background:white;'
+'border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,0.2);border:1.5px solid #f0d0d8;'
+'padding:8px;opacity:0;transform:translateY(6px);transition:opacity 0.15s ease,transform 0.15s ease;}'
+'.ct-popup#ctActionsPopup{width:290px;}'
+'.ct-popup-label{font-size:8px;font-weight:800;color:#ff2e5f;text-transform:uppercase;letter-spacing:0.6px;padding:5px 6px 3px;}'
+'.ct-popup-btn{display:block;width:100%;text-align:left;padding:7px 10px;margin:1px 0;'
+'background:transparent;color:#333;border:none;border-radius:7px;'
+'font-size:10.5px;font-weight:500;cursor:pointer;font-family:Aptos,Arial,sans-serif;'
+'transition:background 0.1s,color 0.1s;}'
+'.ct-popup-btn:hover{background:#fff0f4;color:#ff2e5f;}'
+'.ct-hl-btn{background:#fff5f7;color:#cc2255;font-weight:600;}'
+'.ct-hl-btn:hover{background:#ffe0ea;color:#ff2e5f;}'
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
+'.ct-jq-btn{background:#ff6600 !important;color:#fff !important;border-color:#ff6600 !important;}'
+'.ct-jq-btn:hover{background:#cc5200 !important;}'
  +'.ct-tr-list-btn{flex:0 0 auto !important;width:auto !important;}'
  ;

  
document.head.appendChild(style);

// ── Mount ─────────────────────────────────────────────────────────────────────
var toolbar=document.createElement('div');
toolbar.id='ctToolbar';
toolbar.innerHTML=buildToolbarHTML(currentBookingInfo);
document.body.appendChild(toolbar);
  (function(){
var areaOut=document.querySelector('.area-out');
if(areaOut){
var r=areaOut.getBoundingClientRect();
toolbar.style.right=(window.innerWidth-r.right+16)+'px';
toolbar.style.bottom=(window.innerHeight-r.bottom+16)+'px';
}
})();
attachToolbarHandlers();
syncNotesBanner(currentBookingInfo);
setTimeout(repositionBanner,50);

})();
