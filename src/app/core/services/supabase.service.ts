import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { environment } from '../../../data/enviroment';
import {
  Pet,
  Vaccine,
  MedicalRecord,
  Expense,
  InventoryItem,
  MedicationLog,
  Medication,
  WeightLog,
} from '../../shared/models/models';
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
      console.log(
        '[SupabaseService] onAuthStateChange event:',
        _event,
        'session present:',
        !!session,
      );
      this.sessionSubject.next(session ?? null);
    });

    // debug: constructed - list localStorage keys (não imprime valores sensíveis)
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keys: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k) keys.push(k!);
        }
        console.log('[SupabaseService] constructed. localStorage keys:', keys);
      } else {
        console.log('[SupabaseService] constructed (no window/localStorage)');
      }
    } catch (e) {
      console.warn('[SupabaseService] error reading localStorage keys', e);
    }
  }

  /**
   * Restaura a sessão do storage antes do app iniciar. Chamado pelo APP_INITIALIZER.
   */
  async initSession(): Promise<void> {
    console.log('[SupabaseService] initSession: starting session restore');
    try {
      const { data, error } = await this.supabase.auth.getSession();
      if (error) {
        console.error('[SupabaseService] initSession: getSession error', error);
        throw error;
      }
      const hasSession = !!data?.session;
      console.log(
        '[SupabaseService] initSession: session restored?',
        hasSession,
        'user:',
        data?.session?.user?.email ?? null,
      );
      this.sessionSubject.next(data.session ?? null);
    } catch (e) {
      console.error('[SupabaseService] Erro ao restaurar sessão:', e);
      this.sessionSubject.next(null);
    } finally {
      this.isSessionRestored.next(true);
      console.log('[SupabaseService] initSession: isSessionRestored set to true');
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
    // Retorna true se já tivermos sessão em memória OU se detectarmos token no localStorage.
    return this.sessionSubject.value != null || this.isAuthenticatedSync();
  }

  /**
   * Verificação síncrona de autenticação baseada no localStorage usado pelo supabase-js.
   * Retorna true se detectar um token/sessão válida no storage ou na sessão em memória.
   */
  isAuthenticatedSync(): boolean {
    // se já tivermos sessão em memória
    if (this.sessionSubject.value) {
      console.log('[SupabaseService] isAuthenticatedSync: session in memory');
      return true;
    }

    // ambiente não-browser
    if (typeof window === 'undefined' || !window.localStorage) {
      console.log('[SupabaseService] isAuthenticatedSync: no window/localStorage');
      return false;
    }

    const storage = window.localStorage;

    // chaves comumente usadas pelo supabase-js v2: 'supabase.auth.token'
    const knownKeys = ['supabase.auth.token', 'sb:token', 'supabase.auth'];

    let raw: string | null = null;

    for (const k of knownKeys) {
      try {
        const v = storage.getItem(k);
        if (v) {
          raw = v;
          console.log('[SupabaseService] isAuthenticatedSync: found known key', k);
          break;
        }
      } catch (e) {
        console.warn('[SupabaseService] isAuthenticatedSync: error reading known key', k, e);
      }
    }

    // fallback: procurar qualquer chave que contenha 'supabase' e 'auth' ou 'token' ou 'session'
    if (!raw) {
      for (let i = 0; i < storage.length; i++) {
        const key = (storage.key(i) as string) || '';
        const lower = key.toLowerCase();
        const likely =
          lower.includes('auth-token') ||
          (lower.includes('supabase') && /(auth|token|session)/.test(lower)) ||
          (lower.startsWith('sb-') && (lower.includes('auth') || lower.includes('token')));
        if (likely) {
          try {
            const candidate = storage.getItem(key);
            if (candidate) {
              raw = candidate;
              console.log('[SupabaseService] isAuthenticatedSync: matched localStorage key:', key);
              break;
            }
          } catch (e) {
            console.warn('[SupabaseService] isAuthenticatedSync: error reading key', key, e);
          }
        }
      }
    }

    if (!raw) {
      console.log('[SupabaseService] isAuthenticatedSync: no matching raw stored value found');
      return false;
    }

    try {
      const parsed: any = JSON.parse(raw);

      // formatos possíveis: objeto token com access_token, ou wrapper { currentSession: { access_token } }
      if (!parsed) return false;

      if (typeof parsed === 'object') {
        if (parsed.access_token) {
          console.log(
            '[SupabaseService] isAuthenticatedSync: found access_token in parsed storage',
          );
          return true;
        }
        if (parsed.token && parsed.token.access_token) {
          console.log(
            '[SupabaseService] isAuthenticatedSync: found token.access_token in parsed storage',
          );
          return true;
        }
        if (parsed.currentSession && parsed.currentSession.access_token) {
          console.log(
            '[SupabaseService] isAuthenticatedSync: found currentSession.access_token in parsed storage',
          );
          return true;
        }
        if (parsed.session && parsed.session.access_token) {
          console.log(
            '[SupabaseService] isAuthenticatedSync: found session.access_token in parsed storage',
          );
          return true;
        }
        if (parsed.user) {
          console.log('[SupabaseService] isAuthenticatedSync: found user in parsed storage');
          return true;
        }
      }

      return false;
    } catch (e) {
      console.warn('[SupabaseService] isAuthenticatedSync: error parsing stored value', e);
      return false;
    }
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

  // FAMILY MODE: shared access management
  async shareAccount(guestEmail: string): Promise<{ success: boolean; message: string }> {
    const user = this.currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    try {
      // check if already invited
      const { data: existing, error: errEx } = await this.supabase
        .from('shared_access')
        .select('*')
        .eq('owner_id', user.id)
        .eq('guest_email', guestEmail)
        .maybeSingle();

      if (errEx) throw errEx;
      if (existing) {
        return { success: false, message: 'Este e-mail já foi convidado.' };
      }

      // try to find guest profile by email
      const { data: profile, error: profileErr } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('email', guestEmail)
        .maybeSingle();

      if (profileErr) throw profileErr;

      const payload: any = {
        owner_id: user.id,
        guest_email: guestEmail,
      };

      if (profile && profile.id) payload.guest_id = profile.id;

      const { data: inserted, error: insertErr } = await this.supabase
        .from('shared_access')
        .insert(payload)
        .select('*')
        .single();

      if (insertErr) throw insertErr;
      return { success: true, message: 'Convite enviado com sucesso.' };
    } catch (e: any) {
      console.error('Erro ao compartilhar conta:', e);
      return { success: false, message: e?.message ?? 'Erro desconhecido' };
    }
  }

  async getSharedUsers(): Promise<
    Array<{ owner_id: string; guest_email: string; guest_id?: string }>
  > {
    const user = this.currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await this.supabase
      .from('shared_access')
      .select('owner_id, guest_email, guest_id')
      .eq('owner_id', user.id)
      .order('guest_email');

    if (error) throw error;
    return (data ?? []) as Array<{ owner_id: string; guest_email: string; guest_id?: string }>;
  }

  async removeSharedAccess(guestEmail: string): Promise<{ success: boolean; message: string }> {
    const user = this.currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    try {
      const { error } = await this.supabase
        .from('shared_access')
        .delete()
        .eq('owner_id', user.id)
        .eq('guest_email', guestEmail);

      if (error) throw error;
      return { success: true, message: 'Acesso revogado com sucesso.' };
    } catch (e: any) {
      console.error('Erro ao remover compartilhamento:', e);
      return { success: false, message: e?.message ?? 'Erro desconhecido' };
    }
  }
}
