import { Component, OnInit, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Pet, MedicalRecord } from '../../../shared/models/models';

@Component({
  selector: 'app-caregiver-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './caregiver-view.component.html',
})
export class CaregiverViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private supabase = inject(SupabaseService);
  private ngZone = inject(NgZone);

  pet: Pet | null = null;
  meds: MedicalRecord[] = [];
  loading = true;
  error = '';

  print() {
    window.print();
  }

  formatAge(birthDate: string | null): string {
    if (!birthDate) return 'Idade não informada';
    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return 'Idade não informada';
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();

    if (months < 0) {
      years -= 1;
      months += 12;
    }

    if (years <= 0 && months <= 0) {
      return 'Recém-nascido';
    }
    if (years === 0) {
      return `${months} mes${months > 1 ? 'es' : ''}`;
    }
    if (months === 0) {
      return `${years} ano${years > 1 ? 's' : ''}`;
    }
    return `${years}a ${months}m`;
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Pet não encontrado';
      this.loading = false;
      return;
    }
    try {
      const data = await this.supabase.getPetById(id);
      let records: MedicalRecord[] = [];
      if (data) {
        records = await this.supabase.getMedicalRecordsByPet(id);
      }
      this.ngZone.run(() => {
        this.pet = data;
        this.meds = records.filter(
          (r) => r.type === 'consulta' || r.type === 'exame' || r.type === 'cirurgia',
        );
        this.loading = false;
      });
    } catch (e: unknown) {
      this.ngZone.run(() => {
        this.error = e instanceof Error ? e.message : 'Erro ao carregar dados';
        this.loading = false;
      });
    }
  }
}
