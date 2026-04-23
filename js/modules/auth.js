// ============================================
// Auth Module
// ============================================
import { supabase } from '../config/supabase.js';
import { toast, initTheme } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initTabs();
  initSigninForm();
  initSignupForm();

  // Auto-redirect if already logged in
  const { data: { session } } = await supabase.auth.getSession();
  if (session) window.location.href = 'index.html';
});

// ===== TABS =====
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const signin = document.getElementById('signinForm');
  const signup = document.getElementById('signupForm');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('bg-white', 'dark:bg-slate-700', 'shadow-sm');
        t.classList.add('text-slate-500');
      });
      tab.classList.add('bg-white', 'dark:bg-slate-700', 'shadow-sm');
      tab.classList.remove('text-slate-500');

      if (tab.dataset.tab === 'signin') {
        signin.classList.remove('hidden');
        signup.classList.add('hidden');
      } else {
        signup.classList.remove('hidden');
        signin.classList.add('hidden');
      }
    });
  });
}

// ===== SIGN IN =====
function initSigninForm() {
  const form = document.getElementById('signinForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="inline-block animate-spin">◌</span> Signing in...';

    const fd = new FormData(form);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: fd.get('email'),
      password: fd.get('password')
    });

    if (error) {
      toast(error.message, 'error');
      btn.disabled = false;
      btn.textContent = originalText;
      return;
    }

    toast('Welcome back!', 'success');
    setTimeout(() => window.location.href = 'index.html', 400);
  });
}

// ===== SIGN UP =====
function initSignupForm() {
  const form = document.getElementById('signupForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="inline-block animate-spin">◌</span> Creating...';

    const fd = new FormData(form);
    const { data, error } = await supabase.auth.signUp({
      email: fd.get('email'),
      password: fd.get('password')
    });

    if (error) {
      toast(error.message, 'error');
      btn.disabled = false;
      btn.textContent = originalText;
      return;
    }

    if (data.user && !data.session) {
      toast('Check your email to confirm your account', 'success', 5000);
    } else {
      toast('Account created!', 'success');
      setTimeout(() => window.location.href = 'index.html', 400);
    }
    btn.disabled = false;
    btn.textContent = originalText;
  });
}

// ===== SIGN OUT (used from other pages) =====
export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = 'auth.html';
}
