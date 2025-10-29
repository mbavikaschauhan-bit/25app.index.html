// === UI_HELPERS.JS ===
// Pure UI helper functions: Build/update DOM with provided data (no direct DB calls)

(function() {
    'use strict';

    // --- UI HELPER FUNCTIONS ---

    const renderTradeHistoryContent = (trades, tbody) => {
        // Sanitize function to prevent XSS
        const sanitize = (str) => {
            if (typeof str !== 'string') return str || '—';
            return str.replace(/[&<>"']/g, (match) => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
            }[match]));
        };

        const rowsHtml = trades.map(t => {
                const isClosed = t.exit_date && t.exit_price && (!t.exit_quantity || t.exit_quantity >= t.quantity);
                const isPartialExit = t.exit_date && t.exit_price && t.exit_quantity && t.exit_quantity < t.quantity;
                const pnl = (isClosed || isPartialExit) ? (window.calculateNetPnl ? window.calculateNetPnl(t) : 0) : 0;
                const netProfitPercentage = (isClosed || isPartialExit) && t.entry_price ? ((pnl / (t.entry_price * (t.quantity || 0))) * 100) : 0;
                let status = 'Open';
                if (isClosed) status = 'Closed';
                else if (isPartialExit) status = 'Partial Exit';
                const type = t.direction || '—';
                return `
                    <tr class="border-b" style="border-color: var(--border-color);">
                        <td class="px-3 py-2 border-r" style="border-color: var(--border-color); width: 40px;">
                            <input type="checkbox" class="trade-checkbox w-4 h-4 rounded border-gray-300" data-trade-id="${sanitize(t.id)}" title="Select this trade">
                        </td>
                        <td class="px-3 py-2 border-r" style="border-color: var(--border-color);">${sanitize(t.asset)}</td>
                        <td class="px-3 py-2 border-r ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}" style="border-color: var(--border-color);">${window.utils.formatCurrency(pnl)}</td>
                        <td class="px-3 py-2 border-r ${netProfitPercentage >= 0 ? 'text-green-500' : 'text-red-500'}" style="border-color: var(--border-color);">${(isClosed || isPartialExit) ? (netProfitPercentage ? netProfitPercentage.toFixed(2) + '%' : '—') : '—'}</td>
                        <td class="px-3 py-2 border-r" style="border-color: var(--border-color);">
                            ${isPartialExit ? 
                                `<span class="text-blue-600 underline cursor-pointer" data-action="view-partial" data-id="${sanitize(t.id)}">${sanitize(status)}</span>` : 
                                sanitize(status)
                            }
                        </td>
                        <td class="px-3 py-2 border-r" style="border-color: var(--border-color);">${sanitize(t.entry_price)}</td>
                        <td class="px-3 py-2 border-r" style="border-color: var(--border-color);">${sanitize(t.quantity)}</td>
                        <td class="px-3 py-2 border-r" style="border-color: var(--border-color);">${sanitize(type)}</td>
                        <td class="px-3 py-2 border-r" style="border-color: var(--border-color);">${sanitize(t.segment)}</td>
                        <td class="px-3 py-2 border-r" style="border-color: var(--border-color);">${sanitize(window.utils.formatDateForDisplay(t.entry_date))}</td>
                        <td class="px-3 py-2 border-r" style="border-color: var(--border-color);">${sanitize(t.stop_loss)}</td>
                        <td class="px-3 py-2 border-r" style="border-color: var(--border-color);">${sanitize(t.target_price ?? t.target)}</td>
                        <td class="px-3 py-2 border-r" style="border-color: var(--border-color);">${sanitize(t.exit_price)}</td>
                        <td class="px-3 py-2 border-r" style="border-color: var(--border-color);">${sanitize(t.exit_quantity)}</td>
                        <td class="px-3 py-2 border-r" style="border-color: var(--border-color);">${sanitize(window.utils.formatDateForDisplay(t.exit_date))}</td>
                        <td class="px-3 py-2 actions-cell" style="border-color: var(--border-color);">
                            ${isClosed ? 
                                // Closed trades: Show Edit and Delete icons only
                                `<button class="action-icon" data-action="edit" data-id="${sanitize(t.id)}" title="Edit Trade">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                                <button class="action-icon" data-action="delete" data-id="${sanitize(t.id)}" title="Delete Trade">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3,6 5,6 21,6"></polyline>
                                        <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                                    </svg>
                                </button>` :
                                // Partial/Open trades: Show Exit button and three-dot menu
                                `<button class="exit-btn" data-action="exit" data-id="${sanitize(t.id)}">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">
                                        <path d="M7 17L17 7M17 7H7M17 7V17"></path>
                                    </svg>
                                    Exit
                                </button>
                                <div class="relative">
                                    <button class="action-icon overflow-menu-btn" data-action="menu" data-id="${sanitize(t.id)}" title="More Actions">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="1"></circle>
                                            <circle cx="19" cy="12" r="1"></circle>
                                            <circle cx="5" cy="12" r="1"></circle>
                                        </svg>
                                    </button>
                                    <div class="overflow-menu hidden" data-menu-for="${sanitize(t.id)}">
                                        <button class="menu-item" data-action="exit" data-id="${sanitize(t.id)}">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M7 17L17 7M17 7H7M17 7V17"></path>
                                            </svg>
                                            Exit Trade
                                        </button>
                                        <button class="menu-item" data-action="edit" data-id="${sanitize(t.id)}">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                            Edit
                                        </button>
                                        <button class="menu-item" data-action="delete" data-id="${sanitize(t.id)}">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <polyline points="3,6 5,6 21,6"></polyline>
                                                <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                                            </svg>
                                            Delete
                                        </button>
                                    </div>
                                </div>`
                            }
                        </td>
                    </tr>`;
            }).join('');
            
            // Cache the generated HTML
            tradeHistoryCache = rowsHtml;
            tradeHistoryLastHash = performanceCache.getTradesHash(trades);
            
            tbody.innerHTML = rowsHtml;
    };

    const renderProfilePage = (profileData) => {
        try {
            console.log('Rendering profile page with data:', profileData);
            
            if (!profileData) {
                console.log('No profile data provided');
                return;
            }
            
            // Update profile form fields
            const nameField = document.getElementById('profile-name');
            const emailField = document.getElementById('profile-email');
            const phoneField = document.getElementById('profile-phone');
            const cityField = document.getElementById('profile-city');
            
            if (nameField) nameField.value = profileData.name || '';
            if (emailField) emailField.value = profileData.email || '';
            if (phoneField) phoneField.value = profileData.phone || '';
            if (cityField) cityField.value = profileData.city || '';
            
            console.log('Form fields updated');
            
            // Update account information
            const memberSinceField = document.getElementById('profile-member-since');
            if (memberSinceField && profileData.created_at) {
                const signupDate = new Date(profileData.created_at);
                memberSinceField.textContent = signupDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                console.log('Member since date set:', signupDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }));
            } else {
                console.log('Member since field not found or no created_at data');
            }
            
            // Update subscription information
            const subscriptionStartField = document.getElementById('profile-subscription-start');
            const subscriptionEndField = document.getElementById('profile-subscription-end');
            const planTypeField = document.getElementById('profile-plan-type');
            
            if (subscriptionStartField && profileData.subscription_start_date) {
                const startDate = new Date(profileData.subscription_start_date);
                subscriptionStartField.textContent = startDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                console.log('Subscription start date set');
            } else {
                console.log('Subscription start field not found or no subscription_start_date data');
            }
            
            if (subscriptionEndField && profileData.subscription_ends_at) {
                const endDate = new Date(profileData.subscription_ends_at);
                subscriptionEndField.textContent = endDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                console.log('Subscription end date set');
            } else {
                console.log('Subscription end field not found or no subscription_ends_at data');
            }
            
            if (planTypeField && profileData.plan_type) {
                planTypeField.textContent = profileData.plan_type.charAt(0).toUpperCase() + profileData.plan_type.slice(1);
                console.log('Plan type set:', profileData.plan_type);
            } else {
                console.log('Plan type field not found or no plan_type data');
            }
            
        } catch (e) {
            console.error('renderProfilePage error', e);
        }
    };

    // Render Top 5 Winners for Dashboard
    const renderDashboardTopWinners = () => {
        try {
            const trades = window.appState?.trades || [];
            const closedTrades = trades.filter(t => t.exit_price && t.exit_date);
            
            // Filter winners (positive P&L) and sort by P&L (best first)
            const winners = closedTrades
                .map(trade => ({ ...trade, pnl: window.calculateNetPnl ? window.calculateNetPnl(trade) : 0 }))
                .filter(trade => trade.pnl > 0)
                .sort((a, b) => b.pnl - a.pnl)
                .slice(0, 5);
            
            const container = document.getElementById('dashboard-top-winners');
            if (container) {
                if (winners.length === 0) {
                    container.innerHTML = '<div class="flex-1 flex items-center justify-center"><p class="text-center text-sm" style="color: var(--text-secondary);">No profitable trades yet.</p></div>';
                    return;
                }
                
                // Sanitize function for dashboard
                const sanitize = (str) => {
                    if (typeof str !== 'string') return str || 'Unknown';
                    return str.replace(/[&<>"']/g, (match) => ({
                        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
                    }[match]));
                };
                
                container.innerHTML = winners.map((trade, index) => {
                    const pnl = trade.pnl;
                    const pnlClass = 'text-green-500';
                    const pnlSign = '+';
                    
                    return `
                        <div class="flex justify-between items-center p-3 rounded-md" style="background-color: var(--bg-secondary); border: 1px solid var(--border-color);">
                            <div class="flex-1">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="font-semibold text-sm" style="color: var(--text-primary);">${sanitize(trade.asset)}</p>
                                        <p class="text-xs" style="color: var(--text-secondary);">${trade.exit_date ? new Date(trade.exit_date).toLocaleDateString() : ''}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="font-bold text-sm ${pnlClass}">${pnlSign}${window.utils.formatCurrency(pnl)}</p>
                                        <p class="text-xs" style="color: var(--text-muted);">${sanitize(trade.quantity)} qty</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch (e) {
            console.error('renderDashboardTopWinners error', e);
        }
    };

    // Render Top 5 Losers for Dashboard
    const renderDashboardTopLosers = () => {
        try {
            const trades = window.appState?.trades || [];
            const closedTrades = trades.filter(t => t.exit_price && t.exit_date);
            
            // Filter losers (negative P&L) and sort by P&L (worst first)
            const losers = closedTrades
                .map(trade => ({ ...trade, pnl: window.calculateNetPnl ? window.calculateNetPnl(trade) : 0 }))
                .filter(trade => trade.pnl < 0)
                .sort((a, b) => a.pnl - b.pnl)
                .slice(0, 5);
            
            const container = document.getElementById('dashboard-top-losers');
            if (container) {
                if (losers.length === 0) {
                    container.innerHTML = '<div class="flex-1 flex items-center justify-center"><p class="text-center text-sm" style="color: var(--text-secondary);">No losing trades yet.</p></div>';
                    return;
                }
                
                // Sanitize function for dashboard
                const sanitize = (str) => {
                    if (typeof str !== 'string') return str || 'Unknown';
                    return str.replace(/[&<>"']/g, (match) => ({
                        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
                    }[match]));
                };
                
                container.innerHTML = losers.map((trade, index) => {
                    const pnl = trade.pnl;
                    const pnlClass = 'text-red-500';
                    const pnlSign = '';
                    
                    return `
                        <div class="flex justify-between items-center p-3 rounded-md" style="background-color: var(--bg-secondary); border: 1px solid var(--border-color);">
                            <div class="flex-1">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="font-semibold text-sm" style="color: var(--text-primary);">${sanitize(trade.asset)}</p>
                                        <p class="text-xs" style="color: var(--text-secondary);">${trade.exit_date ? new Date(trade.exit_date).toLocaleDateString() : ''}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="font-bold text-sm ${pnlClass}">${pnlSign}${window.utils.formatCurrency(pnl)}</p>
                                        <p class="text-xs" style="color: var(--text-muted);">${sanitize(trade.quantity)} qty</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch (e) {
            console.error('renderDashboardTopLosers error', e);
        }
    };

    // --- EXPOSURE ---
    window.uiHelpers = {
        renderTradeHistoryContent,
        renderProfilePage,
        renderDashboardTopWinners,
        renderDashboardTopLosers
    };

})(); // End IIFE

