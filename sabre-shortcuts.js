// ==UserScript==
// @name         Sabre Red Workspace Shortcuts
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Adds keyboard shortcuts and monitors PNR changes in Sabre Red Workspace
// @author       Your name
// @match        https://webservices.sabre.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // PNR MONITORING SYSTEM
    // ============================================
    
    let lastPNRContent = '';
    let processingPNR = false;

    function getPNRContent() {
        const responseArea = document.querySelector('#response_area');
        if (responseArea) {
            return responseArea.textContent.trim();
        }
        return '';
    }

    function extractTicketingDeadline(pnrText) {
        const tkRegex = /TKT\s*(?:BY|BEF|DL)\s*(\d{1,2}[A-Z]{3}\d{2,4})/i;
        const match = pnrText.match(tkRegex);
        if (match) {
            return match[1];
        }
        return null;
    }

    function checkForTicketingDeadline() {
        const currentPNR = getPNRContent();
        
        // Only process if PNR content has actually changed
        if (currentPNR === lastPNRContent || currentPNR === '' || processingPNR) {
            return;
        }

        // Check if this looks like a PNR response (contains common PNR elements)
        if (!currentPNR.includes('RP/') && !currentPNR.includes('.S*MS10')) {
            return;
        }

        processingPNR = true;
        lastPNRContent = currentPNR;

        const deadline = extractTicketingDeadline(currentPNR);
        
        if (deadline) {
            console.log('Ticketing deadline found:', deadline);
            
            // Create visual notification
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: #ff6b6b;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                z-index: 10000;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                animation: slideIn 0.3s ease-out;
            `;
            notification.innerHTML = `
                <div style="margin-bottom: 5px;">⚠️ TICKETING DEADLINE DETECTED</div>
                <div style="font-size: 20px; letter-spacing: 1px;">${deadline}</div>
            `;
            
            // Add animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
            
            document.body.appendChild(notification);
            
            // Remove notification after 8 seconds
            setTimeout(() => {
                notification.style.transition = 'opacity 0.5s';
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 500);
            }, 8000);
        }

        // Reset processing flag after a short delay
        setTimeout(() => {
            processingPNR = false;
        }, 500);
    }

    // Monitor for PNR changes
    function startPNRMonitoring() {
        const responseArea = document.querySelector('#response_area');
        if (!responseArea) {
            console.log('Response area not found, retrying...');
            setTimeout(startPNRMonitoring, 1000);
            return;
        }

        console.log('PNR monitoring active');

        // Use MutationObserver to detect changes
        const observer = new MutationObserver(() => {
            checkForTicketingDeadline();
        });

        observer.observe(responseArea, {
            childList: true,
            subtree: true,
            characterData: true
        });

        // Also check periodically as backup
        setInterval(checkForTicketingDeadline, 1000);
    }

    // ============================================
    // KEYBOARD SHORTCUTS
    // ============================================

    const shortcuts = {
        'F2': '*R',
        'F3': 'I',
        'F4': '*IA',
        'F5': '*A',
        'F6': '*P5',
        'F7': '5.S*TKT01',
        'F8': '*FF',
        'F9': 'ER',
        'F10': 'E',
        'F11': 'IR',
        'F12': '6ITKT01'
    };

    function executeCommand(command) {
        const inputField = document.querySelector('#command');
        if (inputField) {
            inputField.value = command;
            inputField.focus();
            
            const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            });
            inputField.dispatchEvent(enterEvent);
            
            console.log('Executed command:', command);
        } else {
            console.error('Command input field not found');
        }
    }

    function handleKeyPress(e) {
        const key = e.key;
        
        if (shortcuts[key]) {
            e.preventDefault();
            e.stopPropagation();
            executeCommand(shortcuts[key]);
        }
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function initialize() {
        console.log('Sabre Red Workspace Enhanced Script Loading...');
        
        // Start keyboard shortcuts
        document.addEventListener('keydown', handleKeyPress, true);
        console.log('Keyboard shortcuts active');
        
        // Start PNR monitoring
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startPNRMonitoring);
        } else {
            startPNRMonitoring();
        }
    }

    // Start everything
    initialize();

    console.log('Sabre Red Workspace Enhanced Script Loaded Successfully');
})();
