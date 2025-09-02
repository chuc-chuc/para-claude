// ============================================================================
// MODAL VER CAMBIOS - HISTORIAL DE CAMBIOS SOLICITADOS
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, signal, inject } from '@angular/core';
import {
  DetalleConOrden,
  CambioSolicitado,
  obtenerTextoTipoCambio,
  obtenerTextoEstadoCambio,
  obtenerColorEstadoCambio,
  obtenerIconoTipoCambio,
  formatearFechaHora,
  formatearMonto
} from '../../models/liquidacion-verificacion.models';
import { LiquidacionService } from '../../services/liquidacion-verificacion.service';

@Component({
  selector: 'app-modal-ver-cambios',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-screen overflow-y-auto">

        <!-- Header -->
        <div class="px-6 py-4 border-b sticky top-0 bg-white">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-blue-100 rounded-lg">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-blue-600">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Historial de Cambios</h3>
                <p class="text-sm text-gray-600">
                  Orden #{{ detalle?.numero_orden }} • {{ formatearMonto(detalle?.monto || 0) }}
                </p>
              </div>
            </div>
            <button (click)="cerrar.emit()" class="text-gray-400 hover:text-gray-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Contenido -->
        <div class="px-6 py-4">

          <!-- Información del Detalle -->
          <div class="bg-gray-50 rounded-lg p-4 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span class="text-gray-500">Orden:</span>
                <p class="font-medium">#{{ detalle?.numero_orden }}</p>
                <p class="text-xs text-gray-500">{{ detalle?.orden?.area_nombre }}</p>
              </div>
              <div>
                <span class="text-gray-500">Estado Actual:</span>
                <div class="mt-1">
                  <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                    [ngClass]="obtenerColorEstadoVerificacion(detalle?.estado_verificacion!)">
                    {{ obtenerTextoEstadoVerificacion(detalle?.estado_verificacion!) }}
                  </span>
                </div>
              </div>
              <div>
                <span class="text-gray-500">Cambios Pendientes:</span>
                <p class="font-bold text-orange-600">{{ detalle?.cambios_pendientes_count || 0 }}</p>
              </div>
            </div>
          </div>

          <!-- Loading -->
          <div *ngIf="cargando()" class="flex justify-center items-center py-12">
            <div class="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span class="ml-3 text-gray-600">Cargando historial...</span>
          </div>

          <!-- Lista de Cambios -->
          <div *ngIf="!cargando()" class="space-y-4">
            
            <!-- Cambio Individual -->
            <div 
              *ngFor="let cambio of cambios(); trackBy: trackByCambio"
              class="border rounded-lg overflow-hidden"
              [class.border-orange-300]="cambio.estado === 'pendiente'"
              [class.border-green-300]="cambio.estado === 'aprobado'"
              [class.border-red-300]="cambio.estado === 'rechazado'">

              <!-- Header del Cambio -->
              <div class="px-4 py-3 border-b"
                [class.bg-orange-50]="cambio.estado === 'pendiente'"
                [class.bg-green-50]="cambio.estado === 'aprobado'"
                [class.bg-red-50]="cambio.estado === 'rechazado'">
                
                <div class="flex justify-between items-start">
                  <div class="flex items-center gap-3">
                    <span class="text-xl">{{ obtenerIconoTipoCambio(cambio.tipo_cambio) }}</span>
                    <div>
                      <h4 class="font-medium text-gray-900">
                        {{ obtenerTextoTipoCambio(cambio.tipo_cambio) }}
                      </h4>
                      <div class="flex items-center gap-2 text-sm text-gray-600">
                        <span>{{ cambio.solicitado_por }}</span>
                        <span>•</span>
                        <span>{{ formatearFechaHora(cambio.fecha_solicitud) }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-3">
                    <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                      [ngClass]="obtenerColorEstadoCambio(cambio.estado)">
                      {{ obtenerTextoEstadoCambio(cambio.estado) }}
                    </span>
                    
                    <button 
                      (click)="toggleExpandirCambio(cambio.id)"
                      class="p-1 text-gray-400 hover:text-gray-600 rounded">
                      <svg 
                        width="16" height="16" viewBox="0 0 24 24" fill="none" 
                        stroke="currentColor" stroke-width="2"
                        [class.rotate-180]="cambiosExpandidos().has(cambio.id)">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Detalles del Cambio (Expandible) -->
              <div *ngIf="cambiosExpandidos().has(cambio.id)" class="p-4">
                
                <!-- Descripción -->
                <div class="mb-4">
                  <h5 class="text-sm font-medium text-gray-700 mb-2">Descripción del Cambio:</h5>
                  <p class="text-sm text-gray-800 bg-gray-50 p-3 rounded border-l-4 border-gray-300">
                    {{ cambio.descripcion_cambio }}
                  </p>
                </div>

                <!-- Valores (si aplica) -->
                <div *ngIf="cambio.valor_anterior || cambio.valor_solicitado" class="mb-4">
                  <h5 class="text-sm font-medium text-gray-700 mb-2">Cambios Propuestos:</h5>
                  <div class="grid grid-cols-2 gap-4">
                    <div *ngIf="cambio.valor_anterior">
                      <span class="text-xs text-gray-500">Valor Anterior:</span>
                      <p class="text-sm font-medium text-red-600 bg-red-50 p-2 rounded">
                        {{ cambio.valor_anterior }}
                      </p>
                    </div>
                    <div *ngIf="cambio.valor_solicitado">
                      <span class="text-xs text-gray-500">Valor Solicitado:</span>
                      <p class="text-sm font-medium text-green-600 bg-green-50 p-2 rounded">
                        {{ cambio.valor_solicitado }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Justificación -->
                <div *ngIf="cambio.justificacion" class="mb-4">
                  <h5 class="text-sm font-medium text-gray-700 mb-2">Justificación:</h5>
                  <p class="text-sm text-gray-600 italic">{{ cambio.justificacion }}</p>
                </div>

                <!-- Información de Aprobación/Rechazo -->
                <div *ngIf="cambio.estado !== 'pendiente'" class="mt-4 pt-4 border-t">
                  <div class="flex items-start gap-3">
                    <div class="p-2 rounded-lg"
                      [class.bg-green-100]="cambio.estado === 'aprobado'"
                      [class.bg-red-100]="cambio.estado === 'rechazado'">
                      <svg 
                        width="16" height="16" viewBox="0 0 24 24" fill="none" 
                        stroke="currentColor" stroke-width="2"
                        [class.text-green-600]="cambio.estado === 'aprobado'"
                        [class.text-red-600]="cambio.estado === 'rechazado'">
                        <polyline *ngIf="cambio.estado === 'aprobado'" points="20 6 9 17 4 12"/>
                        <line *ngIf="cambio.estado === 'rechazado'" x1="18" y1="6" x2="6" y2="18"/>
                        <line *ngIf="cambio.estado === 'rechazado'" x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </div>
                    <div class="flex-1">
                      <div class="flex items-center gap-2 text-sm">
                        <span class="font-medium"
                          [class.text-green-700]="cambio.estado === 'aprobado'"
                          [class.text-red-700]="cambio.estado === 'rechazado'">
                          {{ cambio.estado === 'aprobado' ? 'Aprobado' : 'Rechazado' }}
                        </span>
                        <span class="text-gray-500">por</span>
                        <span class="font-medium text-gray-700">{{ cambio.aprobado_por }}</span>
                        <span class="text-gray-500">•</span>
                        <span class="text-gray-500">{{ formatearFechaHora(cambio.fecha_aprobacion!) }}</span>
                      </div>
                      <div *ngIf="cambio.observaciones_aprobacion" class="mt-2">
                        <p class="text-sm text-gray-600 bg-gray-50 p-2 rounded border-l-4"
                          [class.border-green-300]="cambio.estado === 'aprobado'"
                          [class.border-red-300]="cambio.estado === 'rechazado'">
                          <strong>Observaciones:</strong> {{ cambio.observaciones_aprobacion }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Sin Cambios -->
            <div *ngIf="cambios().length === 0" class="text-center py-12">
              <div class="text-gray-400 text-6xl mb-4">📝</div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">Sin Cambios Registrados</h3>
              <p class="text-gray-600">No se han solicitado cambios para este detalle</p>
            </div>
          </div>

          <!-- Resumen de Estados -->
          <div *ngIf="cambios().length > 0" class="mt-6 pt-6 border-t">
            <h4 class="text-sm font-medium text-gray-700 mb-3">Resumen del Historial</h4>
            <div class="grid grid-cols-3 gap-4">
              <div class="text-center p-3 bg-orange-50 rounded-lg">
                <div class="text-2xl font-bold text-orange-600">{{ contarCambiosPorEstado('pendiente') }}</div>
                <div class="text-sm text-orange-800">Pendientes</div>
              </div>
              <div class="text-center p-3 bg-green-50 rounded-lg">
                <div class="text-2xl font-bold text-green-600">{{ contarCambiosPorEstado('aprobado') }}</div>
                <div class="text-sm text-green-800">Aprobados</div>
              </div>
              <div class="text-center p-3 bg-red-50 rounded-lg">
                <div class="text-2xl font-bold text-red-600">{{ contarCambiosPorEstado('rechazado') }}</div>
                <div class="text-sm text-red-800">Rechazados</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t bg-gray-50">
          <div class="flex justify-between items-center">
            <div class="text-sm text-gray-600">
              {{ cambios().length }} cambio{{ cambios().length !== 1 ? 's' : '' }} registrado{{ cambios().length !== 1 ? 's' : '' }}
            </div>
            <button 
              type="button" 
              (click)="cerrar.emit()"
              class="px-4 py-2 text-gray-700 bg-white border rounded-md hover:bg-gray-50">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ModalVerCambiosComponent implements OnInit {
  @Input() detalle: DetalleConOrden | null = null;

  @Output() cerrar = new EventEmitter<void>();

  private readonly service = inject(LiquidacionService);

  readonly cambios = signal<CambioSolicitado[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly cambiosExpandidos = signal<Set<number>>(new Set());

  readonly formatearFechaHora = formatearFechaHora;
  readonly formatearMonto = formatearMonto;
  readonly obtenerTextoTipoCambio = obtenerTextoTipoCambio;
  readonly obtenerTextoEstadoCambio = obtenerTextoEstadoCambio;
  readonly obtenerColorEstadoCambio = obtenerColorEstadoCambio;
  readonly obtenerIconoTipoCambio = obtenerIconoTipoCambio;

  ngOnInit(): void {
    this.cargarCambios();
  }

  // ============================================================================
  // CARGA DE DATOS
  // ============================================================================

  private cargarCambios(): void {
    if (!this.detalle) return;

    this.cargando.set(true);

    this.service.obtenerCambiosDetalle(this.detalle.detalle_id)
      .subscribe({
        next: (cambios) => {
          this.cambios.set(cambios);
          this.cargando.set(false);
        },
        error: () => {
          this.cambios.set([]);
          this.cargando.set(false);
        }
      });
  }

  // ============================================================================
  // ACCIONES DE UI
  // ============================================================================

  toggleExpandirCambio(cambioId: number): void {
    const expandidos = new Set(this.cambiosExpandidos());

    if (expandidos.has(cambioId)) {
      expandidos.delete(cambioId);
    } else {
      expandidos.add(cambioId);
    }

    this.cambiosExpandidos.set(expandidos);
  }

  // ============================================================================
  // UTILIDADES DE CÁLCULO
  // ============================================================================

  contarCambiosPorEstado(estado: string): number {
    return this.cambios().filter(c => c.estado === estado).length;
  }

  // ============================================================================
  // UTILIDADES DE ESTILO
  // ============================================================================

  obtenerColorEstadoVerificacion(estado: string): string {
    const colores: Record<string, string> = {
      'pendiente': 'bg-yellow-100 text-yellow-800',
      'verificado': 'bg-green-100 text-green-800',
      'rechazado': 'bg-red-100 text-red-800'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800';
  }

  obtenerTextoEstadoVerificacion(estado: string): string {
    const textos: Record<string, string> = {
      'pendiente': 'Pendiente',
      'verificado': 'Verificado',
      'rechazado': 'Rechazado'
    };
    return textos[estado] || estado;
  }

  // ============================================================================
  // TRACK BY FUNCTIONS
  // ============================================================================

  trackByCambio(index: number, cambio: CambioSolicitado): number {
    return cambio.id;
  }

  // ============================================================================
  // INFORMACIÓN CONTEXTUAL
  // ============================================================================

  get estadisticasCambios(): {
    total: number;
    pendientes: number;
    aprobados: number;
    rechazados: number;
    ultimoCambio?: CambioSolicitado;
  } {
    const cambios = this.cambios();
    const pendientes = this.contarCambiosPorEstado('pendiente');
    const aprobados = this.contarCambiosPorEstado('aprobado');
    const rechazados = this.contarCambiosPorEstado('rechazado');

    // Ordenar por fecha para obtener el último
    const cambiosOrdenados = [...cambios].sort((a, b) =>
      new Date(b.fecha_solicitud).getTime() - new Date(a.fecha_solicitud).getTime()
    );

    return {
      total: cambios.length,
      pendientes,
      aprobados,
      rechazados,
      ultimoCambio: cambiosOrdenados[0]
    };
  }

  get tieneAccionesPendientes(): boolean {
    return this.contarCambiosPorEstado('pendiente') > 0;
  }

  get resumenEstado(): string {
    const stats = this.estadisticasCambios;

    if (stats.total === 0) return 'Sin cambios registrados';
    if (stats.pendientes > 0) return `${stats.pendientes} cambio${stats.pendientes !== 1 ? 's' : ''} pendiente${stats.pendientes !== 1 ? 's' : ''}`;
    if (stats.aprobados > 0 && stats.rechazados === 0) return 'Todos los cambios aprobados';
    if (stats.rechazados > 0 && stats.aprobados === 0) return 'Todos los cambios rechazados';

    return `${stats.aprobados} aprobado${stats.aprobados !== 1 ? 's' : ''}, ${stats.rechazados} rechazado${stats.rechazados !== 1 ? 's' : ''}`;
  }

  // ============================================================================
  // UTILIDADES DE FECHA
  // ============================================================================

  esCambioReciente(fechaSolicitud: string): boolean {
    const fecha = new Date(fechaSolicitud);
    const ahora = new Date();
    const diferencia = ahora.getTime() - fecha.getTime();
    const tresDias = 3 * 24 * 60 * 60 * 1000; // 3 días en ms

    return diferencia < tresDias;
  }

  // ============================================================================
  // FUNCIONES DE FILTRO Y BÚSQUEDA
  // ============================================================================

  filtrarCambiosPorTipo(tipo: string): CambioSolicitado[] {
    return this.cambios().filter(c => c.tipo_cambio === tipo);
  }

  filtrarCambiosPorEstado(estado: string): CambioSolicitado[] {
    return this.cambios().filter(c => c.estado === estado);
  }
}