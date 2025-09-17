// ============================================================================
// COMPONENTE PRINCIPAL ACTUALIZADO CON SELECCIÓN MASIVA
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { LiquidacionService } from '../../services/liquidacion-verificacion.service';
import { FacturaPendiente, DetalleConOrden, Agencia, formatearMonto, formatearFecha, obtenerColorEstadoLiquidacion, obtenerColorEstadoVerificacion, obtenerTextoEstadoVerificacion, obtenerColorEstadoCambio } from '../../models/liquidacion-verificacion.models';

// Componentes
import { ModalSolicitarCambioComponent } from '../modal-solicitar-cambio/modal-solicitar-cambio.component';
import { ModalVerCambiosComponent } from '../modal-ver-cambios/modal-ver-cambios.component';
import { ModalComprobanteComponent } from '../modal-comprobante/modal-comprobante.component';

@Component({
  selector: 'app-liquidacion-verificacion',
  standalone: true,
  imports: [
    CommonModule,
    ModalSolicitarCambioComponent,
    ModalVerCambiosComponent,
    ModalComprobanteComponent
  ],
  templateUrl: './liquidacion-verificacion.component.html',
})
export class LiquidacionVerificacionComponent implements OnInit, OnDestroy {

  private readonly service = inject(LiquidacionService);
  private readonly destroy$ = new Subject<void>();

  // Estado principal
  readonly facturas = signal<FacturaPendiente[]>([]);
  readonly agencias = signal<Agencia[]>([]);
  readonly cargando = signal<boolean>(false);

  // Estado de UI
  readonly facturasExpandidas = signal<Set<number>>(new Set());
  readonly detallesSeleccionados = signal<number[]>([]);

  // Modales
  readonly modalSolicitarCambio = signal<{ visible: boolean, detalle: DetalleConOrden | null }>({ visible: false, detalle: null });
  readonly modalVerCambios = signal<{ visible: boolean, detalle: DetalleConOrden | null }>({ visible: false, detalle: null });
  readonly modalComprobante = signal<{ visible: boolean, modo: 'individual' | 'masivo', detalles: DetalleConOrden[] }>({ visible: false, modo: 'individual', detalles: [] });

  // Utilidades
  readonly formatearMonto = formatearMonto;
  readonly formatearFecha = formatearFecha;
  readonly obtenerColorEstadoLiquidacion = obtenerColorEstadoLiquidacion;
  readonly obtenerColorEstadoVerificacion = obtenerColorEstadoVerificacion;
  readonly obtenerTextoEstadoVerificacion = obtenerTextoEstadoVerificacion;

