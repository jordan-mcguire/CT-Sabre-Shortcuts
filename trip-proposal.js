(function() {
    var includeTCs = confirm('Include T&Cs?');

    function tidyProposal() {
        var iframe = document.querySelector('.share-container iframe');
        if (!iframe) return false;
        
        var html = iframe.getAttribute('srcdoc');
        if (!html) return false;

        try {
            var isCompact = html.indexOf('proposal-compact') !== -1;
            var proposalType = isCompact ? 'proposal-compact' : 'proposal-enhanced';
            var hasCarOption = (html.toLowerCase().indexOf('car option') > -1);

            // Remove price breakdown
            html = html.replace(/<tr>\s*<td class="proposal-enhanced-price-break-down[\s\S]*?<\/tr>\s*(?=\s*<\/table>)/g, '');
            
            // Remove seats, meal, emission labels
            html = html.replace(/<strong[^>]*-(seats|meal|emission)-label[^>]*>[^<]*<\/strong>\s*<span[^>]*>[^<]*<\/span>\s*/g, '');

            // Remove emission rows for compact
            if (isCompact) {
                html = html.replace(/<tr>\s*<td>\s*<strong id="proposal-compact[^"]*emission[^>]*>[\s\S]*?<\/tr>/g, '');
            }

            // Remove hotel images
            html = html.replace(/<tr>\s*<td width="100%">\s*<table id="proposal-enhanced-\d+-hotel-segment-\d+-hotel-images"[\s\S]{1,3000}?<\/table>\s*<\/td>\s*<\/tr>/g, '');
            html = html.replace(/<tr>\s*<td>\s*<img[^>]*class="proposal-enhanced-hotel-image"[^>]*>\s*<\/td>\s*<\/tr>/g, '');

            // Style passenger names
            var passengerRegex = new RegExp('(<span id="' + proposalType + '-passengers-list"[^>]*)>([\\s\\S]*?)<\\/span>', 'g');
            html = html.replace(passengerRegex, function(match, attributes, content) {
                return content.replace(/<[^>]*>/g, '').trim() ?
                    '<br/><br/><div style="background:#fff;border:1px solid #e0e0e0;border-radius:4px;padding:14px;margin:10px 0"><strong style="color:#ff2e5f;font-size:11px;display:block;margin-bottom:10px">✈️ PASSENGER NAME AS PER PHOTO ID / PASSPORT:</strong><span id="' + proposalType + '-passengers-list"' + attributes + ' style="font-size:10px;line-height:1.6;display:block">' + content + '</span></div>' : match;
            });

            // Alignment and styling
            html = html.replace(/align="center"/g, 'align="left"');
            html = html.replace(/<strong id="proposal-compact-\d+-(air|hotel|car)-segment-title"/g, '<strong id="proposal-compact-segment-title" style="color:#ff2e5f;"');
            html = html.replace(/<strong id="proposal-enhanced-\d+-(air|hotel|car)-segment-title"/g, '<strong id="proposal-enhanced-segment-title" style="color:#ff2e5f;"');
            html = html.replace(/(<strong[^>]*>)(Flight|Hotel|Car) Option (\d+)(<\/strong>)/g, '$1<span style="color:#ff2e5f;">$2 Option $3</span>$4');

            // Add spacing
            if (isCompact) {
                html = html.replace(/\.proposal-compact-section-table \{([^}]*)\}/g, '.proposal-compact-section-table {$1margin-bottom:30px;}');
                html = html.replace(/<table([^>]*class="[^"]*proposal-compact-segment-header[^"]*"[^>]*)>/g, function(m, a) {
                    return a.includes('style=') ? m : '<table' + a + ' style="margin-bottom:20px;">';
                });
                html = html.replace(/<table([^>]*class="[^"]*proposal-compact-connected[^"]*"[^>]*)>/g, function(m, a) {
                    return a.includes('style=') ? m : '<table' + a + ' style="margin-bottom:15px;">';
                });
            } else {
                html = html.replace(/\.proposal-enhanced-section-table \{([^}]*)\}/g, '.proposal-enhanced-section-table {$1margin-bottom:30px;}');
                html = html.replace(/<table([^>]*class="[^"]*proposal-enhanced-padding[^"]*"[^>]*)>/g, function(m, a) {
                    return a.includes('style=') ? m : '<table' + a + ' style="padding-top:18px;padding-bottom:18px;">';
                });
                html = html.replace(/<table id="proposal-enhanced-(\d+-air-segment-\d+)"([^>]*)>/g, '<table id="proposal-enhanced-$1" style="margin-bottom:20px;"$2>');
                html = html.replace(/<table id="proposal-enhanced-(\d+-air-segment-\d+-layover)"([^>]*)>/g, '<table id="proposal-enhanced-$1" style="margin-bottom:20px;"$2>');
                html = html.replace(/<table([^>]*class="[^"]*proposal-enhanced-segment-header[^"]*"[^>]*)>/g, function(m, a) {
                    return a.includes('style=') ? m : '<table' + a + ' style="margin-bottom:20px;">';
                });
            }

            // Important notice banner
            var importantNotice = '<table width="100%" style="margin:20px 0"><tr><td><div style="background:#FFF5F8;border:1px solid #FFCDD9;border-left:4px solid #ff2e5f;padding:14px 18px;border-radius:6px"><strong style="color:#ff2e5f;font-size:13px;display:block;margin-bottom:12px">IMPORTANT NOTICE</strong><ul style="font-style:italic;font-size:11px;margin:0;padding-left:20px;color:#333"><li style="margin-bottom:8px">All prices quoted are subject to change until tickets are issued, even if tentatively holding.</li><li style="margin-bottom:8px">Airlines reserve the right to change surcharges, fare levels and taxes without notice.</li><li>Corporate Traveller fees are not included in your quote, as per schedule of fees, and will be charged at the time of invoicing.</li></ul></div></td></tr></table>';
            html = html.replace(/(<table id="[^"]*1-air-option"[^>]*>)/i, '$1<tr><td>' + importantNotice + '</td></tr>');

            // Car rental warning
            if (hasCarOption) {
                var carWarning = '<table width="100%" style="margin:20px 0"><tr><td><div style="background:white;border:2px solid #ff9800;border-radius:8px;padding:16px;box-shadow:0 2px 4px rgba(0,0,0,0.1)"><div style="display:flex;gap:12px"><div style="font-size:24px">⚠️</div><div><strong style="color:#ff9800;font-size:13px;display:block;margin-bottom:8px">Car Rental Important Information</strong><br/><ul style="font-size:11px;color:#333;margin:0;padding-left:20px"><li>You will need a PHYSICAL credit card (not debit) in the main driver\'s name upon pick up.</li><li>Tolls cannot be charged back to Corporate Traveller for rentals with Avis or Budget.</li><li>Bookings with personal memberships attached i.e. Hertz Gold/Avis Wizard will override any chargeback of the rental to Corporate Traveller and charge your card.</li><li>For international rentals: International drivers license may be required.</li></ul></div></div></div></td></tr></table>';
                html = html.replace(/(<table id="[^"]*1-car-option"[^>]*>)/i, carWarning + '$1');
            }

            // Add T&Cs if requested
            if (includeTCs) {
                var carTermsDiv = '';
                if (hasCarOption) {
                    carTermsDiv = '<div style="background:white;border:2px solid #ff9800;border-radius:8px;padding:16px;margin-bottom:16px;box-shadow:0 2px 4px rgba(0,0,0,0.1)"><strong style="color:#ff9800;font-size:13px;display:block;margin-bottom:8px">Car Rental Important Information</strong><br/><ul style="font-size:11px;color:#333;margin:0;padding-left:20px;margin-bottom:0"><li>You will need a PHYSICAL credit card (not debit) in the main driver\'s name upon pick up.</li><li>Tolls cannot be charged back to Corporate Traveller for rentals with Avis or Budget.</li><li>Bookings with personal memberships attached i.e. Hertz Gold/Avis Wizard will override any chargeback of the rental to Corporate Traveller and charge your card.</li><li>For international rentals: International drivers license may be required.</li></ul></div><div style="border-bottom:1px solid #e8e8e8;margin:16px 0"></div>';
                }
                
                fetch('https://raw.githubusercontent.com/jordan-mcguire/tp-tidy/main/terms-footer.html')
                    .then(res => res.text())
                    .then(footer => {
                        var footerTable = '<table width="100%" class="' + proposalType + '-section-table ' + proposalType + '-content-border" style="margin-top:30px"><tr><td><div style="background:#f8f8f8;border:1px solid #e0e0e0;padding:16px;border-radius:4px">' + carTermsDiv + footer + '</div></td></tr></table>';
                        html = html.replace(/(<\/td>\s*<\/tr>\s*<\/table>\s*<\/body>)/i, footerTable + '$1');
                        iframe.setAttribute('srcdoc', html);
                        alert('Changes applied! You can now click Copy.');
                    })
                    .catch(e => {
                        alert('Error loading T&Cs: ' + e.message);
                    });
            } else {
                iframe.setAttribute('srcdoc', html);
                alert('Changes applied! You can now click Copy.');
            }

            return true;
        } catch (e) {
            alert('Error: ' + e.message);
            return false;
        }
    }

    // Try to tidy proposal, with retry logic
    if (!tidyProposal()) {
        var attempts = 0;
        var retryInterval = setInterval(function() {
            attempts++;
            if (tidyProposal() || attempts > 20) {
                clearInterval(retryInterval);
                if (attempts > 20) {
                    alert('Could not find Proposal. Ensure you have clicked Share first.');
                }
            }
        }, 500);
    }
})();