import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

/**
 * Componente de la página de invitación pública para bodas
 * URL: /invitacion/:uuid
 */
@Component({
  selector: 'app-invitacion-boda',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center p-4">
      
      <!-- Loader mientras carga -->
      <div *ngIf="cargando" class="text-center">
        <div class="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-boda-primary"></div>
        <p class="mt-4 text-boda-dark">Cargando invitación...</p>
      </div>

      <!-- Error si no se encuentra la invitación -->
      <div *ngIf="error" class="card-elegant max-w-md text-center">
        <div class="text-6xl mb-4">😔</div>
        <h2 class="text-2xl font-elegant text-boda-dark mb-4">Invitación no encontrada</h2>
        <p class="text-gray-600">El enlace de invitación no es válido o ha expirado.</p>
      </div>

      <!-- Invitación -->
      <div *ngIf="!cargando && !error && invitado" class="card-elegant max-w-2xl w-full animate-fadeIn">
        
        <!-- Decoración superior -->
        <div class="text-center mb-8">
          <div class="text-6xl mb-4">💍</div>
          <h1 class="text-4xl md:text-5xl font-elegant text-boda-primary mb-2">
            {{ invitado.evento_nombre }}
          </h1>
          <div class="w-32 h-1 bg-gradient-to-r from-transparent via-boda-primary to-transparent mx-auto"></div>
        </div>

        <!-- Mensaje personalizado -->
        <div class="text-center mb-8">
          <p class="text-xl text-gray-700 mb-2">Querido/a</p>
          <h2 class="text-3xl font-elegant text-boda-dark mb-4">
            {{ invitado.nombre_completo }}
          </h2>
          <p class="text-gray-600 leading-relaxed">
            Nos complace invitarte a celebrar uno de los días más importantes de nuestras vidas.
            Queremos compartir contigo este momento especial lleno de amor y felicidad.
          </p>
        </div>

        <!-- Detalles del evento -->
        <div class="bg-boda-accent/30 rounded-xl p-6 mb-8">
          <h3 class="text-xl font-elegant text-boda-dark mb-4 text-center">Detalles del Evento</h3>
          
          <div class="space-y-3">
            <!-- Fecha -->
            <div class="flex items-center gap-3">
              <div class="text-2xl">📅</div>
              <div>
                <p class="text-sm text-gray-500">Fecha</p>
                <p class="text-boda-dark font-semibold">{{ formatearFecha(invitado.evento_fecha) }}</p>
              </div>
            </div>

            <!-- Hora -->
            <div class="flex items-center gap-3">
              <div class="text-2xl">🕐</div>
              <div>
                <p class="text-sm text-gray-500">Hora</p>
                <p class="text-boda-dark font-semibold">{{ formatearHora(invitado.evento_fecha) }}</p>
              </div>
            </div>

            <!-- Ubicación -->
            <div class="flex items-center gap-3">
              <div class="text-2xl">📍</div>
              <div>
                <p class="text-sm text-gray-500">Lugar</p>
                <p class="text-boda-dark font-semibold">{{ invitado.evento_ubicacion }}</p>
              </div>
            </div>

            <!-- Número de invitados -->
            <div class="flex items-center gap-3">
              <div class="text-2xl">👥</div>
              <div>
                <p class="text-sm text-gray-500">Número de invitados</p>
                <p class="text-boda-dark font-semibold">{{ invitado.asistentes_esperados }} persona(s)</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Estado actual -->
        <div *ngIf="invitado.estado !== 'invitado'" class="mb-6 text-center">
          <div *ngIf="invitado.estado === 'confirmado'" 
               class="bg-green-50 border-2 border-green-500 rounded-lg p-4">
            <p class="text-green-700 font-semibold">✓ Ya has confirmado tu asistencia</p>
            <p class="text-sm text-green-600 mt-1">¡Te esperamos con mucho cariño!</p>
          </div>
          
          <div *ngIf="invitado.estado === 'declinado'" 
               class="bg-gray-50 border-2 border-gray-400 rounded-lg p-4">
            <p class="text-gray-700 font-semibold">Has declinado la invitación</p>
            <p class="text-sm text-gray-600 mt-1">Lamentamos que no puedas acompañarnos</p>
          </div>
        </div>

        <!-- Botones de confirmación -->
        <div *ngIf="!confirmado && invitado.estado === 'invitado'" class="space-y-3">
          <p class="text-center text-gray-700 mb-4 font-semibold">Por favor, confirma tu asistencia:</p>
          
          <button 
            (click)="confirmar(true)"
            [disabled]="procesando"
            class="w-full btn-primary flex items-center justify-center gap-2">
            <span *ngIf="!procesando">✓ Confirmar Asistencia</span>
            <span *ngIf="procesando">Procesando...</span>
          </button>
          
          <button 
            (click)="confirmar(false)"
            [disabled]="procesando"
            class="w-full btn-secondary flex items-center justify-center gap-2">
            <span *ngIf="!procesando">✗ No podré asistir</span>
            <span *ngIf="procesando">Procesando...</span>
          </button>
        </div>

        <!-- Mensaje después de confirmar -->
        <div *ngIf="confirmado" class="text-center animate-fadeIn">
          <div class="bg-green-50 border-2 border-green-500 rounded-xl p-6 mb-4">
            <div class="text-5xl mb-3">{{ mensajeConfirmacion.icono }}</div>
            <h3 class="text-2xl font-elegant text-green-700 mb-2">{{ mensajeConfirmacion.titulo }}</h3>
            <p class="text-green-600">{{ mensajeConfirmacion.mensaje }}</p>
          </div>
        </div>

        <!-- Pie de página -->
        <div class="text-center mt-8 pt-6 border-t border-boda-primary/20">
          <p class="text-gray-500 text-sm">
            Con cariño, esperamos tu presencia 💕
          </p>
        </div>
      </div>
    </div>
  `
})
export class InvitacionBodaComponent implements OnInit {
  
  uuid: string = '';
  invitado: any = null;
  cargando: boolean = true;
  error: boolean = false;
  procesando: boolean = false;
  confirmado: boolean = false;
  mensajeConfirmacion: any = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    // Obtener UUID de la URL
    this.uuid = this.route.snapshot.params['uuid'];
    this.cargarInvitado();
  }

  /**
   * Carga los datos del invitado desde el backend
   */
  cargarInvitado(): void {
    this.apiService.obtenerInvitado(this.uuid).subscribe({
      next: (response) => {
        if (response.success) {
          this.invitado = response.data;
          this.cargando = false;
        } else {
          this.error = true;
          this.cargando = false;
        }
      },
      error: (err) => {
        console.error('Error al cargar invitado:', err);
        this.error = true;
        this.cargando = false;
      }
    });
  }

  /**
   * Confirma o declina la asistencia
   */
  confirmar(asiste: boolean): void {
    this.procesando = true;

    this.apiService.confirmarAsistencia(this.uuid, asiste).subscribe({
      next: (response) => {
        if (response.success) {
          this.confirmado = true;
          this.procesando = false;
          
          // Actualizar estado local
          this.invitado.estado = asiste ? 'confirmado' : 'declinado';

          // Mensaje según la respuesta
          if (asiste) {
            this.mensajeConfirmacion = {
              icono: '🎉',
              titulo: '¡Confirmado!',
              mensaje: '¡Gracias por confirmar! Te esperamos con mucho cariño en nuestra boda.'
            };
          } else {
            this.mensajeConfirmacion = {
              icono: '😔',
              titulo: 'Confirmación recibida',
              mensaje: 'Lamentamos que no puedas acompañarnos. ¡Gracias por avisarnos!'
            };
          }
        }
      },
      error: (err) => {
        console.error('Error al confirmar:', err);
        this.procesando = false;
        alert('Hubo un error al procesar tu confirmación. Por favor, intenta nuevamente.');
      }
    });
  }

  /**
   * Formatea la fecha en español
   */
  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    const opciones: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('es-ES', opciones);
  }

  /**
   * Formatea la hora
   */
  formatearHora(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}
