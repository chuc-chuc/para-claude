// ============================================
// COMPONENTE HISTORIAL DE REINTEGROS
// historial-reintegros.component.ts
// ============================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

// Servicios
import { ServicioGeneralService } from '../../../../servicios/servicio-general.service';
import { ReintegrosService } from '../../services/reintegros.service';

// Modelos y constantes
import {
  ReintegroAnticipoFormatted,
  CriteriosBusquedaHistorial,
  TIPOS_BUSQUEDA_HISTORIAL,
  UtilidadesReintegros,
  EstadisticasReintegros
} from '../../models/reintegros-anticipos.model';

// Componentes
import { GenericTableComponent } from '../../../../generic-table/generic-table.component';
import { TableAction, TableColumn, TableConfig, SortEvent } from '../../../../model/generic-table.model';

/**
 * Interface para los criterios de búsqueda del historial
 */
interface CriteriosHistorial extends CriteriosBusquedaHistorial {
  // Campos adicionales para la interfaz
}

@Component({
  selector: 'app-historial-reintegros',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GenericTableComponent
  ],
  templateUrl: './historial-reintegros.component.html'
})
export class HistorialReintegrosComponent implements OnInit, OnDestroy {

  // Tipos de búsqueda disponibles
  readonly tiposBusqueda = TIPOS_BUSQUEDA_HISTORIAL;

  // Criterios de búsqueda
  criterios: CriteriosHistorial = {
    tipo_busqueda: 'fecha_verificacion'
  };

  // Estado del componente
  cargando = false;
  busquedaRealizada = false;
  formularioValido = false;

  // Datos para mostrar
  resultados: ReintegroAnticipoFormatted[] = [];
  estadisticas: EstadisticasReintegros | null = null;

  // Constantes
  readonly UtilidadesReintegros = UtilidadesReintegros;

  // Configuración de tabla
  columnas: TableColumn[] = [
    { header: 'ID', property: 'id', sortable: true, filterable: false },
    { header: 'Usuario Registra', property: 'nombre_usuario_registra', sortable: true, filterable: true },
    { header: 'Monto', property: 'monto_anticipo_formatted', sortable: true, filterable: false },
    { header: 'No. Orden', property: 'numero_orden', sortable: true, filterable: true },
    { header: 'Tipo', property: 'tipo_orden', sortable: true, filterable: true },
    { header: 'No. Boleta', property: 'numero_boleta', sortable: true, filterable: true },
    { header: 'Fecha Transacción', property: 'fecha_registro_formatted', sortable: true, filterable: false },
    { header: 'Verificador', property: 'nombre_verificador', sortable: true, filterable: true },
    { header: 'Fecha Verificación', property: 'fecha_verificacion_formatted', sortable: true, filterable: false },
    { header: 'Estado', property: 'estado', sortable: true, filterable: true, isStatus: true },
    { header: 'Banco Origen', property: 'banco_origen', sortable: false, filterable: true }
  ];

  acciones: TableAction[] = [
    {
      icon: 'view',
      tooltip: 'Ver detalles completos',
      action: 'ver_detalles',
      color: 'text-purple-600'
    }
  ];

  configTabla: TableConfig = {
    showCheckbox: false,
    pageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
    showPagination: true,
    showSearch: true,
    searchPlaceholder: 'Buscar en resultados...',
    emptyMessage: 'No se encontraron reintegros en el historial'
  };

  private destroy$ = new Subject<void>();

  constructor(
    private servicioGeneral: ServicioGeneralService,
    private reintegrosService: ReintegrosService
  ) { }

