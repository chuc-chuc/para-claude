// ============================================
// COMPONENTE REGISTRO DE REINTEGROS
// registro-reintegros.component.ts
// ============================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, switchMap } from 'rxjs';
import Swal from 'sweetalert2';

// Servicios
import { ServicioGeneralService } from '../../../../servicios/servicio-general.service';
import { ReintegrosService }  from '../../services/reintegros.service';

// Modelos y constantes
import {
  NuevoReintegro,
  ReintegroAnticipoFormatted,
  TIPOS_ORDEN,
  ValidadoresReintegros,
  UtilidadesReintegros
} from '../../models/reintegros-anticipos.model';

// Componentes
import { GenericTableComponent } from '../../../../generic-table/generic-table.component';
import { TableAction, TableColumn, TableConfig, SortEvent } from '../../../../model/generic-table.model';

@Component({
  selector: 'app-registro-reintegros',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    GenericTableComponent
  ],
  templateUrl: './registro-reintegros.component.html'
})
export class RegistroReintegrosComponent implements OnInit, OnDestroy {

  // Formulario reactivo
  formularioReintegro: FormGroup;

  // Estado del componente
  guardando = false;
  cargandoMisReintegros = false;
  usuarioActual: string = '';

  // Datos para mostrar
  misReintegros: ReintegroAnticipoFormatted[] = [];

  // Constantes
  readonly TIPOS_ORDEN = TIPOS_ORDEN;
  readonly UtilidadesReintegros = UtilidadesReintegros;

  // Configuración de tabla
  columnas: TableColumn[] = [
    { header: 'ID', property: 'id', sortable: true, filterable: false },
    { header: 'Monto', property: 'monto_anticipo_formatted', sortable: true, filterable: false },
    { header: 'No. Orden', property: 'numero_orden', sortable: true, filterable: true },
    { header: 'Tipo Orden', property: 'tipo_orden', sortable: true, filterable: true },
    { header: 'No. Boleta', property: 'numero_boleta', sortable: true, filterable: true },
    { header: 'Fecha Transacción', property: 'fecha_registro_formatted', sortable: true, filterable: false },
    { header: 'Estado', property: 'estado', sortable: true, filterable: true, isStatus: true },
    { header: 'Banco Origen', property: 'banco_origen', sortable: false, filterable: true },
    { header: 'Fecha Registro', property: 'fecha_creacion_formatted', sortable: true, filterable: false }
  ];

  acciones: TableAction[] = [
    {
      icon: 'edit',
      tooltip: 'Editar reintegro',
      action: 'editar',
      color: 'text-blue-600',
      showFn: (item: any) => this.puedeEditar(item.estado)
    },
    {
      icon: 'view',
      tooltip: 'Ver detalles',
      action: 'ver_detalles',
      color: 'text-purple-600'
    },
    {
      icon: 'delete',
      tooltip: 'Eliminar reintegro',
      action: 'eliminar',
      color: 'text-red-600',
      showFn: (item: any) => this.puedeEliminar(item.estado)
    }
  ];

