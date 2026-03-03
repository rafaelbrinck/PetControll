import { Component, OnInit, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { InventoryItem } from '../../../shared/models/models';

@Component({
  selector: 'app-inventory-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './inventory-form.component.html',
})
export class InventoryFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  loading = false;
  error = '';

  form = this.fb.group({
    item_name: ['', Validators.required],
    category: ['', Validators.required],
    current_quantity: [0, [Validators.required, Validators.min(0)]],
    unit_measure: ['', Validators.required],
    alert_threshold: [0, [Validators.required, Validators.min(0)]],
  });

  categories: InventoryItem['category'][] = ['Alimentação', 'Higiene', 'Medicamento', 'Outros'];

  ngOnInit() {}

  getFieldError(field: string) {
    const ctrl = this.form.get(field);
    if (!ctrl || !ctrl.touched || ctrl.valid) return null;
    if (ctrl.errors?.['required']) return 'Campo obrigatório';
    if (ctrl.errors?.['min']) return 'Valor inválido';
    return 'Inválido';
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    try {
      const v = this.form.value as {
        item_name: string;
        category: InventoryItem['category'];
        current_quantity: number;
        unit_measure: string;
        alert_threshold: number;
      };
      const item: InventoryItem = {
        item_name: v.item_name || '',
        category: v.category,
        current_quantity: v.current_quantity || 0,
        unit_measure: v.unit_measure || '',
        alert_threshold: v.alert_threshold || 0,
      };
      await this.supabase.addInventoryItem(item);
      this.ngZone.run(() => {
        this.router.navigate(['/admin/inventory']);
      });
    } catch (e: unknown) {
      this.ngZone.run(() => {
        this.error = e instanceof Error ? e.message : 'Erro ao salvar item';
        this.loading = false;
      });
    }
  }
}
