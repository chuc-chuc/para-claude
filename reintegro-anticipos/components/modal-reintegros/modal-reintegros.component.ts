// ============================================
// COMPONENTE MODAL DE REINTEGROS CON OPCIÓN "OTRO"
// modal-reintegros.component.ts
// ============================================

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, switchMap, startWith, combineLatest } from 'rxjs';
import Swal from 'sweetalert2';

// Servicios
import { ServicioGeneralService } from '../../../../servicios/servicio-general.service';
import { ReintegrosService } from '../../services/reintegros.service';

// Modelos y constantes
import {
  NuevoReintegro,
  ActualizarReintegro,
  ReintegroAnticipoFormatted,
  OrdenPorTipo,
  TIPOS_ORDEN,
  UtilidadesReintegros,
  UtilidadesOrdenesPorTipo
} from '../../models/reintegros-anticipos.model';

export type TipoModal = 'crear' | 'editar';

@Component({
  selector: 'app-modal-reintegros',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './modal-reintegros.component.html',
  styleUrl: './modal-reintegros.component.css'
})
export class ModalReintegrosComponent implements OnInit, OnDestroy, OnChanges {

  @Input() visible = false;
  @Input() tipo: TipoModal = 'crear';
  @Input() reintegroEditar: ReintegroAnticipoFormatted | null = null;
  @Input() usuarioActual = '';

  @Output() cerrar = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<void>();

  // Formulario reactivo
  formularioReintegro: FormGroup;

  // Estado del componente
  guardando = false;
  cargandoOrdenes = false;
  ordenOtroSeleccionada = false; // NUEVO: flag para saber si seleccionó "Otro"

  // Datos para selects
  ordenesPorTipo: OrdenPorTipo[] = [];
  ordenSeleccionada: OrdenPorTipo | null = null;

