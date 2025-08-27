// ============================================================================
// DETALLE FACTURA - COMPLETO CORREGIDO
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, OnInit, Output, EventEmitter, OnDestroy, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, Subject, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ModalRegistrarFacturaComponent } from '../modal-registrar-factura/modal-registrar-factura.component';
import { ModalSolicitarAutorizacionComponent } from '../modal-solicitar-autorizacion/modal-solicitar-autorizacion.component';
import { DiasHabilesService, ValidacionVencimiento } from '../../../../servicios/dias-habiles.service';

// USAR FACADE Y MODELO UNIFICADOS
import { PlanEmpresarialContainerFacade } from '../../../plan-empresarial-container/plan-empresarial-container.facade';
import { AutorizacionEstado, EstadoLiquidacionPE, FacturaPE } from '../../../plan-empresarial-container/shared/models/plan-empresarial.models';

@Component({
  selector: 'app-detalle-factura-pe',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalRegistrarFacturaComponent, ModalSolicitarAutorizacionComponent],
  templateUrl: './detalle-factura.component.html'
})
export class DetalleFacturaPEComponent implements OnInit, OnDestroy {

  // === INPUTS PARA CONTROL EXTERNO ===
  @Input() searchText: string = '';
  @Input() ocultarBuscador: boolean = false;

  // === EVENTOS HACIA EL PADRE ===
  @Output() buscarFactura = new EventEmitter<string>();
  @Output() liquidarFactura = new EventEmitter<void>();
  @Output() facturaEncontrada = new EventEmitter<FacturaPE>();
  @Output() searchTextChange = new EventEmitter<string>();

  // UI / inputs
  searchControl = new FormControl<string>('');
  mostrarRegistrar = false;
  mostrarAutorizacion = false;

  // Streams
  factura$!: Observable<FacturaPE | null>;
  loading$!: Observable<boolean>;

  // Validación de días hábiles
  validacionVencimiento: ValidacionVencimiento | null = null;
  cargandoValidacion = false;

  // Subject para destrucción
  private destroy$ = new Subject<void>();

  constructor(
    private facade: PlanEmpresarialContainerFacade,
    private diasHabilesService: DiasHabilesService
  ) { }

  ngOnInit(): void {
    this.factura$ = this.facade.factura$;
    this.loading$ = this.facade.loadingFactura$;

    // Suscribirse a cambios de factura para notificar al padre y validar vencimiento
    this.factura$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(factura => {
      if (factura) {
        this.facturaEncontrada.emit(factura);
        this.validarVencimientoFactura(factura);
      } else {
        this.validacionVencimiento = null;
      }
    });

    // Inicializar con texto de búsqueda si viene del padre
    if (this.searchText) {
      this.searchControl.setValue(this.searchText, { emitEvent: false });
    }

    // Configurar búsqueda automática solo si no se oculta el buscador
    if (!this.ocultarBuscador) {
      this.configurarBusquedaAutomatica();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private configurarBusquedaAutomatica(): void {
    // Buscar al tipear
    this.searchControl.valueChanges
      .pipe(
        debounceTime(2000),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((v) => {
        const term = (v || '').trim();
        this.searchTextChange.emit(term);

        if (term.length >= 3) {
          this.buscarFacturaInterno(term);
        }
        if (term.length === 0) {
          this.buscarFacturaInterno('');
        }
      });
  }

  private buscarFacturaInterno(numeroDte: string): void {
    // Búsqueda usando facade unificado
    this.facade.buscarFactura(numeroDte);

    // Notificar al padre
    this.buscarFactura.emit(numeroDte);
  }

  buscarManual() {
    const term = (this.searchControl.value || '').trim();
    if (term) {
      this.buscarFacturaInterno(term);
    }
  }

  // === GESTIÓN DE MODALES ===

  abrirRegistrar() {
    this.mostrarRegistrar = true;
  }

  cerrarRegistrar() {
    this.mostrarRegistrar = false;
  }

  onFacturaGuardada() {
    this.cerrarRegistrar();
  }

  abrirAutorizacion() {
    this.mostrarAutorizacion = true;
  }

  cerrarAutorizacion() {
    this.mostrarAutorizacion = false;
  }

  onSolicitudEnviada() {
    this.cerrarAutorizacion();
  }

  // === VALIDACIÓN DE DÍAS HÁBILES ===

  private validarVencimientoFactura(factura: FacturaPE): void {
    if (!factura?.fecha_emision) {
      this.validacionVencimiento = null;
      return;
    }

    this.cargandoValidacion = true;

    this.diasHabilesService.validarVencimientoFactura(
      factura.fecha_emision,
      factura.estado_autorizacion === AutorizacionEstado.Aprobada
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (validacion) => {
        this.validacionVencimiento = validacion;
        this.cargandoValidacion = false;
      },
      error: (error) => {
        console.error('Error al validar vencimiento:', error);
        this.validacionVencimiento = null;
        this.cargandoValidacion = false;
      }
    });
  }

  getMensajeVencimiento(): string {
    if (this.cargandoValidacion) return 'Validando días hábiles...';
    return this.validacionVencimiento?.mensaje || 'Sin validar';
  }

  getClaseVencimiento(): string {
    if (this.cargandoValidacion) return 'text-gray-600 bg-gray-50 border-gray-200';
    return this.validacionVencimiento?.claseCSS || 'text-gray-600 bg-gray-50 border-gray-200';
  }

  // === LÓGICA DE LIQUIDACIÓN ===

  puedeLiquidar(f: FacturaPE): boolean {
    if (f.estado_liquidacion === EstadoLiquidacionPE.Liquidado) return false;

    if (this.validacionVencimiento?.requiereAutorizacion) {
      return f.estado_autorizacion === AutorizacionEstado.Aprobada;
    }

    return true;
  }

  onLiquidar(f: FacturaPE) {
    if (this.validacionVencimiento?.requiereAutorizacion && f.estado_autorizacion !== AutorizacionEstado.Aprobada) {
      this.abrirAutorizacion();
      return;
    }

    if (!this.puedeLiquidar(f)) return;

    this.liquidarFactura.emit();
  }

  // === MÉTODOS PÚBLICOS PARA CONTROL EXTERNO ===

  buscarFacturaPorDTE(numeroDte: string): void {
    this.searchControl.setValue(numeroDte, { emitEvent: false });
    this.buscarFacturaInterno(numeroDte);
  }

  limpiarBusqueda(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.facade.buscarFactura('');
  }

  // === UTILIDADES ===

  monto(v: number | string | undefined): number {
    if (v === undefined || v === null) return 0;
    return typeof v === 'string' ? parseFloat(v) : v;
  }

  requiereAutorizacion(f: FacturaPE): boolean {
    return this.validacionVencimiento?.requiereAutorizacion === true &&
      f.estado_autorizacion !== AutorizacionEstado.Aprobada;
  }

  liquidarDeshabilitado(f: FacturaPE): boolean {
    return !this.puedeLiquidar(f) &&
      (!this.validacionVencimiento?.requiereAutorizacion ||
        f.estado_autorizacion === AutorizacionEstado.Rechazada);
  }
}
// ===========