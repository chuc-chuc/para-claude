import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

/**
 * Componente del panel de administración
 * URL: /admin
 */
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="max-w-7xl mx-auto px-4">
        
        <!-- Encabezado -->
        <div class="mb-8">
          <h1 class="text-4xl font-elegant text-boda-dark mb-2">Panel de Administración</h1>
          <p class="text-gray-600">Gestiona los invitados de tu boda</p>
        </div>

        <!-- Estadísticas -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div class="bg-white rounded-lg shadow p-6">
            <div class="text-3xl mb-2">👥</div>
            <p class="text-gray-500 text-sm">Total Invitados</p>
            <p class="text-3xl font-bold text-boda-dark">{{ invitados.length }}</p>
          </div>
          
          <div class="bg-green-50 rounded-lg shadow p-6">
            <div class="text-3xl mb-2">✅</div>
            <p class="text-gray-500 text-sm">Confirmados</p>
            <p class="text-3xl font-bold text-green-600">{{ contarPorEstado('confirmado') }}</p>
          </div>
          
          <div class="bg-yellow-50 rounded-lg shadow p-6">
            <div class="text-3xl mb-2">⏳</div>
            <p class="text-gray-500 text-sm">Pendientes</p>
            <p class="text-3xl font-bold text-yellow-600">{{ contarPorEstado('invitado') }}</p>
          </div>
          
          <div class="bg-red-50 rounded-lg shadow p-6">
            <div class="text-3xl mb-2">❌</div>
            <p class="text-gray-500 text-sm">Declinados</p>
            <p class="text-3xl font-bold text-red-600">{{ contarPorEstado('declinado') }}</p>
          </div>
        </div>

        <!-- Agregar nuevo invitado -->
        <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 class="text-2xl font-elegant text-boda-dark mb-4">Agregar Nuevo Invitado</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Nombre Completo *</label>
              <input 
                type="text" 
                [(ngModel)]="nuevoInvitado.nombre_completo"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-boda-primary focus:border-transparent"
                placeholder="Ej: María García">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico *</label>
              <input 
                type="email" 
                [(ngModel)]="nuevoInvitado.correo"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-boda-primary focus:border-transparent"
                placeholder="maria@ejemplo.com">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
              <input 
                type="tel" 
                [(ngModel)]="nuevoInvitado.telefono"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-boda-primary focus:border-transparent"
                placeholder="+502 1234-5678">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">N° de Acompañantes</label>
              <input 
                type="number" 
                [(ngModel)]="nuevoInvitado.asistentes_esperados"
                min="1"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-boda-primary focus:border-transparent">
            </div>
            
            <div class="flex items-end">
              <label class="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  [(ngModel)]="nuevoInvitado.es_familiar"
                  class="w-5 h-5 text-boda-primary rounded focus:ring-boda-primary">
                <span class="text-sm font-medium text-gray-700">Es Familiar</span>
              </label>
            </div>
            
            <div class="flex items-end">
              <button 
                (click)="agregarInvitado()"
                [disabled]="!nuevoInvitado.nombre_completo || !nuevoInvitado.correo"
                class="w-full btn-primary">
                ➕ Agregar Invitado
              </button>
            </div>
          </div>
        </div>

        <!-- Lista de invitados -->
        <div class="bg-white rounded-lg shadow-lg overflow-hidden">
          <div class="p-6 bg-gradient-to-r from-boda-primary to-boda-secondary">
            <h2 class="text-2xl font-elegant text-white">Lista de Invitados</h2>
          </div>

          <!-- Loader -->
          <div *ngIf="cargando" class="p-8 text-center">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-boda-primary"></div>
            <p class="mt-4 text-gray-600">Cargando invitados...</p>
          </div>

          <!-- Tabla de invitados -->
          <div *ngIf="!cargando" class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acompañantes
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Link de Invitación
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr *ngFor="let invitado of invitados" class="hover:bg-gray-50 transition-colors">
                  <!-- Nombre -->
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                      <span *ngIf="invitado.es_familiar" class="text-xl">👨‍👩‍👧‍👦</span>
                      <div>
                        <p class="font-semibold text-gray-900">{{ invitado.nombre_completo }}</p>
                      </div>
                    </div>
                  </td>
                  
                  <!-- Contacto -->
                  <td class="px-6 py-4">
                    <p class="text-sm text-gray-600">{{ invitado.correo }}</p>
                    <p *ngIf="invitado.telefono" class="text-sm text-gray-500">{{ invitado.telefono }}</p>
                  </td>
                  
                  <!-- Acompañantes -->
                  <td class="px-6 py-4 text-center">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {{ invitado.asistentes_esperados }}
                    </span>
                  </td>
                  
                  <!-- Estado -->
                  <td class="px-6 py-4">
                    <span 
                      class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                      [ngClass]="{
                        'bg-green-100 text-green-800': invitado.estado === 'confirmado',
                        'bg-yellow-100 text-yellow-800': invitado.estado === 'invitado',
                        'bg-red-100 text-red-800': invitado.estado === 'declinado'
                      }">
                      {{ obtenerTextoEstado(invitado.estado) }}
                    </span>
                  </td>
                  
                  <!-- Link -->
                  <td class="px-6 py-4">
                    <button 
                      (click)="copiarLink(invitado.uuid)"
                      class="flex items-center gap-2 px-4 py-2 bg-boda-primary hover:bg-boda-primary/90 text-white rounded-lg text-sm font-medium transition-colors">
                      <span *ngIf="!linkCopiado[invitado.uuid]">📋 Copiar Link</span>
                      <span *ngIf="linkCopiado[invitado.uuid]" class="text-green-200">✓ Copiado!</span>
                    </button>
                    
                    <!-- Link para enviar por WhatsApp -->
                    <a 
                      [href]="obtenerLinkWhatsApp(invitado)"
                      target="_blank"
                      class="mt-2 flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                      <span>💬 Enviar por WhatsApp</span>
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Mensaje si no hay invitados -->
            <div *ngIf="invitados.length === 0" class="p-8 text-center text-gray-500">
              <div class="text-6xl mb-4">📋</div>
              <p class="text-xl">No hay invitados registrados</p>
              <p class="text-sm mt-2">Agrega tu primer invitado usando el formulario de arriba</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminComponent implements OnInit {
  
  invitados: any[] = [];
  cargando: boolean = true;
  linkCopiado: { [key: string]: boolean } = {};
  
  // Formulario de nuevo invitado
  nuevoInvitado: any = {
    nombre_completo: '',
    correo: '',
    telefono: '',
    asistentes_esperados: 1,
    es_familiar: false
  };

  // ID del evento (cambiar según tu evento)
  eventoId: number = 1;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.cargarInvitados();
  }

  /**
   * Carga todos los invitados del evento
   */
  cargarInvitados(): void {
    this.apiService.obtenerInvitadosPorEvento(this.eventoId).subscribe({
      next: (response) => {
        if (response.success) {
          this.invitados = response.data;
        }
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar invitados:', err);
        this.cargando = false;
      }
    });
  }

  /**
   * Agrega un nuevo invitado
   */
  agregarInvitado(): void {
    if (!this.nuevoInvitado.nombre_completo || !this.nuevoInvitado.correo) {
      alert('Por favor completa los campos requeridos');
      return;
    }

    this.apiService.crearInvitado(this.eventoId, this.nuevoInvitado).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Invitado agregado exitosamente');
          this.cargarInvitados();
          
          // Limpiar formulario
          this.nuevoInvitado = {
            nombre_completo: '',
            correo: '',
            telefono: '',
            asistentes_esperados: 1,
            es_familiar: false
          };
        }
      },
      error: (err) => {
        console.error('Error al agregar invitado:', err);
        alert('Error al agregar invitado. Verifica que el correo no esté duplicado.');
      }
    });
  }

  /**
   * Copia el link de invitación al portapapeles
   */
  copiarLink(uuid: string): void {
    const link = `${window.location.origin}/invitacion/${uuid}`;
    
    navigator.clipboard.writeText(link).then(() => {
      this.linkCopiado[uuid] = true;
      
      // Resetear después de 2 segundos
      setTimeout(() => {
        this.linkCopiado[uuid] = false;
      }, 2000);
    }).catch(err => {
      console.error('Error al copiar:', err);
      alert('No se pudo copiar el link');
    });
  }

  /**
   * Obtiene el link para enviar por WhatsApp
   */
  obtenerLinkWhatsApp(invitado: any): string {
    const link = `${window.location.origin}/invitacion/${invitado.uuid}`;
    const mensaje = `¡Hola ${invitado.nombre_completo}! 💍

Te invitamos a nuestra boda. Por favor confirma tu asistencia en el siguiente enlace:

${link}

¡Esperamos verte allí! 💕`;

    return `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  }

  /**
   * Cuenta invitados por estado
   */
  contarPorEstado(estado: string): number {
    return this.invitados.filter(i => i.estado === estado).length;
  }

  /**
   * Obtiene el texto del estado en español
   */
  obtenerTextoEstado(estado: string): string {
    const estados: any = {
      'invitado': 'Pendiente',
      'confirmado': 'Confirmado',
      'declinado': 'Declinado',
      'registrado': 'Registrado'
    };
    return estados[estado] || estado;
  }
}
