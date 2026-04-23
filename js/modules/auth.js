// ============================================
// Authentication Module
// ============================================
import { supabase, getUser } from '../config/supabase.js';
import { toast } from './ui.js';

export const Auth = {
    /**
     * Sign up a new user
     */
    async signUp(email, password, metadata = {}) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: metadata }
            });
            if (error) throw error;
            toast('Check your email for confirmation!', 'success');
            return data;
        } catch (error) {
            toast(error.message, 'error');
            return null;
        }
    },

    /**
     * Sign in an existing user
     */
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            toast('Welcome back!', 'success');
            return data;
        } catch (error) {
            toast(error.message, 'error');
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
            toast('Logged out successfully', 'info');
            window.location.href = 'auth.html';
        } catch (error) {
            toast(error.message, 'error');
        }
    }
};
