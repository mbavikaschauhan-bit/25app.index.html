// === AUTH.JS ===
// Authentication UI layer: Form handlers, logout buttons, auth state UI toggling

(function() {
    'use strict';

    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', () => {
        console.log('auth.js: DOMContentLoaded - initializing auth UI');

        // --- COMPATIBILITY WRAPPER ---
        // Delegates to window.datastore.auth when available
        window.auth = window.auth || {
            signIn: async (email, pass) => window.datastore?.auth?.signIn ? window.datastore.auth.signIn(email, pass) : Promise.reject(new Error('Auth API missing')),
            signUp: async (email, pass) => window.datastore?.auth?.signUp ? window.datastore.auth.signUp(email, pass) : Promise.reject(new Error('Auth API missing')),
            signOut: async () => window.datastore?.auth?.signOut ? window.datastore.auth.signOut() : Promise.resolve(),
            onAuthStateChanged: (cb) => window.datastore?.auth?.onAuthStateChanged ? window.datastore.auth.onAuthStateChanged(cb) : (()=>{}),
            getUser: async () => window.datastore?.auth?.getUser ? window.datastore.auth.getUser() : null,
            updateProfile: async (user, p) => window.datastore?.auth?.updateProfile ? window.datastore.auth.updateProfile(user, p) : Promise.reject(new Error('Auth API missing'))
        };

        console.log('auth wrapper ready');

        // --- AUTH UI ELEMENTS ---
        const authForm = document.getElementById('auth-form');
        const authTitle = document.getElementById('auth-title');
        const authSubmitBtn = document.getElementById('auth-submit-btn');
        const authSubmitBtnText = authSubmitBtn?.querySelector('.btn-text');
        const authToggleLink = document.getElementById('auth-toggle-link');
        const authMessage = document.getElementById('auth-message');
        const authContainer = document.getElementById('auth-container');
        const appContainer = document.getElementById('app-container');

        if (!authForm) {
            console.warn('auth.js: Auth form not found - skipping auth UI initialization');
            return;
        }

        let authMode = 'signin'; // 'signin' or 'signup'

        // --- AUTH TOGGLE LINK ---
        if (authToggleLink) {
            authToggleLink.addEventListener('click', (e) => {
                e.preventDefault();
                authMode = authMode === 'signin' ? 'signup' : 'signin';
                if (authMessage) authMessage.textContent = '';
                
                if (authMode === 'signin') {
                    if (authTitle) authTitle.textContent = 'Sign In';
                    if (authSubmitBtnText) authSubmitBtnText.textContent = 'Sign In';
                    authToggleLink.textContent = "Don't have an account? Sign up";
                } else {
                    if (authTitle) authTitle.textContent = 'Sign Up';
                    if (authSubmitBtnText) authSubmitBtnText.textContent = 'Create Account';
                    authToggleLink.textContent = "Already have an account? Sign in";
                }
            });
            console.log('auth.js: Auth toggle link initialized');
        }

        // --- AUTH FORM SUBMIT ---
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('auth-email');
            const passwordInput = document.getElementById('auth-password');
            
            if (!emailInput || !passwordInput) {
                console.error('auth.js: Email or password input not found');
                return;
            }

            const email = emailInput.value.trim();
            const password = passwordInput.value;
            
            // Basic input validation
            if (!email) {
                if (authMessage) {
                    authMessage.textContent = 'Please enter your email address.';
                    authMessage.style.color = 'red';
                }
                return;
            }
            
            if (!password) {
                if (authMessage) {
                    authMessage.textContent = 'Please enter your password.';
                    authMessage.style.color = 'red';
                }
                return;
            }
            
            if (password.length < 6) {
                if (authMessage) {
                    authMessage.textContent = 'Password must be at least 6 characters long.';
                    authMessage.style.color = 'red';
                }
                return;
            }
            
            // Show spinner if utils available
            if (window.utils?.toggleSpinner && authSubmitBtn) {
                window.utils.toggleSpinner(authSubmitBtn, true);
            }
            if (authMessage) authMessage.textContent = '';

            try {
                if (authMode === 'signin') {
                    await window.auth.signIn(email, password);
                    console.log('auth.js: Sign in successful');
                } else {
                    await window.auth.signUp(email, password);
                    console.log('auth.js: Sign up successful');
                    if (window.utils?.showToast) {
                        window.utils.showToast('Welcome! Please check your email to confirm your account.', 'success');
                    }
                }
            } catch (error) {
                console.error('auth.js: Auth form error:', error);
                if (authMessage) {
                    authMessage.textContent = error.message || 'Authentication failed. Please try again.';
                    authMessage.style.color = 'red';
                }
            } finally {
                // Hide spinner
                if (window.utils?.toggleSpinner && authSubmitBtn) {
                    window.utils.toggleSpinner(authSubmitBtn, false);
                }
            }
        });
        console.log('auth.js: Auth form submit handler initialized');

        // --- LOGOUT BUTTONS ---
        const logoutButtons = document.querySelectorAll('.logout-btn');
        logoutButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('auth.js: Logout button clicked');
                
                try {
                    await window.auth.signOut();
                    console.log('auth.js: Sign out completed');
                } catch (error) {
                    console.error('auth.js: Sign out error:', error);
                }
                
                // Force UI update to ensure proper logout state
                console.log('auth.js: Forcing UI logout state');
                
                // Update appState if available
                if (window.appState) {
                    window.appState.user = null;
                    
                    // Clear intervals
                    if (window.appState.clockIntervalId) {
                        clearInterval(window.appState.clockIntervalId);
                        window.appState.clockIntervalId = null;
                    }
                    
                    // Clear all data
                    window.appState.trades = [];
                    window.appState.ledger = [];
                    window.appState.challenge = null;
                    window.appState.challengeHistory = [];
                }
                
                // Force hide app container
                if (appContainer) {
                    appContainer.classList.remove('show');
                    console.log('auth.js: App container hidden');
                }
                
                // Force show auth container
                if (authContainer) {
                    authContainer.classList.add('show');
                    console.log('auth.js: Auth container shown');
                }
                
                // Show toast notification
                if (window.utils?.showToast) {
                    window.utils.showToast("You have been signed out.", "info");
                }
                console.log('auth.js: Logout completed');
            });
        });
        console.log(`auth.js: ${logoutButtons.length} logout button(s) initialized`);

    }); // End DOMContentLoaded

})(); // End IIFE