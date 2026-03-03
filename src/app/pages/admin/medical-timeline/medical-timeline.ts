import { Component, Input, OnInit, inject, NgZone } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';
import { MedicalRecord } from '../../../shared/models/models';

@Component({
  selector: 'app-medical-timeline',
  standalone: true,
  imports: [DatePipe, TitleCasePipe, ReactiveFormsModule],
  templateUrl: './medical-timeline.html',
})
export class MedicalTimeline implements OnInit {
  @Input() petId!: string;

  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private ngZone = inject(NgZone);

  records: MedicalRecord[] = [];
  loading = true;
  error = '';
  expanded = false;

  readonly form = this.fb.group({
    type: ['consulta' as MedicalRecord['type'], [Validators.required]],
    title: ['', [Validators.required]],
    diagnosis: [''],
    event_date: ['', [Validators.required]],
  });

  async ngOnInit() {
    await this.loadRecords();
  }

  private async loadRecords() {
    this.loading = true;
    this.error = '';
    try {
      const list = await this.supabase.getMedicalRecordsByPet(this.petId);
      this.ngZone.run(() => {
        this.records = list;
        this.loading = false;
        this.error = '';
      });
    } catch (e: unknown) {
      this.ngZone.run(() => {
        this.error = e instanceof Error ? e.message : 'Erro ao carregar histórico médico';
        this.loading = false;
      });
    }
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.value;
    try {
      await this.supabase.addMedicalRecord({
        pet_id: this.petId,
        type: (value.type ?? 'consulta') as MedicalRecord['type'],
        title: value.title ?? '',
        diagnosis: value.diagnosis ?? null,
        event_date: value.event_date ?? '',
      });
      this.ngZone.run(() => {
        this.form.reset({ type: 'consulta', title: '', diagnosis: '', event_date: '' });
        this.expanded = false;
      });
      await this.loadRecords();
    } catch (e: unknown) {
      this.ngZone.run(() => {
        this.error = e instanceof Error ? e.message : 'Erro ao adicionar registro';
      });
    }
  }

  iconFor(record: MedicalRecord): string {
    switch (record.type) {
      case 'consulta':
        return '🩺';
      case 'exame':
        return '🔬';
      case 'cirurgia':
        return '🏥';
      default:
        return '📄';
    }
  }
}
