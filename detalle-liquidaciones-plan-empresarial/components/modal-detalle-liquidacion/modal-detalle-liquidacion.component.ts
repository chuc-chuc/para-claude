// ============================================================================
// MODAL DETALLE LIQUIDACIÓN - INTERACCIÓN DIRECTA CON FACADE
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, signal, OnInit, OnDestroy, inject, Input } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil, combineLatest, map } from 'rxjs';
import { NgSelectModule } from '@ng-select/ng-select';

import { PagoDepositoFormComponent } from '../pago-forms/pago-deposito-form/pago-deposito-form.component';
import { PagoTransferenciaFormComponent } from '../pago-forms/pago-transferencia-form/pago-transferencia-form.component';
import { PagoChequeFormComponent } from '../pago-forms/pago-cheque-form/pago-cheque-form.component';
import { PagoTarjetaSelectComponent } from '../pago-forms/pago-tarjeta-select/pago-tarjeta-select.component';
import { PagoAnticipoSelectComponent } from '../pago-forms/pago-anticipo-select/pago-anticipo-select.component';

import { PlanEmpresarialContainerFacade } from '../../../plan-empresarial-container/plan-empresarial-container.facade';
import { ServicioGeneralService } from '../../../../servicios/servicio-general.service';

// USAR ÚNICAMENTE MODELOS DEL CONTAINER
import {
  TipoPago, BancoPE, TipoCuentaPE, AgenciaPE, OrdenAutorizadaPE,
  GuardarDetalleLiquidacionPayload, ValidadorMonto
} from '../../../plan-empresarial-container/shared/models/plan-empresarial.models';

@Component({
  selector: 'app-modal-detalle-liquidizacion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PagoDepositoFormComponent,
    PagoTransferenciaFormComponent,
    PagoChequeFormComponent,
    PagoTarjetaSelectComponent,
    PagoAnticipoSelectComponent,
    NgSelectModule
  ],
  templateUrl: './modal-detalle-liquidacion.component.html'
})
export class ModalDetalleLiquidizacionComponent implements OnInit, OnDestroy {
  @Input() visible = false;
  @Input() modo: 'crear' | 'editar' = 'crear';
  @Input() registro: any | null = null;

  // INYECCIÓN DEL FACADE - INTERACCIÓN DIRECTA
  private facade = inject(PlanEmpresarialContainerFacade);
  private servicioGeneral = inject(ServicioGeneralService);

  // FORMULARIO PRINCIPAL
  formularioPrincipal!: FormGroup;
  tipoSeleccionado = signal<string>('');
  mostrarFormularioEspecifico = signal(false);
  datosFormularioCompletos: any = null;

  // ESTADO
  submitting = false;

  // STREAMS DIRECTOS DEL FACADE
  factura$ = this.facade.factura$;
  tiposPago$ = this.facade.tiposPago$;
  bancos$ = this.facade.bancos$;
  tiposCuenta$ = this.facade.tiposCuenta$;
  agencias$ = this.facade.agencias$;
  ordenesAutorizadas$ = this.facade.ordenesAutorizadas$;
  total$ = this.facade.total$;

  // LOADING STATES DEL FACADE
  cargandoBancos$ = this.facade.cargandoBancos$;
  cargandoTiposCuenta$ = this.facade.cargandoTiposCuenta$;
  cargandoOrdenesAutorizadas$ = this.facade.cargandoOrdenesAutorizadas$;

  // PROPIEDADES LOCALES SINCRONIZADAS
  tiposPago: TipoPago[] = [];
  agenciasDisponibles: AgenciaPE[] = [];
  ordenesCompradas: OrdenAutorizadaPE[] = [];
  factura: any = null;
  facturaActualId: number | null = null;
  totalMontoRegistros: number = 0;
  cargandoDatos = false;
  cargandoOrdenes = false;
  cargandoAgencias = false;

