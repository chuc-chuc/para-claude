// src/app/modules/transferencias/aprobacion/components/listado-aprobacion/listado-aprobacion.component.ts

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import {
  SolicitudTransferencia,
  FormatHelper,
  FacturaDetalle,
  ArchivoTransferencia
} from '../../models/transferencias.models';

import { TransferenciasService } from '../../services/transferencias.service';

@Component({
  selector: 'app-listado-aprobacion',
  standalone: true,
  imports: [CommonModule],
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

  // Detalle en memoria
  readonly detalleCache = signal<Map<number, { facturas: FacturaDetalle[], archivos: ArchivoTransferencia[] }>>(new Map());

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

  // === VER DETALLE EN MODAL ===
  async verDetalle(solicitud: SolicitudTransferencia): Promise<void> {
    let detalle = this.detalleCache().get(solicitud.id);

    if (!detalle) {
      try {
        const response = await this.service.obtenerDetalleSolicitud(solicitud.id).toPromise();
        detalle = {
          facturas: response?.facturas_detalle || [],
          archivos: response?.archivos || []
        };
        this.detalleCache.update(map => map.set(solicitud.id, detalle!));
      } catch {
        Swal.fire('Error', 'No se pudo cargar el detalle.', 'error');
        return;
      }
    }

    const facturasHtml = detalle.facturas.length > 0
      ? `<table class="swal2-table"><thead><tr><th>Factura</th><th>Emisor</th><th>Monto</th></tr></thead><tbody>
         ${detalle.facturas.map(f => `<tr><td>${f.numero_factura}</td><td>${f.nombre_emisor}</td><td class="text-right">${this.formatMonto(f.monto_total_factura ?? 0)}</td></tr>`).join('')}
         </tbody></table>`
      : '<p class="text-gray-500">Sin facturas</p>';

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
            <div><strong>Banco:</strong> ${solicitud.banco_nombre}</div>
            <div><strong>Cuenta:</strong> ${solicitud.banco_cuenta}</div>
            <div><strong>Monto:</strong> <span class="text-green-600 font-medium">${this.formatMonto(solicitud.monto_total_solicitud)}</span></div>
            <div><strong>Creado:</strong> ${this.formatFechaHora(solicitud.fecha_creacion)}</div>
            <div><strong>Facturas:</strong> ${solicitud.facturas_numeros.split(',').length}</div>
            <div><strong>Usuario ID:</strong> ${solicitud.creado_por}</div>
          </div>
          <hr>
          <div><strong>Facturas:</strong></div>
          ${facturasHtml}
          ${archivosHtml ? `<div class="mt-3"><strong>Archivos:</strong>${archivosHtml}</div>` : ''}
        </div>
      `,
      width: '640px',
      showCancelButton: true,
      confirmButtonText: 'Aprobar',
      cancelButtonText: 'Rechazar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#ef4444',
      customClass: {
        popup: 'swal2-detail-modal',
        confirmButton: 'swal2-styled',
        cancelButton: 'swal2-styled'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.aprobarRapido(solicitud);
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        this.rechazarRapido(solicitud);
      }
    });
  }

  // === APROBAR RÁPIDO ===
  aprobarRapido(solicitud: SolicitudTransferencia): void {
    Swal.fire({
      icon: 'question',
      title: '¿Aprobar?',
      text: `${solicitud.codigo_solicitud} - ${this.formatMonto(solicitud.monto_total_solicitud)}`,
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarAccion({ solicitud_id: solicitud.id, accion: 'aprobado' }, 'aprobada');
      }
    });
  }

  // === RECHAZAR RÁPIDO ===
  rechazarRapido(solicitud: SolicitudTransferencia): void {
    Swal.fire({
      icon: 'warning',
      title: 'Rechazar solicitud',
      html: `
        <p><strong>${solicitud.codigo_solicitud}</strong></p>
        <textarea id="motivo" class="swal2-textarea mt-2" placeholder="Motivo (mín. 10 caracteres)..."></textarea>
      `,
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      preConfirm: () => {
        const motivo = (document.getElementById('motivo') as HTMLTextAreaElement)?.value?.trim();
        if (!motivo || motivo.length < 10) {
          Swal.showValidationMessage('Mínimo 10 caracteres');
        }
        return motivo;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarAccion({
          solicitud_id: solicitud.id,
          accion: 'rechazado',
          comentario: result.value
        }, 'rechazada');
      }
    });
  }

  private ejecutarAccion(payload: any, accion: string): void {
    Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const obs = payload.accion === 'aprobado'
      ? this.service.aprobarSolicitud(payload)
      : this.service.rechazarSolicitud(payload);

    obs.subscribe({
      next: (exito) => {
        if (exito) {
          Swal.fire('¡Éxito!', `Solicitud ${accion}.`, 'success').then(() => this.refrescarDatos());
        } else {
          Swal.fire('Error', `No se pudo ${accion} la solicitud.`, 'error');
        }
      },
      error: () => Swal.fire('Error', 'Error de conexión.', 'error')
    });
  }

  trackBySolicitud(_: number, s: SolicitudTransferencia): number {
    return s.id;
  }
}