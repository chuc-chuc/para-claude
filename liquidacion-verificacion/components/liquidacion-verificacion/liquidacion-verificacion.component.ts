// ============================================================================
// COMPONENTE PRINCIPAL SIMPLIFICADO - LIQUIDACIÓN Y VERIFICACIÓN
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { TablaDetallesComponent } from '../tabla-detalles-verificacion/tabla-detalles-verificacion.component';
import { TablaRetencionesComponent } from '../tabla-retenciones/tabla-retenciones.component';
import { ModalVerificarComponent } from '../modal-verificar-detalle/modal-verificar-detalle.component';
import { ModalRetencionComponent } from '../modal-retencion/modal-retencion.component';

import { LiquidacionVerificacionService } from '../../services/liquidacion-verificacion.service';
import {
  LiquidacionCompleta,
  DetalleLiquidacion,
  Retencion,
  TipoRetencion,
  formatearMonto,
  formatearFecha
} from '../../models/liquidacion-verificacion.models';

@Component({
  selector: 'app-liquidacion-verificacion',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TablaDetallesComponent,
    TablaRetencionesComponent,
    ModalVerificarComponent,
    ModalRetencionComponent
  ],
  templateUrl: './liquidacion-verificacion.component.html',
})
export class LiquidacionVerificacionComponent implements OnInit, OnDestroy {

  private readonly service = inject(LiquidacionVerificacionService);
  private readonly destroy$ = new Subject<void>();

  // Estado
  readonly liquidacion = signal<LiquidacionCompleta | null>(null);
  readonly tiposRetencion = signal<TipoRetencion[]>([]);
  readonly loading = signal<boolean>(false);

  // Modales
  readonly mostrarModalVerificar = signal<boolean>(false);
  readonly mostrarModalRetencion = signal<boolean>(false);
  readonly modoRetencion = signal<'crear' | 'editar'>('crear');
  readonly detalleAVerificar = signal<DetalleLiquidacion | null>(null);
  readonly retencionAEditar = signal<Retencion | null>(null);

  // Formulario
  readonly numeroFacturaControl = new FormControl('', [Validators.required]);

  // Utilidades
  readonly formatearMonto = formatearMonto;
  readonly formatearFecha = formatearFecha;

  ngOnInit(): void {
    this.inicializarSuscripciones();
    this.configurarBusquedaAutomatica();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // INICIALIZACIÓN
  // ============================================================================

  private inicializarSuscripciones(): void {
    this.service.liquidacionActual$
      .pipe(takeUntil(this.destroy$))
      .subscribe(liq => this.liquidacion.set(liq));

    this.service.tiposRetencion$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tipos => this.tiposRetencion.set(tipos));

    this.service.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.loading.set(loading));
  }

  private configurarBusquedaAutomatica(): void {
    this.numeroFacturaControl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(valor => {
        if (valor && valor.trim().length >= 3) {
          this.buscarFactura(valor.trim());
        } else if (!valor) {
          this.service.limpiarLiquidacion();
        }
      });
  }

  // ============================================================================
  // BÚSQUEDA
  // ============================================================================

  buscarManual(): void {
    const numero = this.numeroFacturaControl.value?.trim();
    if (numero) {
      this.buscarFactura(numero);
    }
  }

  private buscarFactura(numero: string): void {
    this.service.buscarLiquidacion(numero)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  // ============================================================================
  // VERIFICACIÓN DE DETALLES
  // ============================================================================

  abrirModalVerificar(detalle: DetalleLiquidacion): void {
    this.detalleAVerificar.set(detalle);
    this.mostrarModalVerificar.set(true);
  }

  cerrarModalVerificar(): void {
    this.mostrarModalVerificar.set(false);
    this.detalleAVerificar.set(null);
  }

  confirmarVerificacion(datos: any): void {
    const detalle = this.detalleAVerificar();
    if (!detalle) return;

    const payload = {
      id: detalle.id,
      comprobante_contabilidad: datos.comprobante_contabilidad,
      fecha_registro_contabilidad: datos.fecha_registro_contabilidad,
      numero_acta: datos.numero_acta,
      estado_verificacion: datos.estado_verificacion
    };

    this.service.verificarDetalle(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe(success => {
        if (success) {
          this.cerrarModalVerificar();
        }
      });
  }

  // ============================================================================
  // GESTIÓN DE RETENCIONES
  // ============================================================================

  abrirModalNuevaRetencion(): void {
    this.retencionAEditar.set(null);
    this.modoRetencion.set('crear');
    this.mostrarModalRetencion.set(true);
  }

  abrirModalEditarRetencion(retencion: Retencion): void {
    this.retencionAEditar.set(retencion);
    this.modoRetencion.set('editar');
    this.mostrarModalRetencion.set(true);
  }

  cerrarModalRetencion(): void {
    this.mostrarModalRetencion.set(false);
    this.retencionAEditar.set(null);
  }

  confirmarRetencion(datos: any): void {
    if (this.modoRetencion() === 'crear') {
      this.crearRetencion(datos);
    } else {
      this.actualizarRetencion(datos);
    }
  }

  private crearRetencion(datos: any): void {
    const liquidacion = this.liquidacion();
    if (!liquidacion) return;

    const payload = {
      numero_factura: liquidacion.factura.numero_dte,
      tipo_retencion_id: datos.tipo_retencion_id,
      numero_retencion: datos.numero_retencion,
      monto: datos.monto,
      porcentaje: datos.porcentaje,
      fecha_retencion: datos.fecha_retencion
    };

    this.service.crearRetencion(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe(success => {
        if (success) {
          this.cerrarModalRetencion();
        }
      });
  }

  private actualizarRetencion(datos: any): void {
    const retencion = this.retencionAEditar();
    if (!retencion) return;

    const payload = {
      id: retencion.id,
      tipo_retencion_id: datos.tipo_retencion_id,
      numero_retencion: datos.numero_retencion,
      monto: datos.monto,
      porcentaje: datos.porcentaje,
      fecha_retencion: datos.fecha_retencion
    };

    this.service.actualizarRetencion(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe(success => {
        if (success) {
          this.cerrarModalRetencion();
        }
      });
  }

  eliminarRetencion(retencion: Retencion): void {
    if (confirm(`¿Eliminar la retención ${retencion.numero_retencion}?`)) {
      this.service.eliminarRetencion(retencion.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }
  }
}