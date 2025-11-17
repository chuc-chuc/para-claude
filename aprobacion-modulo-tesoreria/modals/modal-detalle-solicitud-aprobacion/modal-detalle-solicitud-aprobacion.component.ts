import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, FileText, X, AlertCircle, Loader, CheckCircle2 } from 'lucide-angular';

import { LiquidacionesModuloTesoreriaService } from '../../services/liquidaciones-modulo-tesoreria.service';
import {
    DetalleSolicitudCompleto,
    FormatHelper,
    TipoLiquidacion,
    FacturaDetalleAPI,           // ← AÑADIDO
} from '../../models/liquidaciones-modulo-tesoreria.models';

@Component({
    selector: 'app-modal-detalle-solicitud-aprobacion',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    templateUrl: './modal-detalle-solicitud-aprobacion.component.html',
})
export class ModalDetalleSolicitudAprobacionComponent {
    @Input({ required: true }) solicitudId!: number;
    @Output() cerrar = new EventEmitter<void>();

    private readonly service = inject(LiquidacionesModuloTesoreriaService);

    detalle = signal<DetalleSolicitudCompleto | null>(null);
    cargando = signal(true);
    error = signal<string | null>(null);

    // Íconos
    readonly FileText = FileText;
    readonly X = X;
    readonly AlertCircle = AlertCircle;
    readonly Loader = Loader;
    readonly CheckCircle2 = CheckCircle2;

    // Helpers
    readonly formatMonto = FormatHelper.formatMonto;
    readonly formatFecha = FormatHelper.formatFecha;
    readonly formatFechaHora = FormatHelper.formatFechaHora;
    readonly getEtiquetaEstado = FormatHelper.getEtiquetaEstadoSolicitud;
    readonly getColorEstado = FormatHelper.getColorEstadoSolicitud;
    readonly getEtiquetaTipo = FormatHelper.getEtiquetaTipo;
    readonly getColorTipo = FormatHelper.getColorTipo;
    readonly getEtiquetaArea = FormatHelper.getEtiquetaArea;

    ngOnInit(): void {
        this.cargarDetalle();
    }

    cargarDetalle(): void {
        this.cargando.set(true);
        this.error.set(null);

        this.service.obtenerDetalleSolicitudTransferencia({ solicitud_id: this.solicitudId }).subscribe({
            next: (response: any) => {
                if (response.respuesta === 'success' && response.datos) {
                    this.detalle.set(response.datos);
                } else {
                    this.error.set(response.mensajes?.[0] || 'Error al cargar detalle');
                }
            },
            error: () => this.error.set('Error de conexión'),
            complete: () => this.cargando.set(false)
        });
    }

    reintentar(): void {
        this.cargarDetalle();
    }

    onCerrar(): void {
        this.cerrar.emit();
    }

    // Métodos auxiliares
    obtenerTotalFacturas(): number {
        return this.detalle()?.facturas_detalle?.length || 0;
    }

    obtenerMontoTotalFacturas(): number {
        return this.detalle()?.facturas_detalle?.reduce((sum: number, f: any) => sum + f.monto_total_factura, 0) || 0;
    }

    obtenerResumenTipos(): { plan: number; presupuesto: number } {
        const facturas = this.detalle()?.facturas_detalle || [];
        return {
            plan: facturas.filter((f: any) => f.tipo_liquidacion === 'plan').length,
            presupuesto: facturas.filter((f: any) => f.tipo_liquidacion === 'presupuesto').length
        };
    }

    // Acordeón
    facturasExpandidas = new Set<string>();

    toggleFactura(numeroFactura: string): void {
        if (this.facturasExpandidas.has(numeroFactura)) {
            this.facturasExpandidas.delete(numeroFactura);
        } else {
            this.facturasExpandidas.add(numeroFactura);
        }
    }

    isFacturaExpandida(numeroFactura: string): boolean {
        return this.facturasExpandidas.has(numeroFactura);
    }

    tieneTransferencias(f: FacturaDetalleAPI): boolean {
        return !!f.transferencias && f.transferencias.length > 0;
    }

    tieneRetenciones(f: FacturaDetalleAPI): boolean {
        return !!f.retenciones && f.retenciones.length > 0;
    }

    tieneCreador(): boolean {
        return !!this.detalle()?.solicitud.creado_por_nombre;
    }

    tieneAprobacion(): boolean {
        return !!this.detalle()?.aprobacion;
    }
}