  // Constantes
  readonly TIPOS_ORDEN = TIPOS_ORDEN;
  readonly UtilidadesReintegros = UtilidadesReintegros;
  readonly UtilidadesOrdenesPorTipo = UtilidadesOrdenesPorTipo;
  readonly Math = Math;
  readonly VALOR_ORDEN_OTRO = 'OTRO'; // NUEVO: constante para identificar "Otro"

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private servicioGeneral: ServicioGeneralService,
    private reintegrosService: ReintegrosService
  ) {
    this.formularioReintegro = this.crearFormulario();
  }

  ngOnInit(): void {
    this.configurarValidacionesTiempoReal();
    this.configurarCambioTipoOrden();
    this.configurarCambioOrden();
    this.inicializarFormulario();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tipo'] || changes['reintegroEditar'] || changes['visible']) {
      if (this.visible) {
        this.inicializarFormulario();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Crea el formulario reactivo con validaciones actualizadas
   */
  private crearFormulario(): FormGroup {
    return this.fb.group({
      tipo_orden: ['', Validators.required],
      numero_orden: [null, Validators.required],
      numero_orden_manual: [''], // NUEVO: campo para ingresar orden manualmente
      monto_anticipo: [null, [
        Validators.required,
        Validators.min(0.01),
        Validators.max(999999.99)
      ]],
      numero_boleta: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(100)
      ]],
      fecha_registro_transaccion: ['', [
        Validators.required,
        this.validarFechaNoFutura
      ]],
      comentario_registro: ['', Validators.maxLength(500)]
    });
  }

  /**
   * Validador personalizado para fecha no futura
   */
  private validarFechaNoFutura = (control: any) => {
    if (!control.value) return null;

    const fechaControl = new Date(control.value);
    const fechaHoy = new Date();
    fechaHoy.setHours(23, 59, 59, 999);

    return fechaControl <= fechaHoy ? null : { fechaFutura: true };
  };

  /**
   * Configura reacciones al cambio de tipo de orden
   */
  private configurarCambioTipoOrden(): void {
    this.formularioReintegro.get('tipo_orden')?.valueChanges
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe(tipoOrden => {
        this.formularioReintegro.get('numero_orden')?.setValue(null);
        this.formularioReintegro.get('numero_orden_manual')?.setValue('');
        this.ordenSeleccionada = null;
        this.ordenOtroSeleccionada = false; // NUEVO: resetear flag
        if (tipoOrden && tipoOrden !== '' && this.tipo === 'crear') {
          this.cargarOrdenesPorTipo();
        } else {
          this.ordenesPorTipo = [];
        }
      });
  }

  /**
   * Configura reacciones al cambio de orden seleccionada
   */
  private configurarCambioOrden(): void {
    this.formularioReintegro.get('numero_orden')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(numeroOrden => {
        // NUEVO: Verificar si seleccionó "Otro"
        if (numeroOrden === this.VALOR_ORDEN_OTRO) {
          this.ordenOtroSeleccionada = true;
          this.ordenSeleccionada = null;
          // Hacer requerido el campo manual
          this.formularioReintegro.get('numero_orden_manual')?.setValidators([
            Validators.required,
            Validators.pattern(/^[0-9]+$/)
          ]);
          this.formularioReintegro.get('numero_orden_manual')?.updateValueAndValidity();
        } else {
          this.ordenOtroSeleccionada = false;
          // Quitar validación del campo manual
          this.formularioReintegro.get('numero_orden_manual')?.clearValidators();
          this.formularioReintegro.get('numero_orden_manual')?.setValue('');
          this.formularioReintegro.get('numero_orden_manual')?.updateValueAndValidity();

          if (numeroOrden) {
            this.ordenSeleccionada = this.ordenesPorTipo.find(o => o.numero_orden === numeroOrden) || null;
            this.validarMontoContraOrden();
          } else {
            this.ordenSeleccionada = null;
          }
        }
      });
  }

  /**
   * Carga las órdenes elegibles para reintegro
   */
  private cargarOrdenesPorTipo(): void {
    this.cargandoOrdenes = true;

    const tipoOrden = this.formularioReintegro.get('tipo_orden')?.value;
    const filtros = tipoOrden ? { tipo_orden: tipoOrden } : {};

    this.reintegrosService.obtenerOrdenesPorTipoConCache(filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.cargandoOrdenes = false;
          if (response.respuesta === 'success' && response.datos) {
            this.ordenesPorTipo = response.datos;
          } else {
            this.ordenesPorTipo = [];
            this.servicioGeneral.mensajeServidor('warning',
              'No se pudieron cargar las órdenes elegibles',
              'Advertencia'
            );
          }
        },
        error: (error) => {
          console.error('Error completo:', error);
          this.cargandoOrdenes = false;
          this.ordenesPorTipo = [];
          this.servicioGeneral.mensajeServidor('error',
            'Error al cargar órdenes elegibles',
            'Error'
          );
        }
      });
  }

  /**
   * Valida que el monto no exceda el saldo de la orden
   */
  private validarMontoContraOrden(): void {
    const montoControl = this.formularioReintegro.get('monto_anticipo');
    const numeroOrdenControl = this.formularioReintegro.get('numero_orden');

    if (!montoControl || !numeroOrdenControl || !this.ordenSeleccionada || this.ordenOtroSeleccionada) {
      return;
    }

    const monto = montoControl.value;
    if (monto && monto > this.ordenSeleccionada.saldo_pendiente) {
      montoControl.setErrors({
        ...montoControl.errors,
        excedeSaldo: {
          saldoDisponible: this.ordenSeleccionada.saldo_pendiente,
          montoSolicitado: monto
        }
      });
    } else if (montoControl.errors?.['excedeSaldo']) {
      delete montoControl.errors['excedeSaldo'];
      if (Object.keys(montoControl.errors).length === 0) {
        montoControl.setErrors(null);
      }
    }
  }

  /**
   * Inicializa el formulario según el tipo de modal
   */
  private inicializarFormulario(): void {
    if (this.tipo === 'editar' && this.reintegroEditar) {
      this.cargarDatosEnFormulario();
    } else if (this.tipo === 'crear') {
      this.configurarFormularioNuevo();
    }
  }

  /**
   * Configura el formulario para un nuevo reintegro
   */
  private configurarFormularioNuevo(): void {
    const fechaHoy = new Date().toISOString().split('T')[0];
    this.formularioReintegro.reset();
    this.formularioReintegro.patchValue({
      tipo_orden: '',
      numero_orden: null,
      numero_orden_manual: '', // NUEVO: resetear campo manual
      fecha_registro_transaccion: fechaHoy
    });
    this.ordenesPorTipo = [];
    this.ordenSeleccionada = null;
    this.ordenOtroSeleccionada = false; // NUEVO: resetear flag
  }

  /**
   * Carga los datos del reintegro en el formulario para edición
   */
  private cargarDatosEnFormulario(): void {
    if (!this.reintegroEditar) return;

    this.formularioReintegro.patchValue({
      tipo_orden: this.reintegroEditar.tipo_orden,
      numero_orden: parseInt(this.reintegroEditar.numero_orden),
      monto_anticipo: this.reintegroEditar.monto_anticipo,
      numero_boleta: this.reintegroEditar.numero_boleta,
      fecha_registro_transaccion: this.reintegroEditar.fecha_registro_transaccion,
      comentario_registro: this.reintegroEditar.comentario_registro || ''
    });

    this.ordenSeleccionada = {
      numero_orden: parseInt(this.reintegroEditar.numero_orden),
      total_anticipos: 0,
      total_liquidado: 0,
      total_reintegrado: 0,
      saldo_pendiente: 999999,
      total_anticipos_formatted: '0.00',
      saldo_pendiente_formatted: '999,999.99'
    };
  }

  /**
   * Configura validaciones en tiempo real actualizadas
   */
  private configurarValidacionesTiempoReal(): void {
    // Validación de número de boleta duplicado
    this.formularioReintegro.get('numero_boleta')?.valueChanges
      .pipe(
        debounceTime(500),
        switchMap(valor => {
          if (!valor || valor.length < 3) return [true];
          const idExcluir = this.tipo === 'editar' ? this.reintegroEditar?.id : undefined;
          return this.reintegrosService.validarNumeroBoleta(valor, idExcluir);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(esValido => {
        const control = this.formularioReintegro.get('numero_boleta');
        if (!esValido && control) {
          control.setErrors({ ...control.errors, duplicado: true });
        } else if (control?.errors?.['duplicado']) {
          delete control.errors['duplicado'];
          if (Object.keys(control.errors).length === 0) {
            control.setErrors(null);
          }
        }
      });

    // Validación de monto contra saldo disponible
    combineLatest([
      this.formularioReintegro.get('monto_anticipo')?.valueChanges.pipe(startWith(null)) || [],
      this.formularioReintegro.get('numero_orden')?.valueChanges.pipe(startWith(null)) || []
    ]).pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.tipo === 'crear' && this.ordenSeleccionada && !this.ordenOtroSeleccionada) {
        this.validarMontoContraOrden();
      }
    });
  }

  /**
   * Obtiene información de la orden seleccionada para mostrar al usuario
   */
  obtenerInfoOrdenSeleccionada(): string {
    if (!this.ordenSeleccionada) return '';

    if (this.tipo === 'editar') {
      return `Orden #${this.ordenSeleccionada.numero_orden} (modo edición)`;
    }

    return UtilidadesOrdenesPorTipo.obtenerDescripcionDetallada(this.ordenSeleccionada);
  }

  /**
   * Obtiene el saldo disponible de la orden seleccionada
   */
  obtenerSaldoDisponible(): number {
    return this.ordenSeleccionada?.saldo_pendiente || 0;
  }

  /**
   * Verifica si hay saldo suficiente para el monto ingresado
   */
  tieneSaldoSuficiente(): boolean {
    if (!this.ordenSeleccionada || this.ordenOtroSeleccionada) return true;
    const monto = this.formularioReintegro.get('monto_anticipo')?.value || 0;
    return UtilidadesOrdenesPorTipo.tieneSaldoSuficiente(this.ordenSeleccionada, monto);
  }

  /**
   * Guarda el reintegro (crear o actualizar)
   */
  guardarReintegro(): void {
    if (this.formularioReintegro.invalid) {
      this.marcarCamposComoTocados();
      this.servicioGeneral.mensajeServidor('warning',
        'Por favor complete todos los campos requeridos correctamente',
        'Formulario Incompleto'
      );
      return;
    }

    // Validación adicional para modo crear con orden existente
    if (this.tipo === 'crear' && this.ordenSeleccionada && !this.ordenOtroSeleccionada) {
      const monto = this.formularioReintegro.get('monto_anticipo')?.value;
      if (monto > this.ordenSeleccionada.saldo_pendiente) {
        this.servicioGeneral.mensajeServidor('warning',
          `El monto no puede exceder el saldo disponible (${this.ordenSeleccionada.saldo_pendiente_formatted})`,
          'Monto Excesivo'
        );
        return;
      }
    }

    this.guardando = true;

    if (this.tipo === 'crear') {
      this.crearNuevoReintegro();
    } else {
      this.actualizarReintegro();
    }
  }

  /**
   * Crea un nuevo reintegro
   */
  private crearNuevoReintegro(): void {
    const formValues = this.formularioReintegro.value;

    // NUEVO: Usar el número manual si seleccionó "Otro"
    const numeroOrden = this.ordenOtroSeleccionada
      ? formValues.numero_orden_manual
      : formValues.numero_orden.toString();

    const nuevoReintegro: NuevoReintegro = {
      usuario_registra: this.usuarioActual,
      monto_anticipo: formValues.monto_anticipo,
      numero_orden: numeroOrden,
      tipo_orden: formValues.tipo_orden,
      numero_boleta: formValues.numero_boleta,
      fecha_registro_transaccion: formValues.fecha_registro_transaccion,
      comentario_registro: formValues.comentario_registro || null
    };

    this.reintegrosService.crearReintegro(nuevoReintegro)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.guardando = false;
          if (response.respuesta === 'success') {
            this.servicioGeneral.mensajeServidor('success',
              'Reintegro registrado exitosamente',
              'Registro Exitoso'
            );

            this.formularioReintegro.reset();
            this.formularioReintegro.markAsUntouched();
            this.formularioReintegro.markAsPristine();

            this.reintegrosService.limpiarCacheOrdenesPorTipo();
            this.guardado.emit();
            this.ejecutarCierre();
          } else {
            this.servicioGeneral.mensajeServidor('error',
              response.mensaje?.join(', ') || 'Error al registrar reintegro',
              'Error'
            );
          }
        },
        error: (error) => {
          this.guardando = false;
          this.servicioGeneral.mensajeServidor('error',
            'Error al comunicarse con el servidor',
            'Error'
          );
          console.error('Error al guardar reintegro:', error);
        }
      });
  }

  /**
   * Actualiza un reintegro existente
   */
  private actualizarReintegro(): void {
    if (!this.reintegroEditar) return;

    const formValues = this.formularioReintegro.value;

    const datosActualizacion: ActualizarReintegro = {
      id: this.reintegroEditar.id!,
      usuario_registra: this.usuarioActual,
      monto_anticipo: formValues.monto_anticipo,
      numero_orden: formValues.numero_orden.toString(),
      tipo_orden: formValues.tipo_orden,
      numero_boleta: formValues.numero_boleta,
      fecha_registro_transaccion: formValues.fecha_registro_transaccion,
      comentario_registro: formValues.comentario_registro || null
    };

    this.reintegrosService.actualizarReintegro(datosActualizacion)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.guardando = false;
          if (response.respuesta === 'success') {
            this.servicioGeneral.mensajeServidor('success',
              'Reintegro actualizado exitosamente',
              'Actualización Exitosa'
            );

            this.formularioReintegro.reset();
            this.formularioReintegro.markAsUntouched();
            this.formularioReintegro.markAsPristine();

            this.reintegrosService.limpiarCacheOrdenesPorTipo();
            this.guardado.emit();
            this.ejecutarCierre();
          } else {
            this.servicioGeneral.mensajeServidor('error',
              response.mensaje?.join(', ') || 'Error al actualizar reintegro',
              'Error'
            );
          }
        },
        error: (error) => {
          this.guardando = false;
          this.servicioGeneral.mensajeServidor('error',
            'Error al comunicarse con el servidor',
            'Error'
          );
          console.error('Error al actualizar reintegro:', error);
        }
      });
  }

  /**
   * Cierra el modal
   */
  cerrarModal(): void {
    if (this.guardando) return;

    if (this.formularioTieneCambios()) {
      this.confirmarCierre();
    } else {
      this.ejecutarCierre();
    }
  }

  /**
   * Confirma el cierre del modal si hay cambios
   */
  private confirmarCierre(): void {
    Swal.fire({
      title: '¿Cerrar sin guardar?',
      text: 'Los cambios realizados se perderán',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, cerrar',
      cancelButtonText: 'Continuar editando'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarCierre();
      }
    });
  }

  /**
   * Ejecuta el cierre del modal
   */
  private ejecutarCierre(): void {
    this.formularioReintegro.reset();
    this.formularioReintegro.markAsUntouched();
    this.formularioReintegro.markAsPristine();

    const fechaHoy = new Date().toISOString().split('T')[0];
    this.formularioReintegro.patchValue({
      tipo_orden: '',
      numero_orden: null,
      numero_orden_manual: '', // NUEVO: resetear campo manual
      fecha_registro_transaccion: fechaHoy
    });

    this.ordenesPorTipo = [];
    this.ordenSeleccionada = null;
    this.ordenOtroSeleccionada = false; // NUEVO: resetear flag
    this.cargandoOrdenes = false;

    this.cerrar.emit();
  }

  /**
   * Verifica si el formulario tiene cambios no guardados
   */
  private formularioTieneCambios(): boolean {
    if (this.tipo === 'crear') {
      return this.formularioReintegro.dirty && Object.values(this.formularioReintegro.value).some(val => val);
    } else if (this.tipo === 'editar' && this.reintegroEditar) {
      const valoresFormulario = this.formularioReintegro.value;
      return (
        valoresFormulario.monto_anticipo !== this.reintegroEditar.monto_anticipo ||
        valoresFormulario.numero_orden !== parseInt(this.reintegroEditar.numero_orden) ||
        valoresFormulario.tipo_orden !== this.reintegroEditar.tipo_orden ||
        valoresFormulario.numero_boleta !== this.reintegroEditar.numero_boleta ||
        valoresFormulario.fecha_registro_transaccion !== this.reintegroEditar.fecha_registro_transaccion ||
        (valoresFormulario.comentario_registro || '') !== (this.reintegroEditar.comentario_registro || '')
      );
    }
    return false;
  }

  /**
   * Marca todos los campos como tocados para mostrar errores
   */
  private marcarCamposComoTocados(): void {
    Object.keys(this.formularioReintegro.controls).forEach(key => {
      const control = this.formularioReintegro.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Utilidades de validación para la UI
   */
  esInvalido(campo: string): boolean {
    const control = this.formularioReintegro.get(campo);
    return !!(control?.invalid && (control.dirty || control.touched));
  }

  /**
   * Obtiene errores de validación
   */
  obtenerErrores(campo: string): string[] {
    const control = this.formularioReintegro.get(campo);
    const errores: string[] = [];

    if (control?.errors) {
      if (control.errors['required']) errores.push('Este campo es obligatorio');
      if (control.errors['min']) errores.push('El valor debe ser mayor a 0');
      if (control.errors['max']) errores.push('El valor excede el máximo permitido');
      if (control.errors['minlength']) errores.push(`Mínimo ${control.errors['minlength'].requiredLength} caracteres`);
      if (control.errors['maxlength']) errores.push(`Máximo ${control.errors['maxlength'].requiredLength} caracteres`);
      if (control.errors['fechaFutura']) errores.push('La fecha no puede ser futura');
      if (control.errors['duplicado']) errores.push('Este número de boleta ya existe');
      if (control.errors['pattern']) errores.push('Solo se permiten números');
      if (control.errors['excedeSaldo']) {
        const error = control.errors['excedeSaldo'];
        errores.push(`El monto excede el saldo disponible (${UtilidadesReintegros.formatearMonto(error.saldoDisponible)})`);
      }
    }

    return errores;
  }

  /**
   * Obtiene información sobre las correcciones solicitadas
   */
  obtenerInformacionCorrecciones(): string {
    if (!this.reintegroEditar?.observaciones_correccion) return '';
    return this.reintegroEditar.observaciones_correccion;
  }

  /**
   * Verifica si el reintegro fue rechazado
   */
  esReintegroRechazado(): boolean {
    return this.reintegroEditar?.estado === 'rechazado';
  }
}