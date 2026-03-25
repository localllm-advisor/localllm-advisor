'use client';

import { useEffect, useState } from 'react';
import { supabase, getAuthReturnAction, AuthReturnAction } from '@/lib/supabase';

/**
 * useAuthReturn — checks for a pending auth return action after OAuth redirect.
 *
 * How it works:
 * 1. Before OAuth redirect, the login button calls setAuthReturnAction(...)
 * 2. After OAuth completes, Supabase redirects back to the same page
 * 3. This hook detects the new session + pending action from localStorage
 * 4. Returns the action so the page can auto-open the right modal
 *
 * The action is returned once and cleared. Returns null if no pending action.
 */
export function useAuthReturn(): AuthReturnAction | null {
  const [action, setAction] = useState<AuthReturnAction | null>(null);

  useEffect(() => {
    if (!supabase) return;

    // Listen for the SIGNED_IN event that fires after OAuth redirect
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        const pending = getAuthReturnAction();
        if (pending) {
          // Small delay to let the page settle
          setTimeout(() => setAction(pending), 300);
        }
      }
    });

    // Also check immediately — user might already be signed in
    // and the auth state event already fired
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const pending = getAuthReturnAction();
        if (pending) {
          setTimeout(() => setAction(pending), 300);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return action;
}
