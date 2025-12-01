import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Rutas públicas de auth (login y registro)
  { path: 'auth', loadComponent: () => import('./componentes/auth/login/login').then(m => m.LoginComponent) },
  { path: 'auth/registro', loadComponent: () => import('./componentes/auth/register/register').then(m => m.RegisterComponent) },

  // Rutas protegidas por authGuard
  { path: '', canActivate: [authGuard], loadComponent: () => import('./componentes/home/home').then(m => m.HomeComponent) },
  { path: 'temp', canActivate: [authGuard], loadComponent: () => import('./componentes/temp/temp').then(m => m.TempComponent) },
  { path: 'hum', canActivate: [authGuard], loadComponent: () => import('./componentes/hum/hum').then(m => m.HumComponent) },
  { path: 'amon', canActivate: [authGuard], loadComponent: () => import('./componentes/amon/amon').then(m => m.AmonComponent) },
  { path: 'co2',   canActivate: [authGuard], loadComponent: () => import('./componentes/co/co').then(m => m.CoComponent) },
  { path: 'nox',  canActivate: [authGuard], loadComponent: () => import('./componentes/nox/nox').then(m => m.NoxComponent) },
  { path: 'sox',  canActivate: [authGuard], loadComponent: () => import('./componentes/sox/sox').then(m => m.SoxComponent) },
  { path: 'pm10', canActivate: [authGuard], loadComponent: () => import('./componentes/pm10/pm10').then(m => m.Pm10Component) },
  { path: 'pm25', canActivate: [authGuard], loadComponent: () => import('./componentes/pm25/pm25').then(m => m.Pm25Component) },

  // Wildcard: si la ruta no coincide, redirigir a la raíz (que a su vez está protegida)
  { path: '**', redirectTo: '' },
];
