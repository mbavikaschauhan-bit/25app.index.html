// === AUTH_STATE.JS ===
// UI-only auth state change handler - extracted from inline auth.onAuthStateChanged

(function(){
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    console.log('auth_state.js: DOMContentLoaded');

    // Safe UI handler exposed
    function handleAuthChange(user) {
      try {
        if (user) {
          // Show loading state to prevent jitter - will be updated when profile data loads
          const userDisplayName = document.getElementById('user-display-name');
          if (userDisplayName) {
            userDisplayName.textContent = 'Loading...';
          }
          console.log('User logged in - showing app container');
          
          // Switch containers immediately for smoother transition
          const authContainer = document.getElementById('auth-container');
          const appContainer = document.getElementById('app-container');
          
          if (authContainer) authContainer.classList.remove('show');
          if (appContainer) appContainer.classList.add('show');
          
          // Set the correct page as active BEFORE loading data to prevent flicker
          const pages = document.querySelectorAll('.page');
          const navItems = document.querySelectorAll('.nav-item');
          
          // Set the correct page as active immediately
          pages.forEach(p => p.classList.remove('active'));
          const savedPage = localStorage.getItem('currentPage') || 'dashboard';
          const targetPage = document.getElementById(savedPage);
          if (targetPage) targetPage.classList.add('active');
          
          // Set the correct nav item as active
          navItems.forEach(item => item.classList.remove('active'));
          const activeNavItem = document.querySelector(`.nav-item[data-page="${savedPage}"]`);
          if (activeNavItem) activeNavItem.classList.add('active');
          
        } else {
          // User logged out - show auth container, hide app container
          const appContainer = document.getElementById('app-container');
          const authContainer = document.getElementById('auth-container');
          
          if (appContainer) appContainer.classList.remove('show');
          if (authContainer) authContainer.classList.add('show');
          console.log('User logged out - showing auth container');
        }
      } catch (err) {
        console.error('auth_state.js: handleAuthChange error', err);
      }
    }

    // Subscribe to auth changes via window.auth wrapper
    if (window.auth && typeof window.auth.onAuthStateChanged === 'function') {
      window.auth.onAuthStateChanged((user) => {
        handleAuthChange(user);
      });
    } else {
      console.warn('auth_state.js: window.auth.onAuthStateChanged not available');
    }

    // Also expose for manual invocation if other code needs it
    window.authState = window.authState || {};
    window.authState.handleAuthChange = handleAuthChange;
  });
})();