  ngOnInit(): void {
    this.validarFormulario();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Valida el formulario según el tipo de búsqueda seleccionado
   */
  validarFormulario(): void {
    this.formularioValido = false;

    switch (this.criterios.tipo_busqueda) {
      case 'fecha_verificacion':
        this.formularioValido = !!(this.criterios.fecha_inicio && this.criterios.fecha_fin);

        // Validar que fecha inicio no sea mayor que fecha fin
        if (this.criterios.fecha_inicio && this.criterios.fecha_fin) {
          const fechaInicio = new Date(this.criterios.fecha_inicio);
          const fechaFin = new Date(this.criterios.fecha_fin);
          if (fechaInicio > fechaFin) {
            this.formularioValido = false;
          }
        }
        break;

      case 'numero_boleta':
        this.formularioValido = !!(this.criterios.numero_boleta?.trim());
        break;

      case 'usuario':
        this.formularioValido = !!(this.criterios.usuario_id?.trim());
        break;
    }
  }

  /**
   * Maneja el cambio de tipo de búsqueda y limpia los criterios anteriores
   */
  cambiarTipoBusqueda(): void {
    // Limpiar criterios anteriores
    const tipoBusquedaActual = this.criterios.tipo_busqueda;
    this.criterios = {
      tipo_busqueda: tipoBusquedaActual
    };
    this.validarFormulario();
  }

  /**
   * Obtiene la descripción del tipo de búsqueda seleccionado
   */
  obtenerDescripcionTipoBusqueda(): string {
    const tipo = this.tiposBusqueda.find(t => t.valor === this.criterios.tipo_busqueda);
    return tipo?.descripcion || '';
  }

  /**
   * Realiza la búsqueda del historial
   */
  buscarHistorial(): void {
    if (!this.formularioValido) {
      this.servicioGeneral.mensajeServidor('warning',
        'Por favor complete todos los campos requeridos correctamente',
        'Formulario Incompleto'
      );
      return;
    }

    this.cargando = true;
    this.resultados = [];
    this.estadisticas = null;

    this.reintegrosService.buscarHistorialReintegros(this.criterios)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.cargando = false;
          this.busquedaRealizada = true;

          if (response.respuesta === 'success') {
            this.resultados = response.datos || [];
            this.estadisticas = response.metadata?.estadisticas || null;

            if (this.resultados.length > 0) {
              this.servicioGeneral.mensajeServidor('success',
                `Se encontraron ${this.resultados.length} reintegros`,
                'Búsqueda Exitosa'
              );
            } else {
              this.servicioGeneral.mensajeServidor('info',
                'No se encontraron reintegros con los criterios especificados',
                'Sin Resultados'
              );
            }
          } else {
            this.servicioGeneral.mensajeServidor('error',
              response.mensaje?.join(', ') || 'Error en la búsqueda',
              'Error'
            );
          }
        },
        error: (error) => {
          this.cargando = false;
          this.busquedaRealizada = true;
          this.servicioGeneral.mensajeServidor('error',
            'Error al comunicarse con el servidor',
            'Error'
          );
          console.error('Error al buscar historial:', error);
        }
      });
  }

  /**
   * Limpia el formulario y los resultados
   */
  limpiarBusqueda(): void {
    this.criterios = {
      tipo_busqueda: 'fecha_verificacion'
    };
    this.resultados = [];
    this.estadisticas = null;
    this.busquedaRealizada = false;
    this.validarFormulario();
  }

  /**
   * Exporta los resultados a CSV
   */
  exportarResultados(): void {
    if (this.resultados.length === 0) {
      this.servicioGeneral.mensajeServidor('warning',
        'No hay datos para exportar',
        'Sin Datos'
      );
      return;
    }

    Swal.fire({
      title: 'Exportar Historial',
      text: `¿Desea exportar ${this.resultados.length} registros a un archivo CSV?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Exportar CSV',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.reintegrosService.exportarReintegros(this.resultados);
        this.servicioGeneral.mensajeServidor('success',
          'Archivo CSV descargado exitosamente',
          'Exportación Exitosa'
        );
      }
    });
  }

  /**
   * Maneja las acciones de la tabla
   */
  manejarAccionFila(evento: { action: string, item: ReintegroAnticipoFormatted }): void {
    const { action, item } = evento;

    switch (action) {
      case 'ver_detalles':
        this.verDetallesCompletos(item);
        break;
      default:
        console.warn(`Acción ${action} no implementada`);
    }
  }

  /**
   * Muestra los detalles completos del reintegro
   */
  verDetallesCompletos(reintegro: ReintegroAnticipoFormatted): void {
    const estadoClase = UtilidadesReintegros.obtenerClaseEstado(reintegro.estado);

    const detallesHTML = `
      <div class="text-left space-y-4 max-h-96 overflow-y-auto">
        <!-- Información principal -->
        <div class="grid grid-cols-2 gap-4">
          <div><strong class="text-gray-700">ID:</strong><br><span class="text-lg font-mono">${reintegro.id}</span></div>
          <div><strong class="text-gray-700">Estado:</strong><br><span class="px-3 py-1 rounded-full text-sm font-medium ${estadoClase}">${UtilidadesReintegros.obtenerEtiquetaEstado(reintegro.estado)}</span></div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div><strong class="text-gray-700">Solicitante:</strong><br><span class="text-blue-600">${reintegro.nombre_usuario_registra || reintegro.usuario_registra}</span></div>
          <div><strong class="text-gray-700">Verificador:</strong><br><span class="text-green-600">${reintegro.nombre_verificador || reintegro.usuario_verificador || 'No verificado'}</span></div>
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

        ${reintegro.fecha_verificacion_formatted ? `
        <div class="grid grid-cols-1 gap-4">
          <div><strong class="text-gray-700">Fecha Verificación:</strong><br><span class="text-green-600 font-semibold">${reintegro.fecha_verificacion_formatted}</span></div>
        </div>
        ` : ''}

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
        </div>
        ` : ''}
      </div>
    `;

    Swal.fire({
      title: `<span class="text-lg font-bold text-gray-800">Historial - Reintegro #${reintegro.id}</span>`,
      html: detallesHTML,
      width: '800px',
      showCloseButton: true,
      showConfirmButton: false,
      customClass: {
        popup: 'rounded-lg',
        htmlContainer: 'text-sm'
      }
    });
  }

  // Métodos para eventos de la tabla
  cambiarPagina(pagina: number): void {
    console.log('Página:', pagina);
  }

  cambiarTamanoPagina(tamano: number): void {
    console.log('Tamaño página:', tamano);
  }

  cambiarOrden(evento: SortEvent): void {
    console.log('Orden:', evento);
  }

  /**
   * Obtiene el resumen de estadísticas para mostrar
   */
  obtenerResumenEstadisticas(): string {
    if (!this.estadisticas) return '';

    return `Total: ${this.estadisticas.total} | Verificados: ${this.estadisticas.verificados} | Rechazados: ${this.estadisticas.rechazados} | Monto Total: ${this.estadisticas.monto_total_formatted || UtilidadesReintegros.formatearMonto(this.estadisticas.monto_total)}`;
  }

  /**
   * Calcula el porcentaje de aprobación
   */
  calcularPorcentajeAprobacion(): number {
    if (!this.estadisticas || this.estadisticas.total === 0) return 0;
    return Math.round((this.estadisticas.verificados / this.estadisticas.total) * 100);
  }

  /**
   * Obtiene el color del badge según el porcentaje de aprobación
   */
  obtenerColorAprobacion(): string {
    const porcentaje = this.calcularPorcentajeAprobacion();
    if (porcentaje >= 80) return 'bg-green-100 text-green-800';
    if (porcentaje >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  }
}