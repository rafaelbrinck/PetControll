import { Component, inject, OnInit, NgZone } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ExpenseCategory } from '../../../shared/models/models';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Alimentação',
  'Saúde',
  'Acessórios',
  'Higiene',
  'Serviços',
  'Outros',
];

@Component({
  selector: 'app-expense-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './expense-form.component.html',
})
export class ExpenseFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  readonly categories = EXPENSE_CATEGORIES;
  pets: { id: string; name: string }[] = [];
  loading = false;
  error = '';

  readonly form = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    category: ['', [Validators.required]],
    description: ['', [Validators.required]],
    expense_date: [this.todayISO(), [Validators.required]],
    pet_id: [null as string | null],
  });

  todayISO(): string {
    return new Date().toISOString().split('T')[0];
  }

  async ngOnInit() {
    try {
      const list = await this.supabase.getPets();
      this.ngZone.run(() => {
        this.pets = list.map((p) => ({ id: p.id, name: p.name }));
      });
    } catch {
      this.ngZone.run(() => (this.pets = []));
    }
  }

  getFieldError(controlName: string): string | null {
    const control = this.form.get(controlName);
    if (!control) return null;
    if (!control.touched && !control.dirty) return null;
    if (control.hasError('required')) {
      if (controlName === 'amount') return 'Valor é obrigatório.';
      if (controlName === 'category') return 'Categoria é obrigatória.';
      if (controlName === 'description') return 'Descrição é obrigatória.';
      if (controlName === 'expense_date') return 'Data é obrigatória.';
    }
    if (control.hasError('min') && controlName === 'amount') return 'Valor deve ser maior que zero.';
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
    const petId = value.pet_id === '' || value.pet_id === undefined ? null : value.pet_id;

    try {
      await this.supabase.addExpense({
        amount: Number(value.amount),
        category: value.category as ExpenseCategory,
        description: value.description ?? '',
        expense_date: value.expense_date ?? this.todayISO(),
        pet_id: petId,
      });
      this.ngZone.run(() => this.router.navigate(['/admin/finance']));
    } catch (e: unknown) {
      this.ngZone.run(() => {
        this.error = e instanceof Error ? e.message : 'Erro ao salvar despesa';
        this.loading = false;
      });
    } finally {
      this.ngZone.run(() => (this.loading = false));
    }
  }
}
