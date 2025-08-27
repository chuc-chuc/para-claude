// ============================================
// COMPONENTE EDICIÓN DE REINTEGROS
// edicion-reintegros.component.ts
// ============================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

// Servicios
import { ServicioGeneralService } from '../../../../servicios/servicio-general.service';
import { ReintegrosService } from '../../services/reintegros.service';

// Modelos y constantes
import {
  ReintegroAnticipoFormatted,
  ActualizarReintegro,
  TIPOS_ORDEN,
  ValidadoresReintegros,
  UtilidadesReintegros
} from '../../models/reintegros-anticipos.model';

@Component({
  selector: 'app-edicion-reintegros',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './edicion-reintegro.component.html'
})
export class EdicionReintegrosComponent implements OnInit, OnDestroy {

  // Formulario reactivo
  formularioReintegro: FormGroup;

  // Estado del componente
  cargando = false;
  guardando = false;
  reintegroId: number = 0;
  usuarioActual: string = '';
  reintegroOriginal: ReintegroAnticipoFormatted | null = null;

  // Constantes
  readonly TIPOS_ORDEN = TIPOS_ORDEN;
  readonly UtilidadesReintegros = UtilidadesReintegros;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private servicioGeneral: ServicioGeneralService,
    private reintegrosService: ReintegrosService
  ) {
    this.formularioReintegro = this.crearFormulario();
  }

  ngOnInit(): void {
    this.obtenerUsuarioActual();
    this.obtenerIdDeRuta();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Crea el formulario reactivo con validaciones
   */
  private crearFormulario(): FormGroup {
    return this.fb.group({
      monto_anticipo: [null, [
        Validators.required,
        Validators.min(0.01),
        Validators.max(999999.99)
      ]],
      numero_orden: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(100)
      ]],
      tipo_orden: ['', Validators.required],
      numero_boleta: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(100)
      ]],
      fecha_registro_transaccion: ['', [
        Validators.required,
        this.validarFechaNoFutura
      ]],
      comentario_registro: ['', Validators.maxLength(500)],
      banco_origen: ['', Validators.maxLength(100)],
      referencia_bancaria: ['', Validators.maxLength(100)]
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
   * Obtiene el usuario actual
   */
  private obtenerUsuarioActual(): void {
    this.usuarioActual = '01JSFRXWDXJSARB23SPPQ6EW89';
  }

  /**
   * Obtiene el ID del reintegro desde la ruta
   */
  private obtenerIdDeRuta(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.reintegroId = +params['id'];
      if (this.reintegroId) {
        this.cargarReintegro();
      } else {
        this.servicioGeneral.mensajeServidor('error', 'ID de reintegro no válido', 'Error');
        this.volverARegistro();
      }
    });
  }

  /**
   * Carga los datos del reintegro a editar
   */
  cargarReintegro(): void {
    this.cargando = true;

    this.reintegrosService.obtenerReintegro(this.reintegroId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.cargando = false;
          if (response.respuesta === 'success' && response.datos) {
            this.reintegroOriginal = response.datos;

            // Verificar que el usuario puede editar este reintegro
            if (this.reintegroOriginal.usuario_registra !== this.usuarioActual) {
              this.servicioGeneral.mensajeServidor('error',
                'No tienes permisos para editar este reintegro',
                'Acceso Denegado'
              );
              this.volverARegistro();
              return;
            }

            // Verificar que el reintegro se puede editar
            if (!ValidadoresReintegros.puedeEditar(this.reintegroOriginal.estado)) {
              this.servicioGeneral.mensajeServidor('warning',
                `No se puede editar un reintegro en estado "${UtilidadesReintegros.obtenerEtiquetaEstado(this.reintegroOriginal.estado)}"`,
                'Edición No Permitida'
              );
              this.volverARegistro();
              return;
            }

            this.cargarDatosEnFormulario();
          } else {
            this.servicioGeneral.mensajeServidor('error',
              response.mensaje?.join(', ') || 'Error al cargar reintegro',
              'Error'
            );
            this.volverARegistro();
          }
        },
        error: (error) => {
          this.cargando = false;
          this.servicioGeneral.mensajeServidor('error',
            'Error al comunicarse con el servidor',
            'Error'
          );
          console.error('Error al cargar reintegro:', error);
          this.volverARegistro();
        }
      });
  }

  /**
   * Carga los datos del reintegro en el formulario
   */
  private cargarDatosEnFormulario(): void {
    if (!this.reintegroOriginal) return;

    this.formularioReintegro.patchValue({
      monto_anticipo: this.reintegroOriginal.monto_anticipo,
      numero_orden: this.reintegroOriginal.numero_orden,
      tipo_orden: this.reintegroOriginal.tipo_orden,
      numero_boleta: this.reintegroOriginal.numero_boleta,
      fecha_registro_transaccion: this.reintegroOriginal.fecha_registro_transaccion,
      comentario_registro: this.reintegroOriginal.comentario_registro || '',
      banco_origen: this.reintegroOriginal.banco_origen || '',
      referencia_bancaria: this.reintegroOriginal.referencia_bancaria || ''
    });
  }

  /**
   * Actualiza el reintegro
   */
  actualizarReintegro(): void {
    if (this.formularioReintegro.invalid) {
      this.marcarCamposComoTocados();
      this.servicioGeneral.mensajeServidor('warning',
        'Por favor complete todos los campos requeridos correctamente',
        'Formulario Incompleto'
      );
      return;
    }

    if (!this.reintegroOriginal) {
      this.servicioGeneral.mensajeServidor('error', 'No se puede actualizar el reintegro', 'Error');
      return;
    }

    const datosActualizacion: ActualizarReintegro = {
      id: this.reintegroId,
      usuario_registra: this.usuarioActual,
      ...this.formularioReintegro.value
    };

    this.guardando = true;

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
            this.volverARegistro();
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
   * Cancela la edición y vuelve al registro
   */
  cancelarEdicion(): void {
    if (this.formularioTieneCambios()) {
      Swal.fire({
        title: '¿Cancelar edición?',
        text: 'Los cambios realizados se perderán',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'Continuar editando'
      }).then((result) => {
        if (result.isConfirmed) {
          this.volverARegistro();
        }
      });
    } else {
      this.volverARegistro();
    }
  }

  /**
   * Verifica si el formulario tiene cambios no guardados
   */
  private formularioTieneCambios(): boolean {
    if (!this.reintegroOriginal) return false;

    const valoresFormulario = this.formularioReintegro.value;

    return (
      valoresFormulario.monto_anticipo !== this.reintegroOriginal.monto_anticipo ||
      valoresFormulario.numero_orden !== this.reintegroOriginal.numero_orden ||
      valoresFormulario.tipo_orden !== this.reintegroOriginal.tipo_orden ||
      valoresFormulario.numero_boleta !== this.reintegroOriginal.numero_boleta ||
      valoresFormulario.fecha_registro_transaccion !== this.reintegroOriginal.fecha_registro_transaccion ||
      (valoresFormulario.comentario_registro || '') !== (this.reintegroOriginal.comentario_registro || '') ||
      (valoresFormulario.banco_origen || '') !== (this.reintegroOriginal.banco_origen || '') ||
      (valoresFormulario.referencia_bancaria || '') !== (this.reintegroOriginal.referencia_bancaria || '')
    );
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
   * Navega de vuelta al componente de registro
   */
  volverARegistro(): void {
    this.router.navigate(['/contabilidad/reintegros-anticipos-registro']);
  }

  /**
   * Obtiene el badge del estado actual
   */
  obtenerBadgeEstado(): string {
    if (!this.reintegroOriginal) return '';

    const claseEstado = UtilidadesReintegros.obtenerClaseEstado(this.reintegroOriginal.estado);
    const etiquetaEstado = UtilidadesReintegros.obtenerEtiquetaEstado(this.reintegroOriginal.estado);

    return `<span class="px-3 py-1 rounded-full text-sm font-medium ${claseEstado}">${etiquetaEstado}</span>`;
  }

  /**
   * Utilidades de validación para la UI
   */
  esInvalido(campo: string): boolean {
    const control = this.formularioReintegro.get(campo);
    return !!(control?.invalid && (control.dirty || control.touched));
  }

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
    }

    return errores;
  }

  /**
   * Obtiene información sobre las correcciones solicitadas
   */
  obtenerInformacionCorrecciones(): string {
    if (!this.reintegroOriginal?.observaciones_correccion) return '';
    return this.reintegroOriginal.observaciones_correccion;
  }

  /**
   * Verifica si el reintegro fue rechazado
   */
  esReintegroRechazado(): boolean {
    return this.reintegroOriginal?.estado === 'rechazado';
  }
}