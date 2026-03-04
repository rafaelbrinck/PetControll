import {
  ApplicationConfig,
  APP_INITIALIZER,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { SupabaseService } from './core/services/supabase.service';

export function initializeApp(supabase: SupabaseService) {
  return () => {
    console.log('[APP_INITIALIZER] initializeApp: calling supabase.initSession()');
    return supabase
      .initSession()
      .then(() => {
        console.log('[APP_INITIALIZER] initializeApp: supabase.initSession() resolved');
      })
      .catch((e) => {
        console.error('[APP_INITIALIZER] initializeApp: supabase.initSession() rejected', e);
        throw e;
      });
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [SupabaseService],
      multi: true,
    },
  ],
};