  // DATOS COMBINADOS PARA EFICIENCIA
  datosModal$ = combineLatest([
    this.tiposPago$,
    this.bancos$,
    this.tiposCuenta$,
    this.agencias$,
    this.ordenesAutorizadas$,
    this.factura$,
    this.total$
  ]).pipe(
    map(([tipos, bancos, tiposCuenta, agencias, ordenes, factura, total]) => ({
      tiposPago: tipos,
      bancos,
      tiposCuenta,
      agencias,
      ordenesDisponibles: ordenes.filter(o =>
        o.estado === 'autorizada' && (o.total_liquidado || 0) < o.total
      ),
      factura,
      total
    }))
  );

  public math = Math;
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.inicializarFormulario();
    this.configurarSuscripciones();
    this.sincronizarDatosConFacade();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // INICIALIZACIÓN
  // ============================================================================

  inicializarFormulario() {
    this.formularioPrincipal = new FormGroup({
      numero_orden: new FormControl('', [Validators.required]),
      agencia: new FormControl('', [Validators.required]),
      descripcion: new FormControl('', [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(200)
      ]),
      monto: new FormControl(null, [
        Validators.required,
        Validators.min(0.01)
      ]),
      correo_proveedor: new FormControl('', [Validators.email]),
      forma_pago: new FormControl('', [Validators.required]),
      banco: new FormControl(''),
      cuenta: new FormControl('')
    });

    if (this.registro) {
      this.cargarDatosParaEdicion();
    }
  }

