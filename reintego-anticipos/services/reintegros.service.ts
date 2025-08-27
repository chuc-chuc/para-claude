// ============================================
// SERVICIO ANGULAR - REINTEGROS DE ANTICIPOS
// Sistema de Contabilidad - ReintegrosService
// ============================================

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
    ReintegroAnticipo,
    ReintegroAnticipoFormatted,
    NuevoReintegro,
    ActualizarReintegro,
    VerificarReintegro,
    SolicitarCorreccion,
    FiltrosReintegros,
    CriteriosBusquedaHistorial,
    RespuestaAPI
} from '../models/reintegros-anticipos.model';
import { ServicioGeneralService } from '../../../servicios/servicio-general.service';

/**
 * Servicio para gestionar reintegros de anticipos
 */
@Injectable({
    providedIn: 'root'
})
export class ReintegrosService {

    constructor(private servicioGeneral: ServicioGeneralService) { }

    /**
     * Lista reintegros con filtros opcionales
     */
    listarReintegros(filtros?: FiltrosReintegros): Observable<RespuestaAPI<ReintegroAnticipoFormatted[]>> {
        return this.servicioGeneral.query({
            ruta: 'contabilidad/listarReintegros',
            tipo: 'post',
            body: filtros || {}
        });
    }

    /**
     * Obtiene los reintegros del usuario actual
     */
    obtenerMisReintegros(usuarioId: string, estado?: string): Observable<RespuestaAPI<ReintegroAnticipoFormatted[]>> {
        const filtros: FiltrosReintegros = {
            usuario_registra: usuarioId
        };

        if (estado) {
            filtros.estado = estado as any;
        }

        return this.listarReintegros(filtros);
    }

    /**
     * Obtiene reintegros pendientes de verificación
     */
    obtenerReintegrosPendientesVerificacion(): Observable<RespuestaAPI<ReintegroAnticipoFormatted[]>> {
        return this.listarReintegros({ estado: 'pendiente' });
    }

    /**
     * Crea un nuevo reintegro
     */
    crearReintegro(reintegro: NuevoReintegro): Observable<RespuestaAPI<{ id: number }>> {
        return this.servicioGeneral.query({
            ruta: 'contabilidad/crearReintegro',
            tipo: 'post',
            body: reintegro
        });
    }

    /**
     * Actualiza un reintegro existente
     */
    actualizarReintegro(reintegro: ActualizarReintegro): Observable<RespuestaAPI> {
        return this.servicioGeneral.query({
            ruta: 'contabilidad/actualizarReintegro',
            tipo: 'post',
            body: reintegro
        });
    }

    /**
     * Elimina lógicamente un reintegro
     */
    eliminarReintegro(id: number, usuarioId: string): Observable<RespuestaAPI> {
        return this.servicioGeneral.query({
            ruta: 'contabilidad/eliminarReintegro',
            tipo: 'post',
            body: { id, usuario_registra: usuarioId }
        });
    }

    /**
     * Obtiene un reintegro específico
     */
    obtenerReintegro(id: number): Observable<RespuestaAPI<ReintegroAnticipoFormatted>> {
        return this.servicioGeneral.query({
            ruta: 'contabilidad/obtenerReintegro',
            tipo: 'post',
            body: { id }
        });
    }

    /**
     * Verifica/aprueba un reintegro
     */
    verificarReintegro(datos: VerificarReintegro): Observable<RespuestaAPI> {
        return this.servicioGeneral.query({
            ruta: 'contabilidad/verificarReintegro',
            tipo: 'post',
            body: datos
        });
    }

    /**
     * Solicita correcciones en un reintegro
     */
    solicitarCorreccion(datos: SolicitarCorreccion): Observable<RespuestaAPI> {
        return this.servicioGeneral.query({
            ruta: 'contabilidad/solicitarCorreccionReintegro',
            tipo: 'post',
            body: datos
        });
    }

    /**
     * Busca en el historial de reintegros
     */
    buscarHistorialReintegros(criterios: CriteriosBusquedaHistorial): Observable<RespuestaAPI<ReintegroAnticipoFormatted[]>> {
        return this.servicioGeneral.query({
            ruta: 'contabilidad/buscarHistorialReintegros',
            tipo: 'post',
            body: criterios
        });
    }

