import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal, computed, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PlanEmpresarialService } from '../../services/plan-empresarial.service';
import { ModalAnticiposComponent } from './modals/modal-anticipos.component';

import {
  OrdenPE,
  AnticipoPendientePE,
  SolicitarAutorizacionAnticipoPayload
} from '../../models/plan-empresarial.models';

/**
 * Sección de gestión de órdenes - Estilo minimalista y funcional
 * Incluye listado de órdenes y gestión de anticipos pendientes
 */
@Component({
  selector: 'app-ordenes-section',
  standalone: true,
  imports: [
    CommonModule,
    ModalAnticiposComponent
  ],
  template: `
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 class="text-sm font-medium text-gray-900">Órdenes Autorizadas</h2>
        
        <div class="flex items-center gap-2">
          <!-- Contador de órdenes -->
          <span class="text-xs text-gray-500">
            {{ estadisticas().totalOrdenes }} órdenes
          </span>
          
          <!-- Botón refrescar -->
          <button 
            (click)="refrescar()"
            [disabled]="cargandoOrdenes()"
            class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50"
            title="Actualizar órdenes">
            <svg class="w-4 h-4" [class.animate-spin]="cargandoOrdenes()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Contenido principal -->
      <div class="overflow-hidden">
        <!-- Loading -->
        <div *ngIf="cargandoOrdenes()" class="p-8 text-center">
          <div class="inline-flex items-center gap-2 text-gray-500">
            <div class="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            <span class="text-sm">Cargando órdenes...</span>
          </div>
        </div>

        <!-- Sin órdenes -->
        <div *ngIf="!cargandoOrdenes() && ordenes().length === 0" class="p-8 text-center">
          <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <p class="text-sm text-gray-600">No hay órdenes disponibles</p>
        </div>

        <!-- Tabla de órdenes -->
        <div *ngIf="!cargandoOrdenes() && ordenes().length > 0" class="overflow-x-auto">
          <table class="w-full text-sm">
            <!-- Header de tabla -->
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orden
                </th>
                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Liquidado
                </th>
                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pendiente
                </th>
                <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Anticipos
                </th>
              </tr>
            </thead>
            
            <!-- Cuerpo de tabla -->
            <tbody class="bg-white divide-y divide-gray-100">
              <tr *ngFor="let orden of ordenes(); trackBy: trackByOrden"
                  class="hover:bg-gray-50 transition-colors">
                
                <!-- Número de orden -->
                <td class="px-3 py-3">
                  <div class="flex flex-col">
                    <span class="font-medium text-gray-900">#{{ orden.numero_orden }}</span>
                    <div *ngIf="orden.area || orden.presupuesto" class="text-xs text-gray-500 mt-0.5">
                      <span *ngIf="orden.area">{{ orden.area }}</span>
                      <span *ngIf="orden.area && orden.presupuesto"> • </span>
                      <span *ngIf="orden.presupuesto">{{ orden.presupuesto }}</span>
                    </div>
                  </div>
                </td>
                
                <!-- Total -->
                <td class="px-3 py-3 text-right">
                  <span class="font-medium text-gray-900">
                    Q{{ orden.total | number:'1.2-2' }}
                  </span>
                </td>
                
                <!-- Liquidado -->
                <td class="px-3 py-3 text-right">
                  <span class="font-medium text-green-600">
                    Q{{ orden.monto_liquidado | number:'1.2-2' }}
                  </span>
                </td>
                
                <!-- Pendiente -->
                <td class="px-3 py-3 text-right">
                  <div [ngSwitch]="orden.monto_pendiente > 0">
                    <span *ngSwitchCase="true" 
                          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Q{{ orden.monto_pendiente | number:'1.2-2' }}
                    </span>
                    <span *ngSwitchCase="false"
                          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Completo
                    </span>
                  </div>
                </td>
                
                <!-- Anticipos -->
                <td class="px-3 py-3 text-center">
                  <div class="flex items-center justify-center gap-2">
                    <!-- Total anticipos -->
                    <span class="text-xs text-gray-500">
                      Q{{ orden.total_anticipos | number:'1.2-2' }}
                    </span>
                    
                    <!-- Botón anticipos pendientes -->
                    <button *ngIf="orden.anticipos_pendientes > 0; else sinAnticipos"
                            (click)="abrirModalAnticipos(orden)"
                            class="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                            [title]="'Anticipos pendientes: ' + orden.anticipos_pendientes">
                      {{ orden.anticipos_pendientes }}
                    </button>
                    
                    <ng-template #sinAnticipos>
                      <span class="inline-flex items-center justify-center w-6 h-6 text-xs text-gray-400 bg-gray-100 rounded-full">
                        -
                      </span>
                    </ng-template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Footer con estadísticas -->
      <div *ngIf="!cargandoOrdenes() && ordenes().length > 0" 
           class="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div class="flex justify-between items-center text-xs text-gray-600">
          <span>
            {{ estadisticas().totalOrdenes }} {{ estadisticas().totalOrdenes === 1 ? 'orden' : 'órdenes' }}
          </span>
          <div class="flex gap-4">
            <span>
              <span class="font-medium">{{ estadisticas().ordenesCompletas }}</span> completas
            </span>
            <span>
              <span class="font-medium">{{ estadisticas().ordenesPendientes }}</span> pendientes
            </span>
            <span *ngIf="estadisticas().anticiposPendientes > 0" class="text-red-600">
              <span class="font-medium">{{ estadisticas().anticiposPendientes }}</span> anticipos pendientes
            </span>
          </div>
        </div>
      </div>

      <!-- Modal de anticipos -->
      <app-modal-anticipos
        *ngIf="mostrarModalAnticipos()"
        [numeroOrden]="ordenSeleccionada()?.numero_orden || ''"
        [nombreOrden]="obtenerNombreOrden()"
        (cerrar)="cerrarModalAnticipos()"
        (solicitudEnviada)="onSolicitudEnviada()">
      </app-modal-anticipos>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    /* Animaciones suaves */
    .transition-colors {
      transition-property: color, background-color, border-color;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      transition-duration: 150ms;
    }
    
    /* Tabla responsive */
    @media (max-width: 640px) {
      table {
        font-size: 0.75rem;
      }
      
      .px-3 {
        padding-left: 0.5rem;
        padding-right: 0.5rem;
      }
      
      .py-3 {
        padding-top: 0.5rem;
        padding-bottom: 0.5rem;
      }
    }
    
    /* Estados hover */
    tbody tr:hover {
      background-color: #f9fafb;
    }
    
    /* Botón anticipos */
    button.bg-red-500:focus {
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.1);
    }
    
    /* Loading spinner */
    .animate-spin {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `]
})
export class OrdenesSectionComponent implements OnInit, OnDestroy {

