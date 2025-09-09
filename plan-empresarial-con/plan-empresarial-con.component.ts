// ============================================================================
// CONTENEDOR PRINCIPAL - PLAN EMPRESARIAL CON (SIMPLIFICADO)
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { OrdenesPlanEmpresarialSimpleComponent } from './components/ordenes-plan-empresarial/ordenes-plan-empresarial.component';
import { OrdenesPlanEmpresarialService } from './services/ordenes-plan-empresarial.service';

@Component({
  selector: 'app-plan-empresarial-con',
  standalone: true,
  imports: [
    CommonModule,
    OrdenesPlanEmpresarialSimpleComponent
  ],
  template: `
    <div class="w-full min-h-screen bg-gray-50">
      <div class="w-full mx-auto space-y-4 p-4">
        
        <!-- Header -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div class="flex justify-between items-center">
            <div>
              <h1 class="text-xl font-bold text-gray-900">Plan Empresarial</h1>
              <p class="text-sm text-gray-600">Gestión de órdenes y anticipos</p>
            </div>
            <div class="flex items-center space-x-4">
              <!-- Resumen rápido -->
              <div class="text-right">
                <div class="text-sm text-gray-500">Total Órdenes</div>
                <div class="text-lg font-semibold text-gray-900">{{ resumen().totalOrdenes }}</div>
              </div>
              <div class="text-right">
                <div class="text-sm text-gray-500">Con Anticipos Pendientes</div>
                <div class="text-lg font-semibold text-red-600">{{ resumen().ordenesConPendientes }}</div>
              </div>
              <!-- Botón refrescar -->
              <button 
                (click)="refrescarTodo()"
                [disabled]="cargando()"
                class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                title="Refrescar todos los datos">
                <svg class="w-4 h-4 mr-2" [class.animate-spin]="cargando()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {{ cargando() ? 'Cargando...' : 'Refrescar' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Contenido Principal -->
        <div class="grid grid-cols-1 gap-4">
          
          <!-- Panel de Órdenes -->
          <div class="col-span-1">
            <app-ordenes-plan-empresarial-simple></app-ordenes-plan-empresarial-simple>
          </div>

          <!-- Espacio para futuros componentes -->
          <!-- 
          <div class="col-span-1">
            <app-otro-componente></app-otro-componente>
          </div>
          -->

        </div>

        <!-- Footer informativo -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <div class="flex justify-between items-center text-xs text-gray-500">
            <span>
              Última actualización: {{ fechaUltimaActualizacion() | date:'dd/MM/yyyy HH:mm' }}
            </span>
            <span>
              Sistema de Gestión Plan Empresarial v1.0
            </span>
          </div>
        </div>

      </div>
    </div>
  `
})
export class PlanEmpresarialConComponent implements OnInit, OnDestroy {

  private readonly service = inject(OrdenesPlanEmpresarialService);
  private readonly destroy$ = new Subject<void>();

  // Estado del contenedor
  readonly cargando = signal<boolean>(false);
  readonly fechaUltimaActualizacion = signal<Date>(new Date());

  ngOnInit(): void {
    this.inicializarSuscripciones();
    this.cargarDatosIniciales();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // INICIALIZACIÓN
  // ============================================================================

  private inicializarSuscripciones(): void {
    // Suscribirse al estado de carga del servicio
    this.service.cargando$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cargando => {
        this.cargando.set(cargando);
        if (!cargando) {
          this.fechaUltimaActualizacion.set(new Date());
        }
      });
  }

  private cargarDatosIniciales(): void {
    this.service.cargarOrdenes().subscribe();
  }

  // ============================================================================
  // ACCIONES DEL CONTENEDOR
  // ============================================================================

  /**
   * Refrescar todos los datos del módulo
   */
  refrescarTodo(): void {
    this.service.refrescarDatos().subscribe();
  }

  /**
   * Obtener resumen de órdenes para mostrar en el header
   */
  resumen(): { totalOrdenes: number; ordenesConPendientes: number } {
    return this.service.obtenerResumen();
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS PARA CONTROL EXTERNO
  // ============================================================================

  /**
   * Verificar si el módulo está ocupado procesando datos
   */
  estaOcupado(): boolean {
    return this.service.estaOcupado();
  }

  /**
   * Limpiar todo el estado del módulo
   */
  limpiarEstado(): void {
    this.service.limpiarEstado();
  }

  /**
   * Obtener información de estado para debugging
   */
  obtenerEstadoCompleto(): {
    ordenes: number;
    anticipos: number;
    cargando: boolean;
    ultimaActualizacion: Date;
  } {
    return {
      ordenes: this.service.obtenerOrdenesActuales().length,
      anticipos: this.service.obtenerAnticiposActuales().length,
      cargando: this.cargando(),
      ultimaActualizacion: this.fechaUltimaActualizacion()
    };
  }
}