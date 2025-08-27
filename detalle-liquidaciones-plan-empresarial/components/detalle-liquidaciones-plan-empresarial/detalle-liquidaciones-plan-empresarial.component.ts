import { CommonModule } from '@angular/common';
import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { Subject, takeUntil, combineLatest, map } from 'rxjs';

import { TablaDetalleLiquidizacionComponent } from '../tabla-detalle-liquidacion/tabla-detalle-liquidacion.component';
import { ModalDetalleLiquidizacionComponent } from '../modal-detalle-liquidacion/modal-detalle-liquidacion.component';
import { ModalConfirmarEliminacionComponent } from '../modal-confirmar-eliminacion/modal-confirmar-eliminacion.component';
import { ResumenLiquidacionComponent } from '../resumen-liquidacion/resumen-liquidacion.component';

import { PlanEmpresarialContainerFacade } from '../../../plan-empresarial-container/plan-empresarial-container.facade';
import { ServicioGeneralService } from '../../../../servicios/servicio-general.service';
import { FacturaPE, DetalleLiquidacionPE } from '../../../plan-empresarial-container/shared/models/plan-empresarial.models';

@Component({
  selector: 'app-detalle-liquidizaciones-pe',
  standalone: true,
  imports: [
    CommonModule,
    TablaDetalleLiquidizacionComponent,
    ModalDetalleLiquidizacionComponent,
    ModalConfirmarEliminacionComponent,
    ResumenLiquidacionComponent
  ],
  template: `
    <section class="w-full space-y-4 mt-2">
      <!-- Tabla de liquidaciones - Sin props, interacción directa con facade -->
      <app-tabla-detalle-liquidizacion
        (mostrarModal)="abrirModal()"
        (editarDetalle)="abrirModalEditar($event)">
      </app-tabla-detalle-liquidizacion>

      <!-- Resumen -->
      <app-resumen-liquidacion 
        *ngIf="datosResumen$ | async as datos"
        [count]="datos.cantidad" 
        [total]="datos.total" 
        [montoFactura]="datos.montoFactura"
        [estadoMonto]="datos.estadoMonto">
      </app-resumen-liquidacion>

      <!-- Modal agregar/editar detalle - Sin props agencias y tiposPago -->
      <app-modal-detalle-liquidizacion 
        *ngIf="mostrarModalDetalle()" 
        [visible]="mostrarModalDetalle()"
        [modo]="modoModal()" 
        [registro]="registroEnEdicion">
      </app-modal-detalle-liquidizacion>

      <!-- Modal confirmar eliminación -->
      <app-modal-confirmar-eliminacion 
        *ngIf="mostrarModalEliminar()" 
        [titulo]="'Confirmar eliminación'"
        [mensaje]="'¿Está seguro(a) de eliminar este detalle? Esta acción no se puede deshacer.'"
        (confirmar)="confirmarEliminacion()" 
        (cancelar)="cancelarEliminacion()">
      </app-modal-confirmar-eliminacion>

      <!-- Indicadores de estado -->
      <div *ngIf="loadingDetalles$ | async" class="fixed inset-0 bg-black/20 flex items-center justify-center z-40">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
          <div class="flex items-center space-x-3">
            <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-gray-700 dark:text-gray-200">Cargando datos...</span>
          </div>
        </div>
      </div>

      <div *ngIf="savingDetalles$ | async"
        class="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50">
        <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <span class="text-sm">Guardando cambios...</span>
      </div>
    </section>
  `,
})
export class DetalleLiquidizacionesPlanEmpresarialComponent implements OnInit, OnDestroy {
  // INYECCIÓN DEL FACADE - COORDINACIÓN DIRECTA
  private facade = inject(PlanEmpresarialContainerFacade);
  private servicio = inject(ServicioGeneralService);

  // === ESTADO LOCAL PARA MODALES ===
  mostrarModalDetalle = signal(false);
  modoModal = signal<'crear' | 'editar'>('crear');
  registroEnEdicion: DetalleLiquidacionPE | null = null;
  indexEnEdicion: number | null = null;

  mostrarModalEliminar = signal(false);
  indexAEliminar: number | null = null;

  // === STREAMS DIRECTOS DEL FACADE ===
  factura$ = this.facade.factura$;
  detalles$ = this.facade.detallesLiquidacion$;
  total$ = this.facade.total$;
  loadingDetalles$ = this.facade.loadingDetalles$;
  savingDetalles$ = this.facade.savingDetalles$;

  // DATOS CALCULADOS PARA EL RESUMEN
  datosResumen$ = combineLatest([
    this.factura$,
    this.detalles$,
    this.total$
  ]).pipe(
    map(([factura, detalles, total]) => ({
      cantidad: detalles.length,
      total,
      montoFactura: factura?.monto_total || 0,
      estadoMonto: this.calcularEstadoMonto(factura, total)
    }))
  );

  private destroy$ = new Subject<void>();

  ngOnInit() {
    // Los componentes hijos manejan su propia interacción con el facade
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // COORDINACIÓN DE MODALES
  // ============================================================================

  abrirModal() {
    const factura = this.facade.getFacturaActual();
    if (!factura?.numero_dte) {
      this.servicio.mensajeServidor('error', 'No hay factura seleccionada para agregar detalles', 'Error');
      return;
    }
    this.registroEnEdicion = this.crearDetalleVacio();
    this.indexEnEdicion = null;
    this.modoModal.set('crear');
    this.mostrarModalDetalle.set(true);
  }

  abrirModalEditar(index: number) {
    const detalles = this.facade.getDetallesActuales();
    if (index < 0 || index >= detalles.length) return;

    const detalleAEditar = detalles[index];
    this.indexEnEdicion = index;
    this.registroEnEdicion = detalleAEditar ? { ...detalleAEditar } : null;
    this.modoModal.set('editar');
    this.mostrarModalDetalle.set(true);
  }

  // ============================================================================
  // ELIMINACIÓN
  // ============================================================================

  confirmarEliminacion() {
    if (this.indexAEliminar !== null) {
      this.facade.eliminarDetalle(this.indexAEliminar);
      this.cancelarEliminacion();
    }
  }

  cancelarEliminacion() {
    this.indexAEliminar = null;
    this.mostrarModalEliminar.set(false);
  }

  // ============================================================================
  // UTILIDADES PRIVADAS
  // ============================================================================

  private crearDetalleVacio(): DetalleLiquidacionPE {
    return {
      id: undefined,
      numero_orden: '',
      agencia: '',
      descripcion: '',
      monto: 0,
      correo_proveedor: '',
      forma_pago: 'deposito',
      banco: '',
      cuenta: '',
      informacion_adicional: null
    };
  }

  private calcularEstadoMonto(factura: FacturaPE | null, total: number): 'completo' | 'incompleto' | 'excedido' {
    if (!factura || total <= 0) return 'incompleto';
    const diff = Math.abs(total - factura.monto_total);
    if (diff < 0.01) return 'completo';
    if (total > factura.monto_total) return 'excedido';
    return 'incompleto';
  }
}