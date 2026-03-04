import { Component, OnInit, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
})
export class SettingsComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private ngZone = inject(NgZone);

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  sharedUsers: Array<{ owner_id: string; guest_email: string; guest_id?: string }> = [];
  loading = false;

  toastMessage = '';
  toastType: 'success' | 'error' | '' = '';

  ngOnInit(): void {
    this.loadSharedUsers();
  }

  async loadSharedUsers() {
    this.loading = true;
    try {
      const list = await this.supabase.getSharedUsers();
      this.ngZone.run(() => {
        this.sharedUsers = list;
        this.loading = false;
      });
    } catch (e: any) {
      this.ngZone.run(() => {
        this.loading = false;
        this.showToast('Erro ao carregar membros: ' + (e?.message ?? e), 'error');
      });
    }
  }

  async invite() {
    if (this.form.invalid) return this.showToast('Email inválido', 'error');
    const email = this.form.value.email!.trim().toLowerCase();
    this.loading = true;
    try {
      const res = await this.supabase.shareAccount(email);
      this.ngZone.run(() => {
        this.loading = false;
        if (res.success) {
          this.showToast(res.message, 'success');
          this.form.reset();
          this.loadSharedUsers();
        } else {
          this.showToast(res.message || 'Não foi possível enviar o convite', 'error');
        }
      });
    } catch (e: any) {
      this.ngZone.run(() => {
        this.loading = false;
        this.showToast('Erro ao enviar convite: ' + (e?.message ?? e), 'error');
      });
    }
  }

  async remove(guestEmail: string) {
    if (!confirm(`Remover acesso de ${guestEmail}?`)) return;
    this.loading = true;
    try {
      const res = await this.supabase.removeSharedAccess(guestEmail);
      this.ngZone.run(() => {
        this.loading = false;
        if (res.success) {
          this.showToast(res.message, 'success');
          this.loadSharedUsers();
        } else {
          this.showToast(res.message || 'Erro ao remover acesso', 'error');
        }
      });
    } catch (e: any) {
      this.ngZone.run(() => {
        this.loading = false;
        this.showToast('Erro ao remover acesso: ' + (e?.message ?? e), 'error');
      });
    }
  }

  showToast(message: string, type: 'success' | 'error') {
    this.toastMessage = message;
    this.toastType = type;
    setTimeout(() => {
      this.ngZone.run(() => {
        this.toastMessage = '';
        this.toastType = '';
      });
    }, 3500);
  }
}
