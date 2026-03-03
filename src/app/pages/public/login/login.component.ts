import { Component, inject, NgZone } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  email = '';
  password = '';
  loading = false;
  error = '';

  async onSubmit() {
    this.error = '';
    this.loading = true;
    try {
      await this.supabase.signIn(this.email, this.password);
      this.ngZone.run(() => this.router.navigate(['/admin/dashboard']));
    } catch (e: unknown) {
      this.ngZone.run(() => {
        this.error = e instanceof Error ? e.message : 'Erro ao fazer login';
        this.loading = false;
      });
    } finally {
      this.ngZone.run(() => (this.loading = false));
    }
  }
}
