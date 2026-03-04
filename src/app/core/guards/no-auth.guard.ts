import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const noAuthGuard: CanActivateFn = () => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);
  // During SSR there is no window/localStorage; allow navigation on server and let client handle redirects
  if (typeof window === 'undefined') {
    console.log('[noAuthGuard] SSR environment detected - allowing navigation on server');
    return true;
  }

  try {
    const auth = supabaseService.isAuthenticated;
    if (auth) {
      console.log('[noAuthGuard] user is authenticated, redirecting to /admin/dashboard');
      router.navigate(['/admin/dashboard']);
      return false;
    }
  } catch (e) {
    console.warn('[noAuthGuard] error checking authentication', e);
  }

  return true;
};
