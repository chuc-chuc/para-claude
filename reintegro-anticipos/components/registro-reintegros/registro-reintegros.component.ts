import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

// Servicios
import { ServicioGeneralService } from '../../../../servicios/servicio-general.service';
import { ReintegrosService } from '../../services/reintegros.service';

// Modelos y constantes
import {
  ReintegroAnticipoFormatted,
  ValidadoresReintegros,
  UtilidadesReintegros
} from '../../models/reintegros-anticipos.model';

// Componentes
import { GenericTableComponent } from '../../../../generic-table/generic-table.component';
import { TableAction, TableColumn, TableConfig } from '../../../../model/generic-table.model';
import { ModalReintegrosComponent, TipoModal } from '../modal-reintegros/modal-reintegros.component';

@Component({
  selector: 'app-registro-reintegros',
  standalone: true,
  imports: [
    CommonModule,
    GenericTableComponent,
    ModalReintegrosComponent
  ],
  templateUrl: './registro-reintegros.component.html',
  styleUrl: './registro-reintegros.component.css'
})
export class RegistroReintegrosComponent implements OnInit, OnDestroy {

  // Estado del componente
  cargandoMisReintegros = false;
  usuarioActual: string = '';
  modalAyudaVisible = false; // Nueva propiedad para el modal de ayuda

  // Datos para mostrar
  misReintegros: ReintegroAnticipoFormatted[] = [];

  // Estado del modal de reintegros
  modalVisible = false;
  modalTipo: TipoModal = 'crear';
  reintegroParaEditar: ReintegroAnticipoFormatted | null = null;

