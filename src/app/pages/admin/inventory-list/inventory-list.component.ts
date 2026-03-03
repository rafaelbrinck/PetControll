import { Component, OnInit, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';
import { InventoryItem } from '../../../shared/models/models';
import { InventoryFormComponent } from '../inventory-form/inventory-form.component';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [CommonModule, FormsModule, InventoryFormComponent],
  templateUrl: './inventory-list.component.html',
})
export class InventoryListComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private ngZone = inject(NgZone);
  private router = inject(Router);

  items: InventoryItem[] = [];
  loading = true;
  error = '';
  isItemSheetOpen = false;
  searchQuery = '';
  selectedCategory = 'Todas';
  categoryOptions: string[] = [];

  trackById(index: number, item: InventoryItem) {
    return item.id;
  }

  async ngOnInit() {
    await this.loadItems();
  }

  private async loadItems() {
    this.loading = true;
    try {
      const list = await this.supabase.getInventoryItems();
      this.ngZone.run(() => {
        this.items = list;
        this.loading = false;
        this.error = '';
        this.updateCategoryOptions(list);
      });
    } catch (e: unknown) {
      this.ngZone.run(() => {
        this.error = e instanceof Error ? e.message : 'Erro ao carregar estoques';
        this.loading = false;
      });
    }
  }

  get filteredItems(): InventoryItem[] {
    let result = [...this.items];

    const query = this.searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((item) => {
        const name = (item.item_name ?? '').toLowerCase();
        const category = (item.category ?? '').toLowerCase();
        return name.includes(query) || category.includes(query);
      });
    }

    if (this.selectedCategory !== 'Todas') {
      const selected = this.selectedCategory.toLowerCase();
      result = result.filter((item) => (item.category ?? '').toLowerCase() === selected);
    }

    return result;
  }

  setCategoryFilter(category: string) {
    this.selectedCategory = category;
  }

  trackSkeleton(index: number, item: number) {
    return item;
  }

  async changeQuantity(item: InventoryItem, delta: number) {
    const newQty = item.current_quantity + delta;
    if (newQty < 0) return;
    try {
      await this.supabase.updateInventoryQuantity(item.id!, newQty);
      // reload
      await this.loadItems();
    } catch (e) {
      console.error('update error', e);
    }
  }

  addItem() {
    this.router.navigate(['/admin/inventory/new']);
  }

  openItemSheet() {
    this.isItemSheetOpen = true;
  }

  closeItemSheet() {
    this.isItemSheetOpen = false;
  }

  private updateCategoryOptions(list: InventoryItem[]) {
    const set = new Set<string>();
    for (const item of list) {
      const category = (item.category ?? '').trim();
      if (category) {
        set.add(category);
      }
    }
    this.categoryOptions = Array.from(set).sort((a, b) => a.localeCompare(b));
  }
}
