// components/modal-detalle-liquidacion/modal-detalle-liquidacion.component.ts
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
    PagoAnticipoSelectComponent
  ],
  templateUrl: './modal-detalle-liquidacion.component.html'
})
export class ModalDetalleLiquidizacionComponent implements OnInit, OnDestroy {
  @Input() visible = false;
  @Input() modo: 'crear' | 'editar' = 'crear';
  @Input() registro: any | null = null;
  @Input() agencias: any[] = [];
  @Input() factura: any | null = null;
  @Input() facturaActualId: number | null = null;
  @Input() totalMontoRegistros: number = 0;
  @Input() ordenesAutorizadas: OrdenAutorizada[] = [];

  @Output() guardar = new EventEmitter<any>();
  @Output() cancelar = new EventEmitter<void>();
  public math = Math;

  // FORMULARIO PRINCIPAL
  formularioPrincipal!: FormGroup;

  // TIPOS DE PAGO
  tiposPago: TipoPago[] = [
    { id: 'deposito', nombre: 'Por depósito a cuenta', requiere_formulario: true, color: 'blue', icono: 'deposito' },
    { id: 'transferencia', nombre: 'Por transferencia', requiere_formulario: true, color: 'green', icono: 'transferencia' },
    { id: 'cheque', nombre: 'Por cheque', requiere_formulario: true, color: 'purple', icono: 'cheque' },
    { id: 'tarjeta', nombre: 'Por tarjeta de crédito', requiere_formulario: false, color: 'yellow', icono: 'tarjeta' },
    { id: 'anticipo', nombre: 'Por anticipo', requiere_formulario: false, color: 'orange', icono: 'anticipo' },
  ];

  tipoSeleccionado = signal<string>('deposito');

  // CATÁLOGOS
  listaBancos: Banco[] = [];
  listaTiposCuenta: TipoCuenta[] = [];
  ordenesCompradas: OrdenAutorizada[] = [];

  // ESTADO
  submitting = false;
  cargandoDatos = false;
  mostrarFormularioEspecifico = signal(false);
  datosFormularioCompletos: any = null;

  private destroy$ = new Subject<void>();

  constructor(private servicioGeneral: ServicioGeneralService) { }

  ngOnInit() {
    this.inicializarFormulario();
    this.ordenesCompradas = [...this.ordenesAutorizadas];
    this.cargarDatosCatalogos();
    this.configurarSuscripciones();

    // Inicializar tipo seleccionado
    const tipoInicial = this.registro?.forma_pago || 'deposito';
    this.tipoSeleccionado.set(tipoInicial);
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
      forma_pago: new FormControl('deposito', [Validators.required]),
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
      forma_pago: this.registro.forma_pago || 'deposito',
      banco: this.registro.banco || '',
      cuenta: this.registro.cuenta || ''
    });

    this.tipoSeleccionado.set(this.registro.forma_pago || 'deposito');
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

    if (monto > montoTotal) {
      montoControl.setErrors({
        maxExceeded: {
          max: montoTotal,
          actual: monto
        }
      });
    } else {
      const errors = montoControl.errors;
      if (errors) {
        const { maxExceeded, ...restErrors } = errors;
        if (Object.keys(restErrors).length > 0) {
          montoControl.setErrors(restErrors);
        } else {
          montoControl.setErrors(null);
        }
      }
    }
  }

  campoInvalido(campo: string): boolean {
    const control = this.formularioPrincipal.get(campo);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  obtenerErrorMensaje(campo: string): string {
    const control = this.formularioPrincipal.get(campo);
    if (!control) return '';

    if (control.hasError('required')) return 'Este campo es obligatorio';
    if (control.hasError('email')) return 'Email inválido';
    if (control.hasError('min')) {
      const minValue = control.errors?.['min'].min;
      return `Valor mínimo permitido es ${minValue}`;
    }
    if (control.hasError('minlength')) {
      const requiredLength = control.errors?.['minlength'].requiredLength;
      return `Mínimo ${requiredLength} caracteres`;
    }
    if (control.hasError('maxlength')) {
      const requiredLength = control.errors?.['maxlength'].requiredLength;
      return `Máximo ${requiredLength} caracteres`;
    }
    if (control.hasError('maxExceeded')) {
      const maxValue = control.errors?.['maxExceeded'].max;
      return `El monto excede el valor de la factura (Q${maxValue.toFixed(2)})`;
    }

    return 'Campo inválido';
  }

  // === CÁLCULOS ===

  calcularMontoPendiente(): number {
    if (!this.factura) return 0;

    const montoTotal = typeof this.factura.monto_total === 'string'
      ? parseFloat(this.factura.monto_total)
      : this.factura.monto_total;

    return montoTotal - this.totalMontoRegistros;
  }

  // === GUARDAR ===

  onGuardarBasico() {
    if (this.submitting) return;

    if (this.formularioPrincipal.invalid) {
      Object.keys(this.formularioPrincipal.controls).forEach(key => {
        const control = this.formularioPrincipal.get(key);
        control?.markAsTouched();
      });
      return;
    }

    // Si requiere formulario específico, abrirlo
    if (this.requiereFormularioEspecifico()) {
      this.mostrarFormularioEspecifico.set(true);
      return;
    }

    // Si no requiere formulario específico, guardar directamente
    this.datosFormularioCompletos = {
      ...this.formularioPrincipal.value,
      forma_pago: this.tipoSeleccionado(),
      factura_id: this.facturaActualId
    };

    this.completarGuardado();
  }

  private completarGuardado() {
    if (!this.datosFormularioCompletos) return;

    this.submitting = true;

    try {
      const registroFinal = {
        id: this.registro?.id,
        numero_orden: this.datosFormularioCompletos.numero_orden || '',
        agencia: this.datosFormularioCompletos.agencia,
        descripcion: this.datosFormularioCompletos.descripcion,
        monto: typeof this.datosFormularioCompletos.monto === 'string'
          ? parseFloat(this.datosFormularioCompletos.monto)
          : this.datosFormularioCompletos.monto,
        correo_proveedor: this.datosFormularioCompletos.correo_proveedor || '',
        forma_pago: this.datosFormularioCompletos.forma_pago,
        banco: this.datosFormularioCompletos.banco || '',
        cuenta: this.datosFormularioCompletos.cuenta || '',
        // Campos adicionales específicos del tipo de pago
        numero_cheque: this.datosFormularioCompletos.numero_cheque || '',
        beneficiario: this.datosFormularioCompletos.beneficiario || '',
        referencia: this.datosFormularioCompletos.referencia || '',
        nota: this.datosFormularioCompletos.nota || '',
        factura_id: this.facturaActualId || this.registro?.factura_id
      };

      this.guardar.emit(registroFinal);
      this.submitting = false;

    } catch (error) {
      console.error('Error al completar guardado:', error);
      this.submitting = false;
    }
  }

  // === UTILIDADES ===

  onCancelar() {
    this.cancelar.emit();
  }

  trackByAgencia(index: number, agencia: any): any {
    return agencia.id || agencia.nombre;
  }

  trackByTipoPago(index: number, tipo: TipoPago): any {
    return tipo.id;
  }

  trackByOrden(index: number, orden: OrdenAutorizada): any {
    return orden.id;
  }
}