  // Constantes
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
    private servicioGeneral: ServicioGeneralService,
    private reintegrosService: ReintegrosService
  ) { }

  ngOnInit(): void {
    this.obtenerUsuarioActual();
    this.cargarMisReintegros();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Obtiene el usuario actual
   */
  private obtenerUsuarioActual(): void {
    this.usuarioActual = localStorage.getItem('usuario_id') || '01JSFRXWDXJSARB23SPPQ6EW89';
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
   * Abre el modal para crear un nuevo reintegro
   */
  abrirModalCrear(): void {
    this.modalTipo = 'crear';
    this.reintegroParaEditar = null;
    this.modalVisible = true;
  }

  /**
   * Abre el modal de ayuda
   */
  abrirModalAyuda(): void {
    this.modalAyudaVisible = true;
  }

  /**
   * Cierra el modal de ayuda
   */
  cerrarModalAyuda(): void {
    this.modalAyudaVisible = false;
  }

  /**
   * Abre el modal para editar un reintegro existente
   */
  abrirModalEditar(reintegro: ReintegroAnticipoFormatted): void {
    if (!this.puedeEditar(reintegro.estado)) {
      this.servicioGeneral.mensajeServidor('warning',
        `No se puede editar un reintegro en estado "${UtilidadesReintegros.obtenerEtiquetaEstado(reintegro.estado)}"`,
        'Edición No Permitida'
      );
      return;
    }

    if (reintegro.usuario_registra !== this.usuarioActual) {
      this.servicioGeneral.mensajeServidor('error',
        'No tienes permisos para editar este reintegro',
        'Acceso Denegado'
      );
      return;
    }

    this.modalTipo = 'editar';
    this.reintegroParaEditar = reintegro;
    this.modalVisible = true;
  }

  /**
   * Cierra el modal de reintegros
   */
  cerrarModal(): void {
    this.modalVisible = false;
    this.reintegroParaEditar = null;
  }

  /**
   * Maneja el evento cuando se guarda un reintegro
   */
  onReintegroGuardado(): void {
    this.cargarMisReintegros();
  }

  /**
   * Maneja las acciones de la tabla
   */
  manejarAccionFila(evento: { action: string, item: ReintegroAnticipoFormatted }): void {
    const { action, item } = evento;

    switch (action) {
      case 'editar':
        this.abrirModalEditar(item);
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
   * Muestra los detalles completos del reintegro
   */
  verDetallesReintegro(reintegro: ReintegroAnticipoFormatted): void {
    const estadoClase = this.obtenerClaseEstado(reintegro.estado);

    const detallesHTML = `
      <div class="text-left space-y-4 max-h-96 overflow-y-auto">
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
        ${reintegro.fecha_verificacion_formatted ? `
        <div class="grid grid-cols-2 gap-4">
          <div><strong class="text-gray-700">Verificado por:</strong><br><span class="text-green-600">${reintegro.nombre_verificador || reintegro.usuario_verificador}</span></div>
          <div><strong class="text-gray-700">Fecha Verificación:</strong><br><span class="text-green-600 font-semibold">${reintegro.fecha_verificacion_formatted}</span></div>
        </div>
        ` : ''}
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
    if (!this.puedeEliminar(reintegro.estado)) {
      this.servicioGeneral.mensajeServidor('warning',
        `No se puede eliminar un reintegro en estado "${UtilidadesReintegros.obtenerEtiquetaEstado(reintegro.estado)}"`,
        'Eliminación No Permitida'
      );
      return;
    }

    if (reintegro.usuario_registra !== this.usuarioActual) {
      this.servicioGeneral.mensajeServidor('error',
        'No tienes permisos para eliminar este reintegro',
        'Acceso Denegado'
      );
      return;
    }

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
   * Obtiene contador por estado para las estadísticas
   */
  obtenerContadorPorEstado(estado: string): number {
    return this.misReintegros.filter(r => r.estado === estado).length;
  }

  /**
   * Obtiene el monto total de reintegros
   */
  obtenerMontoTotal(): number {
    return this.misReintegros.reduce((total, r) => total + (r.monto_anticipo || 0), 0);
  }

  /**
   * Obtiene el monto total formateado
   */
  obtenerMontoTotalFormateado(): string {
    return UtilidadesReintegros.formatearMonto(this.obtenerMontoTotal());
  }

  /**
   * Obtiene el último reintegro registrado
   */
  obtenerUltimoReintegro(): ReintegroAnticipoFormatted | null {
    if (this.misReintegros.length === 0) return null;

    return this.misReintegros.reduce((ultimo, actual) => {
      const fechaUltimo = new Date(ultimo.fecha_creacion || 0);
      const fechaActual = new Date(actual.fecha_creacion || 0);
      return fechaActual > fechaUltimo ? actual : ultimo;
    });
  }

  /**
   * Obtiene reintegros pendientes de corrección
   */
  obtenerReintegrosPendientesCorreccion(): ReintegroAnticipoFormatted[] {
    return this.misReintegros.filter(r => r.estado === 'rechazado');
  }

  /**
   * Verifica si hay alertas importantes
   */
  tieneAlertasImportantes(): boolean {
    return this.obtenerReintegrosPendientesCorreccion().length > 0;
  }

  /**
   * Obtiene el mensaje de alerta principal
   */
  obtenerMensajeAlertaPrincipal(): string {
    const pendientesCorreccion = this.obtenerReintegrosPendientesCorreccion().length;

    if (pendientesCorreccion > 0) {
      return `Tienes ${pendientesCorreccion} reintegro${pendientesCorreccion > 1 ? 's' : ''} que requiere${pendientesCorreccion > 1 ? 'n' : ''} corrección`;
    }

    return '';
  }

  /**
   * Filtra reintegros por estado
   */
  filtrarPorEstado(estado: string): void {
    console.log(`Filtrar por estado: ${estado}`);
  }

  /**
   * Exporta reintegros a CSV
   */
  exportarReintegros(): void {
    if (this.misReintegros.length === 0) {
      this.servicioGeneral.mensajeServidor('warning',
        'No hay datos para exportar',
        'Sin Datos'
      );
      return;
    }

    this.reintegrosService.exportarReintegros(this.misReintegros);
    this.servicioGeneral.mensajeServidor('success',
      'Archivo CSV descargado exitosamente',
      'Exportación Exitosa'
    );
  }

  /**
   * Actualiza los datos (refresh)
   */
  actualizarDatos(): void {
    this.cargarMisReintegros();
  }

  /**
   * Navega a un reintegro específico para editarlo
   */
  navegarAEditar(id: number): void {
    const reintegro = this.misReintegros.find(r => r.id === id);
    if (reintegro) {
      this.abrirModalEditar(reintegro);
    }
  }

  /**
   * Obtiene resumen estadístico
   */
  obtenerResumenEstadistico(): any {
    const total = this.misReintegros.length;
    const verificados = this.obtenerContadorPorEstado('verificado');
    const pendientes = this.obtenerContadorPorEstado('pendiente');
    const rechazados = this.obtenerContadorPorEstado('rechazado');
    const montoTotal = this.obtenerMontoTotal();

    return {
      total,
      verificados,
      pendientes,
      rechazados,
      montoTotal,
      montoTotalFormateado: UtilidadesReintegros.formatearMonto(montoTotal),
      porcentajeAprobacion: total > 0 ? Math.round((verificados / total) * 100) : 0
    };
  }

  /**
   * Utilidades privadas para validaciones
   */
  private obtenerClaseEstado(estado: string): string {
    return UtilidadesReintegros.obtenerClaseEstado(estado as any);
  }

  private puedeEditar(estado: string): boolean {
    return ValidadoresReintegros.puedeEditar(estado as any);
  }

  private puedeEliminar(estado: string): boolean {
    return ValidadoresReintegros.puedeEliminar(estado as any);
  }

  /**
   * Manejo de errores centralizado
   */
  private manejarError(error: any, mensaje: string = 'Error inesperado'): void {
    console.error(mensaje, error);
    this.servicioGeneral.mensajeServidor('error', mensaje, 'Error');
  }

  /**
   * Validaciones de permisos
   */
  private validarPermisoEdicion(reintegro: ReintegroAnticipoFormatted): boolean {
    return reintegro.usuario_registra === this.usuarioActual && this.puedeEditar(reintegro.estado);
  }

  private validarPermisoEliminacion(reintegro: ReintegroAnticipoFormatted): boolean {
    return reintegro.usuario_registra === this.usuarioActual && this.puedeEliminar(reintegro.estado);
  }
}