// ============================================================================
// COMPONENTE CONTENEDOR - CORREGIDO PARA FUNCIONAR CON EL BACKEND
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, combineLatest, map } from 'rxjs';

import { OrdenesPlanEmpresarialComponent } from '../liquidacion-plan-empresarial/components/ordenes-plan-empresarial/ordenes-plan-empresarial.component';
import { DetalleFacturaPEComponent } from '../facturas-plan-empresarial/components/detalle-factura/detalle-factura.component';
import { DetalleLiquidizacionesPlanEmpresarialComponent } from '../detalle-liquidaciones-plan-empresarial/components/detalle-liquidaciones-plan-empresarial/detalle-liquidaciones-plan-empresarial.component';
import { PlanEmpresarialContainerFacade } from './plan-empresarial-container.facade';

// USAR MODELO UNIFICADO
import { FacturaPE, OrdenPlanEmpresarial, DetalleLiquidacionPE } from './shared/models/plan-empresarial.models';

@Component({
  selector: 'app-plan-empresarial-container',
  standalone: true,
  imports: [
    CommonModule,
    OrdenesPlanEmpresarialComponent,
    DetalleFacturaPEComponent,
    DetalleLiquidizacionesPlanEmpresarialComponent
  ],
  templateUrl: './plan-empresarial-container.component.html'
})
export class PlanEmpresarialContainerComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);

  // Streams del facade unificado
  readonly ordenes$: Observable<OrdenPlanEmpresarial[]>;
  readonly cargandoOrdenes$: Observable<boolean>;

  readonly factura$: Observable<FacturaPE | null>;
  readonly loadingFactura$: Observable<boolean>;

  readonly detallesLiquidacion$: Observable<DetalleLiquidacionPE[]>;
  readonly loadingDetalles$: Observable<boolean>;
  readonly savingDetalles$: Observable<boolean>;

  readonly agencias$: Observable<any[]>;
  readonly tiposPago$: Observable<any[]>;
  readonly total$: Observable<number>;

  // Estado para sincronizar búsqueda entre componentes
  currentSearchText: string = '';

  // ✅ VARIABLES LOCALES PARA ACCESO SINCRÓNICO
  private facturaActualValue: FacturaPE | null = null;
  private detallesActualesValue: DetalleLiquidacionPE[] = [];

  // Estado derivado para liquidaciones (solo datos necesarios para la tabla)
  readonly datosLiquidacion$: Observable<{
    factura: FacturaPE | null;
    detalles: DetalleLiquidacionPE[];
    agencias: any[];
    tiposPago: any[];
    total: number;
    isLoading: boolean;
    isSaving: boolean;
    habilitarAcciones: boolean;
    estadoMonto: 'completo' | 'incompleto' | 'excedido';
  }>;

  constructor(private facade: PlanEmpresarialContainerFacade) {
    // Inicializar todos los streams
    this.ordenes$ = this.facade.ordenes$;
    this.cargandoOrdenes$ = this.facade.cargandoOrdenes$;

    this.factura$ = this.facade.factura$;
    this.loadingFactura$ = this.facade.loadingFactura$;

    this.detallesLiquidacion$ = this.facade.detallesLiquidacion$;
    this.loadingDetalles$ = this.facade.loadingDetalles$;
    this.savingDetalles$ = this.facade.savingDetalles$;

    this.agencias$ = this.facade.agencias$;
    this.tiposPago$ = this.facade.tiposPago$;
    this.total$ = this.facade.total$;

    // ✅ SUSCRIBIRSE A CAMBIOS PARA MANTENER VALORES LOCALES
    this.factura$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(factura => {
      this.facturaActualValue = factura;
      console.log('📋 Factura actualizada en contenedor:', factura?.numero_dte || 'ninguna');
    });

    this.detallesLiquidacion$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(detalles => {
      this.detallesActualesValue = detalles;
      console.log('📋 Detalles actualizados en contenedor:', detalles.length, 'registros');
    });

    // Combinar streams para datos de liquidación
    this.datosLiquidacion$ = combineLatest([
      this.factura$,
      this.detallesLiquidacion$,
      this.agencias$,
      this.tiposPago$,
      this.total$,
      this.loadingDetalles$,
      this.savingDetalles$
    ]).pipe(
      map(([factura, detalles, agencias, tiposPago, total, loading, saving]) => {
        const habilitarAcciones = !!factura && factura.estado_id !== 2; // 2 = Liquidado

        let estadoMonto: 'completo' | 'incompleto' | 'excedido' = 'incompleto';
        if (factura && total > 0) {
          const diff = Math.abs(total - factura.monto_total);
          if (diff < 0.01) estadoMonto = 'completo';
          else if (total > factura.monto_total) estadoMonto = 'excedido';
        }

        return {
          factura,
          detalles,
          agencias,
          tiposPago,
          total,
          isLoading: loading,
          isSaving: saving,
          habilitarAcciones,
          estadoMonto
        };
      })
    );
  }

  ngOnInit(): void {
    console.log('🚀 Contenedor principal inicializado');

    // ✅ Cargar catálogos y órdenes al inicializar
    this.facade.cargarCatalogos();
    this.facade.cargarOrdenes();
  }

  ngOnDestroy(): void {
    console.log('🧹 Contenedor principal destruido');
    // Limpieza automática con takeUntilDestroyed
  }

  // ============================================================================
  // EVENTOS DESDE EL COMPONENTE DE FACTURAS - ✅ SIMPLIFICADOS
  // ============================================================================

  onFacturaBuscada(numeroDte: string): void {
    console.log('🔍 Factura buscada desde contenedor:', numeroDte);
    this.currentSearchText = numeroDte;

    // ✅ Solo una llamada al facade - él maneja todo
    this.facade.buscarFactura(numeroDte);
  }

  onSearchTextChanged(searchText: string): void {
    console.log('📝 Texto de búsqueda cambiado:', searchText);
    this.currentSearchText = searchText;
  }

  onLiquidarFactura(): void {
    console.log('✅ Liquidar factura solicitado desde contenedor');
    const facturaActual = this.facturaActual;

    if (facturaActual) {
      console.log('💰 Procesando liquidación para factura:', facturaActual.numero_dte);
      // Aquí puedes agregar lógica adicional para el proceso de liquidación
      // Por ejemplo, validaciones, confirmaciones, etc.
    } else {
      console.log('⚠️ No hay factura para liquidar');
    }
  }

  // ============================================================================
  // EVENTOS PARA LA TABLA DE LIQUIDACIONES - ✅ CORREGIDOS PARA EL BACKEND
  // ============================================================================

  onAgregarDetalle(): void {
    console.log('➕ Solicitando agregar detalle desde contenedor');

    // ✅ CAMBIO: No hacer nada aquí - el componente maneja la creación directamente
    // El facade no necesita agregar detalles temporales porque el backend lo maneja
    // El modal se encargará de crear el detalle cuando se guarde
  }

  onEditarDetalle(index: number): void {
    console.log('✏️ Editando detalle en índice:', index, 'desde contenedor');

    // Validar índice
    if (index < 0 || index >= this.detallesActuales.length) {
      console.warn('⚠️ Índice de edición inválido:', index);
      return;
    }

    const detalle = this.detallesActuales[index];
    console.log('📝 Detalle a editar:', detalle);

    // El modal es manejado dentro del componente de liquidaciones
    // No necesita lógica adicional aquí
  }

  onEliminarDetalle(index: number): void {
    console.log('🗑️ Eliminando detalle en índice:', index, 'desde contenedor');

    // Validar índice
    if (index < 0 || index >= this.detallesActuales.length) {
      console.warn('⚠️ Índice de eliminación inválido:', index);
      return;
    }

    const detalle = this.detallesActuales[index];
    console.log('🗑️ Detalle a eliminar:', detalle);

    // ✅ El facade maneja la eliminación (local o servidor)
    this.facade.eliminarDetalle(index);

    // Log del estado después del cambio
    setTimeout(() => {
      console.log('📊 Total detalles después de eliminar:', this.detallesActuales.length);
    }, 100);
  }

  onCopiarDetalle(index: number): void {
    console.log('📋 Copiando detalle en índice:', index, 'desde contenedor');

    // Validar índice
    if (index < 0 || index >= this.detallesActuales.length) {
      console.warn('⚠️ Índice de copia inválido:', index);
      return;
    }

    const detalleOriginal = this.detallesActuales[index];
    console.log('📋 Detalle a copiar:', detalleOriginal);

    // ✅ El facade maneja la copia (usa endpoint del backend)
    this.facade.copiarDetalle(index);
  }

  onGuardarTodo(): void {
    console.log('💾 Guardando todos los detalles desde contenedor');

    const totalDetalles = this.detallesActuales.length;
    if (totalDetalles === 0) {
      console.log('⚠️ No hay detalles para guardar');
      return;
    }

    console.log('💾 Iniciando guardado de', totalDetalles, 'detalles');

    this.facade.guardarTodosLosDetalles().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (success) => {
        if (success) {
          console.log('✅ Todos los detalles guardados exitosamente');
        } else {
          console.log('❌ Error al guardar algunos detalles');
        }
      },
      error: (error) => {
        console.error('❌ Error en el guardado masivo:', error);
      }
    });
  }

  onCambiarFormaPago(event: { index: number; tipo: string }): void {
    console.log('💳 Cambiando forma de pago desde contenedor:', event);

    // Validar índice
    if (event.index < 0 || event.index >= this.detallesActuales.length) {
      console.warn('⚠️ Índice de cambio de forma de pago inválido:', event.index);
      return;
    }

    // ✅ El facade maneja el cambio
    this.facade.cambiarFormaPago(event.index, event.tipo);

    console.log('💳 Forma de pago actualizada a:', event.tipo);
  }

  // ✅ NUEVO MÉTODO PARA RECARGAR DETALLES DESDE EL COMPONENTE
  onCargarDetalles(): void {
    console.log('🔄 Solicitando recarga de detalles desde contenedor');

    // ✅ Usar método específico del facade para recargar
    this.facade.recargarDetalles();

    console.log('🔄 Recarga de detalles iniciada...');
  }

  // ============================================================================
  // ACCIONES ADICIONALES
  // ============================================================================

  onLimpiarDatos(): void {
    console.log('🧹 Limpiando datos desde contenedor');

    this.currentSearchText = '';
    this.facade.limpiarDatos();

    console.log('🧹 Datos limpiados completamente');
  }

  onRefrescarOrdenes(): void {
    console.log('🔄 Refrescando órdenes desde contenedor');

    this.facade.cargarOrdenes();

    // Log opcional del resultado
    this.ordenes$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(ordenes => {
      console.log('🔄 Órdenes refrescadas:', ordenes.length, 'encontradas');
    });
  }

  onRefrescarCatalogos(): void {
    console.log('🔄 Refrescando catálogos desde contenedor');

    this.facade.cargarCatalogos();

    console.log('🔄 Catálogos refrescándose...');
  }

  // ============================================================================
  // GETTERS PÚBLICOS - ✅ CORREGIDOS
  // ============================================================================

  /**
   * Obtiene la factura actual de forma síncrona
   */
  get facturaActual(): FacturaPE | null {
    return this.facturaActualValue;
  }

  /**
   * Obtiene los detalles actuales de forma síncrona
   */
  get detallesActuales(): DetalleLiquidacionPE[] {
    return this.detallesActualesValue;
  }

  /**
   * Verifica si hay una factura cargada
   */
  get tieneFacturaCargada(): boolean {
    return this.facturaActualValue !== null;
  }

  /**
   * Obtiene el total actual calculado de forma síncrona
   */
  get totalActual(): number {
    return this.detallesActualesValue.reduce((sum, detalle) => sum + (detalle.monto || 0), 0);
  }

  /**
   * Verifica si se pueden realizar acciones sobre los detalles
   */
  get puedeEditarDetalles(): boolean {
    return this.tieneFacturaCargada && (this.facturaActual?.estado_id !== 2); // 2 = Liquidado
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS ADICIONALES
  // ============================================================================

  /**
   * Obtener factura actual de forma reactiva
   */
  obtenerFacturaActual(): Observable<FacturaPE | null> {
    return this.facade.factura$;
  }

  /**
   * Obtener detalles actuales de forma reactiva
   */
  obtenerDetallesActuales(): Observable<DetalleLiquidacionPE[]> {
    return this.facade.detallesLiquidacion$;
  }

  /**
   * Obtener información del estado de la factura
   */
  obtenerInfoEstadoFactura(): { texto: string; color: string; puedeEditar: boolean } {
    const factura = this.facturaActual;

    if (!factura) {
      return { texto: 'Sin factura', color: 'gray', puedeEditar: false };
    }

    switch (factura.estado_liquidacion) {
      case 'Liquidado':
        return { texto: 'Liquidado', color: 'green', puedeEditar: false };
      case 'En Revisión':
        return { texto: 'En Revisión', color: 'yellow', puedeEditar: true };
      case 'Pendiente':
      default:
        return { texto: 'Pendiente', color: 'blue', puedeEditar: true };
    }
  }

  /**
   * Obtener resumen de los detalles
   */
  obtenerResumenDetalles(): {
    total: number;
    cantidad: number;
    completos: number;
    incompletos: number;
    conId: number;
    sinId: number;
  } {
    const detalles = this.detallesActuales;

    return {
      total: this.totalActual,
      cantidad: detalles.length,
      completos: detalles.filter(d => d.numero_orden && d.agencia && d.descripcion && d.monto > 0).length,
      incompletos: detalles.filter(d => !d.numero_orden || !d.agencia || !d.descripcion || d.monto <= 0).length,
      conId: detalles.filter(d => d.id).length,
      sinId: detalles.filter(d => !d.id).length
    };
  }

  /**
   * Información de estado para debugging
   */
  get infoEstado() {
    const resumen = this.obtenerResumenDetalles();
    const infoFactura = this.obtenerInfoEstadoFactura();

    return {
      factura: {
        existe: this.tieneFacturaCargada,
        numero: this.facturaActual?.numero_dte || 'ninguna',
        estado: infoFactura.texto,
        monto: this.facturaActual?.monto_total || 0
      },
      detalles: resumen,
      ui: {
        searchText: this.currentSearchText,
        puedeEditar: this.puedeEditarDetalles
      },
      facade: {
        cacheActivo: !!this.facade.getFacturaActual(),
        totalEnCache: this.facade.getTotalActual()
      }
    };
  }

  /**
   * Método para forzar recarga completa (útil para debugging)
   */
  forzarRecarga(): void {
    console.log('🔄 Forzando recarga completa...');

    // Limpiar estado
    this.facade.limpiarDatos();

    // Recargar catálogos
    this.facade.cargarCatalogos();
    this.facade.cargarOrdenes();

    // Si había una factura buscada, volver a buscarla
    if (this.currentSearchText) {
      setTimeout(() => {
        this.facade.buscarFactura(this.currentSearchText);
      }, 1000);
    }

    console.log('🔄 Recarga completa iniciada');
  }

  // ============================================================================
  // MÉTODOS PARA DEBUGGING Y MONITOREO
  // ============================================================================

  /**
   * Obtener estado completo para debugging
   */
  obtenerEstadoCompleto(): any {
    return {
      contenedor: this.infoEstado,
      facade: {
        ordenes: this.facade.getOrdenesActuales().length,
        factura: this.facade.getFacturaActual()?.numero_dte || null,
        detalles: this.facade.getDetallesActuales().length,
        total: this.facade.getTotalActual()
      },
      streams: {
        cargandoOrdenes: this.facade.cargandoOrdenes$,
        loadingFactura: this.facade.loadingFactura$,
        loadingDetalles: this.facade.loadingDetalles$,
        savingDetalles: this.facade.savingDetalles$
      }
    };
  }

  /**
   * Validar consistencia entre facade y componente
   */
  validarConsistencia(): boolean {
    const factureFacade = this.facade.getFacturaActual();
    const detallesFacade = this.facade.getDetallesActuales();
    const totalFacade = this.facade.getTotalActual();

    const facturaConsistente = this.facturaActual === factureFacade;
    const detallesConsistentes = this.detallesActuales.length === detallesFacade.length;
    const totalConsistente = Math.abs(this.totalActual - totalFacade) < 0.01;

    const consistente = facturaConsistente && detallesConsistentes && totalConsistente;

    if (!consistente) {
      console.warn('⚠️ Inconsistencia detectada:', {
        facturaConsistente,
        detallesConsistentes,
        totalConsistente,
        contenedor: {
          factura: this.facturaActual?.numero_dte,
          detalles: this.detallesActuales.length,
          total: this.totalActual
        },
        facade: {
          factura: factureFacade?.numero_dte,
          detalles: detallesFacade.length,
          total: totalFacade
        }
      });
    }

    return consistente;
  }
}