  // ============================================================================
  // DEPENDENCIAS Y INPUTS/OUTPUTS
  // ============================================================================

  private readonly servicio = inject(PlanEmpresarialService);

  // Inputs
  readonly estadoCarga = input<boolean>(false);
  readonly ordenes = input<OrdenPE[]>([]);

  // Outputs
  readonly cargarOrdenes = output<void>();
  readonly seleccionarOrden = output<OrdenPE>();
  readonly solicitarAutorizacionAnticipo = output<SolicitarAutorizacionAnticipoPayload>();

  // ============================================================================
  // SIGNALS DE ESTADO
  // ============================================================================

  // Estados del servicio
  readonly cargandoOrdenes = computed(() => this.servicio.cargandoOrdenes());

  // Estados de UI
  readonly mostrarModalAnticipos = signal(false);
  readonly ordenSeleccionada = signal<OrdenPE | null>(null);

  // ============================================================================
  // COMPUTED PROPERTIES
  // ============================================================================

  readonly estadisticas = computed(() => {
    const ordenes = this.ordenes();
    const totalOrdenes = ordenes.length;
    const ordenesCompletas = ordenes.filter(o => o.monto_pendiente <= 0).length;
    const ordenesPendientes = ordenes.filter(o => o.monto_pendiente > 0).length;
    const anticiposPendientes = ordenes.reduce((sum, o) => sum + o.anticipos_pendientes, 0);

    return {
      totalOrdenes,
      ordenesCompletas,
      ordenesPendientes,
      anticiposPendientes,
      montoTotalPendiente: ordenes.reduce((sum, o) => sum + o.monto_pendiente, 0)
    };
  });

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  ngOnInit(): void {
    // Cargar órdenes al inicializar
    this.cargarOrdenesInterno();
  }

