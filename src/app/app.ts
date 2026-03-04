import { Component, signal, inject } from '@angular/core';
import {
  RouterOutlet,
  Router,
  NavigationStart,
  NavigationEnd,
  NavigationError,
} from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('PetHealth');

  constructor() {
    const router = inject(Router);
    const supabase = inject<any>(
      // avoid typing dependency here to keep code simple; SupabaseService has isAuthenticatedSync/isAuthenticated
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('./core/services/supabase.service').SupabaseService,
    );
    console.log(
      '[App] initial location:',
      typeof window !== 'undefined' ? window.location.pathname : 'no-window',
    );
    router.events.subscribe((ev: any) => {
      if (ev instanceof NavigationStart) {
        console.log('[Router] NavigationStart ->', ev.url);
      } else if (ev instanceof NavigationEnd) {
        console.log('[Router] NavigationEnd ->', ev.urlAfterRedirects);
      } else if (ev instanceof NavigationError) {
        console.error('[Router] NavigationError ->', ev.error, ev);
      }
    });

    // client-only: if authenticated and we're on public routes, redirect to admin.
    if (typeof window !== 'undefined') {
      try {
        const path = window.location.pathname || '/';
        const isAuth =
          supabase.isAuthenticated ||
          (supabase.isAuthenticatedSync && supabase.isAuthenticatedSync());
        console.log(
          '[App] client post-bootstrap check isAuthenticated ->',
          isAuth,
          'path ->',
          path,
        );
        if (isAuth && (path === '/' || path === '/login' || path === '/register')) {
          console.log('[App] client redirecting authenticated user to /admin/dashboard');
          router.navigate(['/admin/dashboard']);
        }
      } catch (e) {
        console.warn('[App] client redirect check failed', e);
      }
    }
  }
}
