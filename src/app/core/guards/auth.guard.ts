import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { switchMap, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  // Aguarda a restauração de sessão, depois verifica autenticação
  return supabase.isSessionRestored$.pipe(
    switchMap((isRestored) => {
      if (isRestored) {
        // Sessão foi restaurada, agora verifica se há sessão ativa
        return supabase.session$.pipe(
          map((session) => {
            if (session) return true;
            return router.createUrlTree(['/login']);
          }),
        );
      }
      return of(router.createUrlTree(['/login']));
    }),
  );
};
