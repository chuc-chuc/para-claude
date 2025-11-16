import { Routes } from '@angular/router';
import { AdminComponent } from './pages/admin/admin.component';
import { InvitacionBodaComponent } from './pages/invitacion-boda/invitacion-boda.component';

/**
 * Configuración de rutas de la aplicación
 */
export const routes: Routes = [
  {
    path: '',
    redirectTo: '/admin',
    pathMatch: 'full'
  },
  {
    path: 'admin',
    component: AdminComponent
  },
  {
    path: 'invitacion/:uuid',
    component: InvitacionBodaComponent
  },
  {
    path: '**',
    redirectTo: '/admin'
  }
];
