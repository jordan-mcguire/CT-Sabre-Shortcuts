(function () {

    // ─── CONSTANTS ────────────────────────────────────────────────────────────
    var PINK  = '#ff2e5f';
    var TEAL  = '#00434e';
    var TC_URL = 'https://raw.githubusercontent.com/jordan-mcguire/tp-tidy/main/terms-footer.html';
    // Max width wrapper applied to copied output so it doesn't fill the full Outlook window
    var MAX_WIDTH = '700px';

    // ─── HELPERS ──────────────────────────────────────────────────────────────
    function getPaxCount(paxLabel) {
        if (!paxLabel) return 1;
        var total = 0;
        var m = paxLabel.match(/(\d+)/g);
        if (m) m.forEach(function (n) { total += parseInt(n, 10); });
        return total || 1;
    }

    function showCopied(btn) {
        var orig = btn.textContent;
        btn.textContent = '✓ Copied!';
        btn.style.background = TEAL;
        setTimeout(function () { btn.textContent = orig; btn.style.background = PINK; }, 2500);
    }

    function fallbackCopy(html) {
        var ta = document.createElement('textarea');
        ta.value = html;
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }

    function writeToClipboard(html, btn) {
        if (navigator.clipboard && window.ClipboardItem) {
            var blob = new Blob([html], { type: 'text/html' });
            navigator.clipboard.write([new ClipboardItem({ 'text/html': blob })])
                .then(function () { showCopied(btn); })
                .catch(function () { fallbackCopy(html); showCopied(btn); });
        } else {
            fallbackCopy(html);
            showCopied(btn);
        }
    }

    // ─── STATE ────────────────────────────────────────────────────────────────
    // Stores per-option markup values and checkbox states (set via the injected
    // controls inside the iframe). Also tracks whether T&Cs are currently
    // previewed so we can toggle them out again.
    var state = {
        markups:     {},   // optIdx -> float AUD per pax
        included:    {},   // optIdx -> bool
        tcsActive:   false,
        tcFooterHtml: null,
        baseHtml:    null, // srcdoc after tidy, before any T&Cs injection
        meta:        null
    };

    // ─── TIDY ─────────────────────────────────────────────────────────────────
    function tidyProposal(iframe) {
        var html = iframe.getAttribute('srcdoc');
        if (!html) return null;

        var isCompact    = html.indexOf('proposal-compact') !== -1;
        var proposalType = isCompact ? 'proposal-compact' : 'proposal-enhanced';
        var hasCarOption = html.toLowerCase().indexOf('car option') > -1;

        // ── Fare rules extraction (before removal) ────────────────────────────
        var fareRulesBlocks = [];
        var frRe = /<table id="proposal-enhanced-fare-rules-(\d+)"[\s\S]*?<\/table>\s*(?=\s*<\/td>)/g;
        var frM;
        while ((frM = frRe.exec(html)) !== null) {
            var optNum = frM[1], block = frM[0];
            var refund = '', exchange = '', fc = '';
            var rm = block.match(/proposal-enhanced-fare-rules-\d+-penalties-refund-value[^>]*>([^<]*)<\/span>/);
            if (rm) {
                var rr = rm[1].replace(/\.\s*PLEASE NOTE:[^;]*/gi, '').replace(/penalty applies[^;]*/gi, '').trim().replace(/\.$/, '').trim();
                refund = rr.split(';').map(function (p) { return p.trim(); }).filter(Boolean)
                    .map(function (p) { return p + ' penalty applies. PLEASE NOTE: Some taxes and surcharges may be non refundable.'; }).join('<br/>');
            }
            var em = block.match(/proposal-enhanced-fare-rules-\d+-penalties-exchange-value[^>]*>([^<]*)<\/span>/);
            if (em) {
                var er = em[1].replace(/plus any difference in fare and taxes[^;]*/gi, '').trim().replace(/;$/, '').trim();
                exchange = er.split(';').map(function (p) { return p.trim(); }).filter(Boolean)
                    .map(function (p) { return p + ' plus any difference in fare and taxes'; }).join('<br/>');
            }
            var fcm = block.match(/proposal-enhanced-fare-rules-\d+-flight-conditions-value[^>]*>([^<]*)<\/span>/);
            if (fcm) fc = fcm[1].trim();
            if (refund || exchange || fc) fareRulesBlocks.push({ option: optNum, refund: refund, exchange: exchange, flightConditions: fc });
        }

        // Build Section 2 HTML
        var section2Html = '';
        if (fareRulesBlocks.length > 0) {
            fareRulesBlocks.forEach(function (fr) {
                section2Html += '<div style="margin-bottom:12px">'
                    + '<strong style="color:' + PINK + ';font-size:11px;display:block;margin-bottom:8px">Option ' + fr.option + ' Airfare Rules:</strong>'
                    + '<span style="font-size:10px;line-height:1.6;display:block">';
                if (fr.refund)          section2Html += '<strong style="font-size:10px">Penalties - Refund:</strong><br/>' + fr.refund;
                if (fr.exchange)        section2Html += (fr.refund ? '<br/><br/>' : '') + '<strong style="font-size:10px">Penalties - Exchange:</strong><br/>' + fr.exchange;
                if (fr.flightConditions)section2Html += (fr.refund || fr.exchange ? '<br/><br/>' : '') + '<strong style="font-size:10px">Flight Conditions:</strong><br/>' + fr.flightConditions;
                section2Html += '</span></div><div style="border-bottom:1px solid #e8e8e8;margin:10px 0"></div>';
            });
            section2Html = section2Html.replace(/<div style="border-bottom:1px solid #e8e8e8;margin:10px 0"><\/div>$/, '');
        }

        // ── Remove fare rules blocks from the body of each option ────────────
        // They will only appear in the T&Cs section below, not inline.
        html = html.replace(/<strong[^>]*proposal-enhanced-fare-rules-label[^>]*>[\s\S]*?<\/strong>\s*<table id="proposal-enhanced-fare-rules-\d+"[\s\S]*?<\/table>/g, '');
        // Also remove the containing td if it is now empty
        html = html.replace(/<td id="proposal-enhanced-fare-rules-content">\s*<\/td>/g, '');

        // ── Passenger counts per option ───────────────────────────────────────
        var paxMap = {};
        var parts  = html.split(/<table id="proposal-enhanced-(\d+)-air-option"/);
        for (var si = 1; si < parts.length; si += 2) {
            var oi = parts[si], ob = parts[si + 1] || '';
            var counts = {}, prRe = /<td[^>]*proposal-enhanced-pbd-left-align[^>]*>\s*(Adult|Child|Infant)\s*<\/td>[\s\S]*?x\s*(\d+)/gi, pr;
            while ((pr = prRe.exec(ob)) !== null) {
                var t = pr[1].toLowerCase();
                counts[t] = (counts[t] || 0) + parseInt(pr[2], 10);
            }
            var pp = [];
            ['adult', 'child', 'infant'].forEach(function (t) {
                if (!counts[t]) return;
                var n = counts[t];
                pp.push(n + ' ' + (n === 1 ? t : (t === 'child' ? 'children' : t + 's')));
            });
            paxMap[oi] = pp.length ? pp.join(', ') : '1 adult';
        }

        // ── Standard cleanups ─────────────────────────────────────────────────
        html = html.replace(/<tr>\s*<td[^>]*proposal-enhanced-price-break-down[^>]*>[\s\S]*?<\/td>\s*<\/tr>/g, '');
        html = html.replace(/<table[^>]*role="none"[^>]*>\s*<tbody>\s*<tr[^>]*style="height:\s*10px"[^>]*>\s*<\/tr>\s*<\/tbody>\s*<\/table>/g, '');
        html = html.replace(/<strong[^>]*-(seats|meal|emission)-label[^>]*>[^<]*<\/strong>\s*<span[^>]*>[^<]*<\/span>\s*/g, '');
        if (isCompact) html = html.replace(/<tr>\s*<td>\s*<strong id="proposal-compact[^"]*emission[^>]*>[\s\S]*?<\/tr>/g, '');
        html = html.replace(/<tr>\s*<td width="100%">\s*<table id="proposal-enhanced-\d+-hotel-segment-\d+-hotel-images"[\s\S]{1,3000}?<\/table>\s*<\/td>\s*<\/tr>/g, '');
        html = html.replace(/<tr>\s*<td>\s*<img[^>]*class="proposal-enhanced-hotel-image"[^>]*>\s*<\/td>\s*<\/tr>/g, '');

        // Gap fix
        html = html.replace(/(<td[^>]*class="[^"]*proposal-enhanced-row-connect-left[^"]*")[^>]*width="[^"]*"/g, '$1');
        html = html.replace(/(<td[^>]*class="[^"]*proposal-enhanced-row-connect-right[^"]*")(?![^>]*width=)/g, '$1 width="50%"');

        // Passenger names box
        var pnRe = new RegExp('(<span id="' + proposalType + '-passengers-list"[^>]*)>([\\s\\S]*?)<\\/span>', 'g');
        html = html.replace(pnRe, function (match, attrs, content) {
            return content.replace(/<[^>]*>/g, '').trim()
                ? '<br/><br/><div style="background:#fff;border:1px solid #e0e0e0;border-radius:4px;padding:14px;margin:10px 0">'
                  + '<strong style="color:' + PINK + ';font-size:11px;display:block;margin-bottom:10px">✈️ PASSENGER NAME AS PER PHOTO ID / PASSPORT:</strong>'
                  + '<span id="' + proposalType + '-passengers-list"' + attrs + ' style="font-size:10px;line-height:1.6;display:block">' + content + '</span></div>'
                : match;
        });

        // Alignment and styling
        html = html.replace(/align="center"/g, 'align="left"');
        html = html.replace(/<strong id="proposal-compact-\d+-(air|hotel|car)-segment-title"/g,  '<strong id="proposal-compact-segment-title" style="color:' + PINK + ';"');
        html = html.replace(/<strong id="proposal-enhanced-\d+-(air|hotel|car)-segment-title"/g, '<strong id="proposal-enhanced-segment-title" style="color:' + PINK + ';"');
        html = html.replace(/(<strong[^>]*>)(Flight|Hotel|Car) Option (\d+)(<\/strong>)/g, '$1<span style="color:' + PINK + ';">$2 Option $3</span>$4');

        // Spacing
        if (isCompact) {
            html = html.replace(/\.proposal-compact-section-table \{([^}]*)\}/g, '.proposal-compact-section-table {$1margin-bottom:30px;}');
            html = html.replace(/<table([^>]*class="[^"]*proposal-compact-segment-header[^"]*"[^>]*)>/g, function (m, a) { return a.includes('style=') ? m : '<table' + a + ' style="margin-bottom:20px;">'; });
            html = html.replace(/<table([^>]*class="[^"]*proposal-compact-connected[^"]*"[^>]*)>/g,        function (m, a) { return a.includes('style=') ? m : '<table' + a + ' style="margin-bottom:15px;">'; });
        } else {
            html = html.replace(/\.proposal-enhanced-section-table \{([^}]*)\}/g, '.proposal-enhanced-section-table {$1margin-bottom:30px;}');
            html = html.replace(/<table([^>]*class="[^"]*proposal-enhanced-padding[^"]*"[^>]*)>/g,        function (m, a) { return a.includes('style=') ? m : '<table' + a + ' style="padding-top:18px;padding-bottom:18px;">'; });
            html = html.replace(/<table id="proposal-enhanced-(\d+-air-segment-\d+)"([^>]*)>/g,           '<table id="proposal-enhanced-$1" style="margin-bottom:20px;"$2>');
            html = html.replace(/<table id="proposal-enhanced-(\d+-air-segment-\d+-layover)"([^>]*)>/g,   '<table id="proposal-enhanced-$1" style="margin-bottom:20px;"$2>');
            html = html.replace(/<table([^>]*class="[^"]*proposal-enhanced-segment-header[^"]*"[^>]*)>/g, function (m, a) { return a.includes('style=') ? m : '<table' + a + ' style="margin-bottom:20px;">'; });
        }

        // Outlook cleanup
        html = html.replace(/\srole="presentation"/g, '');
        html = html.replace(/box-sizing:\s*[^;]+;?/g, '');
        html = html.replace(/\s*!important/g, '');

        // ── Price header: passenger summary below price, controls injected later ──
        // We wrap the price cell with data attrs so the injected iframe controls
        // can update the displayed number and pax label live.
        html = html.replace(/<td id="proposal-enhanced-(\d+)-air-total-price"[^>]*>([\s\S]*?)<\/td>/g, function (match, idx, inner) {
            var paxSummary = paxMap[idx] || '1 adult';
            return '<td id="proposal-enhanced-' + idx + '-air-total-price" style="vertical-align:top;text-align:right">'
                + '<div data-tp-price-cell="' + idx + '">'
                + inner.trim()
                + '<div data-tp-pax-label="' + idx + '" style="font-size:9px;color:#666;text-align:right;margin-top:4px;padding-top:2px;font-weight:normal;letter-spacing:0.02em">'
                + paxSummary.toUpperCase() + ' - APPROX. TOTAL</div>'
                + '</div></td>';
        });

        // ── Important notice above option 1 ───────────────────────────────────
        var importantNotice = '<table width="100%" style="margin:20px 0"><tr><td>'
            + '<div style="background:#f5f5f5;border:1px solid #d0d0d0;border-left:3px solid ' + PINK + ';padding:10px 14px;border-radius:4px">'
            + '<strong style="color:' + PINK + ';font-size:11px;display:block;margin-bottom:6px">IMPORTANT NOTICE</strong>'
            + '<ul style="font-style:italic;font-size:10px;margin:0;padding-left:18px;color:#333;line-height:1.4">'
            + '<li style="margin-bottom:4px">All prices quoted are subject to change until tickets are issued, even if tentatively holding.</li>'
            + '<li style="margin-bottom:4px">Airlines reserve the right to change surcharges, fare levels and taxes without notice.</li>'
            + '<li>Corporate Traveller fees are not included in your quote, as per schedule of fees, and will be charged at the time of invoicing.</li>'
            + '</ul></div></td></tr></table>';
        html = html.replace(/(<table id="[^"]*1-air-option"[^>]*>)/i, '$1<tr><td>' + importantNotice + '</td></tr>');

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
            html = html.replace(/(<table id="[^"]*1-car-option"[^>]*>)/i, carWarning + '$1');
        }

        iframe.setAttribute('srcdoc', html);

        return { proposalType: proposalType, hasCarOption: hasCarOption, section2Html: section2Html, paxMap: paxMap };
    }

    // ─── INJECT CONTROLS INTO IFRAME ─────────────────────────────────────────
    // Injects per-option markup inputs and include checkboxes directly into
    // the srcdoc, positioned in the price header row of each option.
    function injectIframeControls(iframe, meta, options) {
        var html = iframe.getAttribute('srcdoc') || '';

        options.forEach(function (o) {
            // We look for the wrapper div we injected around the price cell and
            // append a small control row beneath the pax label.
            var controlHtml = '<div data-tp-controls="' + o + '" style="margin-top:6px;display:flex;flex-direction:column;align-items:flex-end;gap:4px">'
                // Include checkbox
                + '<label style="display:inline-flex;align-items:center;gap:4px;font-size:9px;color:#555;cursor:pointer;font-family:sans-serif">'
                + '<input type="checkbox" data-tp-opt="' + o + '" checked style="accent-color:' + PINK + ';width:11px;height:11px">'
                + '<span>Include in copy</span>'
                + '</label>'
                // Markup input
                + '<div style="display:inline-flex;align-items:center;gap:3px;font-size:9px;font-family:sans-serif;color:#555">'
                + '<span>Markup AUD/pax</span>'
                + '<input type="number" min="0" step="1" placeholder="0" data-tp-markup="' + o + '" '
                + 'style="width:58px;padding:2px 4px;border:1px solid #ddd;border-radius:3px;font-size:9px;text-align:right">'
                + '<button data-tp-apply="' + o + '" '
                + 'style="padding:2px 7px;background:' + PINK + ';color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:9px;font-family:sans-serif">Apply</button>'
                + '</div>'
                + '</div>';

            // Insert inside the data-tp-price-cell div, after the pax label
            html = html.replace(
                new RegExp('(data-tp-pax-label="' + o + '"[^>]*>[^<]*<\\/div>)(?=\\s*<\\/div>)'),
                '$1' + controlHtml
            );
        });

        // Inject a script into the srcdoc to wire up the apply buttons
        var iframeScript = '<script>'
            + '(function(){'
            + '  document.addEventListener("click", function(e){'
            + '    var btn = e.target.closest("[data-tp-apply]");'
            + '    if (!btn) return;'
            + '    var o = btn.getAttribute("data-tp-apply");'
            + '    var inp = document.querySelector("[data-tp-markup=\\"" + o + "\\"]");'
            + '    var markup = parseFloat(inp ? inp.value : "0") || 0;'
            + '    if (!markup) return;'
            + '    // Send to parent window'
            + '    window.parent.postMessage({type:"tp-apply-markup", option:o, markup:markup}, "*");'
            + '    btn.textContent = "✓";'
            + '    setTimeout(function(){ btn.textContent = "Apply"; }, 1500);'
            + '  });'
            + '  document.addEventListener("change", function(e){'
            + '    var cb = e.target.closest("[data-tp-opt]");'
            + '    if (!cb) return;'
            + '    window.parent.postMessage({type:"tp-opt-toggle", option:cb.getAttribute("data-tp-opt"), checked:cb.checked}, "*");'
            + '  });'
            + '})();'
            + '<\/script>';

        html = html.replace('</body>', iframeScript + '</body>');

        iframe.setAttribute('srcdoc', html);
    }

    // ─── APPLY MARKUP TO SRCDOC ───────────────────────────────────────────────
    function applyMarkup(iframe, optIdx, markupPerPax, paxLabel) {
        var html     = iframe.getAttribute('srcdoc') || '';
        var paxCount = getPaxCount(paxLabel);

        html = html.replace(
            new RegExp('(data-tp-price-cell="' + optIdx + '"[\\s\\S]{1,600}?&nbsp;)([\\d,]+\\.\\d{2})'),
            function (m, prefix, priceStr) {
                var base     = parseFloat(priceStr.replace(/,/g, ''));
                var newTotal = (base + markupPerPax * paxCount).toFixed(2);
                return prefix + newTotal;
            }
        );

        iframe.setAttribute('srcdoc', html);
    }

    // ─── T&CS TOGGLE ──────────────────────────────────────────────────────────
    function applyTCs(iframe, meta, footer) {
        var html = iframe.getAttribute('srcdoc') || '';

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

        var tcFooter = footer;
        if (meta.section2Html) {
            tcFooter = tcFooter.replace(
                /<strong style="color:#ff2e5f;font-size:11px;display:block;margin-bottom:10px">Airfare Rules:<\/strong>\s*<span style="font-size:10px">[\s\S]*?<\/span>/,
                meta.section2Html
            );
        }

        var footerBlock = '<table id="tp-tcs-block" width="100%" style="margin-top:30px"><tr><td>'
            + '<div style="background:#f8f8f8;border:1px solid #e0e0e0;padding:16px;border-radius:4px">'
            + carDiv + tcFooter + '</div></td></tr></table>';

        html = html.replace(/(<\/td>\s*<\/tr>\s*<\/table>\s*<\/body>)/i, footerBlock + '$1');
        iframe.setAttribute('srcdoc', html);
    }

    function removeTCs(iframe) {
        var html = iframe.getAttribute('srcdoc') || '';
        html = html.replace(/<table id="tp-tcs-block"[\s\S]*?<\/table>\s*(?=<\/td>\s*<\/tr>\s*<\/table>\s*<\/body>)/i, '');
        iframe.setAttribute('srcdoc', html);
    }

    // ─── BUILD COPY HTML ──────────────────────────────────────────────────────
    function buildCopyHtml(iframe, meta, selectedOpts, includeTCs, tcFooter) {
        var srcHtml = iframe.getAttribute('srcdoc') || '';
        var parser  = new DOMParser();
        var doc     = parser.parseFromString(srcHtml, 'text/html');

        // Remove injected iframe controls from copy output
        doc.querySelectorAll('[data-tp-controls]').forEach(function (el) { el.parentNode.removeChild(el); });

        // Header
        var headerTable = doc.querySelector('table.proposal-enhanced-section-table.proposal-enhanced-main-header-padding');
        var headerHtml  = headerTable ? headerTable.outerHTML : '';

        // Selected options only
        var optionsHtml = '';
        selectedOpts.forEach(function (o) {
            var t = doc.getElementById('proposal-enhanced-' + o + '-air-option');
            if (t) optionsHtml += t.outerHTML;
        });

        // Styles
        var styleHtml = '';
        doc.querySelectorAll('style').forEach(function (s) { styleHtml += s.outerHTML; });

        // T&Cs footer
        var footerHtml = '';
        if (includeTCs && tcFooter) {
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
            var tc = tcFooter;
            if (meta.section2Html) {
                tc = tc.replace(
                    /<strong style="color:#ff2e5f;font-size:11px;display:block;margin-bottom:10px">Airfare Rules:<\/strong>\s*<span style="font-size:10px">[\s\S]*?<\/span>/,
                    meta.section2Html
                );
            }
            footerHtml = '<table width="100%" style="margin-top:30px"><tr><td>'
                + '<div style="background:#f8f8f8;border:1px solid #e0e0e0;padding:16px;border-radius:4px">'
                + carDiv + tc + '</div></td></tr></table>';
        }

        // Wrap everything in a max-width container for Outlook
        var finalHtml = '<!DOCTYPE html><html><head><meta charset="utf-8">' + styleHtml + '</head><body>'
            + '<div style="max-width:' + MAX_WIDTH + ';margin:0 auto">'
            + '<table width="100%" border="0" cellpadding="0" cellspacing="0"><tbody>'
            + '<tr><td>' + headerHtml + '</td></tr>'
            + '<tr><td>' + optionsHtml + '</td></tr>'
            + (footerHtml ? '<tr><td>' + footerHtml + '</td></tr>' : '')
            + '</tbody></table>'
            + '</div>'
            + '</body></html>';

        return finalHtml;
    }

    // ─── INJECT OUTER CONTROLS (T&Cs + Copy near Close/Copy buttons) ─────────
    function injectOuterControls(iframe, meta, options) {
        // Remove any existing outer controls
        var existing = document.getElementById('tp-outer-controls');
        if (existing) existing.parentNode.removeChild(existing);

        // Find the share container's button area - look for the Close button
        var closeBtn = document.querySelector('.share-container button, .share-container [class*="close"], .share-container [class*="Close"]');
        var targetParent = closeBtn ? closeBtn.parentNode : document.querySelector('.share-container');
        if (!targetParent) return;

        var wrapper = document.createElement('span');
        wrapper.id  = 'tp-outer-controls';
        wrapper.style.cssText = 'display:inline-flex;align-items:center;gap:8px;margin-left:8px;font-family:sans-serif;vertical-align:middle';

        // T&Cs toggle
        var tcsLabel = document.createElement('label');
        tcsLabel.style.cssText = 'display:inline-flex;align-items:center;gap:5px;cursor:pointer;font-size:11px;font-weight:600;color:' + TEAL;
        tcsLabel.innerHTML = '<input type="checkbox" id="tp-tcs-toggle" style="accent-color:' + TEAL + ';width:13px;height:13px"> T&amp;Cs';
        wrapper.appendChild(tcsLabel);

        // Copy button
        var copyBtn = document.createElement('button');
        copyBtn.id  = 'tp-copy-btn';
        copyBtn.textContent = '📋 Copy';
        copyBtn.style.cssText = 'padding:5px 14px;background:' + PINK + ';color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:12px;font-weight:600;font-family:sans-serif';
        wrapper.appendChild(copyBtn);

        targetParent.appendChild(wrapper);

        // ── T&Cs toggle handler ───────────────────────────────────────────────
        var tcsToggle = document.getElementById('tp-tcs-toggle');

        tcsToggle.addEventListener('change', function () {
            if (tcsToggle.checked) {
                if (state.tcFooterHtml) {
                    applyTCs(iframe, meta, state.tcFooterHtml);
                    state.tcsActive = true;
                } else {
                    tcsToggle.disabled = true;
                    tcsToggle.parentNode.style.opacity = '0.5';
                    fetch(TC_URL)
                        .then(function (r) { return r.text(); })
                        .then(function (footer) {
                            state.tcFooterHtml = footer;
                            applyTCs(iframe, meta, footer);
                            state.tcsActive = true;
                            tcsToggle.disabled = false;
                            tcsToggle.parentNode.style.opacity = '1';
                        })
                        .catch(function (e) {
                            alert('Error loading T&Cs: ' + e.message);
                            tcsToggle.checked  = false;
                            tcsToggle.disabled = false;
                            tcsToggle.parentNode.style.opacity = '1';
                        });
                }
            } else {
                removeTCs(iframe);
                state.tcsActive = false;
            }
        });

        // ── Copy handler ──────────────────────────────────────────────────────
        copyBtn.addEventListener('click', function () {
            var selectedOpts = options.filter(function (o) {
                // Read checkbox state from within the iframe srcdoc via state
                return state.included[o] !== false;
            });
            if (selectedOpts.length === 0) { alert('Select at least one option to copy.'); return; }

            var includeTCs = tcsToggle && tcsToggle.checked;

            var doTheCopy = function (footer) {
                var html = buildCopyHtml(iframe, meta, selectedOpts, includeTCs, footer);
                writeToClipboard(html, copyBtn);
            };

            if (includeTCs && !state.tcFooterHtml) {
                fetch(TC_URL).then(function (r) { return r.text(); }).then(function (f) {
                    state.tcFooterHtml = f;
                    doTheCopy(f);
                }).catch(function (e) { alert('Error loading T&Cs: ' + e.message); });
            } else {
                doTheCopy(state.tcFooterHtml);
            }
        });
    }

    // ─── LISTEN FOR MESSAGES FROM IFRAME ─────────────────────────────────────
    function listenForIframeMessages(iframe, meta) {
        window.addEventListener('message', function (e) {
            if (!e.data || !e.data.type) return;

            if (e.data.type === 'tp-apply-markup') {
                var o      = e.data.option;
                var markup = parseFloat(e.data.markup) || 0;
                state.markups[o] = markup;
                applyMarkup(iframe, o, markup, meta.paxMap[o]);
                // Re-inject controls since srcdoc was replaced
                injectIframeControls(iframe, meta, Object.keys(meta.paxMap));
            }

            if (e.data.type === 'tp-opt-toggle') {
                state.included[e.data.option] = e.data.checked;
            }
        });
    }

    // ─── ENTRY POINT ─────────────────────────────────────────────────────────
    function run() {
        var iframe = document.querySelector('.share-container iframe');
        if (!iframe) return false;

        try {
            var meta = tidyProposal(iframe);
            if (!meta) return false;

            // Discover options
            var html    = iframe.getAttribute('srcdoc') || '';
            var options = [];
            var seen    = {};
            var oRe     = /id="proposal-enhanced-(\d+)-air-option"/g;
            var om;
            while ((om = oRe.exec(html)) !== null) {
                if (!seen[om[1]]) { seen[om[1]] = true; options.push(om[1]); }
            }

            // Initialise all options as included
            options.forEach(function (o) { state.included[o] = true; });

            state.meta = meta;

            // Inject per-option controls into the iframe srcdoc
            injectIframeControls(iframe, meta, options);

            // Inject T&Cs toggle + Copy button near Close/Copy
            injectOuterControls(iframe, meta, options);

            // Listen for postMessage events from iframe
            listenForIframeMessages(iframe, meta);

            return true;
        } catch (e) {
            alert('Tidy error: ' + e.message);
            return false;
        }
    }

    if (!run()) {
        var attempts = 0;
        var retryInterval = setInterval(function () {
            attempts++;
            if (run() || attempts > 20) {
                clearInterval(retryInterval);
                if (attempts > 20) alert('Could not find Proposal. Ensure you have clicked Share first.');
            }
        }, 500);
    }

})();
