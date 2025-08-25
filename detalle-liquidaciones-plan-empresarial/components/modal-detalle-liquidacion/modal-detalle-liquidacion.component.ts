// detalle-liquidaciones-plan-empresarial/components/modal-detalle-liquidacion/modal-detalle-liquidacion.component.ts
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, forkJoin, takeUntil, finalize } from 'rxjs';
import { ServicioGeneralService } from '../../../../servicios/servicio-general.service';
import { PagoDepositoFormComponent } from '../pago-forms/pago-deposito-form/pago-deposito-form.component';
import { PagoTransferenciaFormComponent } from '../pago-forms/pago-transferencia-form/pago-transferencia-form.component';
import { PagoChequeFormComponent } from '../pago-forms/pago-cheque-form/pago-cheque-form.component';
import { PagoTarjetaSelectComponent } from '../pago-forms/pago-tarjeta-select/pago-tarjeta-select.component';
import { PagoAnticipoSelectComponent } from '../pago-forms/pago-anticipo-select/pago-anticipo-select.component';
import { NgSelectModule } from '@ng-select/ng-select';

interface TipoPago {
  id: string;
  nombre: string;
  requiere_formulario: boolean;
  color?: string;
  icono?: string;
}

interface Banco {
  id_banco: number;
  nombre: string;
}

interface TipoCuenta {
  id_tipo_cuenta: number;
  nombre: string;
}

interface OrdenAutorizada {
  id: number;
  numero_orden: string;
  estado: string;
  total: number;
  total_liquidado?: number;
}

