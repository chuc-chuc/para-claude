// listado-tesoreria.component.ts (OPTIMIZADO)

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import {
  SolicitudTransferencia,
  FormatHelper,
  PermisosHelper,
  EstadoSolicitud
} from '../../models/transferencias.models';

import { TransferenciasService } from '../../services/transferencias.service';
import { ModalSolicitudComponent } from '../modals/modal-solicitud/modal-solicitud.component';
import { ModalRegistrarComprobanteComponent } from '../modals/modal-registrar-comprobante/modal-registrar-comprobante.component';
import { DetalleTransferenciaModalComponent } from '../modals/detalle-transferencia-modal/detalle-transferencia-modal.component';

@Component({
  selector: 'app-listado-tesoreria',
  standalone: true,
  imports: [
    CommonModule,
    ModalSolicitudComponent,
    ModalRegistrarComprobanteComponent,
    DetalleTransferenciaModalComponent
  ],
  templateUrl: './listado-tesoreria.component.html',
  styleUrls: ['./listado-tesoreria.component.css']
})
export class ListadoTesoreriaComponent implements OnInit, OnDestroy {

  readonly service = inject(TransferenciasService);
  private readonly destroy$ = new Subject<void>();

  // Estado
  readonly solicitudes = signal<SolicitudTransferencia[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly filtroBusqueda = signal<string>('');

  // Modales
  readonly mostrarModalSolicitud = signal<boolean>(false);
  readonly mostrarModalComprobante = signal<boolean>(false);
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

  // Helpers de formato
  readonly formatMonto = FormatHelper.formatMonto;
  readonly formatFecha = FormatHelper.formatFecha;
  readonly getEtiquetaEstado = FormatHelper.getEtiquetaEstado;
  readonly getColorEstado = FormatHelper.getColorEstado;
  readonly getEtiquetaArea = FormatHelper.getEtiquetaArea;

  // Permisos
  readonly puedeEditar = (estado: EstadoSolicitud) => PermisosHelper.puedeEditar(estado);
  readonly puedeRegistrarComprobante = (estado: EstadoSolicitud) => PermisosHelper.puedeRegistrarComprobante(estado);
  readonly puedeCancelar = (estado: EstadoSolicitud) => PermisosHelper.puedeCancelar(estado);

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
      .subscribe(solicitudes => this.solicitudes.set(solicitudes));

    this.service.cargando$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cargando => this.cargando.set(cargando));
  }

  private cargarDatos(): void {
    this.service.listarSolicitudes().subscribe();
  }

  refrescarDatos(): void {
    this.service.listarSolicitudes().subscribe();
  }

  buscar(termino: string): void {
    this.filtroBusqueda.set(termino);
  }

  // ============================================================================
  // ACCIONES DE MODALES
  // ============================================================================

  abrirModalSolicitud(solicitud?: SolicitudTransferencia): void {
    this.solicitudSeleccionada.set(solicitud || null);
    this.mostrarModalSolicitud.set(true);
  }

  cerrarModalSolicitud(): void {
    this.mostrarModalSolicitud.set(false);
    this.solicitudSeleccionada.set(null);
  }

  onSolicitudGuardada(): void {
    this.cerrarModalSolicitud();
    this.refrescarDatos();
  }

  verDetalle(solicitud: SolicitudTransferencia): void {
    this.solicitudSeleccionada.set(solicitud);
    this.mostrarModalDetalle.set(true);
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle.set(false);
    this.solicitudSeleccionada.set(null);
  }

  editarSolicitud(solicitud: SolicitudTransferencia): void {
    if (this.puedeEditar(solicitud.estado)) {
      this.abrirModalSolicitud(solicitud);
    }
  }

  registrarComprobante(solicitud: SolicitudTransferencia): void {
    if (this.puedeRegistrarComprobante(solicitud.estado)) {
      this.solicitudSeleccionada.set(solicitud);
      this.mostrarModalComprobante.set(true);
    }
  }

  cerrarModalComprobante(): void {
    this.mostrarModalComprobante.set(false);
    this.solicitudSeleccionada.set(null);
  }

  onComprobanteRegistrado(): void {
    this.cerrarModalComprobante();
    this.refrescarDatos();
  }

  // ============================================================================
  // CANCELAR SOLICITUD
  // ============================================================================

  cancelarSolicitud(solicitud: SolicitudTransferencia): void {
    if (!this.puedeCancelar(solicitud.estado)) return;

    Swal.fire({
      title: '¿Cancelar solicitud?',
      html: `
        <div class="text-left">
          <p class="mb-2">Está a punto de cancelar:</p>
          <div class="bg-gray-50 rounded p-3 mb-3">
            <p class="text-sm"><strong>Código:</strong> ${solicitud.codigo_solicitud}</p>
            <p class="text-sm"><strong>Monto:</strong> ${this.formatMonto(solicitud.monto_total_solicitud)}</p>
          </div>
        </div>
      `,
      input: 'textarea',
      inputLabel: 'Motivo de cancelación',
      inputPlaceholder: 'Escriba el motivo (mínimo 10 caracteres)...',
      inputAttributes: {
        'aria-label': 'Motivo de cancelación',
        'rows': '3'
      },
      inputValidator: (value) => {
        if (!value || value.trim().length < 10) {
          return 'Debe ingresar un motivo válido (mínimo 10 caracteres)';
        }
        return null;
      },
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      icon: 'warning',
      customClass: {
        popup: 'swal2-custom-popup',
        confirmButton: 'swal2-styled',
        cancelButton: 'swal2-styled'
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const payload = {
          solicitud_id: solicitud.id,
          motivo: result.value.trim()
        };
        this.service.cancelarSolicitud(payload)
          .pipe(takeUntil(this.destroy$))
          .subscribe(exito => {
            if (exito) {
              this.refrescarDatos();
              Swal.fire({
                icon: 'success',
                title: 'Cancelada',
                text: 'La solicitud ha sido cancelada.',
                confirmButtonColor: '#10b981'
              });
            }
          });
      }
    });
  }

  trackBySolicitud(_: number, s: SolicitudTransferencia): number {
    return s.id;
  }
}