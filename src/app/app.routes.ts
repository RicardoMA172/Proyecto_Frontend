import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./componentes/home/home').then(m => m.HomeComponent) },
  { path: 'co',   loadComponent: () => import('./componentes/co/co').then(m => m.COComponent) },
  { path: 'nox',  loadComponent: () => import('./componentes/nox/nox').then(m => m.NoxComponent) },
  { path: 'sox',  loadComponent: () => import('./componentes/sox/sox').then(m => m.SoxComponent) },
  { path: 'pm10', loadComponent: () => import('./componentes/pm10/pm10').then(m => m.Pm10Component) },
  { path: 'pm25', loadComponent: () => import('./componentes/pm25/pm25').then(m => m.Pm25Component) }
];