interface Agencia {
  id: number;
  nombre_liquidacion: string;
}

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
  @Input() factura: any | null = null;
  @Input() facturaActualId: number | null = null;
  @Input() totalMontoRegistros: number = 0;

  @Output() guardar = new EventEmitter<any>();
  @Output() cancelar = new EventEmitter<void>();
  public math = Math;

  // FORMULARIO PRINCIPAL
  formularioPrincipal!: FormGroup;

  // TIPOS DE PAGO ACTUALIZADOS (sin efectivo)
  tiposPago: TipoPago[] = [
    { id: 'deposito', nombre: 'Por depósito a cuenta', requiere_formulario: true, color: 'blue', icono: 'deposito' },
    { id: 'transferencia', nombre: 'Por transferencia', requiere_formulario: true, color: 'green', icono: 'transferencia' },
    { id: 'cheque', nombre: 'Por cheque', requiere_formulario: true, color: 'purple', icono: 'cheque' },
    { id: 'tarjeta', nombre: 'Por tarjeta de crédito', requiere_formulario: false, color: 'yellow', icono: 'tarjeta' },
    { id: 'anticipo', nombre: 'Por anticipo', requiere_formulario: false, color: 'orange', icono: 'anticipo' },
  ];

  tipoSeleccionado = signal<string>('');

  // CATÁLOGOS
  listaBancos: Banco[] = [];
  listaTiposCuenta: TipoCuenta[] = [];
  agenciasDisponibles: Agencia[] = [];
  ordenesCompradas: OrdenAutorizada[] = [];

  // ESTADO
  submitting = false;
  cargandoDatos = false;
  cargandoOrdenes = false;
  cargandoAgencias = false;
  mostrarFormularioEspecifico = signal(false);
  datosFormularioCompletos: any = null;

  private destroy$ = new Subject<void>();

  constructor(private servicioGeneral: ServicioGeneralService) { }

  ngOnInit() {
    this.inicializarFormulario();
    this.cargarDatosCatalogos();
    this.cargarOrdenes();
    this.cargarAgencias();
    this.configurarSuscripciones();

    // NO inicializar tipo seleccionado por defecto
    if (this.registro?.forma_pago) {
      this.tipoSeleccionado.set(this.registro.forma_pago);
      this.formularioPrincipal.get('forma_pago')?.setValue(this.registro.forma_pago);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // === INICIALIZACIÓN ===

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
      forma_pago: new FormControl('', [Validators.required]), // Sin valor inicial
      banco: new FormControl(''),
      cuenta: new FormControl('')
    });

    // Cargar datos si es edición
    if (this.registro) {
      setTimeout(() => this.cargarDatosParaEdicion(), 0);
    }
  }

  configurarSuscripciones() {
    // Suscripción a cambios en la forma de pago
    this.formularioPrincipal.get('forma_pago')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.tipoSeleccionado.set(value);
        this.manejarCambiosFormaPago(value);
      });

    // Validar monto
    this.formularioPrincipal.get('monto')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(monto => {
        this.validarMonto(monto);
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

  // === CARGA DE CATÁLOGOS ===

  cargarDatosCatalogos() {
    this.cargandoDatos = true;

    forkJoin({
      bancos: this.servicioGeneral.query({
        ruta: 'facturas/bancos/lista',
        tipo: 'get'
      }),
      tiposCuenta: this.servicioGeneral.query({
        ruta: 'facturas/tiposCuenta/lista',
        tipo: 'get'
      })
    }).pipe(
      finalize(() => {
        this.cargandoDatos = false;
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (results: any) => {
        if (results.bancos.respuesta === 'success' && results.bancos.datos) {
          this.listaBancos = results.bancos.datos;
        }

        if (results.tiposCuenta.respuesta === 'success' && results.tiposCuenta.datos) {
          this.listaTiposCuenta = results.tiposCuenta.datos;
        }
      },
      error: (err) => {
        console.error('Error al cargar catálogos:', err);
      }
    });
  }

  cargarOrdenes() {
    this.cargandoOrdenes = true;

    this.servicioGeneral.query({
      ruta: 'contabilidad/obtenerOrdenesAutorizadas',
      tipo: 'get'
    }).subscribe({
      next: (res: any) => {
        if (res.respuesta === 'success') {
          // Filtrar órdenes que NO tengan anticipos pendientes o tardíos
          this.ordenesCompradas = res.datos
            .filter((orden: any) => orden.anticipos_pendientes_o_tardios === 0)
            .map((orden: any) => ({
              id: orden.numero_orden,
              numero_orden: orden.numero_orden.toString(),
              estado: 'autorizada',
              total: parseFloat(orden.total),
              total_liquidado: parseFloat(orden.monto_liquidado) || 0,
              monto_pendiente: parseFloat(orden.total) - (parseFloat(orden.monto_liquidado) || 0),
              puede_finalizar: (parseFloat(orden.total) - (parseFloat(orden.monto_liquidado) || 0)) <= 0
            }));
        } else {
          this.servicioGeneral.mensajeServidor('error', res.mensaje, 'Error');
        }
        this.cargandoOrdenes = false;
      },
      error: (err) => {
        this.cargandoOrdenes = false;
        this.servicioGeneral.mensajeServidor('error', 'No se pudieron cargar las órdenes autorizadas', 'Error');
      }
    });
  }

  cargarAgencias() {
    this.cargandoAgencias = true;

    this.servicioGeneral.query({
      ruta: 'contabilidad/buscarNombreLiquidacion', // Asumo esta ruta basada en el patrón
      tipo: 'get'
    }).subscribe({
      next: (res: any) => {
        if (res.respuesta === 'success') {
          this.agenciasDisponibles = res.datos.map((agencia: any) => ({
            id: agencia.id,
            nombre_liquidacion: agencia.nombre_liquidacion
          }));
        } else {
          this.servicioGeneral.mensajeServidor('error', res.mensaje, 'Error');
        }
        this.cargandoAgencias = false;
      },
      error: (err) => {
        this.cargandoAgencias = false;
        this.servicioGeneral.mensajeServidor('error', 'No se pudieron cargar las agencias', 'Error');
      }
    });
  }

  // === MANEJO DE TIPOS DE PAGO ===

  manejarCambiosFormaPago(forma_pago: string) {
    const bancoControl = this.formularioPrincipal.get('banco');
    const cuentaControl = this.formularioPrincipal.get('cuenta');

    if (!bancoControl || !cuentaControl) return;

    const tipoPago = this.tiposPago.find(t => t.nombre === forma_pago || t.id === forma_pago);

    if (tipoPago?.requiere_formulario) {
      // Para tipos complejos, limpiar campos básicos
      bancoControl.clearValidators();
      cuentaControl.clearValidators();
      bancoControl.setValue('');
      cuentaControl.setValue('');
      this.mostrarFormularioEspecifico.set(true);
    } else {
      // Para tipos simples, limpiar pero mantener disponibles
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
    const color = tipo?.color || 'gray';
    return `bg-${color}-100 text-${color}-800`;
  }

  requiereFormularioEspecifico(): boolean {
    const formaPago = this.formularioPrincipal.get('forma_pago')?.value;
    const tipoPago = this.tiposPago.find(t => t.nombre === formaPago || t.id === formaPago);
    return tipoPago?.requiere_formulario || false;
  }

  // === MANEJO DE FORMULARIOS ESPECÍFICOS ===

  onGuardarDesdeForm(datosEspecificos: any) {
    // Integrar datos del formulario específico con el formulario principal
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

  // === VALIDACIONES ===

  validarMonto(monto: number | null) {
    if (!this.factura || monto === null || monto === undefined) return;

    const montoControl = this.formularioPrincipal.get('monto');
    if (!montoControl) return;

    const montoTotal = typeof this.factura.monto_total === 'string'
      ? parseFloat(this.factura.monto_total)
      : this.factura.monto_total;

    const montoDisponible = montoTotal - this.totalMontoRegistros;

    // Limpiar errores previos
    const errores = montoControl.errors || {};
    delete errores['montoExcedido'];
    delete errores['montoInsuficiente'];

    if (monto > montoDisponible) {
      errores['montoExcedido'] = {
        montoDisponible: montoDisponible,
        montoIngresado: monto
      };
    }

    if (monto <= 0) {
      errores['montoInsuficiente'] = true;
    }

    const tieneErrores = Object.keys(errores).length > 0;
    montoControl.setErrors(tieneErrores ? errores : null);
  }

  calcularMontoDisponible(): number {
    if (!this.factura) return 0;

    const montoTotal = typeof this.factura.monto_total === 'string'
      ? parseFloat(this.factura.monto_total)
      : this.factura.monto_total;

    return montoTotal - this.totalMontoRegistros;
  }

  calcularMontoPendiente(): number {
    return this.calcularMontoDisponible();
  }

  // === ACCIONES PRINCIPALES ===

  onGuardarBasico() {
    if (!this.formularioPrincipal.valid) {
      this.marcarCamposComoTocados();
      return;
    }

    const formaPago = this.formularioPrincipal.get('forma_pago')?.value;
    const tipoPago = this.tiposPago.find(t => t.id === formaPago || t.nombre === formaPago);

    if (tipoPago?.requiere_formulario) {
      this.mostrarFormularioEspecifico.set(true);
    } else {
      // Para tipos simples, guardar directamente
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

    // Emitir los datos al componente padre
    this.guardar.emit(this.datosFormularioCompletos);
  }

  onCancelar() {
    this.resetearFormulario();
    this.cancelar.emit();
  }

  // === UTILIDADES ===

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

  // === GETTERS PARA EL TEMPLATE ===

  get esFormularioValido(): boolean {
    return this.formularioPrincipal.valid;
  }

  get montoDisponible(): number {
    return this.calcularMontoDisponible();
  }

  get ordenesDisponibles(): OrdenAutorizada[] {
    return this.ordenesCompradas.filter(orden =>
      orden.estado === 'autorizada' &&
      (orden.total_liquidado || 0) < orden.total
    );
  }

  // === MANEJO DE ERRORES Y VALIDACIONES DEL TEMPLATE ===

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

    if (errores['required']) {
      return 'Este campo es obligatorio';
    }

    if (errores['email']) {
      return 'Ingrese un correo electrónico válido';
    }

    if (errores['minlength']) {
      return `Mínimo ${errores['minlength'].requiredLength} caracteres`;
    }

    if (errores['maxlength']) {
      return `Máximo ${errores['maxlength'].requiredLength} caracteres`;
    }

    if (errores['min']) {
      return `El valor mínimo es ${errores['min'].min}`;
    }

    if (errores['montoExcedido']) {
      return `El monto excede el disponible (Q${errores['montoExcedido'].montoDisponible.toFixed(2)})`;
    }

    if (errores['montoInsuficiente']) {
      return 'El monto debe ser mayor a 0';
    }

    return 'Campo inválido';
  }

  // === TRACKBY FUNCTIONS PARA PERFORMANCE ===

  trackByOrden(index: number, orden: OrdenAutorizada): number {
    return orden.id;
  }

  trackByTipoPago(index: number, tipo: TipoPago): string {
    return tipo.id;
  }

  trackByAgencia(index: number, agencia: Agencia): number {
    return agencia.id;
  }

  // === MANEJO DE ÓRDENES ===

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

  // === EVENTOS DEL MODAL ===

  onModalClick(event: Event) {
    // Evitar que el modal se cierre al hacer click en el contenido
    event.stopPropagation();
  }

  onOverlayClick() {
    // Cerrar modal al hacer click en el overlay
    this.onCancelar();
  }

  // === FORMATEO ===

  formatearMonto(monto: number): string {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
      minimumFractionDigits: 2
    }).format(monto);
  }

  // === VALIDACIONES ADICIONALES ===

  validarFormularioCompleto(): boolean {
    const formularioPrincipalValido = this.formularioPrincipal.valid;

    if (!this.requiereFormularioEspecifico()) {
      return formularioPrincipalValido;
    }

    // Si requiere formulario específico, debe estar completo
    return formularioPrincipalValido && this.datosFormularioCompletos !== null;
  }

  // === MANEJO DE ESTADOS ===

  reiniciarEstado() {
    this.submitting = false;
    this.mostrarFormularioEspecifico.set(false);
    this.datosFormularioCompletos = null;
  }

  // === INFORMACIÓN DE LA FACTURA ===

  get infoFactura() {
    if (!this.factura) return null;

    return {
      numero: this.factura.numero_factura || 'Sin número',
      proveedor: this.factura.nombre_proveedor || 'Sin proveedor',
      total: this.formatearMonto(this.factura.monto_total || 0),
      disponible: this.formatearMonto(this.montoDisponible)
    };
  }
}