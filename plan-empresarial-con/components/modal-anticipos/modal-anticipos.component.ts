// ============================================================================
// MODAL DE ANTICIPOS - DESDE CERO
// components/modal-anticipos/modal-anticipos.component.ts
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal, inject, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import {
  OrdenesPlanEmpresarialService,
  AnticipoPE,
  SolicitudAutorizacionPE
} from '../../services/ordenes-plan-empresarial.service';
import { formatearMonto, formatearFecha } from '../../utils/format.utils';

@Component({
  selector: 'app-modal-anticipos',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div class="flex items-center justify-center min-h-screen px-2 py-3">
        <!-- Backdrop con cierre al hacer clic fuera -->
        <div 
          class="fixed inset-0 bg-black/50 transition-opacity" 
          (click)="cerrarModal()">
        </div>

        <!-- Modal Container -->
        <div class="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
          
          <!-- Header -->
          <div class="px-4 py-3 border-b border-gray-200 flex-shrink-0">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <h2 class="text-lg font-semibold text-gray-900">Anticipos Pendientes</h2>
                <span class="px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded-md">
                  Orden #{{ numeroOrden }}
                </span>
              </div>
              <button 
                type="button" 
                (click)="cerrarModal()"
                class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Content Area -->
          <div class="flex-1 overflow-hidden">
            
            <!-- Loading State -->
            <div *ngIf="cargando()" class="flex items-center justify-center py-16">
              <div class="flex flex-col items-center space-y-3">
                <div class="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span class="text-gray-600 text-sm">Cargando anticipos...</span>
              </div>
            </div>

            <!-- Alert for Authorization Required -->
            <div *ngIf="!cargando() && obtenerAnticiposParaAutorizar().length > 0"
                 class="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div class="flex items-start">
                <svg class="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 class="text-sm font-medium text-red-800">Autorización Requerida</h4>
                  <p class="text-sm text-red-700 mt-1">
                    {{ obtenerAnticiposParaAutorizar().length }} anticipo(s) requieren autorización por estar fuera de tiempo.
                  </p>
                </div>
              </div>
            </div>

            <!-- Table Container -->
            <div *ngIf="!cargando() && anticipos().length > 0" 
                 class="mx-4 mt-4 border border-gray-200 rounded-lg overflow-hidden">
              
              <div class="overflow-x-auto overflow-y-auto max-h-96">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50 sticky top-0">
                    <tr>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo de Anticipo
                      </th>
                      <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto
                      </th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha Liquidación
                      </th>
                      <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Seguimiento
                      </th>
                      <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr *ngFor="let anticipo of anticipos(); trackBy: trackByAnticipo"
                        class="hover:bg-gray-50 transition-colors">
                      
                      <!-- Tipo de Anticipo -->
                      <td class="px-4 py-3">
                        <div class="flex flex-col">
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                [ngClass]="obtenerClaseTipo(anticipo.tipo_anticipo)">
                            {{ anticipo.tipo_anticipo }}
                          </span>
                          <span *ngIf="obtenerResumenDias(anticipo)" 
                                class="text-xs text-gray-500 mt-1">
                            {{ obtenerResumenDias(anticipo) }}
                          </span>
                        </div>
                      </td>

                      <!-- Monto -->
                      <td class="px-4 py-3 text-right">
                        <span class="font-semibold text-gray-900">
                          {{ formatearMonto(anticipo.monto) }}
                        </span>
                      </td>

                      <!-- Fecha Liquidación -->
                      <td class="px-4 py-3">
                        <span *ngIf="anticipo.fecha_liquidacion; else sinFechaLiquidacion" 
                              class="text-gray-900">
                          {{ formatearFecha(anticipo.fecha_liquidacion) }}
                        </span>
                        <ng-template #sinFechaLiquidacion>
                          <span class="text-gray-400 italic text-sm">Sin liquidar</span>
                        </ng-template>
                      </td>

                      <!-- Estado -->
                      <td class="px-4 py-3 text-center">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              [ngClass]="obtenerClaseEstado(anticipo.estado_liquidacion)">
                          <span class="w-2 h-2 rounded-full mr-1.5"
                                [ngClass]="obtenerDotEstado(anticipo.estado_liquidacion)"></span>
                          {{ obtenerTextoEstado(anticipo.estado_liquidacion) }}
                        </span>
                      </td>

                      <!-- Seguimiento -->
                      <td class="px-4 py-3">
                        <div *ngIf="anticipo.ultimo_seguimiento; else sinSeguimiento" 
                             class="space-y-1">
                          
                          <!-- Estado del seguimiento -->
                          <div *ngIf="anticipo.ultimo_seguimiento.nombre_estado" 
                               class="flex items-center gap-2">
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                  [ngClass]="obtenerClaseSeguimiento(anticipo.ultimo_seguimiento.nombre_estado)">
                              {{ anticipo.ultimo_seguimiento.nombre_estado | titlecase }}
                            </span>
                            <span *ngIf="anticipo.ultimo_seguimiento.fecha_seguimiento" 
                                  class="text-xs text-gray-500">
                              {{ formatearFecha(anticipo.ultimo_seguimiento.fecha_seguimiento) }}
                            </span>
                          </div>
                          
                          <!-- Descripción -->
                          <div *ngIf="anticipo.ultimo_seguimiento.descripcion_estado"
                               class="text-xs text-gray-600 max-w-xs truncate"
                               [title]="anticipo.ultimo_seguimiento.descripcion_estado">
                            {{ anticipo.ultimo_seguimiento.descripcion_estado }}
                          </div>
                          
                          <!-- Comentario del solicitante -->
                          <div *ngIf="anticipo.ultimo_seguimiento.comentario_solicitante" 
                               class="text-xs text-gray-500 italic max-w-xs truncate"
                               [title]="anticipo.ultimo_seguimiento.comentario_solicitante">
                            "{{ anticipo.ultimo_seguimiento.comentario_solicitante }}"
                          </div>
                          
                          <!-- Información de autorización -->
                          <div *ngIf="anticipo.ultimo_seguimiento.fecha_autorizacion || anticipo.ultimo_seguimiento.comentario_autorizador"
                               class="text-xs text-green-600 font-medium">
                            <div *ngIf="anticipo.ultimo_seguimiento.fecha_autorizacion">
                              ✓ Autorizado: {{ formatearFecha(anticipo.ultimo_seguimiento.fecha_autorizacion) }}
                            </div>
                            <div *ngIf="anticipo.ultimo_seguimiento.comentario_autorizador"
                                 class="max-w-xs truncate"
                                 [title]="anticipo.ultimo_seguimiento.comentario_autorizador">
                              {{ anticipo.ultimo_seguimiento.comentario_autorizador }}
                            </div>
                          </div>
                        </div>
                        
                        <ng-template #sinSeguimiento>
                          <span class="text-xs text-gray-400 italic">Sin seguimiento disponible</span>
                        </ng-template>
                      </td>

                      <!-- Acción -->
                      <td class="px-4 py-3 text-center">
                        <ng-container *ngIf="puedeAutorizar(anticipo); else noDisponible">
                          <button 
                            type="button" 
                            (click)="solicitarAutorizacion(anticipo)" 
                            [disabled]="enviando()"
                            class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                            
                            <svg *ngIf="!enviando()" class="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            
                            <div *ngIf="enviando()" class="w-3 h-3 mr-1.5">
                              <div class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            
                            {{ enviando() ? 'Enviando...' : 'Solicitar' }}
                          </button>
                        </ng-container>
                        
                        <ng-template #noDisponible>
                          <span *ngIf="yaTieneSolicitudEnCurso(anticipo)"
                                class="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-md">
                            En curso
                          </span>
                          <span *ngIf="!yaTieneSolicitudEnCurso(anticipo) && !puedeAutorizar(anticipo)"
                                class="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-md">
                            No disponible
                          </span>
                        </ng-template>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Empty State -->
            <div *ngIf="!cargando() && anticipos().length === 0" 
                 class="flex flex-col items-center justify-center py-16 px-4">
              <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">Sin Anticipos Pendientes</h3>
              <p class="text-gray-600 text-center max-w-md">
                Esta orden no tiene anticipos que requieran autorización en este momento.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-4 py-3 bg-gray-50 border-t border-gray-200 flex-shrink-0">
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-500">
                <ng-container *ngIf="anticipos().length > 0; else noItems">
                  {{ anticipos().length }} {{ anticipos().length === 1 ? 'anticipo' : 'anticipos' }} encontrado(s)
                </ng-container>
                <ng-template #noItems>Sin anticipos para mostrar</ng-template>
              </span>
              
              <button 
                type="button"
                (click)="cerrarModal()"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ModalAnticiposComponent implements OnChanges, OnDestroy {
  @Input() numeroOrden: number = 0;
  @Output() cerrar = new EventEmitter<void>();
  @Output() solicitudExitosa = new EventEmitter<void>();

  private readonly service = inject(OrdenesPlanEmpresarialService);
  private readonly destroy$ = new Subject<void>();

  // Estado del componente usando signals
  readonly anticipos = signal<AnticipoPE[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly enviando = signal<boolean>(false);

  // Importar funciones de utilidad
  readonly formatearMonto = formatearMonto;
  readonly formatearFecha = formatearFecha;

  ngOnChanges(changes: SimpleChanges): void {
    if ('numeroOrden' in changes && this.numeroOrden > 0) {
      this.inicializarComponente();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // INICIALIZACIÓN Y CONFIGURACIÓN
  // ============================================================================

  private inicializarComponente(): void {
    // Suscribirse a los streams del servicio
    this.service.anticipos$
      .pipe(takeUntil(this.destroy$))
      .subscribe(anticipos => this.anticipos.set(anticipos));

    this.service.cargandoAnticipos$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cargando => this.cargando.set(cargando));

    this.service.enviandoSolicitud$
      .pipe(takeUntil(this.destroy$))
      .subscribe(enviando => this.enviando.set(enviando));

    // Cargar anticipos para esta orden
    this.service.cargarAnticipos(this.numeroOrden).subscribe();
  }

  // ============================================================================
  // ACCIONES DEL MODAL
  // ============================================================================

  cerrarModal(): void {
    this.cerrar.emit();
  }

  async solicitarAutorizacion(anticipo: AnticipoPE): Promise<void> {
    if (!this.puedeAutorizar(anticipo)) return;

    const justificacion = await this.solicitarJustificacion(anticipo);
    if (!justificacion) return;

    const payload: SolicitudAutorizacionPE = {
      id_solicitud: anticipo.id_solicitud,
      justificacion: justificacion.trim(),
      tipo: 'autorizacion'
    };

    this.service.solicitarAutorizacion(payload).subscribe(exitoso => {
      if (exitoso) {
        // Recargar anticipos y notificar éxito
        this.service.cargarAnticipos(this.numeroOrden).subscribe();
        this.solicitudExitosa.emit();
      }
    });
  }

  // ============================================================================
  // VALIDACIONES DE NEGOCIO
  // ============================================================================

  puedeAutorizar(anticipo: AnticipoPE): boolean {
    return anticipo.requiere_autorizacion &&
      !this.yaTieneSolicitudEnCurso(anticipo) &&
      this.estaFueraDeTiempo(anticipo);
  }

  yaTieneSolicitudEnCurso(anticipo: AnticipoPE): boolean {
    if (!anticipo.ultimo_seguimiento) return false;

    const estado = (anticipo.ultimo_seguimiento.nombre_estado || '').toLowerCase().trim();
    const estadosEnCurso = ['pendiente', 'en proceso', 'en revisión', 'en revision'];

    return estadosEnCurso.includes(estado) && !anticipo.ultimo_seguimiento.fecha_autorizacion;
  }

  estaFueraDeTiempo(anticipo: AnticipoPE): boolean {
    // Por estado de liquidación
    const estadosTardios = ['EN_TIEMPO', 'FUERA_DE_TIEMPO'];
    if (estadosTardios.includes(anticipo.estado_liquidacion)) {
      return true;
    }

    // Por días transcurridos vs permitidos
    if (anticipo.dias_transcurridos !== null && anticipo.dias_transcurridos !== undefined &&
      anticipo.dias_permitidos !== null && anticipo.dias_permitidos !== undefined) {
      return anticipo.dias_transcurridos > anticipo.dias_permitidos;
    }

    return false;
  }

  obtenerAnticiposParaAutorizar(): AnticipoPE[] {
    return this.anticipos().filter(anticipo => this.estaFueraDeTiempo(anticipo));
  }

  // ============================================================================
  // MÉTODOS DE FORMATEO Y UTILIDADES
  // ============================================================================

  obtenerResumenDias(anticipo: AnticipoPE): string | null {
    const transcurridos = anticipo.dias_transcurridos;
    const permitidos = anticipo.dias_permitidos;

    if (transcurridos === null || transcurridos === undefined ||
      permitidos === null || permitidos === undefined) {
      return null;
    }

    return `${transcurridos}/${permitidos} días`;
  }

  obtenerClaseTipo(tipo: string): string {
    const clases: Record<string, string> = {
      'CHEQUE': 'bg-blue-100 text-blue-800 border-blue-200',
      'EFECTIVO': 'bg-green-100 text-green-800 border-green-200',
      'TRANSFERENCIA': 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return clases[tipo] || 'bg-gray-100 text-gray-700 border-gray-200';
  }

  obtenerClaseEstado(estado: string): string {
    const clases: Record<string, string> = {
      'NO_LIQUIDADO': 'bg-gray-100 text-gray-800',
      'RECIENTE': 'bg-green-100 text-green-800',
      'EN_TIEMPO': 'bg-yellow-100 text-yellow-800',
      'FUERA_DE_TIEMPO': 'bg-red-100 text-red-800',
      'LIQUIDADO': 'bg-emerald-100 text-emerald-800'
    };
    return clases[estado] || 'bg-gray-100 text-gray-700';
  }

  obtenerDotEstado(estado: string): string {
    const dots: Record<string, string> = {
      'NO_LIQUIDADO': 'bg-gray-400',
      'RECIENTE': 'bg-green-500',
      'EN_TIEMPO': 'bg-yellow-500',
      'FUERA_DE_TIEMPO': 'bg-red-500',
      'LIQUIDADO': 'bg-emerald-500'
    };
    return dots[estado] || 'bg-gray-400';
  }

  obtenerTextoEstado(estado: string): string {
    const textos: Record<string, string> = {
      'NO_LIQUIDADO': 'Sin liquidar',
      'RECIENTE': 'Reciente',
      'EN_TIEMPO': 'En tiempo',
      'FUERA_DE_TIEMPO': 'Fuera de tiempo',
      'LIQUIDADO': 'Liquidado'
    };
    return textos[estado] || estado;
  }

  obtenerClaseSeguimiento(estado: string | null): string {
    if (!estado) return 'bg-gray-100 text-gray-700';

    const estadoLower = estado.toLowerCase().trim();
    if (estadoLower === 'pendiente') {
      return 'bg-amber-100 text-amber-800';
    }
    if (['aprobado', 'autorizado'].includes(estadoLower)) {
      return 'bg-green-100 text-green-800';
    }
    if (estadoLower === 'rechazado') {
      return 'bg-red-100 text-red-800';
    }

    return 'bg-gray-100 text-gray-700';
  }

  trackByAnticipo(index: number, anticipo: AnticipoPE): number {
    return anticipo.id_solicitud;
  }

  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================

  private async solicitarJustificacion(anticipo: AnticipoPE): Promise<string | null> {
    const resultado = await Swal.fire({
      title: 'Justificación Requerida',
      html: `
        <div class="text-left mb-4">
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
            <p class="text-sm text-blue-800">
              <strong>Anticipo:</strong> ${anticipo.tipo_anticipo}<br>
              <strong>Monto:</strong> ${this.formatearMonto(anticipo.monto)}<br>
              <strong>Orden:</strong> #${anticipo.numero_orden}
            </p>
          </div>
          <p class="text-sm text-gray-600">
            Proporcione una justificación detallada para la autorización de este anticipo fuera de tiempo.
          </p>
        </div>
      `,
      input: 'textarea',
      inputPlaceholder: 'Escriba la justificación (mínimo 20 caracteres)...',
      inputAttributes: {
        rows: '4',
        style: 'resize: vertical; min-height: 100px; font-family: inherit;',
        maxlength: '500',
        class: 'text-sm'
      },
      showCancelButton: true,
      confirmButtonText: 'Enviar Solicitud',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      width: '550px',
      preConfirm: (valor) => this.validarJustificacion(valor),
      allowOutsideClick: false,
      allowEscapeKey: false
    });

    return resultado.isConfirmed ? (resultado.value as string) : null;
  }

  private validarJustificacion(valor: string): string | false {
    const texto = (valor || '').trim();

    if (!texto) {
      Swal.showValidationMessage('La justificación es obligatoria');
      return false;
    }

    if (texto.length < 20) {
      Swal.showValidationMessage(`Mínimo 20 caracteres requeridos. Actual: ${texto.length}/20`);
      return false;
    }

    if (texto.length > 500) {
      Swal.showValidationMessage(`Máximo 500 caracteres permitidos. Actual: ${texto.length}/500`);
      return false;
    }

    return texto;
  }
}