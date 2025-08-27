// ============================================
// COMPONENTE VERIFICACIÓN DE REINTEGROS
// verificacion-reintegros.component.ts
// ============================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { ServicioGeneralService } from '../../../../servicios/servicio-general.service';
import { ReintegrosService } from '../../services/reintegros.service';

// Modelos y constantes
import {
  ReintegroAnticipoFormatted,
  VerificarReintegro,
  SolicitarCorreccion,
  UtilidadesReintegros,
  ESTADOS_REINTEGRO,
  FiltrosReintegros, // AGREGADA
  EstadoReintegro    // AGREGADA
} from '../../models/reintegros-anticipos.model';

// Componentes
import { GenericTableComponent } from '../../../../generic-table/generic-table.component';
import { TableAction, TableColumn, TableConfig, SortEvent } from '../../../../model/generic-table.model';

/**
 * Filtros de búsqueda para verificadores
 */
interface FiltrosVerificacion {
  estado: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  usuario_registra?: string;
}

@Component({
  selector: 'app-verificacion-reintegros',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GenericTableComponent
  ],
  templateUrl: './verificacion-reintegros.component.html',
  styleUrl: './verificacion-reintegros.component.css'
})
export class VerificacionReintegrosComponent implements OnInit, OnDestroy {

  // Estado del componente
  cargandoReintegros = false;
  usuarioVerificador: string = '';

  // Datos para mostrar
  reintegrosPendientes: ReintegroAnticipoFormatted[] = [];

  // Filtros de búsqueda
  filtros: FiltrosVerificacion = {
    estado: 'pendiente'
  };

  // Estadísticas
  estadisticas = {
    total_pendientes: 0,
    total_verificados_hoy: 0,
    monto_total_pendiente: 0
  };

  // Constantes
  readonly UtilidadesReintegros = UtilidadesReintegros;
  readonly ESTADOS_REINTEGRO = ESTADOS_REINTEGRO.filter(e =>
    ['pendiente', 'en_revision', 'verificado', 'rechazado'].includes(e.valor)
  );

  // Configuración de tabla
  columnas: TableColumn[] = [
    { header: 'ID', property: 'id', sortable: true, filterable: false },
    { header: 'Usuario', property: 'nombre_usuario_registra', sortable: true, filterable: true },
    { header: 'Monto', property: 'monto_anticipo_formatted', sortable: true, filterable: false },
    { header: 'No. Orden', property: 'numero_orden', sortable: true, filterable: true },
    { header: 'Tipo', property: 'tipo_orden', sortable: true, filterable: true },
    { header: 'No. Boleta', property: 'numero_boleta', sortable: true, filterable: true },
    { header: 'Fecha Transacción', property: 'fecha_registro_formatted', sortable: true, filterable: false },
    { header: 'Estado', property: 'estado', sortable: true, filterable: true, isStatus: true },
    { header: 'Días Pendientes', property: 'dias_pendientes', sortable: true, filterable: false },
    { header: 'Fecha Registro', property: 'fecha_creacion_formatted', sortable: true, filterable: false }
  ];

  acciones: TableAction[] = [
    {
      icon: 'view',
      tooltip: 'Ver detalles completos',
      action: 'ver_detalles',
      color: 'text-purple-600'
    },
    {
      icon: 'check',
      tooltip: 'Verificar/Aprobar reintegro',
      action: 'verificar',
      color: 'text-green-600',
      showFn: (item: any) => this.puedeVerificar(item.estado)
    },
    {
      icon: 'edit',
      tooltip: 'Solicitar correcciones',
      action: 'solicitar_correccion',
      color: 'text-orange-600',
      showFn: (item: any) => this.puedeVerificar(item.estado)
    }
  ];

  configTabla: TableConfig = {
    showCheckbox: false,
    pageSize: 15,
    pageSizeOptions: [10, 15, 25, 50],
    showPagination: true,
    showSearch: true,
    searchPlaceholder: 'Buscar en reintegros...',
    emptyMessage: 'No hay reintegros pendientes de verificación'
  };

  private destroy$ = new Subject<void>();

  constructor(
    private servicioGeneral: ServicioGeneralService,
    private reintegrosService: ReintegrosService
  ) { }

