// ============================================
// Auth Page Logic
// Works with Supabase when configured.
// Otherwise, lets users continue in offline mode.
// ============================================

import { supabase, isCloudEnabled } from '../config/supabase.js';
import { initTheme, toast, setButtonLoading } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initTabs();
  initForms();
  initOfflineModeNotice();

  if (isCloudEnabled) {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (session) {
      window.location.href = 'index.html';
    }
  }
});

function initTabs() {
  const tabs = document.querySelectorAll('[data-tab]');
  const forms = {
    signin: document.getElementById('signinForm'),
    signup: document.getElementById('signupForm')
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach((button) => {
        button.classList.remove('bg-white', 'text-slate-950', 'shadow-soft', 'dark:bg-slate-800', 'dark:text-white');
        button.classList.add('text-slate-500', 'dark:text-slate-400');
        button.setAttribute('aria-selected', 'false');
      });

      tab.classList.add('bg-white', 'text-slate-950', 'shadow-soft', 'dark:bg-slate-800', 'dark:text-white');
      tab.classList.remove('text-slate-500', 'dark:text-slate-400');
      tab.setAttribute('aria-selected', 'true');

      Object.entries(forms).forEach(([name, form]) => {
        form?.classList.toggle('hidden', name !== target);
      });
    });
  });
}

function initOfflineModeNotice() {
  const notice = document.getElementById('offlineNotice');
  const continueButton = document.getElementById('continueOfflineBtn');

  if (!notice || !continueButton) return;

  if (isCloudEnabled) {
    notice.classList.add('hidden');
    return;
  }

  notice.classList.remove('hidden');

  continueButton.addEventListener('click', () => {
    toast('Continuing in offline mode.', 'success');
    window.location.href = 'index.html';
  });
}

function initForms() {
  const signinForm = document.getElementById('signinForm');
  const signupForm = document.getElementById('signupForm');

  signinForm?.addEventListener('submit', handleSignin);
  signupForm?.addEventListener('submit', handleSignup);
}

async function handleSignin(event) {
  event.preventDefault();

  if (!isCloudEnabled) {
    toast('Cloud auth is not configured. Continuing offline.', 'info');
    window.location.href = 'index.html';
    return;
  }

  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const email = form.email.value.trim();
  const password = form.password.value;

  if (!email || !password) {
    toast('Please enter your email and password.', 'error');
    return;
  }

  try {
    setButtonLoading(button, true, 'Signing in...');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    toast('Welcome back!', 'success');
    window.location.href = 'index.html';
  } catch (error) {
    toast(error.message || 'Could not sign in.', 'error');
  } finally {
    setButtonLoading(button, false);
  }
}

async function handleSignup(event) {
  event.preventDefault();

  if (!isCloudEnabled) {
    toast('Cloud auth is not configured. Continuing offline.', 'info');
    window.location.href = 'index.html';
    return;
  }

  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const email = form.email.value.trim();
  const password = form.password.value;
  const confirmPassword = form.confirmPassword.value;

  if (!email || !password || !confirmPassword) {
    toast('Please complete all required fields.', 'error');
    return;
  }

  if (password.length < 8) {
    toast('Password must be at least 8 characters.', 'error');
    return;
  }

  if (password !== confirmPassword) {
    toast('Passwords do not match.', 'error');
    return;
  }

  try {
    setButtonLoading(button, true, 'Creating account...');

    const { error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) throw error;

    toast('Account created. Check your email if confirmation is enabled.', 'success');
    window.location.href = 'index.html';
  } catch (error) {
    toast(error.message || 'Could not create account.', 'error');
  } finally {
    setButtonLoading(button, false);
  }
}