  ngOnInit(): void {
    this.inicializarSuscripciones();
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private inicializarSuscripciones(): void {
    this.service.facturas$.pipe(takeUntil(this.destroy$)).subscribe(facturas => this.facturas.set(facturas));
    this.service.agencias$.pipe(takeUntil(this.destroy$)).subscribe(agencias => this.agencias.set(agencias));
    this.service.cargando$.pipe(takeUntil(this.destroy$)).subscribe(cargando => this.cargando.set(cargando));
  }

  private cargarDatos(): void {
    this.service.cargarAgencias().subscribe();
    this.cargarFacturas();
  }

  private cargarFacturas(): void {
    this.service.cargarFacturasConLiquidacion().subscribe();
  }

  // ============================================================================
  // MÉTODOS DE SELECCIÓN MASIVA
  // ============================================================================

  toggleSeleccionDetalle(detalleId: number): void {
    const seleccionados = [...this.detallesSeleccionados()];
    const index = seleccionados.indexOf(detalleId);

    if (index > -1) {
      seleccionados.splice(index, 1);
    } else {
      seleccionados.push(detalleId);
    }

    this.detallesSeleccionados.set(seleccionados);
  }

  toggleSeleccionFactura(facturaId: number): void {
    const factura = this.facturas().find(f => f.factura_id === facturaId);
    if (!factura) return;

    const detallesIds = factura.detalles.map(d => d.detalle_id);
    const seleccionados = [...this.detallesSeleccionados()];
    const todosSeleccionados = detallesIds.every(id => seleccionados.includes(id));

    if (todosSeleccionados) {
      // Deseleccionar todos los detalles de esta factura
      const nuevosSeleccionados = seleccionados.filter(id => !detallesIds.includes(id));
      this.detallesSeleccionados.set(nuevosSeleccionados);
    } else {
      // Seleccionar todos los detalles de esta factura
      const nuevosSeleccionados = [...new Set([...seleccionados, ...detallesIds])];
      this.detallesSeleccionados.set(nuevosSeleccionados);
    }
  }

  todosDetallesFacturaSeleccionados(facturaId: number): boolean {
    const factura = this.facturas().find(f => f.factura_id === facturaId);
    if (!factura || factura.detalles.length === 0) return false;

    const detallesIds = factura.detalles.map(d => d.detalle_id);
    return detallesIds.every(id => this.detallesSeleccionados().includes(id));
  }

  algunosDetallesFacturaSeleccionados(facturaId: number): boolean {
    const factura = this.facturas().find(f => f.factura_id === facturaId);
    if (!factura) return false;

    const detallesIds = factura.detalles.map(d => d.detalle_id);
    const algunosSeleccionados = detallesIds.some(id => this.detallesSeleccionados().includes(id));
    const todosSeleccionados = this.todosDetallesFacturaSeleccionados(facturaId);

    return algunosSeleccionados && !todosSeleccionados;
  }

  calcularTotalSeleccionados(): number {
    const seleccionados = this.detallesSeleccionados();
    let total = 0;

    for (const factura of this.facturas()) {
      for (const detalle of factura.detalles) {
        if (seleccionados.includes(detalle.detalle_id)) {
          total += detalle.monto;
        }
      }
    }

    return total;
  }

  limpiarSeleccion(): void {
    this.detallesSeleccionados.set([]);
  }

  // ============================================================================
  // MÉTODOS DE VALIDACIÓN MASIVA
  // ============================================================================

  validarDetallesSeleccionados(): void {
    const seleccionados = this.detallesSeleccionados();
    if (seleccionados.length === 0) return;

    Swal.fire({
      title: 'Validar Detalles Seleccionados',
      text: `¿Confirma que desea validar ${seleccionados.length} detalle(s)?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, validar todos'
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.validarDetallesMasivo(seleccionados).subscribe(success => {
          if (success) {
            this.limpiarSeleccion();
            this.cargarFacturas();
          }
        });
      }
    });
  }

  // ============================================================================
  // MÉTODOS EXISTENTES (sin cambios)
  // ============================================================================

  calcularTotalLiquidado(factura: FacturaPendiente): number {
    return factura.detalles.reduce((total, detalle) => total + detalle.monto, 0);
  }

  toggleExpandirFactura(facturaId: number): void {
    const expandidas = new Set(this.facturasExpandidas());
    if (expandidas.has(facturaId)) {
      expandidas.delete(facturaId);
    } else {
      expandidas.add(facturaId);
    }
    this.facturasExpandidas.set(expandidas);
  }

  verDetalleCompleto(detalle: DetalleConOrden): void {
    Swal.fire({
      title: 'Detalles Completos',
      html: `
        <div class="text-left space-y-2 text-sm">
          <p><strong>ID Detalle:</strong> ${detalle.detalle_id}</p>
          <p><strong>Número Orden:</strong> ${detalle.numero_orden}</p>
          <p><strong>Descripción:</strong> ${detalle.descripcion}</p>
          <p><strong>Monto:</strong> ${formatearMonto(detalle.monto)}</p>
          <p><strong>Correo Proveedor:</strong> ${detalle.correo_proveedor || '-'}</p>
          <p><strong>Forma Pago:</strong> ${detalle.forma_pago}</p>
          <p><strong>Estado Verificación:</strong> ${obtenerTextoEstadoVerificacion(detalle.estado_verificacion)}</p>
          <p><strong>Comprobante Contabilidad:</strong> ${detalle.comprobante_contabilidad || '-'}</p>
          <p><strong>Agencia Gasto:</strong> ${detalle.agencia_gasto_nombre || '-'}</p>
          <p><strong>Nombre Gasto:</strong> ${detalle.nombre_gasto || '-'}</p>
          <p><strong>Solicitante:</strong> ${detalle.solicitante || '-'}</p>
          <p><strong>Total Orden:</strong> ${formatearMonto(detalle.orden.total)}</p>
          <p><strong>Monto Liquidado:</strong> ${formatearMonto(detalle.orden.monto_liquidado)}</p>
          <p><strong>Área:</strong> ${detalle.orden.area_nombre}</p>
          <p><strong>Tipo Presupuesto:</strong> ${detalle.orden.tipo_presupuesto}</p>
          <p><strong>Total Anticipos:</strong> ${formatearMonto(detalle.orden.total_anticipos)}</p>
          <p><strong>Cambios Pendientes:</strong> ${detalle.cambios_pendientes_count}</p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#3085d6',
      width: '600px'
    });
  }

  validarDetalle(detalle: DetalleConOrden): void {
    Swal.fire({
      title: 'Validar Detalle',
      text: '¿Confirma que este detalle está correcto?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, validar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.validarDetalle(detalle.detalle_id).subscribe(success => {
          if (success) {
            this.cargarFacturas();
          }
        });
      }
    });
  }

  abrirModalSolicitarCambio(detalle: DetalleConOrden): void {
    this.modalSolicitarCambio.set({ visible: true, detalle });
  }

  cerrarModalSolicitarCambio(): void {
    this.modalSolicitarCambio.set({ visible: false, detalle: null });
  }

  confirmarSolicitudCambio(datos: any): void {
    const detalle = this.modalSolicitarCambio().detalle;
    if (!detalle) return;

    const payload = {
      detalle_id: detalle.detalle_id,
      descripcion_cambio: datos.descripcion_cambio
    };

    this.service.solicitarCambioDetalle(payload).subscribe(success => {
      if (success) {
        this.cerrarModalSolicitarCambio();
        this.cargarFacturas();
      }
    });
  }

  abrirModalVerCambios(detalle: DetalleConOrden): void {
    this.modalVerCambios.set({ visible: true, detalle });
  }

  cerrarModalVerCambios(): void {
    this.modalVerCambios.set({ visible: false, detalle: null });
  }

  abrirModalComprobanteIndividual(detalle: DetalleConOrden): void {
    this.modalComprobante.set({ visible: true, modo: 'individual', detalles: [detalle] });
  }

  abrirModalComprobanteMasivo(): void {
    const seleccionados = this.detallesSeleccionados();
    if (seleccionados.length === 0) return;

    const detalles = this.facturas().flatMap(f => f.detalles).filter(d => seleccionados.includes(d.detalle_id));
    this.modalComprobante.set({ visible: true, modo: 'masivo', detalles });
  }

  cerrarModalComprobante(): void {
    this.modalComprobante.set({ visible: false, modo: 'individual', detalles: [] });
  }

  confirmarAsignacionComprobante(datos: any): void {
    const modal = this.modalComprobante();

    if (modal.modo === 'individual') {
      const payload = {
        detalle_id: modal.detalles[0].detalle_id,
        ...datos
      };
      this.service.asignarComprobanteDetalle(payload).subscribe(success => {
        if (success) {
          this.cerrarModalComprobante();
          this.cargarFacturas();
        }
      });
    } else {
      const payload = {
        detalles_ids: modal.detalles.map(d => d.detalle_id),
        ...datos
      };
      this.service.asignarComprobanteMasivo(payload).subscribe(success => {
        if (success) {
          this.detallesSeleccionados.set([]);
          this.cerrarModalComprobante();
          this.cargarFacturas();
        }
      });
    }
  }

  trackByFactura(index: number, factura: FacturaPendiente): number {
    return factura.factura_id;
  }

  trackByDetalle(index: number, detalle: DetalleConOrden): number {
    return detalle.detalle_id;
  }
}