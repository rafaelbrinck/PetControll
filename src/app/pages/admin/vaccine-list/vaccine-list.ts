import { Component, Input, OnInit, inject, NgZone } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Vaccine } from '../../../shared/models/models';

@Component({
  selector: 'app-vaccine-list',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './vaccine-list.html',
})
export class VaccineList implements OnInit {
  @Input() petId!: string;

  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private ngZone = inject(NgZone);

  vaccines: Vaccine[] = [];
  loading = true;
  error = '';

  expanded = false;

  readonly form = this.fb.group({
    name: ['', [Validators.required]],
    date_administered: ['', [Validators.required]],
    next_due_date: [''],
    batch_number: [''],
  });

  async ngOnInit() {
    await this.loadVaccines();
  }

  private async loadVaccines() {
    this.loading = true;
    this.error = '';
    try {
      const list = await this.supabase.getVaccinesByPet(this.petId);
      this.ngZone.run(() => {
        this.vaccines = list;
        this.loading = false;
        this.error = '';
      });
    } catch (e: unknown) {
      this.ngZone.run(() => {
        this.error = e instanceof Error ? e.message : 'Erro ao carregar vacinas';
        this.loading = false;
      });
    }
  }

  getStatus(vaccine: Vaccine): 'overdue' | 'soon' | 'ok' | 'none' {
    if (!vaccine.next_due_date) return 'none';
    const due = new Date(vaccine.next_due_date);
    if (Number.isNaN(due.getTime())) return 'none';
    const today = new Date();
    const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 30) return 'soon';
    return 'ok';
  }

  statusLabel(status: 'overdue' | 'soon' | 'ok' | 'none'): string {
    switch (status) {
      case 'overdue':
        return 'Vencida';
      case 'soon':
        return 'Vence em breve';
      case 'ok':
        return 'Em dia';
      default:
        return 'Sem próxima dose';
    }
  }

  statusClasses(status: 'overdue' | 'soon' | 'ok' | 'none'): string {
    switch (status) {
      case 'overdue':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'soon':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'ok':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value;
    try {
      await this.supabase.addVaccine({
        pet_id: this.petId,
        name: value.name ?? '',
        date_administered: value.date_administered ?? '',
        next_due_date: value.next_due_date ?? null,
        batch_number: value.batch_number ?? '',
      });
      this.ngZone.run(() => {
        this.form.reset();
        this.expanded = false;
      });
      await this.loadVaccines();
    } catch (e: unknown) {
      this.ngZone.run(() => {
        this.error = e instanceof Error ? e.message : 'Erro ao adicionar vacina';
      });
    }
  }
}