    /**
     * Valida un número de boleta (verifica que no esté duplicado)
     */
    validarNumeroBoleta(numeroBoleta: string, idExcluir?: number): Observable<boolean> {
        return this.listarReintegros().pipe(
            map(response => {
                if (response.respuesta === 'success' && response.datos) {
                    const duplicado = response.datos.find(r =>
                        r.numero_boleta === numeroBoleta &&
                        (idExcluir ? r.id !== idExcluir : true)
                    );
                    return !duplicado; // Retorna true si NO hay duplicado
                }
                return true;
            }),
            catchError(() => {
                // En caso de error, asumir que es válido
                return [true];
            })
        );
    }

    /**
     * Obtiene estadísticas de reintegros para dashboard
     */
    obtenerEstadisticas(): Observable<any> {
        return this.listarReintegros().pipe(
            map(response => {
                if (response.respuesta === 'success' && response.datos) {
                    const datos = response.datos;

                    return {
                        total: datos.length,
                        pendientes: datos.filter(r => r.estado === 'pendiente').length,
                        verificados: datos.filter(r => r.estado === 'verificado').length,
                        rechazados: datos.filter(r => r.estado === 'rechazado').length,
                        montoTotal: datos.reduce((sum, r) => sum + (r.monto_anticipo || 0), 0),
                        porTipoOrden: this.agruparPorTipo(datos, 'tipo_orden'),
                        porEstado: this.agruparPorTipo(datos, 'estado')
                    };
                }
                return null;
            })
        );
    }

    /**
     * Agrupa datos por un campo específico
     */
    private agruparPorTipo(datos: ReintegroAnticipoFormatted[], campo: keyof ReintegroAnticipoFormatted): any {
        return datos.reduce((acc, item) => {
            const valor = item[campo] as string;
            if (!acc[valor]) {
                acc[valor] = { cantidad: 0, monto: 0 };
            }
            acc[valor].cantidad++;
            acc[valor].monto += item.monto_anticipo || 0;
            return acc;
        }, {} as any);
    }

    /**
     * Exporta reintegros a formato CSV
     */
    exportarReintegros(datos: ReintegroAnticipoFormatted[]): void {
        const headers = [
            'ID', 'Usuario Registra', 'Monto', 'No. Orden', 'Tipo Orden',
            'No. Boleta', 'Fecha Transacción', 'Verificador', 'Fecha Verificación',
            'Estado', 'Banco Origen', 'Referencia Bancaria', 'Comentario'
        ];

        const csvContent = [
            headers.join(','),
            ...datos.map(row => [
                row.id,
                `"${row.nombre_usuario_registra || row.usuario_registra}"`,
                row.monto_anticipo,
                `"${row.numero_orden}"`,
                row.tipo_orden,
                `"${row.numero_boleta}"`,
                row.fecha_registro_transaccion,
                `"${row.nombre_verificador || ''}"`,
                row.fecha_verificacion || '',
                row.estado,
                `"${row.banco_origen || ''}"`,
                `"${row.referencia_bancaria || ''}"`,
                `"${row.comentario_registro || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `reintegros_anticipos_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    /**
     * Formateo de datos para uso en componentes
     */
    formatearParaTabla(datos: ReintegroAnticipoFormatted[]): any[] {
        return datos.map(item => ({
            ...item,
            estado_formatted: this.obtenerEtiquetaEstado(item.estado),
            tipo_orden_formatted: this.obtenerEtiquetaTipoOrden(item.tipo_orden),
            puede_editar: this.puedeEditar(item.estado),
            puede_eliminar: this.puedeEliminar(item.estado),
            puede_verificar: this.puedeVerificar(item.estado)
        }));
    }

    /**
     * Obtiene la etiqueta de un estado
     */
    private obtenerEtiquetaEstado(estado: string): string {
        const estados: { [key: string]: string } = {
            'pendiente': 'Pendiente',
            'en_revision': 'En Revisión',
            'verificado': 'Verificado',
            'rechazado': 'Rechazado',
            'eliminado': 'Eliminado'
        };
        return estados[estado] || estado;
    }

    /**
     * Obtiene la etiqueta de un tipo de orden
     */
    private obtenerEtiquetaTipoOrden(tipo: string): string {
        const tipos: { [key: string]: string } = {
            'compra': 'Compra',
            'servicio': 'Servicio',
            'gasto': 'Gasto',
            'otros': 'Otros'
        };
        return tipos[tipo] || tipo;
    }

    /**
     * Validaciones de estado
     */
    private puedeEditar(estado: string): boolean {
        return ['pendiente', 'rechazado'].includes(estado);
    }

    private puedeEliminar(estado: string): boolean {
        return ['pendiente', 'rechazado'].includes(estado);
    }

    private puedeVerificar(estado: string): boolean {
        return ['pendiente', 'en_revision'].includes(estado);
    }
}