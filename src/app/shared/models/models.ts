export interface Profile {
  id: string;
  email: string;
  full_name: string;
}

export interface Pet {
  id: string;
  owner_id: string;
  name: string;
  species: string;
  breed?: string;
  birth_date: string | null;
  gender: string;
  photo_url?: string | null;
  // nova informação de instruções e contato veterinário
  care_notes?: string;
  vet_contact?: string;
}

export interface Vaccine {
  id: string;
  pet_id: string;
  name: string;
  date_administered: string;
  next_due_date: string | null;
  batch_number: string;
}

export interface MedicalRecord {
  id: string;
  pet_id: string;
  type: 'consulta' | 'exame' | 'cirurgia';
  title: string;
  diagnosis: string | null;
  event_date: string;
}

export type ExpenseCategory =
  | 'Alimentação'
  | 'Saúde'
  | 'Acessórios'
  | 'Higiene'
  | 'Serviços'
  | 'Outros';

export interface InventoryItem {
  id?: string;
  owner_id?: string;
  item_name: string;
  category: 'Alimentação' | 'Higiene' | 'Medicamento' | 'Outros';
  current_quantity: number;
  unit_measure: string;
  alert_threshold: number;
}

export interface Expense {
  id?: string;
  owner_id?: string;
  pet_id?: string | null;
  amount: number;
  category: ExpenseCategory;
  description: string;
  expense_date: string;
}

export interface MedicationLog {
  id?: string;
  medication_id: string;
  scheduled_for: string; // ISO DateTime
  administered_at?: string | null;
  status: 'pending' | 'done' | 'skipped';
}

export interface Medication {
  id?: string;
  pet_id: string;
  name: string;
  dosage: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  pet_name?: string;
}

export interface WeightLog {
  id?: string;
  pet_id: string;
  weight: number;
  date_measured: string;
}