  configurarSuscripciones() {
    // Cambios en forma de pago
    this.formularioPrincipal.get('forma_pago')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.tipoSeleccionado.set(value);
        this.manejarCambiosFormaPago(value);
      });

    // Validación de monto
    this.formularioPrincipal.get('monto')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(monto => {
        this.validarMontoConFacade(monto);
      });
  }

  sincronizarDatosConFacade() {
    // Sincronizar datos combinados
    this.datosModal$.pipe(takeUntil(this.destroy$)).subscribe(datos => {
      this.tiposPago = datos.tiposPago;
      this.agenciasDisponibles = datos.agencias;
      this.ordenesCompradas = datos.ordenesDisponibles;
      this.factura = datos.factura;
      this.facturaActualId = datos.factura?.id || null;
      this.totalMontoRegistros = datos.total;
    });

    // Estados de loading
    this.cargandoBancos$.pipe(takeUntil(this.destroy$)).subscribe(loading => {
      this.cargandoDatos = loading;
    });

    this.cargandoOrdenesAutorizadas$.pipe(takeUntil(this.destroy$)).subscribe(loading => {
      this.cargandoOrdenes = loading;
    });
  }

  cargarDatosParaEdicion() {
    if (!this.registro || !this.formularioPrincipal) return;

    this.formularioPrincipal.patchValue({
      numero_orden: this.registro.numero_orden || '',
      agencia: this.registro.agencia || '',
      descripcion: this.registro.descripcion || '',
      monto: this.registro.monto || null,
      correo_proveedor: this.registro.correo_proveedor || '',
      forma_pago: this.registro.forma_pago || '',
      banco: this.registro.banco || '',
      cuenta: this.registro.cuenta || ''
    });

    this.tipoSeleccionado.set(this.registro.forma_pago || '');
  }

  // ============================================================================
  // MANEJO DE TIPOS DE PAGO
  // ============================================================================

  manejarCambiosFormaPago(forma_pago: string) {
    const bancoControl = this.formularioPrincipal.get('banco');
    const cuentaControl = this.formularioPrincipal.get('cuenta');

    if (!bancoControl || !cuentaControl) return;

    const tipoPago = this.tiposPago.find(t => t.nombre === forma_pago || t.id === forma_pago);

    if (tipoPago?.requiereFormulario) {
      bancoControl.clearValidators();
      cuentaControl.clearValidators();
      bancoControl.setValue('');
      cuentaControl.setValue('');
      this.mostrarFormularioEspecifico.set(true);
    } else {
      bancoControl.clearValidators();
      cuentaControl.clearValidators();
      bancoControl.setValue('');
      cuentaControl.setValue('');
      this.mostrarFormularioEspecifico.set(false);
    }

    bancoControl.updateValueAndValidity();
    cuentaControl.updateValueAndValidity();
  }

  obtenerTextoTipoPago(tipoPago: string): string {
    const tipo = this.tiposPago.find(t => t.id === tipoPago || t.nombre === tipoPago);
    return tipo?.nombre || tipoPago || 'Sin especificar';
  }

  obtenerClaseTipoPago(tipoPago: string): string {
    const tipo = this.tiposPago.find(t => t.id === tipoPago || t.nombre === tipoPago);
    const colores: { [key: string]: string } = {
      'deposito': 'bg-blue-100 text-blue-800',
      'transferencia': 'bg-green-100 text-green-800',
      'cheque': 'bg-purple-100 text-purple-800',
      'tarjeta': 'bg-yellow-100 text-yellow-800',
      'anticipo': 'bg-orange-100 text-orange-800'
    };
    return colores[tipo?.id || 'default'] || 'bg-gray-100 text-gray-800';
  }

  requiereFormularioEspecifico(): boolean {
    const formaPago = this.formularioPrincipal.get('forma_pago')?.value;
    const tipoPago = this.tiposPago.find(t => t.nombre === formaPago || t.id === formaPago);
    return tipoPago?.requiereFormulario || false;
  }

  // ============================================================================
  // VALIDACIONES CON FACADE
  // ============================================================================

  validarMontoConFacade(monto: number | null) {
    if (!this.factura || monto === null || monto === undefined) return;

    const montoControl = this.formularioPrincipal.get('monto');
    if (!montoControl) return;

    const validacion: ValidadorMonto = this.facade.validarMonto(-1, monto);

    const errores = montoControl.errors || {};
    delete errores['montoExcedido'];
    delete errores['montoInsuficiente'];

    if (!validacion.esValido) {
      if (validacion.mensaje?.includes('mayor a 0')) {
        errores['montoInsuficiente'] = true;
      } else if (validacion.mensaje?.includes('excede')) {
        errores['montoExcedido'] = {
          montoDisponible: validacion.montoDisponible,
          montoIngresado: monto
        };
      }
    }

    const tieneErrores = Object.keys(errores).length > 0;
    montoControl.setErrors(tieneErrores ? errores : null);
  }

  calcularMontoDisponible(): number {
    return this.facade.calcularMontoDisponible();
  }

  calcularMontoPendiente(): number {
    return this.calcularMontoDisponible();
  }

  // ============================================================================
  // FORMULARIOS ESPECÍFICOS
  // ============================================================================

  onGuardarDesdeForm(datosEspecificos: any) {
    this.datosFormularioCompletos = {
      ...this.formularioPrincipal.value,
      ...datosEspecificos,
      forma_pago: this.tipoSeleccionado(),
      factura_id: this.facturaActualId
    };

    this.completarGuardado();
  }

  onCancelarFormEspecifico() {
    this.mostrarFormularioEspecifico.set(false);
  }

  // ============================================================================
  // ACCIONES PRINCIPALES
  // ============================================================================

  onGuardarBasico() {
    if (!this.formularioPrincipal.valid) {
      this.marcarCamposComoTocados();
      return;
    }

    const formaPago = this.formularioPrincipal.get('forma_pago')?.value;
    const tipoPago = this.tiposPago.find(t => t.id === formaPago || t.nombre === formaPago);

    if (tipoPago?.requiereFormulario) {
      this.mostrarFormularioEspecifico.set(true);
    } else {
      this.datosFormularioCompletos = {
        ...this.formularioPrincipal.value,
        forma_pago: this.tipoSeleccionado(),
        factura_id: this.facturaActualId
      };
      this.completarGuardado();
    }
  }

  onSubmit() {
    this.onGuardarBasico();
  }

  completarGuardado() {
    if (!this.datosFormularioCompletos) return;

    this.submitting = true;

    const payload: GuardarDetalleLiquidacionPayload = {
      id: this.registro?.id || null,
      numero_factura: this.factura?.numero_dte || '',
      numero_orden: this.datosFormularioCompletos.numero_orden,
      agencia: this.datosFormularioCompletos.agencia,
      descripcion: this.datosFormularioCompletos.descripcion,
      monto: parseFloat(this.datosFormularioCompletos.monto),
      correo_proveedor: this.datosFormularioCompletos.correo_proveedor || null,
      forma_pago: this.datosFormularioCompletos.forma_pago,
      banco: this.datosFormularioCompletos.banco || null,
      cuenta: this.datosFormularioCompletos.cuenta || null,
      ...this.extraerCamposEspecificos(this.datosFormularioCompletos)
    };

    // GUARDAR DIRECTAMENTE CON EL FACADE
    this.facade.guardarDetalle(payload).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (success: boolean) => {
        this.submitting = false;
        if (success) {
          this.cerrarModal();
        }
      },
      error: () => {
        this.submitting = false;
        this.servicioGeneral.mensajeServidor('error', 'Error al guardar el detalle', 'Error');
      }
    });
  }

  private extraerCamposEspecificos(datos: any): Partial<GuardarDetalleLiquidacionPayload> {
    const especificos: Partial<GuardarDetalleLiquidacionPayload> = {};

    switch (datos.forma_pago) {
      case 'deposito':
        if (datos.id_socio) especificos.id_socio = datos.id_socio;
        if (datos.nombre_socio) especificos.nombre_socio = datos.nombre_socio;
        if (datos.numero_cuenta_deposito) especificos.numero_cuenta_deposito = datos.numero_cuenta_deposito;
        if (datos.producto_cuenta) especificos.producto_cuenta = datos.producto_cuenta;
        if (datos.observaciones) especificos.observaciones = datos.observaciones;
        break;

      case 'transferencia':
        if (datos.nombre_cuenta) especificos.nombre_cuenta = datos.nombre_cuenta;
        if (datos.numero_cuenta) especificos.numero_cuenta = datos.numero_cuenta;
        if (datos.banco) especificos.banco = datos.banco;
        if (datos.tipo_cuenta) especificos.tipo_cuenta = datos.tipo_cuenta;
        if (datos.observaciones) especificos.observaciones = datos.observaciones;
        break;

      case 'cheque':
        if (datos.nombre_beneficiario) especificos.nombre_beneficiario = datos.nombre_beneficiario;
        if (datos.consignacion) especificos.consignacion = datos.consignacion;
        if (datos.no_negociable !== undefined) especificos.no_negociable = datos.no_negociable;
        if (datos.observaciones) especificos.observaciones = datos.observaciones;
        break;

      case 'tarjeta':
      case 'anticipo':
        if (datos.nota) especificos.nota = datos.nota;
        break;
    }

    return especificos;
  }

  onCancelar() {
    this.cerrarModal();
  }

  private cerrarModal() {
    this.resetearFormulario();
    this.visible = false;
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  marcarCamposComoTocados() {
    Object.keys(this.formularioPrincipal.controls).forEach(key => {
      this.formularioPrincipal.get(key)?.markAsTouched();
    });
  }

  resetearFormulario() {
    this.formularioPrincipal.reset();
    this.formularioPrincipal.get('forma_pago')?.setValue('');
    this.tipoSeleccionado.set('');
    this.mostrarFormularioEspecifico.set(false);
    this.datosFormularioCompletos = null;
    this.submitting = false;
  }

  // ============================================================================
  // GETTERS PARA TEMPLATE
  // ============================================================================

  get esFormularioValido(): boolean {
    return this.formularioPrincipal.valid;
  }

  get montoDisponible(): number {
    return this.calcularMontoDisponible();
  }

  get ordenesDisponibles(): OrdenAutorizadaPE[] {
    return this.ordenesCompradas.filter(orden =>
      orden.estado === 'autorizada' &&
      (orden.total_liquidado || 0) < orden.total
    );
  }

  get infoFactura() {
    if (!this.factura) return null;

    return {
      numero: this.factura.numero_factura || 'Sin número',
      proveedor: this.factura.nombre_proveedor || 'Sin proveedor',
      total: this.formatearMonto(this.factura.monto_total || 0),
      disponible: this.formatearMonto(this.montoDisponible)
    };
  }

  // ============================================================================
  // MANEJO DE ERRORES
  // ============================================================================

  campoInvalido(nombreCampo: string): boolean {
    const control = this.formularioPrincipal.get(nombreCampo);
    return !!(control && control.touched && control.errors);
  }

  obtenerErrorMensaje(nombreCampo: string): string | null {
    const control = this.formularioPrincipal.get(nombreCampo);

    if (!control || !control.touched || !control.errors) {
      return null;
    }

    const errores = control.errors;

    if (errores['required']) return 'Este campo es obligatorio';
    if (errores['email']) return 'Ingrese un correo electrónico válido';
    if (errores['minlength']) return `Mínimo ${errores['minlength'].requiredLength} caracteres`;
    if (errores['maxlength']) return `Máximo ${errores['maxlength'].requiredLength} caracteres`;
    if (errores['min']) return `El valor mínimo es ${errores['min'].min}`;
    if (errores['montoExcedido']) return `El monto excede el disponible (Q${errores['montoExcedido'].montoDisponible.toFixed(2)})`;
    if (errores['montoInsuficiente']) return 'El monto debe ser mayor a 0';

    return 'Campo inválido';
  }

  // ============================================================================
  // TRACKBY FUNCTIONS
  // ============================================================================

  trackByOrden(index: number, orden: OrdenAutorizadaPE): number {
    return orden.id;
  }

  trackByTipoPago(index: number, tipo: TipoPago): string {
    return tipo.id;
  }

  trackByAgencia(index: number, agencia: AgenciaPE): number {
    return agencia.id;
  }

  trackByBanco(index: number, banco: BancoPE): number {
    return banco.id_banco;
  }

  // ============================================================================
  // MANEJO DE ÓRDENES
  // ============================================================================

  onSeleccionarOrden(numeroOrden: string) {
    const orden = this.ordenesDisponibles.find(o => o.numero_orden === numeroOrden);

    if (orden) {
      const montoDisponibleOrden = orden.total - (orden.total_liquidado || 0);
      const montoSugerido = Math.min(montoDisponibleOrden, this.montoDisponible);

      this.formularioPrincipal.patchValue({
        numero_orden: numeroOrden,
        monto: montoSugerido
      });
    }
  }

  // ============================================================================
  // EVENTOS DEL MODAL
  // ============================================================================

  onModalClick(event: Event) {
    event.stopPropagation();
  }

  onOverlayClick() {
    this.onCancelar();
  }

  // ============================================================================
  // FORMATEO Y VALIDACIONES
  // ============================================================================

  formatearMonto(monto: number): string {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
      minimumFractionDigits: 2
    }).format(monto);
  }

  validarFormularioCompleto(): boolean {
    const formularioPrincipalValido = this.formularioPrincipal.valid;

    if (!this.requiereFormularioEspecifico()) {
      return formularioPrincipalValido;
    }

    return formularioPrincipalValido && this.datosFormularioCompletos !== null;
  }

  reiniciarEstado() {
    this.submitting = false;
    this.mostrarFormularioEspecifico.set(false);
    this.datosFormularioCompletos = null;
  }
}