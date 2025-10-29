// === UI.JS ===
// Pure UI rendering functions: Build/update DOM with provided data (no DB calls)

(function() {
    'use strict';

    // --- PURE RENDERER FUNCTIONS ---

    const renderStatementContentWithExits = async (trades, ledger, statementBody, filters, partialExitsMap) => {
        try {
            const tradeRows = await Promise.all(trades.map(async t => {
                const closed = t.exit_date && t.exit_price;
                
                // For partial trades, calculate charges from stored partial exit data
                let charges = 0;
                if (closed) {
                    const isPartialExit = t.exit_quantity && t.exit_quantity > 0 && t.exit_quantity < t.quantity;
                    
                    if (isPartialExit) {
                        // Get charges from pre-fetched partial exit data
                        try {
                            const partialExits = (partialExitsMap && partialExitsMap[t.id]) ? partialExitsMap[t.id] : [];
                            if (partialExits.length > 0) {
                                charges = partialExits.reduce((sum, exit) => sum + (exit.brokerage || 0) + (exit.charges || 0), 0);
                            } else {
                                // Fallback to main trade data
                                charges = (t.brokerage || 0) + (t.other_fees || 0);
                            }
                        } catch (error) {
                            console.error('Error calculating partial exit charges:', error);
                            charges = (t.brokerage || 0) + (t.other_fees || 0);
                        }
                    } else {
                        // For full trades, use main trade data
                        charges = (t.brokerage || 0) + (t.other_fees || 0);
                    }
                }
                
                const net = closed ? (window.calculateNetPnl ? window.calculateNetPnl(t) : 0) : 0;
                const gross = net + charges; // Calculate gross from net + charges
                
                // Calculate net profit/loss percentage
                const netProfitPercentage = closed && t.entry_price ? ((net / (t.entry_price * (t.quantity || 0))) * 100) : 0;
                
                // Determine trade status
                const isClosed = t.exit_date && t.exit_price && (!t.exit_quantity || t.exit_quantity >= t.quantity);
                const isPartialExit = t.exit_date && t.exit_price && t.exit_quantity && t.exit_quantity < t.quantity;
                
                // Always use entry_date for chronological ordering to maintain the sequence of when entries were made
                // This ensures deposits/withdrawals appear in correct chronological position relative to when trades were entered
                const chronologicalDate = t.entry_date;
                const displayDate = (isClosed && !isPartialExit) ? t.exit_date : t.entry_date;
                
                return {
                    date: window.utils.formatDateForDisplay(displayDate) || '—',
                    chronologicalDate: window.utils.formatDateForDisplay(chronologicalDate) || '—', // For sorting
                    status: isClosed ? 'Closed' : (isPartialExit ? 'Partial' : 'Open'),
                    entryPrice: t.entry_price || '—',
                    entryQty: t.quantity || '—',
                    entryDate: window.utils.formatDateForDisplay(t.entry_date) || '—',
                    stopLoss: t.stop_loss || '—',
                    targetPrice: t.target || '—',
                    exitPrice: t.exit_price || '—',
                    exitQty: t.exit_quantity || '—',
                    exitDate: window.utils.formatDateForDisplay(t.exit_date) || '—',
                    type: 'Trade',
                    symbol: t.asset || '—',
                    strategy: t.strategy || '—',
                    segment: t.segment || '—',
                    direction: t.direction || '—',
                    gross,
                    charges,
                    net,
                    netProfitPercentage,
                    winLoss: closed ? (net > 0 ? 'Win' : (net < 0 ? 'Loss' : '—')) : '—',
                    amount: '',
                    outcomeSummary: t.outcomeSummary || '',
                    emotionalState: t.emotionalState || '',
                    notes: t.reasons || ''
                };
            }));
            
            const ledgerRows = ledger.map(l => ({
                date: window.utils.formatDateForDisplay(l.date) || '—',
                chronologicalDate: window.utils.formatDateForDisplay(l.date) || '—', // Add chronologicalDate for consistent sorting
                status: '—',
                entryPrice: '—',
                entryQty: '—',
                entryDate: '—',
                stopLoss: '—',
                targetPrice: '—',
                exitPrice: '—',
                exitQty: '—',
                exitDate: '—',
                type: l.type,
                symbol: l.type,
                strategy: '—',
                direction: '—',
                gross: 0,
                charges: 0,
                net: 0,
                netProfitPercentage: 0,
                winLoss: '—',
                amount: l.amount || 0,
                outcomeSummary: '—',
                emotionalState: '—',
                notes: l.notes || '—'
            }));

            // Sort by date in strict chronological order (no grouping by type)
            let allRows = [...tradeRows, ...ledgerRows].sort((a, b) => {
                // Parse dates for proper chronological sorting
                const parseDate = (dateStr) => {
                    if (!dateStr || dateStr === '—') return new Date(0); // Put invalid dates at the beginning
                    
                    // Handle DD-MM-YYYY format (from window.utils.formatDateForDisplay)
                    if (dateStr.includes('-') && dateStr.split('-').length === 3) {
                        const parts = dateStr.split('-');
                        if (parts.length === 3) {
                            const [day, month, year] = parts;
                            return new Date(year, month - 1, day);
                        }
                    }
                    // Handle DD/MM/YYYY format
                    else if (dateStr.includes('/')) {
                        const parts = dateStr.split('/');
                        if (parts.length === 3) {
                            return new Date(parts[2], parts[1] - 1, parts[0]);
                        }
                    }
                    // Handle YYYY-MM-DD format
                    else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        return new Date(dateStr);
                    }
                    
                    // Fallback to direct date parsing
                    return new Date(dateStr);
                };
                
                // Use chronologicalDate for consistent sorting (both trades and ledger entries now have this field)
                const sortDateA = a.chronologicalDate;
                const sortDateB = b.chronologicalDate;
                
                const dateA = parseDate(sortDateA);
                const dateB = parseDate(sortDateB);
                
                // Sort purely by chronological date (no secondary sorting)
                return dateA.getTime() - dateB.getTime();
            });
            
            // Apply filters if provided
            if (filters.transactionType && filters.transactionType !== 'All Types') {
                allRows = allRows.filter(row => row.type === filters.transactionType);
            }
            
            if (filters.strategy && filters.strategy !== 'All Strategies') {
                allRows = allRows.filter(row => row.strategy === filters.strategy);
            }
            
            if (filters.startDate || filters.endDate) {
                allRows = allRows.filter(row => {
                    if (!row.date || row.date === '—') return false;
                    
                    // Parse date from various formats (dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd, etc.)
                    let rowDate;
                    try {
                        if (row.date.includes('/')) {
                            // Handle dd/mm/yyyy format
                            const parts = row.date.split('/');
                            if (parts.length === 3) {
                                rowDate = new Date(parts[2], parts[1] - 1, parts[0]);
                            }
                        } else if (row.date.includes('-')) {
                            const parts = row.date.split('-');
                            if (parts.length === 3) {
                                if (parts[0].length === 2) {
                                    // Handle dd-mm-yyyy format (from window.utils.formatDateForDisplay)
                                    const [day, month, year] = parts;
                                    rowDate = new Date(year, month - 1, day);
                                } else {
                                    // Handle yyyy-mm-dd format
                                    const [year, month, day] = parts;
                                    rowDate = new Date(year, month - 1, day);
                                }
                            }
                        } else {
                            // Handle other formats
                            rowDate = new Date(row.date);
                        }
                    } catch (e) {
                        console.warn('Invalid date format:', row.date);
                        return false;
                    }
                    
                    if (isNaN(rowDate.getTime())) return false;
                    
                    // Normalize filter dates to ensure proper comparison
                    const startDate = filters.startDate ? new Date(filters.startDate + 'T00:00:00') : null;
                    const endDate = filters.endDate ? new Date(filters.endDate + 'T23:59:59') : null;
                    
                    // Normalize row date to date-only for accurate comparison
                    const rowDateOnly = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());
                    const startDateOnly = startDate ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()) : null;
                    const endDateOnly = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) : null;
                    
                    // Inclusive date range comparison
                    if (startDateOnly && rowDateOnly < startDateOnly) return false;
                    if (endDateOnly && rowDateOnly > endDateOnly) return false;
                    
                    return true;
                });
            }
            
            // Generate HTML for all rows with sanitization
            const rowsHtml = allRows.map(row => {
                const isTrade = row.type === 'Trade';
                const isDeposit = row.type === 'Deposit';
                const isWithdrawal = row.type === 'Withdrawal';
                
                // Format amounts with proper styling
                const formatAmount = (amount) => {
                    if (amount === 0 || amount === '—') return '—';
                    const formatted = window.utils.formatCurrency(amount);
                    const colorClass = amount >= 0 ? 'text-green-500' : 'text-red-500';
                    return `<span class="${colorClass}">${formatted}</span>`;
                };
                
                const formatPercentage = (percentage) => {
                    if (percentage === 0 || percentage === '—') return '—';
                    const formatted = percentage.toFixed(2) + '%';
                    const colorClass = percentage >= 0 ? 'text-green-500' : 'text-red-500';
                    return `<span class="${colorClass}">${formatted}</span>`;
                };
                
                // Sanitize all user data to prevent XSS
                const sanitize = (str) => {
                    if (typeof str !== 'string') return str || '—';
                    return str.replace(/[&<>"']/g, (match) => ({
                        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
                    }[match]));
                };

                return `
                    <tr class="border-b hover:bg-gray-50" style="border-color: var(--border-color);">
                        <td class="px-3 py-2 text-sm" style="color: var(--text-primary);">${sanitize(row.date)}</td>
                        <td class="px-3 py-2 text-sm" style="color: var(--text-primary);">${sanitize(row.status)}</td>
                        <td class="px-3 py-2 text-sm" style="color: var(--text-primary);">${sanitize(row.entryPrice)}</td>
                        <td class="px-3 py-2 text-sm" style="color: var(--text-primary);">${sanitize(row.entryQty)}</td>
                        <td class="px-3 py-2 text-sm" style="color: var(--text-primary);">${sanitize(row.entryDate)}</td>
                        <td class="px-3 py-2 text-sm" style="color: var(--text-primary);">${sanitize(row.stopLoss)}</td>
                        <td class="px-3 py-2 text-sm" style="color: var(--text-primary);">${sanitize(row.targetPrice)}</td>
                        <td class="px-3 py-2 text-sm" style="color: var(--text-primary);">${sanitize(row.exitPrice)}</td>
                        <td class="px-3 py-2 text-sm" style="color: var(--text-primary);">${sanitize(row.exitQty)}</td>
                        <td class="px-3 py-2 text-sm" style="color: var(--text-primary);">${sanitize(row.exitDate)}</td>
                        <td class="px-3 py-2 text-sm" style="color: var(--text-primary);">${sanitize(row.type)}</td>
                        <td class="px-3 py-2 text-sm" style="color: var(--text-primary);">${sanitize(row.symbol)}</td>
                        <td class="px-3 py-2 text-sm" style="color: var(--text-primary);">${sanitize(row.strategy)}</td>
                        <td class="px-3 py-2 text-sm" style="color: var(--text-primary);">${sanitize(row.segment)}</td>
                        <td class="px-3 py-2 text-sm" style="color: var(--text-primary);">${sanitize(row.direction)}</td>
                        <td class="px-3 py-2 text-sm">${isTrade ? formatAmount(row.gross) : '—'}</td>
                        <td class="px-3 py-2 text-sm">${isTrade ? formatAmount(row.charges) : '—'}</td>
                        <td class="px-3 py-2 text-sm">${isTrade ? formatAmount(row.net) : '—'}</td>
                        <td class="px-3 py-2 text-sm">${isTrade ? formatPercentage(row.netProfitPercentage) : '—'}</td>
                        <td class="px-3 py-2 text-sm" style="color: var(--text-primary);">${sanitize(row.winLoss)}</td>
                        <td class="px-3 py-2 text-sm">${isDeposit || isWithdrawal ? formatAmount(row.amount) : '—'}</td>
                        <td class="px-3 py-2 text-sm" style="color: var(--text-primary);">${sanitize(row.outcomeSummary)}</td>
                        <td class="px-3 py-2 text-sm" style="color: var(--text-primary);">${sanitize(row.emotionalState)}</td>
                        <td class="px-3 py-2 text-sm" style="color: var(--text-primary);">${sanitize(row.notes)}</td>
                    </tr>
                `;
            }).join('');
            
            // Update the statement body
            statementBody.innerHTML = rowsHtml;
            
            // Update cache
            window.statementCache = rowsHtml;
            window.statementLastHash = window.performanceCache.getTradesHash(trades) + '_' + window.performanceCache.getTradesHash(ledger);
            
        } catch (e) {
            console.error('renderStatementContentWithExits error', e);
        }
    };

    function formatCurrencySafe(v){
      if (window.utils && typeof window.utils.formatCurrency === 'function') return window.utils.formatCurrency(v);
      return (typeof v === 'number') ? '₹' + v.toFixed(2) : (v ?? '₹0.00');
    }
    function safePercent(v){
      if (typeof v !== 'number') return '0%';
      return (v*100).toFixed(1) + '%';
    }

    function renderDashboardUI(data) {
      try {
        data = data || {};
        const summary = data.summary || { netPnl:0, winRate:0, profitFactor:0, avgWin:0, avgLoss:0, wins:0, losses:0, tradeCount:0, accountValue:null };

        // Primary metric nodes (IDs are taken from index.html)
        const netPnlEl = document.getElementById('db-net-pnl');
        if (netPnlEl) netPnlEl.textContent = formatCurrencySafe(summary.netPnl);

        const netPnlPctEl = document.getElementById('db-net-pnl-percentage');
        if (netPnlPctEl) netPnlPctEl.textContent = (typeof summary.netPnl === 'number' && summary.accountValue ? `${((summary.netPnl / summary.accountValue)*100).toFixed(2)}%` : '0.00%');

        const totalTradesEl = document.getElementById('db-total-trades');
        if (totalTradesEl) totalTradesEl.textContent = `${summary.tradeCount || 0} trades`;

        const winRateEl = document.getElementById('db-win-rate');
        if (winRateEl) winRateEl.textContent = safePercent(summary.winRate);

        const wonTradesEl = document.getElementById('db-won-trades');
        if (wonTradesEl) wonTradesEl.textContent = `${summary.wins || 0} won`;

        const lostTradesEl = document.getElementById('db-lost-trades');
        if (lostTradesEl) lostTradesEl.textContent = `${summary.losses || 0} lost`;

        const pfEl = document.getElementById('db-profit-factor');
        if (pfEl) pfEl.textContent = (summary.profitFactor === Infinity ? '∞' : (typeof summary.profitFactor === 'number' ? summary.profitFactor.toFixed(2) : summary.profitFactor));

        const pfRatioEl = document.getElementById('profit-factor-ratio');
        if (pfRatioEl) pfRatioEl.textContent = (summary.profitFactor === Infinity ? '∞' : (typeof summary.profitFactor === 'number' ? summary.profitFactor.toFixed(2) : summary.profitFactor));

        const avgWinLossEl = document.getElementById('db-avg-win-loss');
        if (avgWinLossEl) avgWinLossEl.textContent = (typeof summary.avgWin === 'number' && typeof summary.avgLoss === 'number') ? ( (summary.avgWin / (summary.avgLoss || 1)).toFixed(2) ) : '0.00';

        const avgWinEl = document.getElementById('db-avg-win');
        if (avgWinEl) avgWinEl.textContent = `+${formatCurrencySafe(summary.avgWin)}`;

        const avgLossEl = document.getElementById('db-avg-loss');
        if (avgLossEl) avgLossEl.textContent = `-${formatCurrencySafe(summary.avgLoss)}`;

        // Account summary items - calculate all fund management metrics
        const accountSummaryContainer = document.getElementById('db-account-summary');
        if (accountSummaryContainer) {
          // Get trades and ledger data for calculations
          const trades = data.trades || [];
          const ledger = data.ledger || [];
          
          // Calculate deposits and withdrawals
          const deposits = ledger
            .filter(l => l.type === 'Deposit')
            .reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
          const withdrawals = ledger
            .filter(l => l.type === 'Withdrawal')
            .reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
          
          // Calculate realized P&L from closed trades
          const realizedPnl = trades
            .filter(trade => trade.exit_date && trade.exit_price)
            .reduce((total, trade) => {
              try {
                const netPnl = window.calculateNetPnl ? window.calculateNetPnl(trade) : (trade.netPnl ?? trade.pnl ?? 0);
                return total + (isFinite(netPnl) ? netPnl : 0);
              } catch (error) {
                return total;
              }
            }, 0);
          
          // Calculate net account value
          const netAccountValue = deposits - withdrawals + realizedPnl;
          
          // Calculate deployed capital (money currently in active trades)
          const deployedCapital = trades
            .filter(trade => !trade.exit_date || !trade.exit_price)
            .reduce((total, trade) => {
              const entryPrice = parseFloat(trade.entry_price) || 0;
              const quantity = parseFloat(trade.quantity) || 0;
              const tradeValue = entryPrice * quantity;
              return total + (isFinite(tradeValue) ? tradeValue : 0);
            }, 0);
          
          // Calculate available cash
          const availableCash = Math.max(0, netAccountValue - deployedCapital);
          
          // Starting balance (first deposit or 0)
          const startingBalance = ledger.length > 0 ? 
            (ledger.filter(l => l.type === 'Deposit')[0]?.amount || 0) : 0;
          
          // Update all account summary metrics
          const metrics = [
            { label: 'NET ACCOUNT VALUE', value: netAccountValue, color: netAccountValue >= 0 ? 'text-green-600' : 'text-red-600' },
            { label: 'NET REALIZED P&L', value: realizedPnl, color: realizedPnl >= 0 ? 'text-green-600' : 'text-red-600' },
            { label: 'AVAILABLE CASH', value: availableCash, color: availableCash >= 0 ? 'text-green-600' : 'text-red-600' },
            { label: 'DEPLOYED CAPITAL', value: deployedCapital, color: 'text-gray-900' },
            { label: 'TOTAL DEPOSITS', value: deposits, color: 'text-gray-900' },
            { label: 'TOTAL WITHDRAWN', value: withdrawals, color: 'text-gray-900' },
            { label: 'STARTING BALANCE', value: startingBalance, color: 'text-gray-900' }
          ];
          
          // Update the HTML with all metrics
          accountSummaryContainer.innerHTML = metrics.map(metric => 
            `<div>
              <p class="text-sm" style="color: var(--text-secondary);">${metric.label}</p>
              <p class="text-2xl font-bold ${metric.color}" style="color: var(--text-primary);">${formatCurrencySafe(metric.value)}</p>
            </div>`
          ).join('');
        }

        // call existing UI helpers safely
        if (window.uiHelpers && typeof window.uiHelpers.renderDashboardTopWinners === 'function') {
          try { window.uiHelpers.renderDashboardTopWinners(); } catch(e){ console.warn('renderDashboardUI: top winners failed', e); }
        }

        // call open positions overview if available
        if (typeof window.renderOpenPositionsOverview === 'function') {
          try { window.renderOpenPositionsOverview(); } catch(e){ console.warn('renderDashboardUI: open positions overview failed', e); }
        }

      } catch (err) {
        console.error('renderDashboardUI error', err);
      }
    }

    // --- EXPOSURE ---
    window.ui = window.ui || {};
    window.ui.renderStatementContentWithExits = renderStatementContentWithExits;
    window.ui.renderDashboardUI = renderDashboardUI;

})(); // End IIFE