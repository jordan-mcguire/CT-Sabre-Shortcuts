(function() {

    // ─── CONSTANTS ────────────────────────────────────────────────────────────
    var PINK       = '#ff2e5f';
    var TEAL       = '#00434e';
    var TC_URL     = 'https://raw.githubusercontent.com/jordan-mcguire/tp-tidy/main/terms-footer.html';

    // ─── HELPERS ──────────────────────────────────────────────────────────────
    function getPaxCount(paxLabel) {
        if (!paxLabel) return 1;
        var total = 0;
        var matches = paxLabel.match(/(\d+)/g);
        if (matches) matches.forEach(function(n){ total += parseInt(n, 10); });
        return total || 1;
    }

    function showCopied(statusEl) {
        if (!statusEl) return;
        statusEl.style.display = 'inline';
        setTimeout(function(){ statusEl.style.display = 'none'; }, 3000);
    }

    function fallbackCopy(html, statusEl) {
        var ta       = document.createElement('textarea');
        ta.value     = html;
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showCopied(statusEl);
    }

    // ─── TIDY ─────────────────────────────────────────────────────────────────
    function tidyProposal(iframe) {
        var html = iframe.getAttribute('srcdoc');
        if (!html) return null;

        var isCompact    = html.indexOf('proposal-compact') !== -1;
        var proposalType = isCompact ? 'proposal-compact' : 'proposal-enhanced';
        var hasCarOption = html.toLowerCase().indexOf('car option') > -1;

        // ── Fare rules extraction ─────────────────────────────────────────────
        var fareRulesBlocks = [];
        var frRegex = /<table id="proposal-enhanced-fare-rules-(\d+)"[\s\S]*?<\/table>\s*(?=\s*<\/td>)/g;
        var frMatch;
        while ((frMatch = frRegex.exec(html)) !== null) {
            var optNum = frMatch[1];
            var block  = frMatch[0];
            var refund = '', exchange = '', flightConditions = '';

            var rm = block.match(/proposal-enhanced-fare-rules-\d+-penalties-refund-value[^>]*>([^<]*)<\/span>/);
            if (rm) {
                var rRaw = rm[1].replace(/\.\s*PLEASE NOTE:[^;]*/gi,'').replace(/penalty applies[^;]*/gi,'').trim().replace(/\.$/,'').trim();
                refund = rRaw.split(';').map(function(p){return p.trim();}).filter(Boolean)
                    .map(function(p){return p+' penalty applies. PLEASE NOTE: Some taxes and surcharges may be non refundable.';}).join('<br/>');
            }
            var em = block.match(/proposal-enhanced-fare-rules-\d+-penalties-exchange-value[^>]*>([^<]*)<\/span>/);
            if (em) {
                var eRaw = em[1].replace(/plus any difference in fare and taxes[^;]*/gi,'').trim().replace(/;$/,'').trim();
                exchange = eRaw.split(';').map(function(p){return p.trim();}).filter(Boolean)
                    .map(function(p){return p+' plus any difference in fare and taxes';}).join('<br/>');
            }
            var fc = block.match(/proposal-enhanced-fare-rules-\d+-flight-conditions-value[^>]*>([^<]*)<\/span>/);
            if (fc) flightConditions = fc[1].trim();

            if (refund || exchange || flightConditions) {
                fareRulesBlocks.push({option:optNum, refund:refund, exchange:exchange, flightConditions:flightConditions});
            }
        }

        var section2Html = '';
        if (fareRulesBlocks.length > 0) {
            fareRulesBlocks.forEach(function(fr) {
                section2Html += '<div style="margin-bottom:12px">'
                    + '<strong style="color:'+PINK+';font-size:11px;display:block;margin-bottom:8px">Option '+fr.option+' Airfare Rules:</strong>'
                    + '<span style="font-size:10px;line-height:1.6;display:block">';
                if (fr.refund)          section2Html += '<strong style="font-size:10px">Penalties - Refund:</strong><br/>'+fr.refund;
                if (fr.exchange)        section2Html += (fr.refund?'<br/><br/>':'')+'<strong style="font-size:10px">Penalties - Exchange:</strong><br/>'+fr.exchange;
                if (fr.flightConditions)section2Html += (fr.refund||fr.exchange?'<br/><br/>':'')+'<strong style="font-size:10px">Flight Conditions:</strong><br/>'+fr.flightConditions;
                section2Html += '</span></div><div style="border-bottom:1px solid #e8e8e8;margin:10px 0"></div>';
            });
            section2Html = section2Html.replace(/<div style="border-bottom:1px solid #e8e8e8;margin:10px 0"><\/div>$/, '');
        }

        // ── Passenger count per option ────────────────────────────────────────
        // Extract from price breakdown table before we remove it.
        // We scan the raw html for each option block.
        var paxMap = {};
        // Build a map of option index -> option HTML block
        var splitByOpt = html.split(/<table id="proposal-enhanced-(\d+)-air-option"/);
        // splitByOpt[0] = content before first option
        // then alternates: optIdx, optContent, optIdx, optContent...
        for (var si = 1; si < splitByOpt.length; si += 2) {
            var optIdx   = splitByOpt[si];
            var optBlock = splitByOpt[si + 1] || '';
            var counts   = {};
            var paxRowRe = /<td[^>]*proposal-enhanced-pbd-left-align[^>]*>\s*(Adult|Child|Infant)\s*<\/td>[\s\S]*?x\s*(\d+)/gi;
            var pr;
            while ((pr = paxRowRe.exec(optBlock)) !== null) {
                var t = pr[1].toLowerCase();
                counts[t] = (counts[t] || 0) + parseInt(pr[2], 10);
            }
            var parts = [];
            ['adult','child','infant'].forEach(function(t) {
                if (!counts[t]) return;
                var n = counts[t];
                parts.push(n + ' ' + (n === 1 ? t : (t === 'child' ? 'children' : t + 's')));
            });
            paxMap[optIdx] = parts.length ? parts.join(', ') : '1 adult';
        }

        // ── Standard cleanups ─────────────────────────────────────────────────
        html = html.replace(/<tr>\s*<td[^>]*proposal-enhanced-price-break-down[^>]*>[\s\S]*?<\/td>\s*<\/tr>/g, '');
        html = html.replace(/<table[^>]*role="none"[^>]*>\s*<tbody>\s*<tr[^>]*style="height:\s*10px"[^>]*>\s*<\/tr>\s*<\/tbody>\s*<\/table>/g, '');
        html = html.replace(/<strong[^>]*-(seats|meal|emission)-label[^>]*>[^<]*<\/strong>\s*<span[^>]*>[^<]*<\/span>\s*/g, '');
        if (isCompact) {
            html = html.replace(/<tr>\s*<td>\s*<strong id="proposal-compact[^"]*emission[^>]*>[\s\S]*?<\/tr>/g, '');
        }
        html = html.replace(/<tr>\s*<td width="100%">\s*<table id="proposal-enhanced-\d+-hotel-segment-\d+-hotel-images"[\s\S]{1,3000}?<\/table>\s*<\/td>\s*<\/tr>/g, '');
        html = html.replace(/<tr>\s*<td>\s*<img[^>]*class="proposal-enhanced-hotel-image"[^>]*>\s*<\/td>\s*<\/tr>/g, '');

        // Gap fix
        html = html.replace(/(<td[^>]*class="[^"]*proposal-enhanced-row-connect-left[^"]*")[^>]*width="[^"]*"/g, '$1');
        html = html.replace(/(<td[^>]*class="[^"]*proposal-enhanced-row-connect-right[^"]*")(?![^>]*width=)/g, '$1 width="50%"');

        // Passenger names box
        var paxNameRe = new RegExp('(<span id="'+proposalType+'-passengers-list"[^>]*)>([\\s\\S]*?)<\\/span>', 'g');
        html = html.replace(paxNameRe, function(match, attrs, content) {
            return content.replace(/<[^>]*>/g,'').trim()
                ? '<br/><br/><div style="background:#fff;border:1px solid #e0e0e0;border-radius:4px;padding:14px;margin:10px 0">'
                  + '<strong style="color:'+PINK+';font-size:11px;display:block;margin-bottom:10px">✈️ PASSENGER NAME AS PER PHOTO ID / PASSPORT:</strong>'
                  + '<span id="'+proposalType+'-passengers-list"'+attrs+' style="font-size:10px;line-height:1.6;display:block">'+content+'</span></div>'
                : match;
        });

        // Alignment and styling
        html = html.replace(/align="center"/g, 'align="left"');
        html = html.replace(/<strong id="proposal-compact-\d+-(air|hotel|car)-segment-title"/g, '<strong id="proposal-compact-segment-title" style="color:'+PINK+';"');
        html = html.replace(/<strong id="proposal-enhanced-\d+-(air|hotel|car)-segment-title"/g, '<strong id="proposal-enhanced-segment-title" style="color:'+PINK+';"');
        html = html.replace(/(<strong[^>]*>)(Flight|Hotel|Car) Option (\d+)(<\/strong>)/g, '$1<span style="color:'+PINK+';">$2 Option $3</span>$4');

        // Spacing
        if (isCompact) {
            html = html.replace(/\.proposal-compact-section-table \{([^}]*)\}/g, '.proposal-compact-section-table {$1margin-bottom:30px;}');
            html = html.replace(/<table([^>]*class="[^"]*proposal-compact-segment-header[^"]*"[^>]*)>/g, function(m,a){return a.includes('style=')?m:'<table'+a+' style="margin-bottom:20px;">';});
            html = html.replace(/<table([^>]*class="[^"]*proposal-compact-connected[^"]*"[^>]*)>/g,        function(m,a){return a.includes('style=')?m:'<table'+a+' style="margin-bottom:15px;">';});
        } else {
            html = html.replace(/\.proposal-enhanced-section-table \{([^}]*)\}/g, '.proposal-enhanced-section-table {$1margin-bottom:30px;}');
            html = html.replace(/<table([^>]*class="[^"]*proposal-enhanced-padding[^"]*"[^>]*)>/g,        function(m,a){return a.includes('style=')?m:'<table'+a+' style="padding-top:18px;padding-bottom:18px;">';});
            html = html.replace(/<table id="proposal-enhanced-(\d+-air-segment-\d+)"([^>]*)>/g,           '<table id="proposal-enhanced-$1" style="margin-bottom:20px;"$2>');
            html = html.replace(/<table id="proposal-enhanced-(\d+-air-segment-\d+-layover)"([^>]*)>/g,   '<table id="proposal-enhanced-$1" style="margin-bottom:20px;"$2>');
            html = html.replace(/<table([^>]*class="[^"]*proposal-enhanced-segment-header[^"]*"[^>]*)>/g, function(m,a){return a.includes('style=')?m:'<table'+a+' style="margin-bottom:20px;">';});
        }

        // Outlook cleanup
        html = html.replace(/\srole="presentation"/g, '');
        html = html.replace(/box-sizing:\s*[^;]+;?/g, '');
        html = html.replace(/\s*!important/g, '');

        // ── Passenger summary injected into price header cell ─────────────────
        // We wrap the existing price cell contents so we can update it later,
        // and add the pax summary label beneath the price.
        html = html.replace(/<td id="proposal-enhanced-(\d+)-air-total-price"[^>]*>([\s\S]*?)<\/td>/g, function(match, idx, inner) {
            var paxSummary = paxMap[idx] || '1 adult';
            return '<td id="proposal-enhanced-'+idx+'-air-total-price" style="vertical-align:top;text-align:right">'
                + '<div data-tp-price-cell="'+idx+'">'
                + inner.trim()
                + '<div data-tp-pax-label="'+idx+'" style="font-size:9px;color:#666;text-align:right;margin-top:2px;font-weight:normal">'
                + '('+paxSummary+' - approx. total)</div>'
                + '</div></td>';
        });

        // ── Important notice ──────────────────────────────────────────────────
        var importantNotice = '<table width="100%" style="margin:20px 0"><tr><td>'
            + '<div style="background:#f5f5f5;border:1px solid #d0d0d0;border-left:3px solid '+PINK+';padding:10px 14px;border-radius:4px">'
            + '<strong style="color:'+PINK+';font-size:11px;display:block;margin-bottom:6px">IMPORTANT NOTICE</strong>'
            + '<ul style="font-style:italic;font-size:10px;margin:0;padding-left:18px;color:#333;line-height:1.4">'
            + '<li style="margin-bottom:4px">All prices quoted are subject to change until tickets are issued, even if tentatively holding.</li>'
            + '<li style="margin-bottom:4px">Airlines reserve the right to change surcharges, fare levels and taxes without notice.</li>'
            + '<li>Corporate Traveller fees are not included in your quote, as per schedule of fees, and will be charged at the time of invoicing.</li>'
            + '</ul></div></td></tr></table>';
        html = html.replace(/(<table id="[^"]*1-air-option"[^>]*>)/i, '$1<tr><td>'+importantNotice+'</td></tr>');

        // ── Car rental warning ────────────────────────────────────────────────
        if (hasCarOption) {
            var carWarning = '<table width="100%" style="margin:20px 0"><tr><td>'
                + '<div style="background:white;border:2px solid #ff9800;border-radius:8px;padding:16px">'
                + '<strong style="color:#ff9800;font-size:13px;display:block;margin-bottom:8px">⚠️ Car Rental Important Information</strong>'
                + '<ul style="font-size:11px;color:#333;margin:0;padding-left:20px">'
                + '<li>You will need a PHYSICAL credit card (not debit) in the main driver\'s name upon pick up.</li>'
                + '<li>Tolls cannot be charged back to Corporate Traveller for rentals with Avis or Budget.</li>'
                + '<li>Bookings with personal memberships attached i.e. Hertz Gold/Avis Wizard will override any chargeback of the rental to Corporate Traveller and charge your card.</li>'
                + '<li>For international rentals: International drivers license may be required.</li>'
                + '</ul></div></td></tr></table>';
            html = html.replace(/(<table id="[^"]*1-car-option"[^>]*>)/i, carWarning+'$1');
        }

        iframe.setAttribute('srcdoc', html);

        return { proposalType:proposalType, hasCarOption:hasCarOption, section2Html:section2Html, paxMap:paxMap };
    }

    // ─── CONTROL PANEL ───────────────────────────────────────────────────────
    function injectControlPanel(iframe, meta) {
        var shareContainer = document.querySelector('.share-container');
        if (!shareContainer) return;

        var existing = document.getElementById('tp-control-panel');
        if (existing) existing.parentNode.removeChild(existing);

        // Discover options present in tidied srcdoc
        var html    = iframe.getAttribute('srcdoc') || '';
        var options = [];
        var seen    = {};
        var oRe     = /id="proposal-enhanced-(\d+)-air-option"/g;
        var om;
        while ((om = oRe.exec(html)) !== null) {
            if (!seen[om[1]]) { seen[om[1]] = true; options.push(om[1]); }
        }

        // ── Build panel ───────────────────────────────────────────────────────
        var panel = document.createElement('div');
        panel.id  = 'tp-control-panel';
        panel.style.cssText = 'background:#fff;border:1px solid #e0e0e0;border-top:3px solid '+PINK
            +';border-radius:4px;padding:12px 14px;margin:8px 0 6px 0;font-family:sans-serif;font-size:11px;color:#222;box-shadow:0 2px 6px rgba(0,0,0,0.08)';

        var html2 = '';

        // Option checkboxes
        if (options.length > 0) {
            html2 += '<div style="margin-bottom:10px">'
                + '<strong style="color:'+PINK+';display:block;margin-bottom:6px;font-size:11px">Include in copy:</strong>';
            options.forEach(function(o) {
                html2 += '<label style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;cursor:pointer">'
                    + '<input type="checkbox" data-tp-opt="'+o+'" checked style="accent-color:'+PINK+'">'
                    + '<span>Option '+o+'</span></label>';
            });
            html2 += '</div>';
        }

        // Markup inputs
        if (options.length > 0) {
            html2 += '<div style="margin-bottom:10px;display:flex;align-items:center;flex-wrap:wrap;gap:6px">'
                + '<strong style="color:'+PINK+';font-size:11px;margin-right:4px">Markup per pax (AUD):</strong>';
            options.forEach(function(o) {
                html2 += '<label style="display:inline-flex;align-items:center;gap:3px">'
                    + '<span style="color:#555;font-size:10px">Opt '+o+'</span>'
                    + '<input type="number" min="0" step="1" placeholder="0" data-tp-markup="'+o+'" '
                    + 'style="width:68px;padding:2px 5px;border:1px solid #ccc;border-radius:3px;font-size:11px">'
                    + '</label>';
            });
            html2 += '<button id="tp-apply-markup" style="padding:3px 10px;background:'+PINK+';color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:11px">Apply</button>';
            html2 += '</div>';
        }

        // T&Cs + Copy row
        html2 += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
            + '<label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer">'
            + '<input type="checkbox" id="tp-tcs-toggle" style="accent-color:'+TEAL+';width:14px;height:14px">'
            + '<span style="font-size:11px;font-weight:600;color:'+TEAL+'">Include T&amp;Cs</span>'
            + '</label>'
            + '<button id="tp-copy-btn" style="padding:5px 16px;background:'+PINK+';color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:12px;font-weight:600">📋 Copy to clipboard</button>'
            + '<span id="tp-copy-status" style="font-size:10px;color:green;display:none">✓ Copied!</span>'
            + '</div>';

        panel.innerHTML = html2;
        shareContainer.insertBefore(panel, shareContainer.firstChild);

        // ── Markup apply handler ──────────────────────────────────────────────
        var applyBtn = document.getElementById('tp-apply-markup');
        if (applyBtn) {
            applyBtn.addEventListener('click', function() {
                var currentHtml = iframe.getAttribute('srcdoc') || '';

                options.forEach(function(o) {
                    var input  = panel.querySelector('[data-tp-markup="'+o+'"]');
                    var markup = parseFloat(input ? input.value : '0') || 0;
                    if (!markup) return;

                    // Update the displayed price inside data-tp-price-cell
                    // The price number follows &nbsp; inside the outermost price span
                    currentHtml = currentHtml.replace(
                        new RegExp('(data-tp-price-cell="'+o+'"[\\s\\S]{1,400}?&nbsp;)([\\d,]+\\.\\d{2})'),
                        function(m, prefix, priceStr) {
                            var base     = parseFloat(priceStr.replace(/,/g,''));
                            var paxCount = getPaxCount(meta.paxMap[o]);
                            var newPrice = (base + markup * paxCount).toFixed(2);
                            return prefix + newPrice;
                        }
                    );

                    // Update pax label to reflect markup
                    currentHtml = currentHtml.replace(
                        new RegExp('(data-tp-pax-label="'+o+'"[^>]*>)([^<]*)'),
                        function(m, tag, label) {
                            var clean = label.replace(/\s*\+\s*AUD\s*[\d\.]+\s*markup/i,'').replace(/\s*-\s*approx\.\s*total/i,'').trim();
                            return tag + clean + ' + AUD '+markup.toFixed(2)+' markup - approx. total';
                        }
                    );
                });

                iframe.setAttribute('srcdoc', currentHtml);
                applyBtn.textContent        = '✓ Applied';
                applyBtn.style.background   = TEAL;
                setTimeout(function(){ applyBtn.textContent = 'Apply'; applyBtn.style.background = PINK; }, 2000);
            });
        }

        // ── Copy handler ──────────────────────────────────────────────────────
        var copyBtn    = document.getElementById('tp-copy-btn');
        var tcsToggle  = document.getElementById('tp-tcs-toggle');
        var copyStatus = document.getElementById('tp-copy-status');

        copyBtn.addEventListener('click', function() {
            var selectedOpts = options.filter(function(o) {
                var cb = panel.querySelector('[data-tp-opt="'+o+'"]');
                return cb && cb.checked;
            });
            if (selectedOpts.length === 0) { alert('Select at least one option to copy.'); return; }

            if (tcsToggle && tcsToggle.checked) {
                fetch(TC_URL)
                    .then(function(r){ return r.text(); })
                    .then(function(footer){ buildAndCopy(iframe, meta, selectedOpts, footer, copyStatus); })
                    .catch(function(e){ alert('Error loading T&Cs: '+e.message); });
            } else {
                buildAndCopy(iframe, meta, selectedOpts, null, copyStatus);
            }
        });
    }

    // ─── BUILD & COPY ─────────────────────────────────────────────────────────
    function buildAndCopy(iframe, meta, selectedOpts, tcFooter, statusEl) {
        var srcHtml = iframe.getAttribute('srcdoc') || '';
        var parser  = new DOMParser();
        var doc     = parser.parseFromString(srcHtml, 'text/html');

        // Header (agency info + passenger names)
        var headerTable = doc.querySelector('table.proposal-enhanced-section-table.proposal-enhanced-main-header-padding');
        var headerHtml  = headerTable ? headerTable.outerHTML : '';

        // Selected option tables
        var optionsHtml = '';
        selectedOpts.forEach(function(o) {
            var t = doc.getElementById('proposal-enhanced-'+o+'-air-option');
            if (t) optionsHtml += t.outerHTML;
        });

        // Styles
        var styleHtml = '';
        doc.querySelectorAll('style').forEach(function(s){ styleHtml += s.outerHTML; });

        // T&Cs footer
        var footerHtml = '';
        if (tcFooter) {
            var carDiv = '';
            if (meta.hasCarOption) {
                carDiv = '<div style="background:white;border:2px solid #ff9800;border-radius:8px;padding:16px;margin-bottom:16px">'
                    + '<strong style="color:#ff9800;font-size:13px;display:block;margin-bottom:8px">Car Rental Important Information</strong>'
                    + '<ul style="font-size:11px;color:#333;margin:0;padding-left:20px">'
                    + '<li>You will need a PHYSICAL credit card (not debit) in the main driver\'s name upon pick up.</li>'
                    + '<li>Tolls cannot be charged back to Corporate Traveller for rentals with Avis or Budget.</li>'
                    + '<li>Bookings with personal memberships attached i.e. Hertz Gold/Avis Wizard will override any chargeback of the rental to Corporate Traveller and charge your card.</li>'
                    + '<li>For international rentals: International drivers license may be required.</li>'
                    + '</ul></div><div style="border-bottom:1px solid #e8e8e8;margin:16px 0"></div>';
            }
            if (meta.section2Html) {
                tcFooter = tcFooter.replace(
                    /<strong style="color:#ff2e5f;font-size:11px;display:block;margin-bottom:10px">Airfare Rules:<\/strong>\s*<span style="font-size:10px">[\s\S]*?<\/span>/,
                    meta.section2Html
                );
            }
            footerHtml = '<table width="100%" style="margin-top:30px"><tr><td>'
                + '<div style="background:#f8f8f8;border:1px solid #e0e0e0;padding:16px;border-radius:4px">'
                + carDiv + tcFooter + '</div></td></tr></table>';
        }

        var finalHtml = '<!DOCTYPE html><html><head><meta charset="utf-8">'+styleHtml+'</head><body>'
            + '<table width="100%" border="0" cellpadding="0" cellspacing="0"><tbody>'
            + '<tr><td>'+headerHtml+'</td></tr>'
            + '<tr><td>'+optionsHtml+'</td></tr>'
            + (footerHtml ? '<tr><td>'+footerHtml+'</td></tr>' : '')
            + '</tbody></table></body></html>';

        if (navigator.clipboard && window.ClipboardItem) {
            var blob = new Blob([finalHtml], {type:'text/html'});
            navigator.clipboard.write([new ClipboardItem({'text/html':blob})])
                .then(function(){ showCopied(statusEl); })
                .catch(function(){ fallbackCopy(finalHtml, statusEl); });
        } else {
            fallbackCopy(finalHtml, statusEl);
        }
    }

    // ─── ENTRY POINT ─────────────────────────────────────────────────────────
    function run() {
        var iframe = document.querySelector('.share-container iframe');
        if (!iframe) return false;
        try {
            var meta = tidyProposal(iframe);
            if (!meta) return false;
            injectControlPanel(iframe, meta);
            return true;
        } catch(e) {
            alert('Tidy error: '+e.message);
            return false;
        }
    }

    if (!run()) {
        var attempts = 0;
        var retryInterval = setInterval(function() {
            attempts++;
            if (run() || attempts > 20) {
                clearInterval(retryInterval);
                if (attempts > 20) alert('Could not find Proposal. Ensure you have clicked Share first.');
            }
        }, 500);
    }

})();
