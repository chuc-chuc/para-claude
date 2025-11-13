// listado-aprobacion.component.ts (OPTIMIZADO)

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import {
  SolicitudTransferencia,
  FormatHelper
} from '../models/transferencias.models';

import { TransferenciasService } from '../services/transferencias.service';
import { DetalleTransferenciaModalComponent } from '../tesoreria/modals/detalle-transferencia-modal/detalle-transferencia-modal.component';

@Component({
  selector: 'app-listado-aprobacion',
  standalone: true,
  imports: [CommonModule, DetalleTransferenciaModalComponent],
  templateUrl: './listado-aprobacion.component.html',
  styleUrls: ['./listado-aprobacion.component.css']
})
export class ListadoAprobacionComponent implements OnInit, OnDestroy {

  readonly service = inject(TransferenciasService);
  private readonly destroy$ = new Subject<void>();

  // Estado
  readonly solicitudes = signal<SolicitudTransferencia[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly filtroBusqueda = signal<string>('');
  readonly mostrarModalDetalle = signal<boolean>(false);
  readonly solicitudSeleccionada = signal<SolicitudTransferencia | null>(null);

  // Filtros computados
  readonly solicitudesFiltradas = computed(() => {
    const busqueda = this.filtroBusqueda().toLowerCase().trim();
    if (!busqueda) return this.solicitudes();

    return this.solicitudes().filter(s =>
      s.codigo_solicitud.toLowerCase().includes(busqueda) ||
      s.facturas_numeros.toLowerCase().includes(busqueda) ||
      s.banco_nombre?.toLowerCase().includes(busqueda)
    );
  });

  // Estadísticas computadas
  readonly estadisticas = computed(() => {
    const solicitudes = this.solicitudes();
    const montoTotal = solicitudes.reduce((acc, s) => acc + s.monto_total_solicitud, 0);
    return {
      total: solicitudes.length,
      montoTotal
    };
  });

  // Helpers de formato
  readonly formatMonto = FormatHelper.formatMonto;
  readonly formatFecha = FormatHelper.formatFecha;
  readonly formatFechaHora = FormatHelper.formatFechaHora;

  ngOnInit(): void {
    this.suscribirAServicios();
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private suscribirAServicios(): void {
    this.service.solicitudes$
      .pipe(takeUntil(this.destroy$))
      .subscribe(solicitudes => {
        const pendientes = solicitudes.filter(s => s.estado === 'pendiente_aprobacion');
        this.solicitudes.set(pendientes);
      });

    this.service.cargando$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cargando => this.cargando.set(cargando));
  }

  private cargarDatos(): void {
    this.service.listarSolicitudesPendientes().subscribe();
  }

  refrescarDatos(): void {
    this.service.listarSolicitudesPendientes().subscribe();
  }

  buscar(termino: string): void {
    this.filtroBusqueda.set(termino);
  }

  // ============================================================================
  // VER DETALLE
  // ============================================================================

  verDetalle(solicitud: SolicitudTransferencia): void {
    this.solicitudSeleccionada.set(solicitud);
    this.mostrarModalDetalle.set(true);
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle.set(false);
    this.solicitudSeleccionada.set(null);
  }

  // ============================================================================
  // APROBAR RÁPIDO CON CONFIRMACIÓN
  // ============================================================================

  aprobarRapido(solicitud: SolicitudTransferencia): void {
    Swal.fire({
      icon: 'question',
      title: '¿Aprobar solicitud?',
      html: `
        <div class="text-left space-y-3">
          <div class="bg-gray-50 rounded-lg p-4">
            <p class="text-sm mb-2"><strong>Código:</strong> ${solicitud.codigo_solicitud}</p>
            <p class="text-sm mb-2"><strong>Monto:</strong> <span class="text-green-600 font-bold">${this.formatMonto(solicitud.monto_total_solicitud)}</span></p>
            <p class="text-sm mb-2"><strong>Banco:</strong> ${solicitud.banco_nombre}</p>
            <p class="text-sm"><strong>Facturas:</strong> ${solicitud.facturas_numeros.split(',').length}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Comentario (opcional)</label>
            <textarea id="comentario-aprobacion" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" 
              rows="3" placeholder="Agregar comentario..."></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      width: '500px',
      customClass: {
        popup: 'swal2-custom-popup'
      },
      preConfirm: () => {
        const comentario = (document.getElementById('comentario-aprobacion') as HTMLTextAreaElement)?.value?.trim();
        return comentario || undefined;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarAprobacion(solicitud.id, result.value);
      }
    });
  }

  // ============================================================================
  // RECHAZAR CON MOTIVO OBLIGATORIO
  // ============================================================================

  rechazarRapido(solicitud: SolicitudTransferencia): void {
    Swal.fire({
      icon: 'warning',
      title: 'Rechazar solicitud',
      html: `
        <div class="text-left space-y-3">
          <div class="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
            <p class="text-sm mb-2"><strong>Código:</strong> ${solicitud.codigo_solicitud}</p>
            <p class="text-sm mb-2"><strong>Monto:</strong> ${this.formatMonto(solicitud.monto_total_solicitud)}</p>
            <p class="text-sm"><strong>Banco:</strong> ${solicitud.banco_nombre}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Motivo del rechazo <span class="text-red-500">*</span>
              <span class="text-xs font-normal text-gray-500">(mínimo 10 caracteres)</span>
            </label>
            <textarea id="motivo-rechazo" class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent" 
              rows="4" placeholder="Especifique el motivo del rechazo..."></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      width: '500px',
      customClass: {
        popup: 'swal2-custom-popup'
      },
      preConfirm: () => {
        const motivo = (document.getElementById('motivo-rechazo') as HTMLTextAreaElement)?.value?.trim();
        if (!motivo || motivo.length < 10) {
          Swal.showValidationMessage('El motivo debe tener al menos 10 caracteres');
          return false;
        }
        return motivo;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.ejecutarRechazo(solicitud.id, result.value);
      }
    });
  }

  // ============================================================================
  // ACCIONES MASIVAS (OPCIONAL)
  // ============================================================================

  aprobarYVerSiguiente(solicitud: SolicitudTransferencia): void {
    Swal.fire({
      icon: 'question',
      title: '¿Aprobar y continuar?',
      html: `
        <div class="text-left">
          <p class="mb-3">Se aprobará:</p>
          <div class="bg-green-50 rounded-lg p-3">
            <p class="text-sm"><strong>${solicitud.codigo_solicitud}</strong></p>
            <p class="text-sm text-green-600 font-bold">${this.formatMonto(solicitud.monto_total_solicitud)}</p>
          </div>
          <p class="mt-3 text-sm text-gray-600">Luego se mostrará la siguiente solicitud pendiente.</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Aprobar y continuar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarAprobacion(solicitud.id, undefined, true);
      }
    });
  }

  // ============================================================================
  // EJECUCIÓN DE ACCIONES
  // ============================================================================

  private ejecutarAprobacion(solicitudId: number, comentario?: string, continuarAlSiguiente: boolean = false): void {
    // Mostrar loading
    Swal.fire({
      title: 'Procesando...',
      html: 'Aprobando solicitud',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const payload = {
      solicitud_id: solicitudId,
      accion: 'aprobado' as const,
      comentario
    };

    this.service.aprobarSolicitud(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (exito) => {
          if (exito) {
            Swal.fire({
              icon: 'success',
              title: '¡Aprobada!',
              text: 'La solicitud ha sido aprobada correctamente',
              timer: 2000,
              showConfirmButton: false
            }).then(() => {
              this.refrescarDatos();

              // Si es aprobar y continuar, mostrar siguiente
              if (continuarAlSiguiente) {
                setTimeout(() => {
                  const siguiente = this.solicitudes()[0];
                  if (siguiente) {
                    this.verDetalle(siguiente);
                  } else {
                    Swal.fire({
                      icon: 'info',
                      title: 'Sin más pendientes',
                      text: 'No hay más solicitudes por aprobar',
                      confirmButtonColor: '#3b82f6'
                    });
                  }
                }, 500);
              }
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo aprobar la solicitud',
              confirmButtonColor: '#ef4444'
            });
          }
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'No se pudo completar la operación',
            confirmButtonColor: '#ef4444'
          });
        }
      });
  }

  private ejecutarRechazo(solicitudId: number, comentario: string): void {
    // Mostrar loading
    Swal.fire({
      title: 'Procesando...',
      html: 'Rechazando solicitud',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const payload = {
      solicitud_id: solicitudId,
      accion: 'rechazado' as const,
      comentario
    };

    this.service.rechazarSolicitud(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (exito) => {
          if (exito) {
            Swal.fire({
              icon: 'success',
              title: 'Rechazada',
              text: 'La solicitud ha sido rechazada',
              timer: 2000,
              showConfirmButton: false
            }).then(() => {
              this.refrescarDatos();
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo rechazar la solicitud',
              confirmButtonColor: '#ef4444'
            });
          }
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'No se pudo completar la operación',
            confirmButtonColor: '#ef4444'
          });
        }
      });
  }

  trackBySolicitud(_: number, s: SolicitudTransferencia): number {
    return s.id;
  }

  // Agregar al listado-aprobacion.component.ts

  mostrarAyuda(): void {
    Swal.fire({
      icon: 'info',
      title: 'Guía de Aprobación',
      html: `
      <div class="text-left text-sm space-y-3">
        <div class="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-500">
          <p class="font-semibold text-blue-900 mb-1">Ver Detalle</p>
          <p class="text-gray-700">Haga clic en el ícono de ojo para ver toda la información de la solicitud antes de aprobar o rechazar.</p>
        </div>
        
        <div class="bg-green-50 rounded-lg p-3 border-l-4 border-green-500">
          <p class="font-semibold text-green-900 mb-1">Aprobar</p>
          <p class="text-gray-700">Puede agregar un comentario opcional. La solicitud pasará a estado "Aprobado" y tesorería podrá registrar el comprobante.</p>
        </div>
        
        <div class="bg-red-50 rounded-lg p-3 border-l-4 border-red-500">
          <p class="font-semibold text-red-900 mb-1">Rechazar</p>
          <p class="text-gray-700">Debe proporcionar un motivo (mínimo 10 caracteres). La solicitud pasará a estado "Rechazado" y tesorería podrá editarla y reenviarla.</p>
        </div>

        <div class="bg-gray-50 rounded-lg p-3 border-l-4 border-gray-500">
          <p class="font-semibold text-gray-900 mb-1">Actualizar</p>
          <p class="text-gray-700">Use el botón "Actualizar" para verificar si hay nuevas solicitudes pendientes.</p>
        </div>
      </div>
    `,
      width: '600px',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#3b82f6'
    });
  }
}