import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { environment } from '../../../data/enviroment';
import { Pet, Vaccine, MedicalRecord, Expense, InventoryItem, MedicationLog, Medication, WeightLog } from '../../shared/models/models';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;
  private sessionSubject = new BehaviorSubject<Session | null>(null);
  private isSessionRestored = new BehaviorSubject<boolean>(false);
  readonly session$ = this.sessionSubject.asObservable();
  readonly isSessionRestored$ = this.isSessionRestored.asObservable();

  constructor() {
    this.supabase = createClient(environment.supabase.url, environment.supabase.key, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    });
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.sessionSubject.next(session ?? null);
    });
  }

  /**
   * Restaura a sessão do storage antes do app iniciar. Chamado pelo APP_INITIALIZER.
   */
  async initSession(): Promise<void> {
    try {
      const { data, error } = await this.supabase.auth.getSession();
      if (error) throw error;
      this.sessionSubject.next(data.session ?? null);
    } catch (e) {
      console.error('Erro ao restaurar sessão:', e);
      this.sessionSubject.next(null);
    } finally {
      this.isSessionRestored.next(true);
    }
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  get currentUser(): User | null {
    const v = this.sessionSubject.value;
    return v != null ? v.user : null;
  }

  get isAuthenticated(): boolean {
    return this.sessionSubject.value != null;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async getPets(): Promise<Pet[]> {
    const { data, error } = await this.supabase.from('pets').select('*').order('name');
    if (error) throw error;
    return (data ?? []) as Pet[];
  }

  async getPetById(id: string): Promise<Pet | null> {
    const { data, error } = await this.supabase.from('pets').select('*').eq('id', id).maybeSingle();

    if (error) throw error;
    return data as Pet | null;
  }

  async createPet(input: {
    name: string;
    species: string;
    breed?: string;
    birth_date?: string | null;
    gender: string;
    photo_url?: string | null;
    care_notes?: string;
    vet_contact?: string;
  }): Promise<Pet> {
    const user = this.currentUser;
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const payload = {
      name: input.name,
      species: input.species,
      breed: input.breed ?? null,
      birth_date: input.birth_date ?? null,
      gender: input.gender,
      photo_url: input.photo_url ?? null,
      care_notes: input.care_notes ?? null,
      vet_contact: input.vet_contact ?? null,
      owner_id: user.id,
    };

    const { data, error } = await this.supabase.from('pets').insert(payload).select('*').single();

    if (error) throw error;
    return data as Pet;
  }

  async updatePet(id: string, changes: Partial<Pet>): Promise<Pet> {
    const { data, error } = await this.supabase
      .from('pets')
      .update(changes)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as Pet;
  }

  async getVaccinesByPet(petId: string): Promise<Vaccine[]> {
    const { data, error } = await this.supabase
      .from('vaccines')
      .select('*')
      .eq('pet_id', petId)
      .order('date_administered', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Vaccine[];
  }

  async addVaccine(input: {
    pet_id: string;
    name: string;
    date_administered: string;
    next_due_date?: string | null;
    batch_number?: string;
  }): Promise<Vaccine> {
    const payload = {
      pet_id: input.pet_id,
      name: input.name,
      date_administered: input.date_administered,
      next_due_date: input.next_due_date ?? null,
      batch_number: input.batch_number ?? '',
    };

    const { data, error } = await this.supabase
      .from('vaccines')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as Vaccine;
  }

  async getMedicalRecordsByPet(petId: string): Promise<MedicalRecord[]> {
    const { data, error } = await this.supabase
      .from('medical_records')
      .select('*')
      .eq('pet_id', petId)
      .order('event_date', { ascending: false });

    if (error) throw error;
    return (data ?? []) as MedicalRecord[];
  }

  async addMedicalRecord(input: {
    pet_id: string;
    type: MedicalRecord['type'];
    title: string;
    diagnosis?: string | null;
    event_date: string;
  }): Promise<MedicalRecord> {
    const payload = {
      pet_id: input.pet_id,
      type: input.type,
      title: input.title,
      diagnosis: input.diagnosis ?? null,
      event_date: input.event_date,
    };

    const { data, error } = await this.supabase
      .from('medical_records')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as MedicalRecord;
  }

  async getExpenses(): Promise<Expense[]> {
    const user = this.currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await this.supabase
      .from('expenses')
      .select('*')
      .eq('owner_id', user.id)
      .order('expense_date', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Expense[];
  }

  async addExpense(expense: {
    pet_id?: string | null;
    amount: number;
    category: Expense['category'];
    description: string;
    expense_date: string;
  }): Promise<Expense> {
    const user = this.currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    const payload = {
      owner_id: user.id,
      pet_id: expense.pet_id ?? null,
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      expense_date: expense.expense_date,
    };

    const { data, error } = await this.supabase
      .from('expenses')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as Expense;
  }

  async getInventoryItems(): Promise<InventoryItem[]> {
    const user = this.currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await this.supabase
      .from('inventory')
      .select('*')
      .eq('owner_id', user.id)
      .order('item_name');

    if (error) throw error;
    return (data ?? []) as InventoryItem[];
  }

  async addInventoryItem(item: InventoryItem): Promise<InventoryItem> {
    const user = this.currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    const payload = {
      owner_id: user.id,
      item_name: item.item_name,
      category: item.category,
      current_quantity: item.current_quantity,
      unit_measure: item.unit_measure,
      alert_threshold: item.alert_threshold,
    };

    const { data, error } = await this.supabase
      .from('inventory')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as InventoryItem;
  }

  async updateInventoryQuantity(id: string, newQuantity: number): Promise<InventoryItem> {
    const { data, error } = await this.supabase
      .from('inventory')
      .update({ current_quantity: newQuantity })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as InventoryItem;
  }

  //medication logs
  async getTodayMedications(): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await this.supabase
      .from('medication_logs')
      .select(`*, medication:medication_id(*, pet:pet_id(name))`)
      .gte('scheduled_for', `${today}T00:00:00`)
      .lt('scheduled_for', `${today}T23:59:59`)
      .eq('status', 'pending');

    if (error) throw error;
    return (data ?? []) as any[];
  }

  async updateMedicationLog(id: string, changes: Partial<MedicationLog>): Promise<MedicationLog> {
    const { data, error } = await this.supabase
      .from('medication_logs')
      .update(changes)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as MedicationLog;
  }

  // weight logs
  async getWeightLogs(petId: string): Promise<WeightLog[]> {
    const { data, error } = await this.supabase
      .from('weight_logs')
      .select('*')
      .eq('pet_id', petId)
      .order('date_measured', { ascending: true });
    if (error) throw error;
    return (data ?? []) as WeightLog[];
  }

  async addWeightLog(weightLog: WeightLog): Promise<WeightLog> {
    const { data, error } = await this.supabase
      .from('weight_logs')
      .insert(weightLog)
      .select('*')
      .single();
    if (error) throw error;
    return data as WeightLog;
  }
}
