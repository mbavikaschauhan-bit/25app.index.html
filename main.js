// === MAIN.JS ===
// Main application logic: Data loading and orchestration

(function() {
    'use strict';

    // --- DATA LOADING FUNCTIONS ---

    async function loadStatementData(trades, ledgerArg) {
        // preserve existing ledger if already provided by caller
        const ledger = typeof ledgerArg !== 'undefined' ? ledgerArg : (window.appState && window.appState.ledger ? window.appState.ledger : await (window.datastore && window.datastore.getLedger ? window.datastore.getLedger() : []));
        // build tradeIds array safely
        const tradeIds = Array.isArray(trades) ? trades.map(t => t.id).filter(Boolean) : [];
        // fetch partial exits via existing datastore helper
        let partialExitsMap = {};
        if (tradeIds.length && window.datastore && typeof window.datastore.getPartialExitsForTrades === 'function') {
            partialExitsMap = await window.datastore.getPartialExitsForTrades(tradeIds);
        }
        return { trades, ledger, partialExitsMap };
    }

    // === DASHBOARD DATA LOADER & SUMMARY ===
    async function computeSummaryFromTradesAndLedger(trades = [], ledger = []) {
      const summary = {
        netPnl: 0,
        wins: 0,
        losses: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        winRate: 0,
        tradeCount: 0,
        accountValue: null
      };

      if (!Array.isArray(trades)) trades = [];
      if (!Array.isArray(ledger)) ledger = [];

      const closedTrades = trades.filter(t => t.exit_price && t.exit_date);
      let grossProfit = 0, grossLoss = 0;
      let wins = 0, losses = 0, netPnl = 0;

      closedTrades.forEach(t => {
        const net = Number(window.calculateNetPnl ? window.calculateNetPnl(t) : (t.netPnl ?? t.pnl ?? 0)) || 0;
        netPnl += net;
        if (net > 0) { wins++; grossProfit += net; }
        else if (net < 0) { losses++; grossLoss += Math.abs(net); }
      });

      summary.netPnl = netPnl;
      summary.wins = wins;
      summary.losses = losses;
      summary.tradeCount = closedTrades.length;
      summary.avgWin = wins ? (grossProfit / wins) : 0;
      summary.avgLoss = losses ? (grossLoss / losses) : 0;
      summary.profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : (grossProfit > 0 ? Infinity : 0);
      summary.winRate = summary.tradeCount ? (wins / summary.tradeCount) : 0;

      // account value from ledger fallback
      if (ledger.length) {
        summary.accountValue = ledger.reduce((s, it) => s + (Number(it.amount) || 0), 0);
      } else if (window.appState && typeof window.appState.accountValue !== 'undefined') {
        summary.accountValue = window.appState.accountValue;
      } else {
        summary.accountValue = null;
      }

      return summary;
    }

    async function loadDashboardData(options) {
      const data = {};
      // get trades
      if (window.appState && Array.isArray(window.appState.trades) && window.appState.trades.length) {
        data.trades = window.appState.trades;
      } else if (window.datastore && typeof window.datastore.getTrades === 'function') {
        try { data.trades = await window.datastore.getTrades(options); } catch(e){ console.warn('loadDashboardData: getTrades failed', e); data.trades = []; }
      } else {
        data.trades = [];
      }

      // get ledger
      if (options && Array.isArray(options.ledger)) {
        data.ledger = options.ledger;
      } else if (window.appState && Array.isArray(window.appState.ledger)) {
        data.ledger = window.appState.ledger;
      } else if (window.datastore && typeof window.datastore.getLedger === 'function') {
        try { data.ledger = await window.datastore.getLedger(); } catch(e){ console.warn('loadDashboardData: getLedger failed', e); data.ledger = []; }
      } else {
        data.ledger = [];
      }

      // compute summary using datastore helper if exists
      if (window.datastore && typeof window.datastore.getDashboardSummary === 'function') {
        try {
          data.summary = await window.datastore.getDashboardSummary();
        } catch (err) {
          console.warn('loadDashboardData: getDashboardSummary failed - computing fallback', err);
          try {
            data.summary = await computeSummaryFromTradesAndLedger(data.trades, data.ledger);
          } catch (fallbackErr) {
            console.error('loadDashboardData: fallback summary computation failed', fallbackErr);
            data.summary = {
              netPnl: 0, wins: 0, losses: 0, avgWin: 0, avgLoss: 0,
              profitFactor: 0, winRate: 0, tradeCount: 0, accountValue: null
            };
          }
        }
      } else {
        try {
          data.summary = await computeSummaryFromTradesAndLedger(data.trades, data.ledger);
        } catch (err) {
          console.error('loadDashboardData: summary computation failed', err);
          data.summary = {
            netPnl: 0, wins: 0, losses: 0, avgWin: 0, avgLoss: 0,
            profitFactor: 0, winRate: 0, tradeCount: 0, accountValue: null
          };
        }
      }

      return data;
    }

    // --- EXPOSURE ---
    window.main = window.main || {};
    window.main.loadStatementData = loadStatementData;
    window.main.loadDashboardData = loadDashboardData;

})(); // End IIFE
