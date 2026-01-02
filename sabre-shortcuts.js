(function() {
    if (document.getElementById('sabreShortcutsMenu')) {
        document.getElementById('sabreShortcutsMenu').remove();
        return;
    }

    function extractBookingInfo() {
        const bodyText = document.body.innerText;
        const lines = document.querySelectorAll('.dn-line.text-line');
        let info = {pnr: '', traveller: '', company: '', costCentre: '', booker: '', approved: false, notes: []};
        for (let i = 0; i < lines.length; i++) {
            const text = lines[i].innerText.trim();
            if (text.length === 6 && /^[A-Z]{6}$/i.test(text)) {info.pnr = text; break;}
        }
        const travellerMatch = bodyText.match(/1\.1([A-Z\/\s]+(?:MR|MRS|MS|MISS|DR|MSTR)?)/);
        if (travellerMatch) info.traveller = travellerMatch[1].trim();
        const companyMatch = bodyText.match(/L¥COMPANY ID-([^\s\n]+)/);
        if (companyMatch) info.company = companyMatch[1].trim();
        const costCentreMatch = bodyText.match(/L¥CC-[^\/]+\/[^\/]+\/([^\s\n]+)/);
        if (costCentreMatch) info.costCentre = costCentreMatch[1].trim();
        const bookerMatch = bodyText.match(/L¥BKG MADE-([^\/\n]+)/);
        if (bookerMatch) info.booker = bookerMatch[1].trim();
        if (bodyText.indexOf('B¥BOOKING AUTHORISED') > -1) info.approved = true;
        const noteMatches = bodyText.matchAll(/\d+\.H-N-(.+?)(?=\n|$)/g);
        for (const match of noteMatches) info.notes.push(match[1].trim());
        return info;
    }
    function buildBookingInfoHTML(bookingInfo) {
        let approvalHTML = '';
        if (bookingInfo.booker) {
            approvalHTML = bookingInfo.approved ? '<div class="approval-status approved">✓ APPROVED</div>' : '<div class="approval-status pending">⏳ PENDING</div>';
        }
        let bookingInfoHTML = '';
        if (bookingInfo.pnr || bookingInfo.traveller || bookingInfo.company) {
            bookingInfoHTML = '<div class="booking-info"><div class="booking-info-title">📋 Current Booking</div>' + 
                (bookingInfo.pnr ? '<div class="info-row"><span class="info-label">Sabre PNR:</span> <span class="info-value">' + bookingInfo.pnr + '</span></div>' : '') +
                (bookingInfo.traveller ? '<div class="info-row"><span class="info-label">Traveller:</span> <span class="info-value">' + bookingInfo.traveller + '</span></div>' : '') +
                (bookingInfo.company ? '<div class="info-row"><span class="info-label">Company:</span> <span class="info-value">' + bookingInfo.company + '</span></div>' : '') +
                (bookingInfo.costCentre ? '<div class="info-row"><span class="info-label">Cost Centre:</span> <span class="info-value">' + bookingInfo.costCentre + '</span></div>' : '') +
                (bookingInfo.booker ? '<div class="info-row"><span class="info-label">Booker:</span> <span class="info-value">' + bookingInfo.booker + '</span></div>' : '') +
                approvalHTML + '</div>';
        }
        return bookingInfoHTML;
    }

    function buildNotesButtonHTML(bookingInfo) {
        if (bookingInfo.notes.length > 0) {
            return '<a href="#" class="menu-item menu-item-alert" data-action="viewNotes">⚠️ Notes to Agent Found</a>';
        }
        return '';
    }

    function buildMenuContent(bookingInfo) {
        return '<div class="menu-header">⚡ Sabre Shortcuts</div>' + 
            buildBookingInfoHTML(bookingInfo) + 
            (bookingInfo.pnr || bookingInfo.traveller ? '<a href="#" class="menu-item" data-action="copyBookingInfo">Copy Booking Info</a>' : '') + 
            buildNotesButtonHTML(bookingInfo) +
            '<a href="#" class="menu-item" data-action="copyPNR">Copy PNR</a>' +
            '<a href="#" class="menu-item" data-action="viewSerko">View PNR in Serko</a>' +
            '<a href="#" class="menu-item" data-action="masquerade">Masquerade in YourCT</a>' +
            '<a href="#" class="menu-item" data-action="tripProposal">Trip Proposal Tidy</a>' +
            '<div class="close-btn">×</div>';
    }
    let currentBookingInfo = extractBookingInfo();
    let lastKnownPNR = currentBookingInfo.pnr;

    var menu = document.createElement('div');
    menu.id = 'sabreShortcutsMenu';
    menu.innerHTML = buildMenuContent(currentBookingInfo);

    var style = document.createElement('style');
    style.textContent = '#sabreShortcutsMenu{position:fixed;top:20px;right:20px;width:280px;background:linear-gradient(135deg,#ff2e5f 0%,#ff6b9d 100%);border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.3);padding:15px;z-index:999999;font-family:Arial,sans-serif;max-height:90vh;overflow-y:auto}.menu-header{color:white;font-weight:bold;font-size:16px;margin-bottom:15px;text-align:center;padding-bottom:10px;border-border:2px solid rgba(255,255,255,0.3);cursor:move}.booking-info{background:rgba(255,255,255,0.95);border-radius:8px;padding:12px;margin-bottom:12px;font-size:11px}.booking-info-title{font-weight:bold;color:#ff2e5f;margin-bottom:8px;font-size:12px;text-align:center}.info-row{margin:5px 0;display:flex;justify-content:space-between;align-items:flex-start}.info-label{font-weight:600;color:#555;margin-right:8px;min-width:80px}.info-value{color:#333;text-align:right;word-break:break-word;flex:1}.approval-status{margin-top:10px;padding:8px;border-radius:5px;text-align:center;font-weight:bold;font-size:11px}.approval-status.approved{background:#d4edda;color:#155724;border:1px solid #c3e6cb}.approval-status.pending{background:#fff3cd;color:#856404;border:1px solid #ffeaa7}.menu-item{display:block;padding:10px 15px;margin:8px 0;background:rgba(255,255,255,0.95);color:#333;text-decoration:none;border-radius:5px;transition:all 0.3s ease;font-size:14px;text-align:center;font-weight:500;cursor:pointer}.menu-item:hover{background:white;transform:translateX(-3px);box-shadow:0 2px 8px rgba(0,0,0,0.2)}.menu-item-alert{background:#fff3cd;border:2px solid #ff9800;font-weight:600;animation:pulse 2s infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.8}}.close-btn{position:absolute;top:5px;right:10px;color:white;font-size:24px;cursor:pointer;line-height:20px}.close-btn:hover{color:#ffeb3b}.notes-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;border-radius:10px;padding:25px;box-shadow:0 8px 30px rgba(0,0,0,0.4);z-index:1000000;max-width:500px;width:90%;max-height:70vh;overflow-y:auto}.notes-modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:999999}.notes-modal-title{font-size:18px;font-weight:bold;color:#ff2e5f;margin-bottom:15px;display:flex;align-items:center;gap:10px}.notes-modal-content{background:#f8f9fa;padding:15px;border-radius:8px;border-left:4px solid #ff9800;font-size:13px;line-height:1.6;color:#333;white-space:pre-wrap}.notes-modal-close{background:#ff2e5f;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;font-weight:bold;margin-top:15px;width:100%}.notes-modal-close:hover{background:#e02850}';
    document.head.appendChild(style);
    document.body.appendChild(menu);
    function copyBookingInfo() {
        let text = '=== BOOKING INFORMATION ===\n\n';
        if (currentBookingInfo.pnr) text += 'Sabre PNR: ' + currentBookingInfo.pnr + '\n';
        if (currentBookingInfo.traveller) text += 'Traveller: ' + currentBookingInfo.traveller + '\n';
        if (currentBookingInfo.company) text += 'Company: ' + currentBookingInfo.company + '\n';
        if (currentBookingInfo.costCentre) text += 'Cost Centre: ' + currentBookingInfo.costCentre + '\n';
        if (currentBookingInfo.booker) text += 'Booker: ' + currentBookingInfo.booker + '\n';
        if (currentBookingInfo.booker) text += 'Approval Status: ' + (currentBookingInfo.approved ? 'APPROVED' : 'PENDING') + '\n';
        var temp = document.createElement('textarea');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        alert('Booking info copied to clipboard!');
    }

    function showNotesModal() {
        const overlay = document.createElement('div');
        overlay.className = 'notes-modal-overlay';
        const modal = document.createElement('div');
        modal.className = 'notes-modal';
        const notesText = currentBookingInfo.notes.join('\n');
        modal.innerHTML = '<div class="notes-modal-title">⚠️ Notes to Agent</div><div class="notes-modal-content">' + notesText + '</div><button class="notes-modal-close">Close</button>';
        document.body.appendChild(overlay);
        document.body.appendChild(modal);
        modal.querySelector('.notes-modal-close').addEventListener('click', function() {
            overlay.remove();
            modal.remove();
        });
        overlay.addEventListener('click', function() {
            overlay.remove();
            modal.remove();
        });
    }
    function attachEventListeners() {
        var isDragging = false, currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;
        var header = menu.querySelector('.menu-header');
        header.addEventListener('mousedown', function(e) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            isDragging = true;
        });
        document.addEventListener('mousemove', function(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;
                menu.style.transform = 'translate3d(' + currentX + 'px, ' + currentY + 'px, 0)';
            }
        });
        document.addEventListener('mouseup', function() {
            isDragging = false;
        });
        menu.querySelector('.close-btn').addEventListener('click', function() {
            menu.remove();
        });
        menu.querySelectorAll('.menu-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                var action = this.getAttribute('data-action');
                if (action === 'copyBookingInfo') {
                    copyBookingInfo();
                } else if (action === 'viewNotes') {
                    showNotesModal();
                } else if (action === 'copyPNR') {
                    if (currentBookingInfo.pnr) {
                        var temp = document.createElement('textarea');
                        temp.value = currentBookingInfo.pnr;
                        document.body.appendChild(temp);
                        temp.select();
                        document.execCommand('copy');
                        document.body.removeChild(temp);
                    } else {
                        alert('PNR not found');
                    }
                    } else if (action === 'viewSerko') {
                    const pattern = /Q¥QUOTE NUMBER\s*-\s*(\d+)/;
                    const bodyText = document.body.innerText;
                    const match = bodyText.match(pattern);
                    if (match && match[1]) {
                        const quoteNum = match[1];
                        const url = 'https://serko.au.fcm.travel/Web/Booking/Detail/' + quoteNum;
                        window.open(url, '_blank');
                    } else {
                        alert('Quote number not found!');
                    }
                } else if (action === 'masquerade') {
                    const pattern = /U62-([A-F0-9-]+)/i;
                    const bodyText = document.body.innerText;
                    const match = bodyText.match(pattern);
                    if (match && match[1]) {
                        const guid = match[1];
                        const url = 'https://agentport.fcm.travel/SamlService/AgentToClientSsoTraveler/' + guid;
                        window.open(url, '_blank');
                    } else {
                        alert('Agentport or YourCT profile not found. This could be a profile that only exists in Lumina, or a guest traveller.');
                    }
                } else if (action === 'tripProposal') {
                    var script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/gh/jordan-mcguire/CT-Sabre-Shortcuts@main/trip-proposal.js';
                    document.body.appendChild(script);
                }
            });
        });
    }
    attachEventListeners();

    setInterval(function() {
        const newBookingInfo = extractBookingInfo();
        if (newBookingInfo.pnr && newBookingInfo.pnr !== lastKnownPNR) {
            console.log('PNR changed from', lastKnownPNR, 'to', newBookingInfo.pnr);
            lastKnownPNR = newBookingInfo.pnr;
            currentBookingInfo = newBookingInfo;
            menu.innerHTML = buildMenuContent(currentBookingInfo);
            attachEventListeners();
        }
    }, 2000);

})();
