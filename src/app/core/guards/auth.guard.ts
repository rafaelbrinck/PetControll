import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = () => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);
  console.log('[authGuard] invoked');
  // During SSR there is no window/localStorage; allow navigation on server and let client handle redirects
  if (typeof window === 'undefined') {
    console.log('[authGuard] SSR environment detected - allowing navigation on server');
    return true;
  }
  try {
    const auth = supabaseService.isAuthenticated;
    console.log(
      '[authGuard] isAuthenticated ->',
      auth,
      'currentUser:',
      supabaseService.currentUser?.email ?? null,
    );
    if (auth) {
      return true;
    }
  } catch (e) {
    console.warn('[authGuard] error checking isAuthenticated', e);
  }

  console.log('[authGuard] not authenticated -> redirecting to /login');
  router.navigate(['/login']);
  return false;
};
