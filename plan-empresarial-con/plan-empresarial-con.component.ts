// ============================================================================
// CONTENEDOR PRINCIPAL - PLAN EMPRESARIAL COMPLETO CON LIQUIDACIONES
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { OrdenesPlanEmpresarialSimpleComponent } from './components/ordenes-plan-empresarial/ordenes-plan-empresarial.component';
import { FacturasGestionComponent } from './components/facturas-gestion/facturas-gestion.component';
import { DetalleLiquidizacionesPlanEmpresarialComponent } from './components/detalle-liquidaciones-pe/detalle-liquidaciones-pe.component';

import { OrdenesPlanEmpresarialService } from './services/ordenes-plan-empresarial.service';
import { FacturasPlanEmpresarialService } from './services/facturas-plan-empresarial.service';
import { FacturaPE, DetalleLiquidacionPE } from './models/facturas-plan-empresarial.models';

@Component({
  selector: 'app-plan-empresarial-con',
  standalone: true,
  imports: [
    CommonModule,
    OrdenesPlanEmpresarialSimpleComponent,
    FacturasGestionComponent,
    DetalleLiquidizacionesPlanEmpresarialComponent
  ],
  template: `
    <div class="w-full min-h-screen bg-gray-50 dark:bg-gray-900">
      <div class="w-full mx-auto space-y-4 p-4">
        
        <!-- Header -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div class="flex justify-between items-center">
            <div>
              <h1 class="text-xl font-bold text-gray-900 dark:text-white">Plan Empresarial</h1>
              <p class="text-sm text-gray-600 dark:text-gray-300">Gestión completa de órdenes, facturas y liquidaciones</p>
            </div>
            <div class="flex items-center space-x-4">
              
              <!-- Resumen de Órdenes -->
              <div class="text-right">
                <div class="text-sm text-gray-500 dark:text-gray-400">Total Órdenes</div>
                <div class="text-lg font-semibold text-gray-900 dark:text-white">{{ resumenOrdenes().totalOrdenes }}</div>
              </div>
              <div class="text-right">
                <div class="text-sm text-gray-500 dark:text-gray-400">Con Anticipos Pendientes</div>
                <div class="text-lg font-semibold text-red-600 dark:text-red-400">{{ resumenOrdenes().ordenesConPendientes }}</div>
              </div>

              <!-- Separador -->
              <div class="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>

              <!-- Resumen de Facturas -->
              <div class="text-right">
                <div class="text-sm text-gray-500 dark:text-gray-400">Factura Actual</div>
                <div class="text-lg font-semibold" [ngClass]="facturaActual() ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'">
                  {{ facturaActual()?.numero_dte || 'Ninguna' }}
                </div>
              </div>

              <!-- Resumen de Liquidaciones -->
              <div *ngIf="facturaActual()" class="text-right">
                <div class="text-sm text-gray-500 dark:text-gray-400">Detalles Liquidación</div>
                <div class="text-lg font-semibold" [ngClass]="obtenerClaseEstadoLiquidacion()">
                  {{ resumenLiquidaciones().cantidad }} / Q{{ resumenLiquidaciones().total | number:'1.2-2' }}
                </div>
              </div>

              <!-- Botón refrescar todo -->
              <button 
                (click)="refrescarTodo()"
                [disabled]="estaOcupado()"
                class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                title="Refrescar todos los datos">
                <svg class="w-4 h-4 mr-2" [class.animate-spin]="estaOcupado()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {{ estaOcupado() ? 'Cargando...' : 'Refrescar' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Contenido Principal -->
        <div class="space-y-4">
          
          <!-- Primera fila: Órdenes y Facturas -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            <!-- Panel de Órdenes -->
            <div class="lg:col-span-1">
              <app-ordenes-plan-empresarial-simple></app-ordenes-plan-empresarial-simple>
            </div>

            <!-- Panel de Facturas -->
            <div class="lg:col-span-1">
              <app-facturas-gestion></app-facturas-gestion>
            </div>

          </div>

          <!-- Segunda fila: Liquidaciones (solo cuando hay factura) -->
          <div *ngIf="mostrarPanelLiquidaciones()" class="w-full">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div class="p-2 bg-blue-50 dark:bg-blue-900 rounded-lg">
                    <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Liquidación de Factura</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-300">
                      {{ facturaActual()?.numero_dte }} - {{ facturaActual()?.nombre_emisor }}
                    </p>
                  </div>
                </div>
                
                <!-- Indicadores de estado -->
                <div class="flex items-center space-x-4">
                  <div class="text-right">
                    <div class="text-sm text-gray-500 dark:text-gray-400">Estado</div>
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" 
                          [ngClass]="obtenerClaseEstadoFactura()">
                      {{ facturaActual()?.estado_liquidacion }}
                    </span>
                  </div>
                  
                  <div class="text-right">
                    <div class="text-sm text-gray-500 dark:text-gray-400">Progreso</div>
                    <div class="text-sm font-medium" [ngClass]="obtenerClaseProgreso()">
                      Q{{ resumenLiquidaciones().total | number:'1.2-2' }} / Q{{ facturaActual()?.monto_total | number:'1.2-2' }}
                    </div>
                  </div>

                  <!-- Botón colapsar -->
                  <button 
                    (click)="togglePanelLiquidaciones()"
                    class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Contraer panel">
                    <svg class="w-5 h-5 transform transition-transform" [class.rotate-180]="!panelLiquidacionesExpandido()" 
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Componente de liquidaciones -->
            <div *ngIf="panelLiquidacionesExpandido()">
              <app-detalle-liquidizaciones-pe></app-detalle-liquidizaciones-pe>
            </div>
          </div>

          <!-- Placeholder cuando no hay factura -->
          <div *ngIf="!mostrarPanelLiquidaciones()" class="w-full">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
              <div class="flex flex-col items-center justify-center">
                <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-4">
                  <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Gestión de Liquidaciones</h3>
                <p class="text-sm text-gray-600 dark:text-gray-300 max-w-md mb-4">
                  Selecciona o busca una factura en el panel superior para comenzar a gestionar sus detalles de liquidación
                </p>
                <div class="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-xs font-medium rounded-full">
                  💡 Busca una factura para comenzar
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Footer informativo -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div class="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
            <span>
              Última actualización: {{ fechaUltimaActualizacion() | date:'dd/MM/yyyy HH:mm' }}
            </span>
            <div class="flex items-center space-x-4">
              <span>Sistema integrado: Órdenes + Facturas + Liquidaciones</span>
              <span class="flex items-center space-x-1">
                <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Activo</span>
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class PlanEmpresarialConComponent implements OnInit, OnDestroy {

  private readonly ordenesService = inject(OrdenesPlanEmpresarialService);
  private readonly facturasService = inject(FacturasPlanEmpresarialService);
  private readonly destroy$ = new Subject<void>();

  // ============================================================================
  // ESTADO DEL CONTENEDOR
  // ============================================================================

  readonly fechaUltimaActualizacion = signal<Date>(new Date());
  readonly facturaActual = signal<FacturaPE | null>(null);
  readonly detallesLiquidacion = signal<DetalleLiquidacionPE[]>([]);
  readonly panelLiquidacionesExpandido = signal<boolean>(true);

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
    // Suscribirse a cambios en la factura actual
    this.facturasService.facturaActual$
      .pipe(takeUntil(this.destroy$))
      .subscribe(factura => {
        this.facturaActual.set(factura);
        // Auto-expandir panel cuando se carga una factura
        if (factura && !this.panelLiquidacionesExpandido()) {
          this.panelLiquidacionesExpandido.set(true);
        }
        this.actualizarFechaActualizacion();
      });

    // Suscribirse a cambios en detalles de liquidación
    this.facturasService.detallesLiquidacion$
      .pipe(takeUntil(this.destroy$))
      .subscribe(detalles => {
        this.detallesLiquidacion.set(detalles);
        this.actualizarFechaActualizacion();
      });

    // Suscribirse a cambios en órdenes para actualizar fecha
    this.ordenesService.cargando$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cargando => {
        if (!cargando) {
          this.actualizarFechaActualizacion();
        }
      });
  }

  private cargarDatosIniciales(): void {
    // Cargar órdenes
    this.ordenesService.cargarOrdenes().subscribe();

    // Cargar catálogos de facturas
    this.facturasService.cargarCatalogos().subscribe();
  }

  private actualizarFechaActualizacion(): void {
    this.fechaUltimaActualizacion.set(new Date());
  }

  // ============================================================================
  // ACCIONES DEL CONTENEDOR
  // ============================================================================

  /**
   * Refrescar todos los datos del módulo
   */
  refrescarTodo(): void {
    Promise.all([
      this.ordenesService.refrescarDatos().toPromise(),
      this.facturasService.cargarCatalogos().toPromise()
    ]).then(() => {
      // Recargar detalles si hay factura actual
      const factura = this.facturaActual();
      if (factura) {
        this.facturasService.cargarDetallesLiquidacion(factura.numero_dte).subscribe();
      }
      this.actualizarFechaActualizacion();
    });
  }

  /**
   * Obtener resumen de órdenes para mostrar en el header
   */
  resumenOrdenes(): { totalOrdenes: number; ordenesConPendientes: number } {
    return this.ordenesService.obtenerResumen();
  }

  /**
   * Obtener resumen de liquidaciones
   */
  resumenLiquidaciones(): { cantidad: number; total: number; estado: 'completo' | 'incompleto' | 'excedido' } {
    const detalles = this.detallesLiquidacion();
    const factura = this.facturaActual();

    const cantidad = detalles.length;
    const total = detalles.reduce((sum, d) => sum + d.monto, 0);

    let estado: 'completo' | 'incompleto' | 'excedido' = 'incompleto';
    if (factura) {
      const diferencia = Math.abs(total - factura.monto_total);
      if (diferencia < 0.01) estado = 'completo';
      else if (total > factura.monto_total) estado = 'excedido';
    }

    return { cantidad, total, estado };
  }

  /**
   * Verificar si algún servicio está ocupado
   */
  estaOcupado(): boolean {
    return this.ordenesService.estaOcupado() || this.facturasService.estaOcupado();
  }

  /**
   * Determinar si mostrar el panel de liquidaciones
   */
  mostrarPanelLiquidaciones(): boolean {
    return this.facturaActual() !== null;
  }

  /**
   * Toggle del panel de liquidaciones
   */
  togglePanelLiquidaciones(): void {
    this.panelLiquidacionesExpandido.set(!this.panelLiquidacionesExpandido());
  }

  // ============================================================================
  // MÉTODOS DE ESTILO Y UI
  // ============================================================================

  /**
   * Obtener clase CSS para el estado de liquidación
   */
  obtenerClaseEstadoLiquidacion(): string {
    const resumen = this.resumenLiquidaciones();
    const baseClasses = 'text-lg font-semibold';

    switch (resumen.estado) {
      case 'completo':
        return `${baseClasses} text-green-600 dark:text-green-400`;
      case 'excedido':
        return `${baseClasses} text-red-600 dark:text-red-400`;
      default:
        return `${baseClasses} text-yellow-600 dark:text-yellow-400`;
    }
  }

  /**
   * Obtener clase CSS para el estado de la factura
   */
  obtenerClaseEstadoFactura(): string {
    const estado = this.facturaActual()?.estado_liquidacion;

    switch (estado) {
      case 'Liquidado':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'En Revisión':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    }
  }

  /**
   * Obtener clase CSS para el progreso
   */
  obtenerClaseProgreso(): string {
    const resumen = this.resumenLiquidaciones();

    switch (resumen.estado) {
      case 'completo':
        return 'text-green-600 dark:text-green-400';
      case 'excedido':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-900 dark:text-gray-100';
    }
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS PARA CONTROL EXTERNO (MANTENIDOS DEL ORIGINAL)
  // ============================================================================

  /**
   * Limpiar todo el estado del módulo
   */
  limpiarEstado(): void {
    this.ordenesService.limpiarEstado();
    this.facturasService.limpiarEstado();
    this.panelLiquidacionesExpandido.set(true);
  }

  /**
   * Obtener información de estado completa para debugging
   */
  obtenerEstadoCompleto(): {
    ordenes: {
      total: number;
      cargando: boolean;
      ultimaActualizacion: Date;
    };
    facturas: {
      facturaActual: FacturaPE | null;
      detallesCount: number;
      cargando: boolean;
    };
    liquidaciones: {
      cantidad: number;
      total: number;
      estado: string;
      panelExpandido: boolean;
    };
    contenedor: {
      ultimaActualizacion: Date;
      ocupado: boolean;
    };
  } {
    const resumenLiq = this.resumenLiquidaciones();

    return {
      ordenes: {
        total: this.ordenesService.obtenerOrdenesActuales().length,
        cargando: this.ordenesService.estaOcupado(),
        ultimaActualizacion: this.fechaUltimaActualizacion()
      },
      facturas: {
        facturaActual: this.facturasService.obtenerFacturaActual(),
        detallesCount: this.facturasService.obtenerDetallesActuales().length,
        cargando: this.facturasService.estaOcupado()
      },
      liquidaciones: {
        cantidad: resumenLiq.cantidad,
        total: resumenLiq.total,
        estado: resumenLiq.estado,
        panelExpandido: this.panelLiquidacionesExpandido()
      },
      contenedor: {
        ultimaActualizacion: this.fechaUltimaActualizacion(),
        ocupado: this.estaOcupado()
      }
    };
  }

  /**
   * Buscar factura desde el contenedor (para integración externa)
   */
  buscarFactura(numeroDte: string): void {
    this.facturasService.buscarFactura(numeroDte).subscribe();
  }

  /**
   * Obtener información de la factura actual
   */
  obtenerInfoFacturaActual(): {
    existe: boolean;
    numero: string | null;
    estado: string | null;
    monto: number;
    detalles: number;
    liquidacionCompleta: boolean;
  } {
    const factura = this.facturaActual();
    const resumen = this.resumenLiquidaciones();

    return {
      existe: !!factura,
      numero: factura?.numero_dte || null,
      estado: factura?.estado_liquidacion || null,
      monto: factura?.monto_total || 0,
      detalles: this.facturasService.obtenerDetallesActuales().length,
      liquidacionCompleta: resumen.estado === 'completo'
    };
  }

  /**
   * Verificar si hay una factura cargada
   */
  tieneFacturaCargada(): boolean {
    return this.facturaActual() !== null;
  }

  /**
   * Validar consistencia de datos entre servicios
   */
  validarConsistencia(): {
    ordenesOk: boolean;
    facturasOk: boolean;
    liquidacionesOk: boolean;
    catalogosOk: boolean;
    mensaje: string;
  } {
    const ordenes = this.ordenesService.obtenerOrdenesActuales();
    const factura = this.facturasService.obtenerFacturaActual();
    const detalles = this.facturasService.obtenerDetallesActuales();
    const resumen = this.resumenLiquidaciones();

    const ordenesOk = ordenes.length >= 0;
    const facturasOk = !factura || (Boolean(factura.numero_dte) && factura.monto_total > 0);
    const liquidacionesOk = !factura || detalles.length >= 0;
    const catalogosOk = true;

    let mensaje = 'Todo en orden';
    if (!ordenesOk) mensaje = 'Error en carga de órdenes';
    else if (!facturasOk) mensaje = 'Error en datos de factura';
    else if (!liquidacionesOk) mensaje = 'Error en liquidaciones';
    else if (!catalogosOk) mensaje = 'Error en catálogos';
    else if (factura && resumen.estado === 'excedido') mensaje = 'Liquidación excede monto de factura';

    return {
      ordenesOk,
      facturasOk,
      liquidacionesOk,
      catalogosOk,
      mensaje
    };
  }

  /**
   * Exportar datos para reportes o debugging
   */
  exportarDatos(): {
    timestamp: string;
    ordenes: any[];
    factura: FacturaPE | null;
    detalles: DetalleLiquidacionPE[];
    resumen: any;
  } {
    return {
      timestamp: new Date().toISOString(),
      ordenes: this.ordenesService.obtenerOrdenesActuales(),
      factura: this.facturasService.obtenerFacturaActual(),
      detalles: this.facturasService.obtenerDetallesActuales(),
      resumen: {
        totalOrdenes: this.resumenOrdenes().totalOrdenes,
        ordenesConPendientes: this.resumenOrdenes().ordenesConPendientes,
        facturaActual: this.obtenerInfoFacturaActual(),
        liquidaciones: this.resumenLiquidaciones(),
        estadoSistema: this.validarConsistencia()
      }
    };
  }

  /**
   * Método de utilidad para logging y debugging
   */
  logEstado(contexto: string = 'General'): void {
    console.group(`🏢 Plan Empresarial - ${contexto}`);
    console.log('📊 Estado completo:', this.obtenerEstadoCompleto());
    console.log('📋 Resumen:', this.exportarDatos().resumen);
    console.log('✅ Validación:', this.validarConsistencia());
    console.groupEnd();
  }
}