  ngOnDestroy(): void {
    // La limpieza se maneja automáticamente con takeUntilDestroyed
  }

  // ============================================================================
  // MÉTODOS DE CARGA
  // ============================================================================

  refrescar(): void {
    this.cargarOrdenesInterno();
    this.cargarOrdenes.emit();
  }

  private cargarOrdenesInterno(): void {
    this.servicio.cargarOrdenes().subscribe();
  }

  // ============================================================================
  // GESTIÓN DE MODAL DE ANTICIPOS
  // ============================================================================

  abrirModalAnticipos(orden: OrdenPE): void {
    this.ordenSeleccionada.set(orden);
    this.mostrarModalAnticipos.set(true);
    this.seleccionarOrden.emit(orden);

    // Cargar anticipos de la orden seleccionada
    this.servicio.seleccionarOrden(parseInt(orden.numero_orden));
  }

  cerrarModalAnticipos(): void {
    this.mostrarModalAnticipos.set(false);
    this.ordenSeleccionada.set(null);
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  onSolicitudEnviada(): void {
    // Refrescar las órdenes para actualizar el estado de anticipos
    this.refrescar();

    // Mantener el modal abierto para ver los cambios
    const ordenActual = this.ordenSeleccionada();
    if (ordenActual) {
      // Recargar anticipos de la orden actual
      setTimeout(() => {
        this.servicio.cargarAnticiposPendientes(parseInt(ordenActual.numero_orden)).subscribe();
      }, 1000);
    }
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  trackByOrden(index: number, orden: OrdenPE): string {
    return orden.numero_orden;
  }

  obtenerNombreOrden(): string {
    const orden = this.ordenSeleccionada();
    if (!orden) return '';

    let nombre = `Orden #${orden.numero_orden}`;

    if (orden.area) {
      nombre += ` - ${orden.area}`;
    }

    if (orden.presupuesto) {
      nombre += ` (${orden.presupuesto})`;
    }

    return nombre;
  }

  obtenerColorEstadoOrden(orden: OrdenPE): string {
    if (orden.monto_pendiente <= 0) {
      return 'text-green-600';
    } else if (orden.anticipos_pendientes > 0) {
      return 'text-red-600';
    } else {
      return 'text-amber-600';
    }
  }

  formatearMonto(monto: number): string {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(monto);
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS PARA CONTROL EXTERNO
  // ============================================================================

  /**
   * Obtiene las órdenes actualmente cargadas
   */
  obtenerOrdenesActuales(): OrdenPE[] {
    return this.ordenes();
  }

  /**
   * Obtiene una orden específica por número
   */
  obtenerOrdenPorNumero(numeroOrden: string): OrdenPE | undefined {
    return this.ordenes().find(o => o.numero_orden === numeroOrden);
  }

  /**
   * Verifica si hay órdenes con anticipos pendientes
   */
  tieneAnticiposPendientes(): boolean {
    return this.estadisticas().anticiposPendientes > 0;
  }

  /**
   * Obtiene el resumen de órdenes
   */
  obtenerResumen() {
    return this.estadisticas();
  }

  /**
   * Fuerza la recarga de datos
   */
  forzarRecarga(): void {
    this.refrescar();
  }
}