  configTabla: TableConfig = {
    showCheckbox: false,
    pageSize: 10,
    pageSizeOptions: [10, 15, 25],
    showPagination: true,
    showSearch: true,
    searchPlaceholder: 'Buscar en mis reintegros...',
    emptyMessage: 'No tienes reintegros registrados'
  };

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private servicioGeneral: ServicioGeneralService,
    private reintegrosService: ReintegrosService
  ) {
    this.formularioReintegro = this.crearFormulario();
  }

  ngOnInit(): void {
    this.obtenerUsuarioActual();
    this.configurarValidacionesTiempoReal();
    this.cargarMisReintegros();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Crea el formulario reactivo con validaciones
   */
  private crearFormulario(): FormGroup {
    const fechaHoy = new Date().toISOString().split('T')[0];

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
      fecha_registro_transaccion: [fechaHoy, [
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
   * Configura validaciones en tiempo real
   */
  private configurarValidacionesTiempoReal(): void {
    // Validación de número de boleta duplicado
    this.formularioReintegro.get('numero_boleta')?.valueChanges
      .pipe(
        debounceTime(500),
        switchMap(valor => {
          if (!valor || valor.length < 3) return [true];
          return this.reintegrosService.validarNumeroBoleta(valor);
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
  }

  /**
   * Obtiene el usuario actual
   */
  private obtenerUsuarioActual(): void {
    // Implementar lógica para obtener usuario actual
    // Por ejemplo, desde localStorage, servicio de autenticación, etc.
    this.usuarioActual = localStorage.getItem('usuario_id') || '';
    if (this.usuarioActual) {
      this.cargarMisReintegros();
    }
  }

  /**
   * Carga los reintegros del usuario actual
   */
  cargarMisReintegros(): void {
    this.cargandoMisReintegros = true;

    this.reintegrosService.obtenerMisReintegros(this.usuarioActual)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.cargandoMisReintegros = false;
          if (response.respuesta === 'success') {
            this.misReintegros = response.datos || [];
          } else {
            this.servicioGeneral.mensajeServidor('error',
              response.mensaje?.join(', ') || 'Error al cargar reintegros',
              'Error'
            );
          }
        },
        error: (error) => {
          this.cargandoMisReintegros = false;
          this.servicioGeneral.mensajeServidor('error',
            'Error al comunicarse con el servidor',
            'Error'
          );
          console.error('Error al cargar reintegros:', error);
        }
      });
  }

  /**
   * Guarda un nuevo reintegro
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

    const nuevoReintegro: NuevoReintegro = {
      ...this.formularioReintegro.value,
      usuario_registra: this.usuarioActual
    };

    this.guardando = true;

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
            this.limpiarFormulario();
            this.cargarMisReintegros();
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
   * Limpia el formulario
   */
  limpiarFormulario(): void {
    const fechaHoy = new Date().toISOString().split('T')[0];
    this.formularioReintegro.reset();
    this.formularioReintegro.patchValue({
      fecha_registro_transaccion: fechaHoy
    });
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
   * Maneja las acciones de la tabla
   */
  manejarAccionFila(evento: { action: string, item: ReintegroAnticipoFormatted }): void {
    const { action, item } = evento;

    switch (action) {
      case 'editar':
        this.editarReintegro(item);
        break;
      case 'ver_detalles':
        this.verDetallesReintegro(item);
        break;
      case 'eliminar':
        this.eliminarReintegro(item);
        break;
      default:
        console.warn(`Acción ${action} no implementada`);
    }
  }

  /**
   * Navega al componente de edición
   */
  editarReintegro(reintegro: ReintegroAnticipoFormatted): void {
    this.router.navigate(['/contabilidad/reintegros-anticipos-editar', reintegro.id]);
  }

  /**
   * Muestra los detalles completos del reintegro
   */
  verDetallesReintegro(reintegro: ReintegroAnticipoFormatted): void {
    const estadoClase = this.obtenerClaseEstado(reintegro.estado);

    let detallesHTML = `
      <div class="text-left space-y-4">
        <!-- Información principal -->
        <div class="grid grid-cols-2 gap-4">
          <div><strong class="text-gray-700">ID:</strong><br><span class="text-lg font-mono">${reintegro.id}</span></div>
          <div><strong class="text-gray-700">Estado:</strong><br><span class="px-3 py-1 rounded-full text-sm font-medium ${estadoClase}">${UtilidadesReintegros.obtenerEtiquetaEstado(reintegro.estado)}</span></div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div><strong class="text-gray-700">Monto:</strong><br><span class="text-green-600 font-bold text-xl">${reintegro.monto_anticipo_formatted || UtilidadesReintegros.formatearMonto(reintegro.monto_anticipo)}</span></div>
          <div><strong class="text-gray-700">Tipo de Orden:</strong><br><span class="capitalize">${UtilidadesReintegros.obtenerEtiquetaTipoOrden(reintegro.tipo_orden)}</span></div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div><strong class="text-gray-700">No. Orden:</strong><br><span class="font-mono">${reintegro.numero_orden}</span></div>
          <div><strong class="text-gray-700">No. Boleta:</strong><br><span class="font-mono">${reintegro.numero_boleta}</span></div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div><strong class="text-gray-700">Fecha Transacción:</strong><br>${reintegro.fecha_registro_formatted}</div>
          <div><strong class="text-gray-700">Fecha Registro:</strong><br>${reintegro.fecha_creacion_formatted}</div>
        </div>

        <!-- Información bancaria -->
        ${reintegro.banco_origen || reintegro.referencia_bancaria ? `
        <div class="pt-2 border-t">
          <h4 class="font-semibold text-gray-700 mb-2">Información Bancaria</h4>
          <div class="grid grid-cols-2 gap-4">
            ${reintegro.banco_origen ? `<div><strong>Banco Origen:</strong><br>${reintegro.banco_origen}</div>` : ''}
            ${reintegro.referencia_bancaria ? `<div><strong>Referencia:</strong><br>${reintegro.referencia_bancaria}</div>` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Comentarios y observaciones -->
        ${reintegro.comentario_registro ? `
        <div class="pt-2 border-t">
          <strong class="text-gray-700">Comentario de Registro:</strong>
          <div class="mt-1 p-3 bg-blue-50 rounded-lg border text-sm">${reintegro.comentario_registro}</div>
        </div>
        ` : ''}

        ${reintegro.observaciones_correccion ? `
        <div class="pt-2 border-t">
          <strong class="text-red-700">Correcciones Solicitadas:</strong>
          <div class="mt-1 p-3 bg-red-50 rounded-lg border-l-4 border-red-400 text-sm">${reintegro.observaciones_correccion}</div>
        </div>
        ` : ''}

        ${reintegro.comentario_verificacion ? `
        <div class="pt-2 border-t">
          <strong class="text-green-700">Comentario del Verificador:</strong>
          <div class="mt-1 p-3 bg-green-50 rounded-lg border text-sm">${reintegro.comentario_verificacion}</div>
          <div class="text-xs text-gray-500 mt-2">
            Verificado por: ${reintegro.nombre_verificador || reintegro.usuario_verificador}<br>
            Fecha: ${reintegro.fecha_verificacion_formatted}
          </div>
        </div>
        ` : ''}
      </div>
    `;

    Swal.fire({
      title: `<span class="text-lg font-bold text-gray-800">Reintegro #${reintegro.id}</span>`,
      html: detallesHTML,
      width: '700px',
      showCloseButton: true,
      showConfirmButton: false,
      customClass: {
        popup: 'rounded-lg',
        htmlContainer: 'text-sm'
      }
    });
  }

  /**
   * Elimina lógicamente un reintegro
   */
  eliminarReintegro(reintegro: ReintegroAnticipoFormatted): void {
    Swal.fire({
      title: '¿Confirmar eliminación?',
      html: `
        <div class="text-left">
          <p class="mb-3">Está a punto de eliminar el siguiente reintegro:</p>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div><strong>ID:</strong> ${reintegro.id}</div>
              <div><strong>Monto:</strong> ${reintegro.monto_anticipo_formatted || UtilidadesReintegros.formatearMonto(reintegro.monto_anticipo)}</div>
              <div><strong>No. Orden:</strong> ${reintegro.numero_orden}</div>
              <div><strong>No. Boleta:</strong> ${reintegro.numero_boleta}</div>
            </div>
          </div>
          <p class="mt-3 text-red-600 text-sm"><strong>Esta acción no se puede deshacer.</strong></p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        return this.reintegrosService.eliminarReintegro(reintegro.id!, this.usuarioActual)
          .toPromise()
          .then(response => {
            if (response?.respuesta !== 'success') {
              throw new Error(response?.mensaje?.join(', ') || 'Error al eliminar');
            }
            return response;
          })
          .catch(error => {
            Swal.showValidationMessage(`Error: ${error.message}`);
          });
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed) {
        this.servicioGeneral.mensajeServidor('success',
          'Reintegro eliminado exitosamente',
          'Eliminación Exitosa'
        );
        this.cargarMisReintegros();
      }
    });
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
      if (control.errors['duplicado']) errores.push('Este número de boleta ya existe');
    }

    return errores;
  }

  private obtenerClaseEstado(estado: string): string {
    return UtilidadesReintegros.obtenerClaseEstado(estado as any);
  }

  private puedeEditar(estado: string): boolean {
    return ValidadoresReintegros.puedeEditar(estado as any);
  }

  private puedeEliminar(estado: string): boolean {
    return ValidadoresReintegros.puedeEliminar(estado as any);
  }
}