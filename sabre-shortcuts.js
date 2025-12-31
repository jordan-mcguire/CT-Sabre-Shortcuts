(function() {
    // Toggle menu if already exists
    if (document.getElementById('sabreShortcutsMenu')) {
        document.getElementById('sabreShortcutsMenu').remove();
        return;
    }

    // Create menu
    var menu = document.createElement('div');
    menu.id = 'sabreShortcutsMenu';
    menu.innerHTML = `
        <div class="menu-header">⚡ Sabre Shortcuts</div>
        <a href="#" class="menu-item" data-action="copyPNR">Copy PNR</a>
        <a href="#" class="menu-item" data-action="viewSerko">View PNR in Serko</a>
        <a href="#" class="menu-item" data-action="masquerade">Masquerade in YourCT</a>
        <a href="#" class="menu-item" data-action="tripProposal">Trip Proposal Tidy</a>
        <div class="close-btn">×</div>
    `;

    // Add styles
    var style = document.createElement('style');
    style.textContent = `
        #sabreShortcutsMenu {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 250px;
            background: linear-gradient(135deg, #ff2e5f 0%, #ff6b9d 100%);
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            padding: 15px;
            z-index: 999999;
            font-family: Arial, sans-serif;
        }
        .menu-header {
            color: white;
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 15px;
            text-align: center;
            padding-bottom: 10px;
            border-bottom: 2px solid rgba(255,255,255,0.3);
            cursor: move;
        }
        .menu-item {
            display: block;
            padding: 10px 15px;
            margin: 8px 0;
            background: rgba(255,255,255,0.95);
            color: #333;
            text-decoration: none;
            border-radius: 5px;
            transition: all 0.3s ease;
            font-size: 14px;
            text-align: center;
            font-weight: 500;
            cursor: pointer;
        }
        .menu-item:hover {
            background: white;
            transform: translateX(-3px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .close-btn {
            position: absolute;
            top: 5px;
            right: 10px;
            color: white;
            font-size: 24px;
            cursor: pointer;
            line-height: 20px;
        }
        .close-btn:hover {
            color: #ffeb3b;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(menu);

    // Dragging functionality
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

    // Close button
    menu.querySelector('.close-btn').addEventListener('click', function() {
        menu.remove();
    });

    // Menu item actions
    menu.querySelectorAll('.menu-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            var action = this.getAttribute('data-action');

            if (action === 'copyPNR') {
                var lines = document.querySelectorAll('.dn-line.text-line');
                var pnr = '';
                for (var i = 0; i < lines.length; i++) {
                    var text = lines[i].innerText.trim();
                    if (text.length === 6 && /^[A-Z]{6}$/i.test(text)) {
                        pnr = text;
                        break;
                    }
                }
                if (pnr) {
                    var temp = document.createElement('textarea');
                    temp.value = pnr;
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
                // Load and execute trip proposal script
                var script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/gh/jordan-mcguire/CT-Sabre-Shortcuts@main/trip-proposal.js';
                document.body.appendChild(script);
            }
        });
    });
})();