  ngOnInit(): void {
    this.obtenerUsuarioVerificador();
    this.cargarReintegros();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Obtiene el usuario verificador actual
   */
  private obtenerUsuarioVerificador(): void {
    this.usuarioVerificador = localStorage.getItem('usuario_id') || '';
  }

  /**
   * Carga los reintegros según los filtros aplicados
   */
  cargarReintegros(): void {
    this.cargandoReintegros = true;

    const filtrosAPI: FiltrosReintegros = {
      estado: this.filtros.estado as EstadoReintegro,
      fecha_inicio: this.filtros.fecha_inicio,
      fecha_fin: this.filtros.fecha_fin,
      usuario_registra: this.filtros.usuario_registra
    };

    this.reintegrosService.listarReintegros(filtrosAPI)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.cargandoReintegros = false;
          if (response.respuesta === 'success') {
            this.reintegrosPendientes = response.datos || [];
            this.calcularEstadisticas();
          } else {
            this.servicioGeneral.mensajeServidor('error',
              response.mensaje?.join(', ') || 'Error al cargar reintegros',
              'Error'
            );
            this.reintegrosPendientes = [];
          }
        },
        error: (error) => {
          this.cargandoReintegros = false;
          this.servicioGeneral.mensajeServidor('error',
            'Error al comunicarse con el servidor',
            'Error'
          );
          console.error('Error al cargar reintegros:', error);
          this.reintegrosPendientes = [];
        }
      });
  }

  /**
   * Calcula estadísticas para el dashboard
   */
  private calcularEstadisticas(): void {
    const hoy = new Date().toDateString();

    this.estadisticas = {
      total_pendientes: this.reintegrosPendientes.filter(r => r.estado === 'pendiente').length,
      total_verificados_hoy: this.reintegrosPendientes.filter(r =>
        r.estado === 'verificado' &&
        r.fecha_verificacion &&
        new Date(r.fecha_verificacion).toDateString() === hoy
      ).length,
      monto_total_pendiente: this.reintegrosPendientes
        .filter(r => r.estado === 'pendiente')
        .reduce((sum, r) => sum + (r.monto_anticipo || 0), 0)
    };
  }

  /**
   * Aplica filtros de búsqueda
   */
  aplicarFiltros(): void {
    this.cargarReintegros();
  }

  /**
   * Limpia todos los filtros
   */
  limpiarFiltros(): void {
    this.filtros = {
      estado: 'pendiente'
    };
    this.cargarReintegros();
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
      case 'verificar':
        this.verificarReintegro(item);
        break;
      case 'solicitar_correccion':
        this.solicitarCorrecciones(item);
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
          <div><strong class="text-gray-700">Días Pendientes:</strong><br><span class="text-orange-600 font-bold">${reintegro.dias_pendientes || 0} días</span></div>
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

        <!-- Comentarios -->
        ${reintegro.comentario_registro ? `
        <div class="pt-2 border-t">
          <strong class="text-gray-700">Comentario del Solicitante:</strong>
          <div class="mt-1 p-3 bg-blue-50 rounded-lg border text-sm">${reintegro.comentario_registro}</div>
        </div>
        ` : ''}

        ${reintegro.observaciones_correccion ? `
        <div class="pt-2 border-t">
          <strong class="text-red-700">Correcciones Anteriores:</strong>
          <div class="mt-1 p-3 bg-red-50 rounded-lg border-l-4 border-red-400 text-sm">${reintegro.observaciones_correccion}</div>
        </div>
        ` : ''}

        ${reintegro.comentario_verificacion ? `
        <div class="pt-2 border-t">
          <strong class="text-green-700">Comentario de Verificación:</strong>
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
      title: `<span class="text-lg font-bold text-gray-800">Reintegro #${reintegro.id} - ${UtilidadesReintegros.obtenerEtiquetaTipoOrden(reintegro.tipo_orden)}</span>`,
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

  /**
   * Verifica/aprueba un reintegro
   */
  verificarReintegro(reintegro: ReintegroAnticipoFormatted): void {
    Swal.fire({
      title: 'Verificar Reintegro',
      html: `
        <div class="text-left mb-4">
          <p class="mb-3">Está a punto de <strong class="text-green-600">APROBAR</strong> el siguiente reintegro:</p>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div><strong>ID:</strong> ${reintegro.id}</div>
              <div><strong>Solicitante:</strong> ${reintegro.nombre_usuario_registra || reintegro.usuario_registra}</div>
              <div><strong>Monto:</strong> ${reintegro.monto_anticipo_formatted || UtilidadesReintegros.formatearMonto(reintegro.monto_anticipo)}</div>
              <div><strong>No. Boleta:</strong> ${reintegro.numero_boleta}</div>
            </div>
          </div>
        </div>
        <div class="text-left">
          <label for="comentario_verificacion" class="block text-sm font-medium text-gray-700 mb-2">
            Comentario de Verificación (Opcional):
          </label>
          <textarea 
            id="comentario_verificacion" 
            class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" 
            rows="3" 
            placeholder="Comentario adicional sobre la verificación..."></textarea>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Verificar y Aprobar',
      cancelButtonText: 'Cancelar',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        const comentario = (document.getElementById('comentario_verificacion') as HTMLTextAreaElement)?.value || '';

        const datosVerificacion: VerificarReintegro = {
          id: reintegro.id!,
          usuario_verificador: this.usuarioVerificador,
          comentario_verificacion: comentario.trim() || undefined
        };

        return this.reintegrosService.verificarReintegro(datosVerificacion)
          .toPromise()
          .then(response => {
            if (response?.respuesta !== 'success') {
              throw new Error(response?.mensaje?.join(', ') || 'Error al verificar');
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
          'Reintegro verificado y aprobado exitosamente',
          'Verificación Exitosa'
        );
        this.cargarReintegros();
      }
    });
  }

  /**
   * Solicita correcciones en un reintegro
   */
  solicitarCorrecciones(reintegro: ReintegroAnticipoFormatted): void {
    Swal.fire({
      title: 'Solicitar Correcciones',
      html: `
        <div class="text-left mb-4">
          <p class="mb-3">Solicitar correcciones para el reintegro:</p>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div><strong>ID:</strong> ${reintegro.id}</div>
              <div><strong>Solicitante:</strong> ${reintegro.nombre_usuario_registra || reintegro.usuario_registra}</div>
              <div><strong>Monto:</strong> ${reintegro.monto_anticipo_formatted || UtilidadesReintegros.formatearMonto(reintegro.monto_anticipo)}</div>
              <div><strong>No. Boleta:</strong> ${reintegro.numero_boleta}</div>
            </div>
          </div>
        </div>
        <div class="text-left">
          <label for="observaciones_correccion" class="block text-sm font-medium text-gray-700 mb-2">
            Observaciones y Correcciones Requeridas <span class="text-red-500">*</span>:
          </label>
          <textarea 
            id="observaciones_correccion" 
            class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" 
            rows="4" 
            placeholder="Detalle específicamente qué debe corregir el usuario..."
            required></textarea>
          <p class="text-xs text-gray-500 mt-1">Sea específico sobre las correcciones requeridas</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ea580c',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Solicitar Correcciones',
      cancelButtonText: 'Cancelar',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        const observaciones = (document.getElementById('observaciones_correccion') as HTMLTextAreaElement)?.value || '';

        if (!observaciones.trim()) {
          Swal.showValidationMessage('Debe especificar las correcciones requeridas');
          return false;
        }

        const datosCorreccion: SolicitarCorreccion = {
          id: reintegro.id!,
          usuario_verificador: this.usuarioVerificador,
          observaciones_correccion: observaciones.trim()
        };

        return this.reintegrosService.solicitarCorreccion(datosCorreccion)
          .toPromise()
          .then(response => {
            if (response?.respuesta !== 'success') {
              throw new Error(response?.mensaje?.join(', ') || 'Error al solicitar correcciones');
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
          'Correcciones solicitadas exitosamente. El usuario será notificado.',
          'Correcciones Enviadas'
        );
        this.cargarReintegros();
      }
    });
  }

  /**
   * Validaciones de estado
   */
  private puedeVerificar(estado: string): boolean {
    return ['pendiente', 'en_revision'].includes(estado);
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
}