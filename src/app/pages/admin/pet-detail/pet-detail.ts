import { Component, OnInit, inject, signal, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Pet, WeightLog } from '../../../shared/models/models';
import { VaccineList } from '../vaccine-list/vaccine-list';
import { MedicalTimeline } from '../medical-timeline/medical-timeline';
import {
  NgApexchartsModule,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexStroke,
  ApexDataLabels,
  ApexYAxis,
  ApexTitleSubtitle,
} from 'ng-apexcharts';

@Component({
  selector: 'app-pet-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    VaccineList,
    MedicalTimeline,
    TitleCasePipe,
    FormsModule,
    ReactiveFormsModule,
    NgApexchartsModule,
  ],
  templateUrl: './pet-detail.html',
})
export class PetDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private supabase = inject(SupabaseService);
  private ngZone = inject(NgZone);
  private fb = inject(FormBuilder);

  readonly pet = signal<Pet | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly activeTab = signal<'history' | 'vaccines' | 'care' | 'weight'>('history');

  readonly weightLogs = signal<WeightLog[]>([]);
  readonly showWeightForm = signal(false);
  readonly weightForm = this.fb.group({
    weight: [null, Validators.required],
    date: [new Date().toISOString().split('T')[0], Validators.required],
  });

  get petId(): string | null {
    return this.pet()?.id ?? null;
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Pet não encontrado.');
      this.loading.set(false);
      return;
    }
    this.loadWeightData(id);

    try {
      const data = await this.supabase.getPetById(id);
      this.ngZone.run(() => {
        if (!data) {
          this.error.set('Pet não encontrado.');
        } else {
          this.pet.set(data);
          this.error.set('');
        }
        this.loading.set(false);
      });
    } catch (e: unknown) {
      this.ngZone.run(() => {
        this.error.set(e instanceof Error ? e.message : 'Erro ao carregar pet');
        this.loading.set(false);
      });
    }
  }

  setTab(tab: 'history' | 'vaccines' | 'care' | 'weight') {
    this.activeTab.set(tab);
  }

  async saveCareInfo() {
    const pet = this.pet();
    if (!pet) return;
    try {
      const updated = await this.supabase.updatePet(pet.id, {
        care_notes: pet.care_notes,
        vet_contact: pet.vet_contact,
      });
      this.ngZone.run(() => {
        this.pet.set(updated);
      });
    } catch (e) {
      console.error('erro salvando cuidados', e);
    }
  }

  // weight helpers
  chartOptions: any;

  private async loadWeightData(petId: string) {
    try {
      const logs = await this.supabase.getWeightLogs(petId);
      this.ngZone.run(() => {
        this.weightLogs.set(logs);
        this.prepareChart(logs);
      });
    } catch (e) {
      console.error('erro carregando pesos', e);
    }
  }

  private prepareChart(logs: WeightLog[]) {
    const series = logs.map((w) => w.weight);
    const categories = logs.map((w) => w.date_measured);
    this.chartOptions = {
      series: [{ name: 'Peso', data: series }],
      chart: { type: 'area', height: 350, zoom: { enabled: false } },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth' },
      xaxis: { categories },
      yaxis: { title: { text: 'Peso (kg)' } },
    } as any;
  }

  readonly isWeightSheetOpen = signal(false);

  openWeightSheet() {
    this.isWeightSheetOpen.set(true);
  }

  closeWeightSheet() {
    this.isWeightSheetOpen.set(false);
  }

  async addWeightEntry(weight: number, date: string) {
    const pet = this.pet();
    if (!pet) return;
    try {
      await this.supabase.addWeightLog({ pet_id: pet.id, weight, date_measured: date });
      await this.loadWeightData(pet.id);
      this.showWeightForm.set(false);
    } catch (e) {
      console.error('erro salvando peso', e);
    }
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
}
