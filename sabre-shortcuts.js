javascript:(function() {
    const CACHE_DURATION = 5 * 60 * 1000;
    const CHECK_INTERVAL = 2000;

    let overlay = document.getElementById('pnrCacheOverlay');
    let isCollapsed = false; // Track collapse state in memory
    
    if (overlay) {
        overlay.remove();
        return;
    }

    const style = document.createElement('style');
    style.textContent = `
        #pnrCacheOverlay {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 0;
            min-width: 400px;
            max-width: 500px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            cursor: move;
            display: flex;
            flex-direction: column;
        }
        #pnrCacheOverlay.expand-upward {
            flex-direction: column-reverse;
        }
        #pnrCacheOverlay-header {
            background: #333;
            color: white;
            padding: 10px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
            user-select: none;
        }
        #pnrCacheOverlay-header-left {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        #pnrCacheOverlay-header-right {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        #pnrCacheOverlay-collapse {
            background: none;
            border: none;
            color: white;
            font-size: 16px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
        }
        #pnrCacheOverlay-collapse:hover {
            opacity: 0.7;
        }
        #pnrCacheOverlay-close {
            background: #d9534f;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
        }
        #pnrCacheOverlay-close:hover {
            background: #c9302c;
        }
        #pnrCacheOverlay-content {
            overflow: hidden;
            transition: max-height 0.3s ease-out;
        }
        #pnrCacheOverlay-content.collapsed {
            max-height: 0;
        }
        #pnrCacheOverlay-content.expanded {
            max-height: 2000px;
        }
        #pnrCacheOverlay-inner {
            padding: 15px;
            max-height: 70vh;
            overflow-y: auto;
        }
        .pnr-info {
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
        }
        .pnr-info:last-child {
            border-bottom: none;
        }
        .pnr-label {
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }
        .pnr-value {
            color: #666;
            font-family: 'Courier New', monospace;
            background: #f5f5f5;
            padding: 8px;
            border-radius: 4px;
            word-break: break-all;
        }
        .pnr-buttons {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        .pnr-button {
            flex: 1;
            padding: 8px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            transition: background-color 0.2s;
        }
        .copy-button {
            background: #5cb85c;
            color: white;
        }
        .copy-button:hover {
            background: #4cae4c;
        }
        .copy-button.copied {
            background: #4cae4c;
        }
        .clear-button {
            background: #d9534f;
            color: white;
        }
        .clear-button:hover {
            background: #c9302c;
        }
        .status-message {
            text-align: center;
            padding: 20px;
            color: #666;
            font-style: italic;
        }
    `;
    document.head.appendChild(style);

    overlay = document.createElement('div');
    overlay.id = 'pnrCacheOverlay';
    
    const header = document.createElement('div');
    header.id = 'pnrCacheOverlay-header';
    
    const headerLeft = document.createElement('div');
    headerLeft.id = 'pnrCacheOverlay-header-left';
    
    const collapseBtn = document.createElement('button');
    collapseBtn.id = 'pnrCacheOverlay-collapse';
    collapseBtn.innerHTML = '▼';
    collapseBtn.title = 'Collapse';
    
    const title = document.createElement('span');
    title.textContent = 'Active Listener';
    
    headerLeft.appendChild(collapseBtn);
    headerLeft.appendChild(title);
    
    const headerRight = document.createElement('div');
    headerRight.id = 'pnrCacheOverlay-header-right';
    
    const closeBtn = document.createElement('button');
    closeBtn.id = 'pnrCacheOverlay-close';
    closeBtn.innerHTML = '×';
    closeBtn.title = 'Close';
    
    headerRight.appendChild(closeBtn);
    
    header.appendChild(headerLeft);
    header.appendChild(headerRight);
    
    const content = document.createElement('div');
    content.id = 'pnrCacheOverlay-content';
    content.className = 'expanded';
    
    const inner = document.createElement('div');
    inner.id = 'pnrCacheOverlay-inner';
    
    content.appendChild(inner);
    overlay.appendChild(header);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    function dragStart(e) {
        if (e.target === closeBtn || e.target === collapseBtn) {
            return;
        }
        
        if (e.type === "touchstart") {
            initialX = e.touches[0].clientX - xOffset;
            initialY = e.touches[0].clientY - yOffset;
        } else {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
        }

        if (e.target === header || e.target === headerLeft || e.target === title) {
            isDragging = true;
        }
    }

    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            
            if (e.type === "touchmove") {
                currentX = e.touches[0].clientX - initialX;
                currentY = e.touches[0].clientY - initialY;
            } else {
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
            }

            xOffset = currentX;
            yOffset = currentY;

            setTranslate(currentX, currentY, overlay);
        }
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }

    header.addEventListener("mousedown", dragStart, false);
    document.addEventListener("mouseup", dragEnd, false);
    document.addEventListener("mousemove", drag, false);
    header.addEventListener("touchstart", dragStart, false);
    document.addEventListener("touchend", dragEnd, false);
    document.addEventListener("touchmove", drag, false);

    closeBtn.addEventListener('click', () => {
        overlay.remove();
    });

    collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isCollapsed = !isCollapsed;
        
        if (isCollapsed) {
            // Determine expand direction based on position
            const rect = overlay.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const overlayMiddle = rect.top + (rect.height / 2);
            
            if (overlayMiddle > viewportHeight / 2) {
                overlay.classList.add('expand-upward');
            } else {
                overlay.classList.remove('expand-upward');
            }
            
            content.classList.remove('expanded');
            content.classList.add('collapsed');
            collapseBtn.innerHTML = '▲';
            collapseBtn.title = 'Expand';
        } else {
            content.classList.remove('collapsed');
            content.classList.add('expanded');
            collapseBtn.innerHTML = '▼';
            collapseBtn.title = 'Collapse';
        }
    });

    function extractPNR() {
        const scripts = document.getElementsByTagName('script');
        for (let script of scripts) {
            const content = script.textContent;
            if (content.includes('lblRecLoc')) {
                const match = content.match(/lblRecLoc['"]\s*(?:id|name)=[^>]*>([A-Z0-9]{6})</i);
                if (match) return match[1];
            }
        }

        const labels = document.querySelectorAll('[id*="lblRecLoc"], [name*="lblRecLoc"]');
        for (let label of labels) {
            const text = label.textContent.trim();
            if (/^[A-Z0-9]{6}$/.test(text)) return text;
        }

        const bodyText = document.body.innerText;
        const pnrMatch = bodyText.match(/(?:PNR|Record Locator|Confirmation)[\s:]+([A-Z0-9]{6})/i);
        if (pnrMatch) return pnrMatch[1];

        return null;
    }

    function getFromCache(key) {
        const item = localStorage.getItem(key);
        if (!item) return null;
        
        const data = JSON.parse(item);
        if (Date.now() - data.timestamp > CACHE_DURATION) {
            localStorage.removeItem(key);
            return null;
        }
        
        return data.value;
    }

    function saveToCache(key, value) {
        const data = {
            value: value,
            timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(data));
    }

    function copyToClipboard(text, button) {
        navigator.clipboard.writeText(text).then(() => {
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.classList.add('copied');
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('copied');
            }, 2000);
        });
    }

    function updateDisplay(pnr, token) {
        const tokenPreview = token ? `${token.substring(0, 20)}...` : 'Not found';
        
        inner.innerHTML = `
            <div class="pnr-info">
                <div class="pnr-label">PNR:</div>
                <div class="pnr-value">${pnr || 'Not found'}</div>
            </div>
            <div class="pnr-info">
                <div class="pnr-label">Auth Token:</div>
                <div class="pnr-value" style="font-size: 11px;">${tokenPreview}</div>
            </div>
            <div class="pnr-buttons">
                <button class="pnr-button copy-button" id="copyPNR">Copy PNR</button>
                <button class="pnr-button copy-button" id="copyToken">Copy Token</button>
                <button class="pnr-button clear-button" id="clearCache">Clear Cache</button>
            </div>
        `;

        if (pnr) {
            document.getElementById('copyPNR').addEventListener('click', function() {
                copyToClipboard(pnr, this);
            });
        }

        if (token) {
            document.getElementById('copyToken').addEventListener('click', function() {
                copyToClipboard(token, this);
            });
        }

        document.getElementById('clearCache').addEventListener('click', () => {
            if (pnr) localStorage.removeItem(`pnr_${pnr}`);
            localStorage.removeItem('auth_token');
            updateDisplay(pnr, null);
        });
    }

    function checkForUpdates() {
        const pnr = extractPNR();
        
        if (!pnr) {
            inner.innerHTML = '<div class="status-message">No PNR detected on this page</div>';
            return;
        }

        let token = getFromCache(`pnr_${pnr}`);
        
        if (!token) {
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name.includes('auth') || name.includes('token') || name.includes('session')) {
                    token = value;
                    saveToCache(`pnr_${pnr}`, token);
                    break;
                }
            }
        }

        updateDisplay(pnr, token);
    }

    checkForUpdates();
    setInterval(checkForUpdates, CHECK_INTERVAL);
})();
