// ============================================================================
// COMPONENTE DE ÓRDENES - PATRÓN SIMPLE COMO LIQUIDACION-VERIFICACION
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { OrdenesPlanEmpresarialService, OrdenPE } from '../../services/ordenes-plan-empresarial.service';
import { ModalAnticiposComponent } from '../modal-anticipos/modal-anticipos.component';

@Component({
  selector: 'app-ordenes-plan-empresarial-simple',
  standalone: true,
  imports: [CommonModule, ModalAnticiposComponent],
  template: `
    <div class="w-full h-80 flex flex-col">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
        
        <!-- Header -->
        <div class="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h2 class="text-sm font-medium text-gray-900">Órdenes – Plan Empresarial</h2>
          <button 
            (click)="refrescar()"
            class="p-1.5 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            title="Actualizar">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <!-- Loading -->
        <div *ngIf="cargando()" class="flex-1 flex items-center justify-center">
          <div class="flex items-center space-x-2 text-gray-500">
            <div class="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
            <span class="text-sm">Cargando...</span>
          </div>
        </div>

        <!-- Tabla -->
        <div *ngIf="!cargando() && ordenes().length > 0" class="flex-1 overflow-hidden">
          <div class="h-full overflow-y-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 sticky top-0">
                <tr class="border-b border-gray-200">
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orden
                  </th>
                  <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pendiente
                  </th>
                  <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Anticipos
                  </th>
                  <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-100">
                <tr *ngFor="let orden of ordenes(); trackBy: trackByOrden"
                    class="hover:bg-gray-50 transition-colors duration-150">
                  <td class="px-3 py-3">
                    <span class="font-medium text-gray-900">#{{ orden.numero_orden }}</span>
                    <div *ngIf="orden.area || orden.presupuesto" class="text-xs text-gray-500">
                      {{ orden.area }} / {{ orden.presupuesto }}
                    </div>
                  </td>
                  <td class="px-3 py-3 text-right">
                    <span class="text-gray-900 font-medium">{{ formatearMonto(orden.total) }}</span>
                  </td>
                  <td class="px-3 py-3 text-right">
                    <ng-container *ngIf="orden.monto_pendiente > 0; else completoTpl">
                      <span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-md">
                        {{ formatearMonto(orden.monto_pendiente) }}
                      </span>
                    </ng-container>
                    <ng-template #completoTpl>
                      <span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-md">
                        Completo
                      </span>
                    </ng-template>
                  </td>
                  <td class="px-3 py-3 text-right">
                    <span class="text-blue-700 font-medium">{{ formatearMonto(orden.total_anticipos) }}</span>
                  </td>
                  <td class="px-3 py-3 text-center">
                    <button 
                      *ngIf="orden.anticipos_pendientes > 0; else sinAnticipos"
                      (click)="abrirModalAnticipos(orden)"
                      class="inline-flex items-center justify-center w-8 h-8 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                      title="Anticipos pendientes - Solicitar autorización">
                      {{ orden.anticipos_pendientes }}
                    </button>
                    <ng-template #sinAnticipos>
                      <span class="inline-flex items-center justify-center w-8 h-8 text-xs text-gray-400 bg-gray-100 rounded-full">
                        -
                      </span>
                    </ng-template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="!cargando() && ordenes().length === 0"
             class="flex-1 flex flex-col items-center justify-center text-center py-8">
          <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 class="text-sm font-medium text-gray-900 mb-1">Sin órdenes</h3>
          <p class="text-xs text-gray-500">No hay órdenes disponibles para gestionar</p>
        </div>

        <!-- Footer -->
        <div *ngIf="!cargando()" 
             class="px-3 py-2 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <span class="text-xs text-gray-600">
            {{ resumen().totalOrdenes }} {{ resumen().totalOrdenes === 1 ? 'orden' : 'órdenes' }}
          </span>
          <span class="text-xs text-gray-600">
            {{ resumen().ordenesConPendientes }} con anticipos pendientes
          </span>
        </div>
      </div>
    </div>

    <!-- Modal de anticipos -->
    <app-modal-anticipos 
      *ngIf="modalVisible()"
      [numeroOrden]="ordenSeleccionada()?.numero_orden || 0"
      (cerrar)="cerrarModal()"
      (solicitudExitosa)="onSolicitudExitosa()">
    </app-modal-anticipos>
  `
})
export class OrdenesPlanEmpresarialSimpleComponent implements OnInit, OnDestroy {

  private readonly service = inject(OrdenesPlanEmpresarialService);
  private readonly destroy$ = new Subject<void>();

  // Estado del componente
  readonly ordenes = signal<OrdenPE[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly modalVisible = signal<boolean>(false);
  readonly ordenSeleccionada = signal<OrdenPE | null>(null);

  ngOnInit(): void {
    this.inicializarSuscripciones();
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // INICIALIZACIÓN
  // ============================================================================

  private inicializarSuscripciones(): void {
    this.service.ordenes$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ordenes => this.ordenes.set(ordenes));

    this.service.cargando$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cargando => this.cargando.set(cargando));
  }

  private cargarDatos(): void {
    this.service.cargarOrdenes().subscribe();
  }

  // ============================================================================
  // ACCIONES DEL COMPONENTE
  // ============================================================================

  refrescar(): void {
    this.service.cargarOrdenes().subscribe();
  }

  abrirModalAnticipos(orden: OrdenPE): void {
    this.ordenSeleccionada.set(orden);
    this.modalVisible.set(true);
  }

  cerrarModal(): void {
    this.modalVisible.set(false);
    this.ordenSeleccionada.set(null);
  }

  onSolicitudExitosa(): void {
    // Mantener el modal abierto pero refrescar datos
    this.service.cargarOrdenes().subscribe();
  }

  // ============================================================================
  // MÉTODOS DE UTILIDAD
  // ============================================================================

  resumen(): { totalOrdenes: number; ordenesConPendientes: number } {
    return this.service.obtenerResumen();
  }

  formatearMonto(monto: number): string {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(monto);
  }

  trackByOrden(index: number, orden: OrdenPE): number {
    return orden.numero_orden;
  }
}