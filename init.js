// === INIT.JS START ===
(function(){
  'use strict';
  
  let initAttempts = 0;
  const maxInitAttempts = 50; // Try for up to 5 seconds (50 * 100ms)
  const initRetryDelay = 100; // 100ms between attempts
  
  function checkModulesReady() {
    return !!(window.datastore && window.main && window.ui && window.auth);
  }
  
  function initializeApp(){
    if(window.appReady) {
      console.log('init.js: app already initialized');
      return;
    }
    
    if(!checkModulesReady()) {
      initAttempts++;
      if(initAttempts < maxInitAttempts) {
        console.log(`init.js: modules not ready yet (attempt ${initAttempts}/${maxInitAttempts}), retrying in ${initRetryDelay}ms...`);
        setTimeout(initializeApp, initRetryDelay);
        return;
      } else {
        console.error('init.js: modules failed to load after maximum attempts');
        return;
      }
    }
    
    try {
      console.log('init.js: all modules ready, initializing app...');
      
      // Initialize dashboard if user is logged in
      if(window.appState?.user){
        window.main.loadDashboardData().then(data => {
          if(window.ui && typeof window.ui.renderDashboardUI === 'function') {
            window.ui.renderDashboardUI(data);
            console.log('init.js: dashboard rendered for logged-in user');
          }
        }).catch(e => {
          console.error('init.js: loadDashboardData failed', e);
          // Show user-friendly error message
          if(window.utils?.showToast) {
            window.utils.showToast('Failed to load dashboard data. Please refresh the page.', 'error');
          }
        });
      }
      
      // Set up auth state change handler
      if(window.auth?.onAuthStateChanged){
        window.auth.onAuthStateChanged(user => {
          if(user) {
            window.main.loadDashboardData().then(data => {
              if(window.ui && typeof window.ui.renderDashboardUI === 'function') {
                window.ui.renderDashboardUI(data);
                console.log('init.js: dashboard rendered after auth change');
              }
            }).catch(e => {
              console.error('init.js: loadDashboardData failed after auth change', e);
              // Show user-friendly error message
              if(window.utils?.showToast) {
                window.utils.showToast('Failed to load dashboard data. Please refresh the page.', 'error');
              }
            });
          }
        });
      }
      
      window.appReady = true;
      console.log('✅ init.js: app initialization complete');
    } catch(err){
      console.error('init.js: initialization error', err);
    }
  }

  // Start initialization after DOM is ready
  function startInitialization() {
    console.log('init.js: starting module loading detection...');
    initializeApp();
  }

  if(document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(startInitialization, 100); // Give a bit more time for scripts to load
  } else {
    document.addEventListener('DOMContentLoaded', startInitialization);
  }
})();
// === INIT.JS END ===


