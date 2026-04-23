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

/**
 * Auth Page UI Handling
 * This logic runs only on the auth.html page
 */
const initAuthUI = () => {
    const signinForm = document.getElementById('signinForm');
    const signupForm = document.getElementById('signupForm');
    if (!signinForm || !signupForm) return;

    const tabBtns = document.querySelectorAll('.tab-btn');

    // Tab Switching Logic
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            // Update buttons styling
            tabBtns.forEach(b => {
                b.classList.remove('bg-white', 'dark:bg-slate-700', 'shadow-sm');
                b.classList.add('text-slate-500');
            });
            btn.classList.add('bg-white', 'dark:bg-slate-700', 'shadow-sm');
            btn.classList.remove('text-slate-500');

            // Toggle forms visibility
            if (tab === 'signin') {
                signinForm.classList.remove('hidden');
                signupForm.classList.add('hidden');
                document.title = 'Sign In — EduLearn';
            } else {
                signinForm.classList.add('hidden');
                signupForm.classList.remove('hidden');
                document.title = 'Create Account — EduLearn';
            }
        });
    });

    // Form Submissions
    const handleFormSubmit = async (form, action) => {
        const formData = new FormData(form);
        const email = formData.get('email');
        const password = formData.get('password');
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <span class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
            </span>
        `;

        try {
            const result = await (action === 'signin' ? Auth.signIn(email, password) : Auth.signUp(email, password));
            if (result) {
                // For signup, check if we got a session (auto-login)
                if (action === 'signin' || (result.session || result.user)) {
                    // Short delay for better UX
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 500);
                } else {
                    // Probably needs email confirmation
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            } else {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    };

    signinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleFormSubmit(signinForm, 'signin');
    });

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleFormSubmit(signupForm, 'signup');
    });
};

// Initialize if in browser environment
if (typeof document !== 'undefined') {
    initAuthUI();
}
