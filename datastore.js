// === DATASTORE.JS ===
// Pure data layer: Supabase client + backend operations with NO DOM/UI dependencies

(function() {
    'use strict';

    // Use globally available Supabase from CDN (loaded in index.html)
    const { createClient } = window.supabase;

    // --- Supabase Client Initialization ---
    // Security: Support environment variables with fallback to hardcoded values
    const supabaseUrl = window.SUPABASE_URL || "https://pedhqcyudanorjewtdiy.supabase.co"; 
    const supabaseAnonKey = window.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZGhxY3l1ZGFub3JqZXd0ZGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0OTE1ODAsImV4cCI6MjA3NTA2NzU4MH0.5-5t2Z3gosmTmaFlLKKTm7jHYB7HDESt7h9wH5VAHWk"; 

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // --- Backend Adapter (Inlined) ---
    const auth = {
    onAuthStateChanged: (callback) => {
        return supabase.auth.onAuthStateChange((event, session) => {
            const user = session?.user || null;
            if (user) {
                user.uid = user.id;
                user.displayName = user.user_metadata?.name || user.email;
            }
            try {
                callback(user);
            } catch (error) {
                console.error('Auth state change callback error:', error);
            }
            });
        },
        signIn: async (email, password) => {
            try {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                return { user: data.user, session: data.session };
            } catch (error) {
                console.error('Sign in error:', error);
                throw error;
            }
        },
        signUp: async (email, password) => {
            try {
                const { data, error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                // Optional: Create a profile entry upon sign-up
                if (data.user) {
                    try {
                        await supabase.from('profiles').insert({ id: data.user.id, name: 'New User', email: data.user.email });
                    } catch (profileError) {
                        console.warn('Profile creation failed:', profileError);
                        // Continue without throwing - profile creation is optional
                    }
                }
                return { user: data.user, session: data.session };
            } catch (error) {
                console.error('Sign up error:', error);
                throw error;
            }
        },
        updateProfile: async (user, profileData) => {
            try {
                const { data, error } = await supabase.auth.updateUser({
                    data: { name: profileData.displayName }
                });
                if (error) throw error;
                return data;
            } catch (error) {
                console.error('Update profile error:', error);
                throw error;
            }
        },
        signOut: async () => {
            try {
                await supabase.auth.signOut();
            } catch (error) {
                console.error('Sign out error:', error);
                // Don't throw - logout should always succeed from UI perspective
            }
        },
        getUser: async () => {
            const { data, error } = await supabase.auth.getSession();
            if (error) {
                console.error("Error getting supabase session:", error);
                return null;
            }
            return data?.session?.user || null;
        }
    };

    // === Small helper services for trades and files ===
    async function addTrade(trade) {
        // trade: { user_id, asset, entryPrice, exitPrice, quantity, entryDate, exitDate, pnl, ... }
        const { data, error } = await supabase.from('trades').insert([trade]).select();
        if (error) throw error;
        return data[0];
    }

    async function uploadAttachment(userId, file) {
        // `file` is an input File object. Place in 'attachments' bucket.
        const filename = `${userId}/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage.from('attachments').upload(filename, file);
        if (uploadErr) throw uploadErr;
        const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filename);
        return { publicUrl, path: filename };
    }

    async function getTradesForCalendar(userId, startDateISO, endDateISO) {
        const { data, error } = await supabase
            .from('trades')
            .select('*')
            .eq('user_id', userId)
            .gte('exit_date', startDateISO)
            .lte('exit_date', endDateISO)
            .order('exit_date', { ascending: true });
        if (error) throw error;
        return data;
    }

    async function getPartialExitsForTrades(tradeIds) {
        if (!tradeIds || tradeIds.length === 0) {
            return {};
        }
        
        try {
            const { data, error } = await supabase
                .from('partial_exits')
                .select('*')
                .in('trade_id', tradeIds);
            
            if (error) throw error;
            
            // Group partial exits by trade_id
            const partialExitsMap = {};
            data.forEach(exit => {
                if (!partialExitsMap[exit.trade_id]) {
                    partialExitsMap[exit.trade_id] = [];
                }
                partialExitsMap[exit.trade_id].push(exit);
            });
            
            return partialExitsMap;
        } catch (error) {
            console.error('Error fetching partial exits for trades:', error);
            return {};
        }
    }

    // --- Exposure wrapper ---
    window.datastore = {
        supabase,
        auth,
        addTrade,
        uploadAttachment,
        getTradesForCalendar,
        getPartialExitsForTrades
    };

})(); // End of IIFE

