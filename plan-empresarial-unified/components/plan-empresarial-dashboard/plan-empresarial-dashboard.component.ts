import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PlanEmpresarialService } from '../../services/plan-empresarial.service';
import { FacturaSectionComponent } from '../facturas-section/facturas-section.component';
import { OrdenesSectionComponent } from '../ordenes-section/ordenes-section.component';
import { LiquidacionesSectionComponent } from '../liquidaciones-section/liquidaciones-section.component';

import {
  FacturaPE,
  OrdenPE,
  EstadisticasDashboard,
  ResumenLiquidacion
} from '../../models/plan-empresarial.models';

/**
 * Dashboard principal del módulo Plan Empresarial
 * Consolida todas las funcionalidades en una interfaz unificada y minimalista
 */
@Component({
  selector: 'app-plan-empresarial-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FacturaSectionComponent,
    OrdenesSectionComponent,
    LiquidacionesSectionComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <!-- Header del Dashboard -->
      <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-4">
            <!-- Título y breadcrumb -->
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                Plan Empresarial
              </h1>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Gestión integral de facturas, órdenes y liquidaciones
              </p>
            </div>
            
            <!-- Indicadores de estado -->
            <div class="flex items-center gap-4">
              <!-- Badge de factura activa -->
              <div *ngIf="facturaActiva()" 
                   class="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span class="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {{ facturaActiva()?.numero_dte }}
                </span>
              </div>
              
              <!-- Loading global -->
              <div *ngIf="servicio.cargando()" 
                   class="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div class="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <span class="text-sm text-amber-700 dark:text-amber-300">Cargando...</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Estadísticas rápidas -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Facturas Pendientes -->
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Facturas Pendientes</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ estadisticas().facturas_pendientes }}
                </p>
              </div>
              <div class="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Órdenes con Anticipos -->
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Órdenes con Anticipos</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ estadisticas().ordenes_con_anticipos }}
                </p>
              </div>
              <div class="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <svg class="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Liquidaciones Completadas -->
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Liquidaciones Completadas</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ estadisticas().liquidaciones_completadas }}
                </p>
              </div>
              <div class="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Monto Pendiente -->
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Monto Pendiente</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  Q{{ estadisticas().monto_total_pendiente | number:'1.2-2' }}
                </p>
              </div>
              <div class="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <svg class="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Layout principal -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <!-- Sección Facturas -->
          <app-factura-section
            [estadoCarga]="servicio.cargandoFacturas()"
            (facturaSeleccionada)="onFacturaSeleccionada($event)"
            (buscarFactura)="onBuscarFactura($event)"
            (registrarFactura)="onRegistrarFactura($event)"
            (solicitarAutorizacion)="onSolicitarAutorizacion($event)">
          </app-factura-section>

          <!-- Sección Órdenes -->
          <app-ordenes-section
            [estadoCarga]="servicio.cargandoOrdenes()" 
            [ordenes]="ordenes()"
            (cargarOrdenes)="onCargarOrdenes()"
            (seleccionarOrden)="onSeleccionarOrden($event)"
            (solicitarAutorizacionAnticipo)="onSolicitarAutorizacionAnticipo($event)">
          </app-ordenes-section>
        </div>

        <!-- Sección Liquidaciones (ancho completo) -->
        <div class="grid grid-cols-1 gap-6">
          <app-liquidaciones-section
            [facturaActiva]="facturaActiva()"
            [estadoCarga]="servicio.cargandoDetalles()"
            [guardandoDetalle]="servicio.guardandoDetalle()"
            [resumenLiquidacion]="resumenLiquidacion()"
            [puedeEditar]="servicio.puedeEditarDetalles()"
            (guardarDetalle)="onGuardarDetalle($event)"
            (eliminarDetalle)="onEliminarDetalle($event)"
            (copiarDetalle)="onCopiarDetalle($event)"
            (actualizarDetalle)="onActualizarDetalle($event)">
          </app-liquidaciones-section>
        </div>
      </main>

      <!-- Toast de mensajes -->
      <div *ngIf="ultimoMensaje()" 
           class="fixed bottom-4 right-4 z-50 transition-all duration-300"
           [class]="obtenerClaseMensaje(ultimoMensaje()!.tipo)">
        <div class="flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path *ngIf="ultimoMensaje()!.tipo === 'success'" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
            <path *ngIf="ultimoMensaje()!.tipo === 'error'" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>
            <path *ngIf="ultimoMensaje()!.tipo === 'warning'" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"/>
            <path *ngIf="ultimoMensaje()!.tipo === 'info'" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"/>
          </svg>
          <span class="text-sm font-medium">{{ ultimoMensaje()!.texto }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    /* Animaciones para transiciones suaves */
    .transition-all {
      transition-property: all;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      transition-duration: 300ms;
    }

    /* Grid responsivo mejorado */
    @media (max-width: 768px) {
      .grid {
        gap: 1rem;
      }
      
      .px-4 {
        padding-left: 1rem;
        padding-right: 1rem;
      }
    }

    /* Estados de carga suaves */
    .animate-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: .5;
      }
    }

    /* Toast personalizado */
    .toast-enter {
      opacity: 0;
      transform: translateX(100%);
    }
    
    .toast-enter-active {
      opacity: 1;
      transform: translateX(0);
    }
  `]
})
export class PlanEmpresarialDashboardComponent implements OnInit, OnDestroy {

  // ============================================================================
  // INYECCIÓN DE DEPENDENCIAS
  // ============================================================================

  readonly servicio = inject(PlanEmpresarialService);

  // ============================================================================
  // SIGNALS LOCALES PARA UI
  // ============================================================================

  private readonly _mensajeVisible = signal(false);

  // ============================================================================
  // COMPUTED SIGNALS PARA DATOS DERIVADOS
  // ============================================================================

  readonly facturaActiva = computed(() => this.servicio.facturaActiva());
  readonly ordenes = computed(() => this.servicio.ordenes());
  readonly estadisticas = computed(() => this.servicio.estadisticas());
  readonly resumenLiquidacion = computed(() => this.servicio.resumenLiquidacion());
  readonly ultimoMensaje = computed(() => this.servicio.ultimoMensaje());

  // ============================================================================
  // COMPUTED PARA UI HELPERS
  // ============================================================================

  readonly tieneDatos = computed(() =>
    this.facturaActiva() !== null || this.ordenes().length > 0
  );

  readonly puedeOperar = computed(() =>
    !this.servicio.cargando() && this.servicio.estadoCarga() !== 'error'
  );

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  ngOnInit(): void {
    // Inicializar el servicio y cargar datos iniciales
    this.servicio.inicializar()
      .pipe(takeUntilDestroyed())
      .subscribe(success => {
        if (success) {
          // Cargar órdenes después de la inicialización
          this.servicio.cargarOrdenes().subscribe();
        }
      });

    // Configurar auto-hide para mensajes
    this.configurarMensajes();
  }

  ngOnDestroy(): void {
    // Cleanup automático con takeUntilDestroyed
  }

  // ============================================================================
  // CONFIGURACIÓN DE MENSAJES
  // ============================================================================

  private configurarMensajes(): void {
    // Auto-hide de mensajes después de 3 segundos
    this.ultimoMensaje.subscribe(mensaje => {
      if (mensaje) {
        this._mensajeVisible.set(true);
        setTimeout(() => {
          this._mensajeVisible.set(false);
        }, 3000);
      }
    });
  }

  // ============================================================================
  // EVENT HANDLERS - FACTURAS
  // ============================================================================

  onFacturaSeleccionada(factura: FacturaPE): void {
    // La selección ya se maneja internamente en el servicio
    console.log('Factura seleccionada:', factura.numero_dte);
  }

  onBuscarFactura(numeroDte: string): void {
    this.servicio.buscarFactura(numeroDte).subscribe();
  }

  onRegistrarFactura(payload: any): void {
    this.servicio.registrarFactura(payload).subscribe();
  }

  onSolicitarAutorizacion(payload: any): void {
    this.servicio.solicitarAutorizacionFactura(payload).subscribe();
  }

  // ============================================================================
  // EVENT HANDLERS - ÓRDENES
  // ============================================================================

  onCargarOrdenes(): void {
    this.servicio.cargarOrdenes().subscribe();
  }

  onSeleccionarOrden(numeroOrden: number): void {
    this.servicio.seleccionarOrden(numeroOrden);
  }

  onSolicitarAutorizacionAnticipo(payload: any): void {
    this.servicio.solicitarAutorizacionAnticipo(payload).subscribe();
  }

  // ============================================================================
  // EVENT HANDLERS - LIQUIDACIONES
  // ============================================================================

  onGuardarDetalle(payload: any): void {
    this.servicio.guardarDetalleLiquidacion(payload).subscribe();
  }

  onEliminarDetalle(id: number): void {
    this.servicio.eliminarDetalleLiquidacion(id).subscribe();
  }

  onCopiarDetalle(id: number): void {
    this.servicio.copiarDetalleLiquidacion(id).subscribe();
  }

  onActualizarDetalle(params: { id: number, campo: 'monto' | 'agencia', valor: any }): void {
    this.servicio.actualizarDetalleLiquidacion(params.id, params.campo, params.valor).subscribe();
  }

  // ============================================================================
  // UTILIDADES PARA UI
  // ============================================================================

  obtenerClaseMensaje(tipo: 'success' | 'error' | 'warning' | 'info'): string {
    const clases = {
      success: 'bg-green-500 text-white',
      error: 'bg-red-500 text-white',
      warning: 'bg-yellow-500 text-white',
      info: 'bg-blue-500 text-white'
    };
    return clases[tipo] || clases.info;
  }

  reiniciarDashboard(): void {
    this.servicio.reiniciarEstado();
    this.servicio.inicializar().subscribe();
  }

  refrescarDatos(): void {
    this.servicio.refrescarDatos().subscribe();
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS PARA DEPURACIÓN
  // ============================================================================

  obtenerEstadoCompleto(): any {
    return {
      facturaActiva: this.facturaActiva(),
      cantidadOrdenes: this.ordenes().length,
      estadisticas: this.estadisticas(),
      resumen: this.resumenLiquidacion(),
      cargando: this.servicio.cargando(),
      puedeOperar: this.puedeOperar()
    };
  }

  obtenerInformacionDebug(): any {
    return {
      servicio: {
        estadoCarga: this.servicio.estadoCarga(),
        cargandoFacturas: this.servicio.cargandoFacturas(),
        cargandoOrdenes: this.servicio.cargandoOrdenes(),
        cargandoDetalles: this.servicio.cargandoDetalles(),
        tieneFactura: this.servicio.tieneFacturaCargada()
      },
      ui: {
        tieneDatos: this.tieneDatos(),
        puedeOperar: this.puedeOperar(),
        mensajeVisible: this._mensajeVisible()
      }
    };
  }
}