// src/app/modules/transferencias/tesoreria/components/listado-tesoreria/listado-tesoreria.component.ts

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import {
  SolicitudTransferencia,
  FormatHelper,
  FacturaDetalle,
  AprobacionTransferencia,
  ArchivoTransferencia,
  PermisosHelper,
  EstadoSolicitud
} from '../../models/transferencias.models';

import { TransferenciasService } from '../../services/transferencias.service';
import { ModalSolicitudComponent } from '../modals/modal-solicitud/modal-solicitud.component';
import { ModalRegistrarComprobanteComponent } from '../modals/modal-registrar-comprobante/modal-registrar-comprobante.component';

@Component({
  selector: 'app-listado-tesoreria',
  standalone: true,
  imports: [
    CommonModule,
    ModalSolicitudComponent,
    ModalRegistrarComprobanteComponent
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
  readonly solicitudSeleccionada = signal<SolicitudTransferencia | null>(null);

  // Cache para detalles
  readonly detalleCache = signal<Map<number, { facturas: FacturaDetalle[], aprobacion: AprobacionTransferencia | null, archivos: ArchivoTransferencia[] }>>(new Map());

  // Filtros
  readonly solicitudesFiltradas = computed(() => {
    const busqueda = this.filtroBusqueda().toLowerCase().trim();
    return this.solicitudes().filter(s =>
      !busqueda ||
      s.codigo_solicitud.toLowerCase().includes(busqueda) ||
      s.facturas_numeros.toLowerCase().includes(busqueda) ||
      s.banco_nombre?.toLowerCase().includes(busqueda)
    );
  });

  // Helpers
  readonly formatMonto = FormatHelper.formatMonto;
  readonly formatFecha = FormatHelper.formatFecha;
  readonly formatFechaHora = FormatHelper.formatFechaHora;
  readonly formatTamano = FormatHelper.formatTamano;
  readonly getEtiquetaEstado = FormatHelper.getEtiquetaEstado;
  readonly getColorEstado = FormatHelper.getColorEstado;
  readonly getEtiquetaArea = FormatHelper.getEtiquetaArea;

  // Permisos
  puedeEditar = (estado: EstadoSolicitud): boolean => PermisosHelper.puedeEditar(estado);
  puedeRegistrarComprobante = (estado: EstadoSolicitud): boolean => PermisosHelper.puedeRegistrarComprobante(estado);
  puedeCancelar = (estado: EstadoSolicitud): boolean => PermisosHelper.puedeCancelar(estado);

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

  // === MODAL SOLICITUD (CREAR / EDITAR) ===
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

  // === VER DETALLE ===
  async verDetalle(solicitud: SolicitudTransferencia): Promise<void> {
    let detalle = this.detalleCache().get(solicitud.id);

    if (!detalle) {
      try {
        const response = await this.service.obtenerDetalleSolicitud(solicitud.id).toPromise();
        if (!response) return;
        detalle = {
          facturas: response.facturas_detalle || [],
          aprobacion: response.aprobacion || null,
          archivos: response.archivos || []
        };
        this.detalleCache.update(map => map.set(solicitud.id, detalle!));
      } catch {
        Swal.fire('Error', 'No se pudo cargar el detalle.', 'error');
        return;
      }
    }

    const facturasHtml = detalle.facturas.length > 0
      ? `<table class="swal2-table"><thead><tr><th>Factura</th><th>Emisor</th><th>Monto</th><th>Forma Pago</th></tr></thead><tbody>
         ${detalle.facturas.map(f => `<tr><td>${f.numero_factura}</td><td>${f.nombre_emisor}</td><td class="text-right">${this.formatMonto(f.monto_total_factura ?? 0)}</td><td>${f.forma_pago}</td></tr>`).join('')}
         </tbody></table>`
      : '<p class="text-gray-500">Sin facturas</p>';

    const aprobacionHtml = detalle.aprobacion
      ? `<div class="mt-3"><strong>Aprobación:</strong> ${detalle.aprobacion.comentario || 'Sin comentario'}</div>`
      : '';

    const archivosHtml = detalle.archivos.length > 0
      ? `<div class="mt-3 space-y-1">
         ${detalle.archivos.map(a => `<div class="flex justify-between text-xs"><span>${a.nombre_original}</span><span class="text-gray-500">${this.formatTamano(a.tamano_bytes)}</span></div>`).join('')}
         </div>`
      : '';

    Swal.fire({
      title: `Solicitud: ${solicitud.codigo_solicitud}`,
      html: `
        <div class="text-left text-sm space-y-3">
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div><strong>Estado:</strong> <span class="${this.getColorEstado(solicitud.estado).bg} ${this.getColorEstado(solicitud.estado).text} px-2 py-1 rounded-full text-xs font-medium">${this.getEtiquetaEstado(solicitud.estado)}</span></div>
            <div><strong>Banco:</strong> ${solicitud.banco_nombre}</div>
            <div><strong>Cuenta:</strong> ${solicitud.banco_cuenta}</div>
            <div><strong>Monto:</strong> <span class="text-green-600 font-medium">${this.formatMonto(solicitud.monto_total_solicitud)}</span></div>
            <div><strong>Creado:</strong> ${this.formatFechaHora(solicitud.fecha_creacion)}</div>
            <div><strong>Área:</strong> ${this.getEtiquetaArea(solicitud.area_aprobacion)}</div>
            <div><strong>Facturas:</strong> ${solicitud.facturas_numeros.split(',').length}</div>
            <div><strong>Usuario ID:</strong> ${solicitud.creado_por}</div>
          </div>
          <hr>
          <div><strong>Facturas:</strong></div>
          ${facturasHtml}
          ${aprobacionHtml}
          ${archivosHtml ? `<div class="mt-3"><strong>Archivos:</strong>${archivosHtml}</div>` : ''}
        </div>
      `,
      width: '640px',
      showConfirmButton: true,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#3b82f6'
    });
  }

  // === EDITAR ===
  editarSolicitud(solicitud: SolicitudTransferencia): void {
    if (this.puedeEditar(solicitud.estado)) {
      this.abrirModalSolicitud(solicitud);
    }
  }

  // === REGISTRAR COMPROBANTE ===
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

  // === CANCELAR CON SWAL ===
  cancelarSolicitud(solicitud: SolicitudTransferencia): void {
    if (!this.puedeCancelar(solicitud.estado)) return;

    Swal.fire({
      title: '¿Cancelar solicitud?',
      text: 'Esta acción no se puede deshacer.',
      input: 'textarea',
      inputLabel: 'Motivo de cancelación (mínimo 10 caracteres)',
      inputPlaceholder: 'Escribe el motivo aquí...',
      inputAttributes: {
        'aria-label': 'Motivo de cancelación'
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
      icon: 'warning'
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
              Swal.fire('Cancelada', 'La solicitud ha sido cancelada.', 'success');
            }
          });
      }
    });
  }

  trackBySolicitud(_: number, s: SolicitudTransferencia): number {
    return s.id;
  }
}