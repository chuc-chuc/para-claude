// components/detalle-factura/detalle-factura.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, Subject, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FacturasPEFacade } from '../../services/facturas-pe.facade';
import { AutorizacionEstado, EstadoLiquidacionPE, FacturaPE } from '../../models/facturas-pe.models';
import { ModalRegistrarFacturaComponent } from '../modal-registrar-factura/modal-registrar-factura.component';
import { ModalSolicitarAutorizacionComponent } from '../modal-solicitar-autorizacion/modal-solicitar-autorizacion.component';
import { DiasHabilesService, ValidacionVencimiento } from '../../../../servicios/dias-habiles.service';

@Component({
  selector: 'app-detalle-factura-pe',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalRegistrarFacturaComponent, ModalSolicitarAutorizacionComponent],
  templateUrl: './detalle-factura.component.html'
})
export class DetalleFacturaPEComponent implements OnInit, OnDestroy {

  // === EVENTOS HACIA EL PADRE ===
  @Output() buscarFactura = new EventEmitter<string>();
  @Output() liquidarFactura = new EventEmitter<void>();
  @Output() facturaEncontrada = new EventEmitter<FacturaPE>();

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
    private facade: FacturasPEFacade,
    private diasHabilesService: DiasHabilesService
  ) { }

  ngOnInit(): void {
    this.factura$ = this.facade.factura$;
    this.loading$ = this.facade.loading$;

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

    // Buscar al tipear
    this.searchControl.valueChanges
      .pipe(
        debounceTime(2000),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((v) => {
        const term = (v || '').trim();
        if (term.length >= 3) {
          this.buscarFacturaInterno(term);
        }
        if (term.length === 0) {
          this.buscarFacturaInterno('');
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buscarFacturaInterno(numeroDte: string): void {
    // Búsqueda interna usando el facade
    this.facade.buscarPorDte(numeroDte);

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
    console.log('🟢 Abriendo modal de registro'); // Debug temporal
    this.mostrarRegistrar = true;
  }

  cerrarRegistrar() {
    this.mostrarRegistrar = false;
  }

  onFacturaGuardada() {
    this.cerrarRegistrar();
    // El facade ya maneja la búsqueda automática después del registro
  }

  abrirAutorizacion() {
    this.mostrarAutorizacion = true;
  }

  cerrarAutorizacion() {
    this.mostrarAutorizacion = false;
  }

  onSolicitudEnviada() {
    this.cerrarAutorizacion();
    // El facade ya maneja el refresh automático
  }

  // === VALIDACIÓN DE DÍAS HÁBILES ===

  /**
   * Valida el vencimiento usando tu servicio de días hábiles existente
   */
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

  /**
   * Obtiene el mensaje de vencimiento desde la validación
   */
  getMensajeVencimiento(): string {
    if (this.cargandoValidacion) return 'Validando días hábiles...';
    return this.validacionVencimiento?.mensaje || 'Sin validar';
  }

  /**
   * Obtiene las clases CSS desde la validación
   */
  getClaseVencimiento(): string {
    if (this.cargandoValidacion) return 'text-gray-600 bg-gray-50 border-gray-200';
    return this.validacionVencimiento?.claseCSS || 'text-gray-600 bg-gray-50 border-gray-200';
  }

  // === LÓGICA DE LIQUIDACIÓN ===

  puedeLiquidar(f: FacturaPE): boolean {
    if (f.estado_liquidacion === EstadoLiquidacionPE.Liquidado) return false;

    // Si excede días y requiere autorización, verificar que esté aprobada
    if (this.validacionVencimiento?.requiereAutorizacion) {
      return f.estado_autorizacion === AutorizacionEstado.Aprobada;
    }

    return true;
  }

  onLiquidar(f: FacturaPE) {
    // Si requiere autorización y no la tiene, abrir modal de autorización
    if (this.validacionVencimiento?.requiereAutorizacion && f.estado_autorizacion !== AutorizacionEstado.Aprobada) {
      this.abrirAutorizacion();
      return;
    }

    if (!this.puedeLiquidar(f)) return;

    // Notificar al padre que se solicita liquidar
    this.liquidarFactura.emit();
  }

  // === MÉTODOS PÚBLICOS PARA CONTROL EXTERNO ===

  /**
   * Permite al padre buscar una factura específica
   */
  buscarFacturaPorDTE(numeroDte: string): void {
    this.searchControl.setValue(numeroDte, { emitEvent: false });
    this.buscarFacturaInterno(numeroDte);
  }

  /**
   * Permite al padre limpiar la búsqueda
   */
  limpiarBusqueda(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.facade.buscarPorDte('');
  }

  // === UTILIDADES ===

  /**
   * Convierte valores a número para mostrar en template
   */
  monto(v: number | string | undefined): number {
    if (v === undefined || v === null) return 0;
    return typeof v === 'string' ? parseFloat(v) : v;
  }

  /**
   * Determina si requiere mostrar botón de autorización
   */
  requiereAutorizacion(f: FacturaPE): boolean {
    return this.validacionVencimiento?.requiereAutorizacion === true &&
      f.estado_autorizacion !== AutorizacionEstado.Aprobada;
  }

  /**
   * Determina si el botón de liquidar debe estar deshabilitado
   */
  liquidarDeshabilitado(f: FacturaPE): boolean {
    return !this.puedeLiquidar(f) &&
      (!this.validacionVencimiento?.requiereAutorizacion ||
        f.estado_autorizacion === AutorizacionEstado.Rechazada);
  }
}