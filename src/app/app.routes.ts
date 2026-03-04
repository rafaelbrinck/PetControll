import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/public/login/login.component').then((m) => m.LoginComponent),
        canActivate: [
          () => import('./core/guards/no-auth.guard').then((m) => m.noAuthGuard) as any,
        ],
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./pages/public/register/register.component').then((m) => m.RegisterComponent),
        canActivate: [
          () => import('./core/guards/no-auth.guard').then((m) => m.noAuthGuard) as any,
        ],
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/admin/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'pets',
        loadComponent: () =>
          import('./pages/admin/pets-list/pets-list.component').then((m) => m.PetsListComponent),
      },
      {
        path: 'pets/new',
        loadComponent: () => import('./pages/admin/pet-form/pet-form').then((m) => m.PetForm),
      },
      {
        path: 'pets/:id',
        loadComponent: () => import('./pages/admin/pet-detail/pet-detail').then((m) => m.PetDetail),
      },
      {
        path: 'finance',
        loadComponent: () =>
          import('./pages/admin/finance-dashboard/finance-dashboard.component').then(
            (m) => m.FinanceDashboardComponent,
          ),
      },
      {
        path: 'finance/new',
        loadComponent: () =>
          import('./pages/admin/expense-form/expense-form.component').then(
            (m) => m.ExpenseFormComponent,
          ),
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./pages/admin/inventory-list/inventory-list.component').then(
            (m) => m.InventoryListComponent,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/admin/settings/settings.component').then((m) => m.SettingsComponent),
      },
      {
        path: 'inventory/new',
        loadComponent: () =>
          import('./pages/admin/inventory-form/inventory-form.component').then(
            (m) => m.InventoryFormComponent,
          ),
      },
      // rota de ficha do cuidador ligada ao pet
      {
        path: 'pets/:id/caregiver',
        loadComponent: () =>
          import('./pages/admin/caregiver-view/caregiver-view.component').then(
            (m) => m.CaregiverViewComponent,
          ),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
