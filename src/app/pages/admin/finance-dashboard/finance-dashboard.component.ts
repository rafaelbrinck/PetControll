import { Component, NgZone, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Expense } from '../../../shared/models/models';
import { ExpenseFormComponent } from '../expense-form/expense-form.component';

@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [RouterLink, FormsModule, ExpenseFormComponent],
  templateUrl: './finance-dashboard.component.html',
})
export class FinanceDashboardComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private ngZone = inject(NgZone);

  expenses: Expense[] = [];
  loading = true;
  error = '';
  isExpenseSheetOpen = false;
  searchQuery = '';
  selectedCategory = 'Todas';
  categoryOptions: string[] = [];

  get totalThisMonth(): number {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return this.expenses
      .filter((e) => {
        const d = new Date(e.expense_date);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }

  async ngOnInit() {
    try {
      const list = await this.supabase.getExpenses();
      this.ngZone.run(() => {
        this.expenses = list;
        this.loading = false;
        this.error = '';
        this.updateCategoryOptions(list);
      });
    } catch (e: unknown) {
      this.ngZone.run(() => {
        this.error = e instanceof Error ? e.message : 'Erro ao carregar despesas';
        this.loading = false;
      });
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  formatBRL(value: number | string): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value));
  }

  get filteredExpenses(): Expense[] {
    let result = [...this.expenses];

    const query = this.searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((e) => {
        const desc = (e.description ?? '').toLowerCase();
        const cat = (e.category ?? '').toLowerCase();
        return desc.includes(query) || cat.includes(query);
      });
    }

    if (this.selectedCategory !== 'Todas') {
      const selected = this.selectedCategory.toLowerCase();
      result = result.filter((e) => (e.category ?? '').toLowerCase() === selected);
    }

    return result;
  }

  setCategoryFilter(category: string) {
    this.selectedCategory = category;
  }

  private updateCategoryOptions(list: Expense[]) {
    const set = new Set<string>();
    for (const exp of list) {
      const cat = (exp.category ?? '').trim();
      if (cat) {
        set.add(cat);
      }
    }
    this.categoryOptions = Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  openExpenseSheet() {
    this.isExpenseSheetOpen = true;
  }

  closeExpenseSheet() {
    this.isExpenseSheetOpen = false;
  }
}
