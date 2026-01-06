// ==UserScript==
// @name         Sabre Red Workspace Enhancer
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Enhanced Sabre interface with floating menu and booking info extraction
// @match        https://webservices.havail.sabre.com/*
// @grant        GM_setClipboard
// @grant        GM_openInTab
// ==/UserScript==

(function() {
    'use strict';

    let floatingMenu;
    let bookingInfo = {};

    // Create floating menu
    function createFloatingMenu() {
        floatingMenu = document.createElement('div');
        floatingMenu.id = 'sabre-floating-menu';
        floatingMenu.innerHTML = `
            <button class="smenu-btn" id="hotel-availability">Hotel Availability</button>
            <button class="smenu-btn" id="cryptic-command">Enter Cryptic</button>
            <button class="smenu-btn" id="list-queue">List Queue</button>
            <button class="smenu-btn" id="check-notes">Check Notes to Agent</button>
        `;

        const style = document.createElement('style');
        style.textContent = `
            #sabre-floating-menu {
                position: fixed;
                top: 80px;
                right: 20px;
                background: #00434e;
                padding: 12px;
                border-radius: 10px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                z-index: 10000;
                min-width: 180px;
                font-family: Arial, sans-serif;
                color: white;
            }
            .smenu-btn {
                display: block;
                width: 100%;
                padding: 8px;
                margin: 4px 0;
                background: rgba(255,255,255,0.1);
                color: white;
                border: 1px solid rgba(255,255,255,0.3);
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.3s;
                font-size: 11px;
            }
            .smenu-btn:hover {
                background: rgba(255,255,255,0.2);
                transform: translateX(-2px);
            }
            #booking-info-panel {
                position: fixed;
                top: 80px;
                left: 20px;
                background: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                z-index: 10000;
                min-width: 300px;
                font-family: Arial, sans-serif;
                max-width: 400px;
            }
            #booking-info-panel h3 {
                margin: 0 0 15px 0;
                color: #1e3a5f;
                border-bottom: 2px solid #1e3a5f;
                padding-bottom: 10px;
                position: relative;
            }
            .hover-copy-btn {
                position: absolute;
                top: 0;
                right: 0;
                padding: 4px 8px;
                background: #1e3a5f;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                font-size: 11px;
                opacity: 0;
                transition: opacity 0.3s;
            }
            #booking-info-panel h3:hover .hover-copy-btn {
                opacity: 1;
            }
            .hover-copy-btn:hover {
                background: #2d5a7b;
            }
            .info-row {
                margin: 8px 0;
                display: flex;
                gap: 10px;
            }
            .info-label {
                font-weight: bold;
                color: #2d5a7b;
                min-width: 120px;
            }
            .info-value {
                color: #333;
                word-break: break-word;
            }
            .info-divider {
                border-top: 1px solid #e0e0e0;
                margin: 12px 0;
            }
            .info-btn {
                display: block;
                width: 100%;
                padding: 8px;
                margin: 6px 0;
                background: #1e3a5f;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.3s;
                font-size: 11px;
            }
            .info-btn:hover {
                background: #2d5a7b;
                transform: translateY(-1px);
            }
            .info-btn:active {
                transform: translateY(0);
            }
            .btn-row {
                display: flex;
                gap: 8px;
            }
            .btn-row .info-btn {
                flex: 1;
            }
            .notes-dropdown {
                position: fixed;
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                z-index: 10001;
                max-width: 600px;
                max-height: 400px;
                overflow-y: auto;
            }
            .notes-close {
                position: absolute;
                top: 10px;
                right: 10px;
                background: #dc3545;
                color: white;
                border: none;
                border-radius: 5px;
                padding: 5px 10px;
                cursor: pointer;
                font-size: 16px;
                line-height: 1;
            }
            .notes-close:hover {
                background: #c82333;
            }
            .notes-content {
                white-space: pre-wrap;
                font-family: 'Courier New', monospace;
                font-size: 13px;
                line-height: 1.5;
                color: #333;
                margin-top: 30px;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(floatingMenu);

        // Add event listeners
        document.getElementById('hotel-availability').addEventListener('click', () => executeCommand('HOA'));
        document.getElementById('cryptic-command').addEventListener('click', () => focusCrypticInput());
        document.getElementById('list-queue').addEventListener('click', () => executeCommand('QC/'));
        document.getElementById('check-notes').addEventListener('click', checkNotesToAgent);
    }

    // Execute Sabre command
    function executeCommand(command) {
        const input = document.querySelector('textarea[name="__commandInput"]') ||
                     document.querySelector('input[name="__commandInput"]');
        if (input) {
            input.value = command;
            input.focus();
            const event = new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true });
            input.dispatchEvent(event);
        }
    }

    // Focus cryptic input
    function focusCrypticInput() {
        const input = document.querySelector('textarea[name="__commandInput"]') ||
                     document.querySelector('input[name="__commandInput"]');
        if (input) {
            input.focus();
            input.select();
        }
    }

    // Check for notes to agent
    function checkNotesToAgent() {
        const bodyText = document.body.innerText;
        const notesMatch = bodyText.match(/5\.(.+?)(?=\n\d+\.|\n[A-Z]{2,}|\n*$)/s);
        
        if (notesMatch) {
            const notes = notesMatch[0].trim();
            showNotesDropdown(notes);
        } else {
            alert('No notes to agent found in current PNR');
        }
    }

    // Show notes in dropdown
    function showNotesDropdown(notes) {
        // Remove existing dropdown
        const existing = document.querySelector('.notes-dropdown');
        if (existing) existing.remove();

        const btn = document.getElementById('check-notes');
        const rect = btn.getBoundingClientRect();
        
        const dropdown = document.createElement('div');
        dropdown.className = 'notes-dropdown';
        dropdown.style.top = (rect.bottom + 5) + 'px';
        dropdown.style.right = '20px';
        dropdown.innerHTML = `
            <button class="notes-close">×</button>
            <h3 style="color: #1e3a5f; margin-top: 0;">Notes to Agent</h3>
            <div class="notes-content">${notes}</div>
        `;
        document.body.appendChild(dropdown);

        dropdown.querySelector('.notes-close').addEventListener('click', () => dropdown.remove());
        
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', function closeDropdown(e) {
                if (!dropdown.contains(e.target) && e.target !== btn) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }, 100);
    }

    // Extract contact info
    function extractContactInfo() {
        const bodyText = document.body.innerText;
        const contact = {};

        // Extract phone number
        const phoneMatch = bodyText.match(/P¥PAX-(\d+)/);
        if (phoneMatch) {
            contact.phone = phoneMatch[1];
        }

        // Extract email
        const emailMatch = bodyText.match(/E¥PAX-([^\s\n]+)/);
        if (emailMatch) {
            let email = emailMatch[1];
            // Replace .. with _
            email = email.replace(/\.\./g, '_');
            // Replace ¤ with @
            email = email.replace(/¤/g, '@');
            contact.email = email;
        }

        return contact;
    }

    // Extract and parse traveller name
    function extractTravellerName() {
        const bodyText = document.body.innerText;
        const nameMatch = bodyText.match(/1\.1([^\n]+)/);
        
        if (nameMatch) {
            let fullName = nameMatch[1].trim();
            
            // Remove titles
            const titles = ['MR', 'MRS', 'MS', 'MISS', 'DR', 'MSTR', 'PROF', 'PROFAUST', 'MASTER'];
            titles.forEach(title => {
                fullName = fullName.replace(new RegExp('\\b' + title + '\\b', 'g'), '').trim();
            });
            
            // Split by slash
            const parts = fullName.split('/');
            if (parts.length >= 2) {
                return {
                    surname: parts[0].trim(),
                    firstName: parts[1].trim()
                };
            } else if (parts.length === 1) {
                return {
                    surname: parts[0].trim(),
                    firstName: ''
                };
            }
        }
        
        return null;
    }

    // Copy traveller details
    function copyTravellerDetails() {
        const name = extractTravellerName();
        const contact = extractContactInfo();
        
        let output = '';
        
        if (name) {
            output += `Guest Surname: ${name.surname || 'Not Found'}\n`;
            output += `Guest First Name: ${name.firstName || 'Not Found'}\n`;
        } else {
            output += `Guest Surname: Not Found\n`;
            output += `Guest First Name: Not Found\n`;
        }
        
        output += `Phone Number: ${contact.phone || 'Not Found'}\n`;
        output += `Email Address: ${contact.email || 'Not Found'}`;
        
        navigator.clipboard.writeText(output).then(() => {
            alert('Traveller details copied to clipboard!');
        });
    }

    // Extract booking information
    function extractBookingInfo() {
        const bodyText = document.body.innerText;
        const info = {};

        // Extract PNR
        const pnrMatch = bodyText.match(/\b([A-Z0-9]{6})\b/);
        if (pnrMatch) info.pnr = pnrMatch[1];

        // Extract Lumina Booking ID
        const luminaMatch = bodyText.match(/LUMINA BOOKING ID-(\d+)/);
        if (luminaMatch) info.luminaId = luminaMatch[1];

        // Extract traveller name (full for display)
        const travellerMatch = bodyText.match(/1\.1([^\n]+)/);
        if (travellerMatch) info.traveller = travellerMatch[1].trim();

        // Extract hotel booking info
        const hotelMatch = bodyText.match(/1\s+([A-Z\s\-']+?)\s+(\d{2}[A-Z]{3})\s.*?(\d+)\sNIGHT/s);
        if (hotelMatch) {
            info.hotel = hotelMatch[1].trim();
            info.checkIn = hotelMatch[2];
            info.nights = hotelMatch[3];
        }

        // Extract confirmation number
        const confMatch = bodyText.match(/CONF NBR-(\w+)/);
        if (confMatch) info.confirmationNbr = confMatch[1];

        return info;
    }

    // Create booking info panel
    function createBookingInfoPanel(info) {
        // Remove existing panel
        const existingPanel = document.getElementById('booking-info-panel');
        if (existingPanel) existingPanel.remove();

        if (Object.keys(info).length === 0) return;

        const panel = document.createElement('div');
        panel.id = 'booking-info-panel';
        
        let html = '<h3>Current Booking<button class="hover-copy-btn" id="hover-copy-all">Copy</button></h3>';
        
        // PNR and Lumina ID at top
        if (info.pnr) {
            html += `<div class="info-row"><span class="info-label">Sabre PNR:</span><span class="info-value">${info.pnr}</span></div>`;
        }
        
        if (info.luminaId) {
            html += `<div class="info-row"><span class="info-label">Lumina ID:</span><span class="info-value">${info.luminaId}</span></div>`;
        }

        // Copy buttons for PNR and Lumina (half width each)
        html += '<div class="btn-row">';
        if (info.pnr) {
            html += `<button class="info-btn" onclick="navigator.clipboard.writeText('${info.pnr}').then(() => alert('PNR copied!'))">Copy PNR</button>`;
        }
        if (info.luminaId) {
            html += `<button class="info-btn" onclick="navigator.clipboard.writeText('${info.luminaId}').then(() => alert('Lumina ID copied!'))">Copy Lumina ID</button>`;
        }
        html += '</div>';

        // Divider
        html += '<div class="info-divider"></div>';
        
        // Rest of booking info
        if (info.traveller) {
            html += `<div class="info-row"><span class="info-label">Traveller:</span><span class="info-value">${info.traveller}</span></div>`;
        }
        
        if (info.hotel) {
            html += `<div class="info-row"><span class="info-label">Hotel:</span><span class="info-value">${info.hotel}</span></div>`;
        }
        
        if (info.checkIn) {
            html += `<div class="info-row"><span class="info-label">Check-in:</span><span class="info-value">${info.checkIn}</span></div>`;
          }
        
        if (info.nights) {
            html += `<div class="info-row"><span class="info-label">Nights:</span><span class="info-value">${info.nights}</span></div>`;
        }
        
        if (info.confirmationNbr) {
            html += `<div class="info-row"><span class="info-label">Confirmation:</span><span class="info-value">${info.confirmationNbr}</span></div>`;
        }

        // Copy Traveller Details button
        html += `<button class="info-btn" id="copy-traveller-btn">Copy Traveller Details</button>`;

        // Action buttons (half width each)
        if (info.pnr) {
            html += '<div class="btn-row">';
            html += `<button class="info-btn" id="view-serko-btn">View PNR in Serko</button>`;
            html += `<button class="info-btn" id="view-yourct-btn">View in YourCT</button>`;
            html += '</div>';
        }

        panel.innerHTML = html;
        document.body.appendChild(panel);

        // Add event listeners
        document.getElementById('copy-traveller-btn')?.addEventListener('click', copyTravellerDetails);

        document.getElementById('hover-copy-all')?.addEventListener('click', () => {
            let copyText = '';
            if (info.pnr) copyText += `Sabre PNR: ${info.pnr}\n`;
            if (info.luminaId) copyText += `Lumina ID: ${info.luminaId}\n`;
            if (info.traveller) copyText += `Traveller: ${info.traveller}\n`;
            if (info.hotel) copyText += `Hotel: ${info.hotel}\n`;
            if (info.checkIn) copyText += `Check-in: ${info.checkIn}\n`;
            if (info.nights) copyText += `Nights: ${info.nights}\n`;
            if (info.confirmationNbr) copyText += `Confirmation: ${info.confirmationNbr}\n`;
            
            navigator.clipboard.writeText(copyText).then(() => {
                alert('Booking information copied to clipboard!');
            });
        });

        if (info.pnr) {
            document.getElementById('view-serko-btn')?.addEventListener('click', () => {
                window.open(`https://live.serko.com/admin/bookings?search=${info.pnr}`, '_blank');
            });

            document.getElementById('view-yourct-btn')?.addEventListener('click', () => {
                window.open(`https://yourct.portalconnect.travel/Search.aspx?search=${info.pnr}`, '_blank');
            });
        }

        bookingInfo = info;
    }

    // Monitor for page changes
    function monitorPageChanges() {
        const observer = new MutationObserver(() => {
            const info = extractBookingInfo();
            if (JSON.stringify(info) !== JSON.stringify(bookingInfo)) {
                createBookingInfoPanel(info);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Initialize
    function init() {
        createFloatingMenu();
        const info = extractBookingInfo();
        createBookingInfoPanel(info);
        monitorPageChanges();
    }

    // Wait for page to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
