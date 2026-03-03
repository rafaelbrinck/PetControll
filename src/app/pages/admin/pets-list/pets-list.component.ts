import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Pet } from '../../../shared/models/models';

@Component({
  selector: 'app-pets-list',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './pets-list.component.html',
})
export class PetsListComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  petsList: Pet[] = [];
  loading = true;
  error = '';
  searchQuery = '';
  selectedSpecies = 'Todas';
  speciesOptions: string[] = [];

  async ngOnInit() {
    this.loading = true;
    try {
      const list = await this.supabase.getPets();
      this.ngZone.run(() => {
        this.petsList = list;
        this.error = '';
        this.updateSpeciesOptions(list);
      });
    } catch (e: unknown) {
      this.ngZone.run(() => {
        this.error = e instanceof Error ? e.message : 'Erro ao carregar pets';
      });
    } finally {
      this.ngZone.run(() => {
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  }

  get filteredPets(): Pet[] {
    let result = [...this.petsList];

    const query = this.searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((pet) => {
        const name = (pet.name ?? '').toLowerCase();
        const breed = (pet.breed ?? '').toLowerCase();
        return name.includes(query) || breed.includes(query);
      });
    }

    if (this.selectedSpecies !== 'Todas') {
      const selected = this.selectedSpecies.toLowerCase();
      result = result.filter((pet) => (pet.species ?? '').toLowerCase() === selected);
    }

    return result;
  }

  setSpeciesFilter(species: string) {
    this.selectedSpecies = species;
  }

  private updateSpeciesOptions(list: Pet[]) {
    const set = new Set<string>();
    for (const pet of list) {
      const species = (pet.species ?? '').trim();
      if (species) {
        set.add(species);
      }
    }
    this.speciesOptions = Array.from(set).sort((a, b) => a.localeCompare(b));
  }
}
