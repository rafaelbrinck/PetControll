import { Component, inject, NgZone } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-pet-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './pet-form.html',
})
export class PetForm {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  readonly form = this.fb.group({
    name: ['', [Validators.required]],
    species: ['', [Validators.required]],
    breed: [''],
    birth_date: [''],
    gender: ['', [Validators.required]],
  });

  loading = false;
  error = '';

  getFieldError(controlName: string): string | null {
    const control = this.form.get(controlName);
    if (!control) return null;
    if (control.hasError('required') && (control.dirty || control.touched)) {
      if (controlName === 'name') return 'Nome é obrigatório.';
      if (controlName === 'species') return 'Espécie é obrigatória.';
      if (controlName === 'gender') return 'Gênero é obrigatório.';
    }
    return null;
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';

    const value = this.form.value;

    try {
      await this.supabase.createPet({
        name: value.name ?? '',
        species: value.species ?? '',
        breed: value.breed ?? undefined,
        birth_date: value.birth_date ?? null,
        gender: value.gender ?? '',
      });
      this.ngZone.run(() => this.router.navigate(['/admin/pets']));
    } catch (e: unknown) {
      this.ngZone.run(() => {
        this.error = e instanceof Error ? e.message : 'Erro ao salvar pet';
        this.loading = false;
      });
    } finally {
      this.ngZone.run(() => (this.loading = false));
    }
  }
}
