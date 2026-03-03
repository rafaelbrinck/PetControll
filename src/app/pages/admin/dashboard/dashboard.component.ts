import { Component, OnInit, inject, signal, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Pet, Vaccine, Expense, InventoryItem } from '../../../shared/models/models';

interface Alert {
  type: 'vaccine' | 'stock' | 'expense';
  pet_name?: string;
  title: string;
  due_date: string;
  urgency: 'high' | 'medium' | 'low';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private ngZone = inject(NgZone);

  // Signals para estado reativo
  readonly isLoading = signal(true);
  readonly totalPets = signal(0);
  readonly monthlyExpenses = signal(0);
  readonly lowStockCount = signal(0);
  readonly upcomingAlerts = signal<Alert[]>([]);
  readonly todaysMeds = signal<any[]>([]); // will hold medication logs with join data
  readonly userEmail = signal('');

  async ngOnInit() {
    await this.loadDashboardData();
  }

  private async loadDashboardData() {
    this.isLoading.set(true);
    try {
      // Carrega email do usuário
      const user = this.supabase.currentUser;
      if (user) {
        this.ngZone.run(() => this.userEmail.set(user.email || ''));
      }

      // Carrega dados em paralelo
      const pets = await this.supabase.getPets().catch(() => []);
      const expenses = await this.supabase.getExpenses().catch(() => []);
      const inventory = await this.supabase.getInventoryItems().catch(() => []);
      const vaccines = await this.carregaAllVaccines(pets);
      const meds = await this.supabase.getTodayMedications().catch(() => []);

      this.ngZone.run(() => {
        this.todaysMeds.set(meds as any[]);
        // Calcula totais
        this.totalPets.set(pets.length);

        // Gasto do mês atual
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const monthTotal = (expenses as Expense[]).reduce((sum, exp) => {
          const expDate = new Date(exp.expense_date);
          if (expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
            return sum + exp.amount;
          }
          return sum;
        }, 0);
        this.monthlyExpenses.set(monthTotal);

        // Itens com estoque baixo
        const lowStock = (inventory as InventoryItem[]).filter(
          (item) => item.current_quantity <= item.alert_threshold,
        );
        this.lowStockCount.set(lowStock.length);

        // Gera alertas
        const alerts: Alert[] = [];

        // Vacinas vencendo nos próximos 30 dias
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        (vaccines as any[]).forEach((v) => {
          if (v.next_due_date) {
            const dueDate = new Date(v.next_due_date);
            if (dueDate <= thirtyDaysFromNow && dueDate >= now) {
              const daysLeft = Math.ceil(
                (dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
              );
              alerts.push({
                type: 'vaccine',
                title: `Vacina ${v.vaccine_name} vence em ${daysLeft} dias`,
                due_date: v.next_due_date,
                pet_name: v.pet_name,
                urgency: daysLeft <= 7 ? 'high' : daysLeft <= 14 ? 'medium' : 'low',
              });
            }
          }
        });

        // Estoque baixo
        lowStock.slice(0, 3).forEach((item) => {
          alerts.push({
            type: 'stock',
            title: `${item.item_name} em estoque baixo`,
            due_date: new Date().toISOString(),
            urgency: 'high',
          });
        });

        // Ordena por urgência
        alerts.sort((a, b) => {
          const urgencyMap = { high: 0, medium: 1, low: 2 };
          return urgencyMap[a.urgency] - urgencyMap[b.urgency];
        });

        this.upcomingAlerts.set(alerts.slice(0, 5));
        this.isLoading.set(false);
      });
    } catch (e) {
      console.error('Erro na dashboard:', e);
      this.ngZone.run(() => this.isLoading.set(false));
    }
  }

  private async carregaAllVaccines(pets: Pet[]): Promise<any[]> {
    const allVaccines: any[] = [];
    for (const pet of pets) {
      try {
        const vacs = await this.supabase.getVaccinesByPet(pet.id);
        allVaccines.push(
          ...(vacs as any[]).map((v: any) => ({
            ...v,
            pet_name: pet.name,
            vaccine_name: v.name,
          })),
        );
      } catch (e) {
        console.error(`Erro ao carregar vacinas de ${pet.name}:`, e);
      }
    }
    return allVaccines;
  }

  async markMedicationDone(log: any) {
    try {
      await this.supabase.updateMedicationLog(log.id, {
        status: 'done',
        administered_at: new Date().toISOString(),
      });
      // remove or update locally
      this.ngZone.run(() => {
        const arr = this.todaysMeds();
        const idx = arr.findIndex((x) => x.id === log.id);
        if (idx !== -1) {
          arr[idx].status = 'done';
          this.todaysMeds.set([...arr]);
        }
      });
    } catch (e) {
      console.error('Erro marcando medicação', e);
    }
  }

  formatReais(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
