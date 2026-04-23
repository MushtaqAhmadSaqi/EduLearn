// ============================================
// Authentication Module
// ============================================
import { supabase, getUser } from '../config/supabase.js';
import { showToast } from './ui.js';

export const Auth = {
    /**
     * Sign up a new user
     * @param {string} email 
     * @param {string} password 
     * @param {object} metadata 
     */
    async signUp(email, password, metadata = {}) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: metadata
                }
            });
            if (error) throw error;
            showToast('Check your email for confirmation!', 'success');
            return data;
        } catch (error) {
            showToast(error.message, 'error');
            return null;
        }
    },

    /**
     * Sign in an existing user
     * @param {string} email 
     * @param {string} password 
     */
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            showToast('Welcome back!', 'success');
            return data;
        } catch (error) {
            showToast(error.message, 'error');
            return null;
        }
    },

    /**
     * Sign out current user
     */
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            showToast('Logged out successfully', 'info');
            window.location.href = 'auth.html';
        } catch (error) {
            showToast(error.message, 'error');
        }
    },

    /**
     * Get current user profile
     */
    async getProfile() {
        const user = await getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        return data || null;
    }
};
