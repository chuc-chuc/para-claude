// ============================================================================
// COMPONENTE PRINCIPAL - LIQUIDACIONES POR PRESUPUESTO (ACTUALIZADO CON NUEVOS FILTROS)
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed, OnDestroy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

// Modelos
import {
    LiquidacionPorFactura,
    DetalleLiquidacion,
    FacturaResumen,
    RetencionFactura,
    FiltrosLiquidacion,
    EstadosHelper,
    FormatHelper,
    MENSAJES_LIQUIDACIONES
} from '../models/liquidaciones-presupuesto.models';

// Servicios
import { LiquidacionesPresupuestoService } from '../services/liquidaciones-presupuesto.service';

// Modales
import { ModalComprobanteComponentti } from '../modals/modal-comprobante/modal-comprobante.component';
import { ModalSolicitarCambioComponentti } from '../modals/modal-solicitar-cambio/modal-solicitar-cambio.component';
import { ModalVerCambiosComponentti } from '../modals/modal-ver-cambios/modal-ver-cambios.component';
import { ModalVerDetalleComponentti } from '../modals/modal-ver-detalle/modal-ver-detalle.component';

@Component({
    selector: 'app-liquidaciones-presupuesto-ti',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        ModalComprobanteComponentti,
        ModalSolicitarCambioComponentti,
        ModalVerCambiosComponentti,
        ModalVerDetalleComponentti
    ],
    templateUrl: './liquidaciones-presupuesto.component.html',
    styleUrls: ['./liquidaciones-presupuesto.component.css']
})
export class LiquidacionesPresupuestoComponentti implements OnInit, OnDestroy {

    readonly service = inject(LiquidacionesPresupuestoService);
    private readonly fb = inject(FormBuilder);
    private readonly destroy$ = new Subject<void>();

    // ============================================================================
    // ESTADO DEL COMPONENTE
    // ============================================================================

    // Signals reactivas
    readonly liquidaciones = signal<LiquidacionPorFactura[]>([]);
    readonly cargando = signal<boolean>(false);
    readonly error = signal<string | null>(null);

    // Estados de modales
    readonly mostrarModalComprobante = signal<boolean>(false);
    readonly mostrarModalCambio = signal<boolean>(false);
    readonly mostrarModalVerCambios = signal<boolean>(false);
    readonly mostrarModalVerDetalle = signal<boolean>(false);

    // Datos para modales
    readonly detalleSeleccionadoModal = signal<DetalleLiquidacion | null>(null);
    readonly facturaSeleccionadaModal = signal<FacturaResumen | null>(null);
    readonly retencionesSeleccionadasModal = signal<RetencionFactura[]>([]);
    readonly modoComprobante = signal<'individual' | 'masivo'>('individual');

    // Signals para controlar el estado del header
    readonly headerEstaFijo = signal<boolean>(false);
    readonly offsetTop = signal<number>(170);

    // Formulario de filtros
    formularioFiltros!: FormGroup;

    // Computed para estadísticas
    readonly estadisticas = computed(() => {
        const liquidaciones = this.liquidaciones();
        const todosLosDetalles = liquidaciones.flatMap(liq => liq.detalles);
        const detallesSeleccionados = todosLosDetalles.filter(detalle => detalle.seleccionado);

        return {
            totalDetalles: todosLosDetalles.length,
            detallesSeleccionados: detallesSeleccionados.length,
            totalFacturas: liquidaciones.length,
            todosMarcados: this.todosMarcados(),
            algunoMarcado: this.algunoMarcado()
        };
    });

    // Computed para selecciones
    readonly todosMarcados = computed(() => {
        const liquidaciones = this.liquidaciones();
        if (liquidaciones.length === 0) return false;

        const todosLosDetalles = liquidaciones.flatMap(liq => liq.detalles);
        return todosLosDetalles.length > 0 && todosLosDetalles.every(detalle => detalle.seleccionado);
    });

    readonly algunoMarcado = computed(() => {
        const liquidaciones = this.liquidaciones();
        const todosLosDetalles = liquidaciones.flatMap(liq => liq.detalles);
        return todosLosDetalles.some(detalle => detalle.seleccionado);
    });

    // Helpers para templates
    readonly formatMonto = FormatHelper.formatMonto;
    readonly formatFecha = FormatHelper.formatFecha;
    readonly formatFechaHora = FormatHelper.formatFechaHora;
    readonly truncateText = FormatHelper.truncateText;
    readonly getColorEstadoVerificacion = EstadosHelper.getColorEstadoVerificacion;
    readonly getColorEstadoLiquidacion = EstadosHelper.getColorEstadoLiquidacion;
    readonly getColorFormaPago = EstadosHelper.getColorFormaPago;
    readonly puedeVerificar = EstadosHelper.puedeVerificar;
    readonly puedeAsignarComprobante = EstadosHelper.puedeAsignarComprobante;
    readonly puedeSolicitarCambio = EstadosHelper.puedeSolicitarCambio;

    // ============================================================================
    // LISTENER PARA EL SCROLL
    // ============================================================================

    @HostListener('window:scroll', ['$event'])
    onWindowScroll(): void {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        const navbarHeight = 170;
        const startScrollPoint = 10;

        if (scrollTop <= startScrollPoint) {
            this.headerEstaFijo.set(false);
            this.offsetTop.set(navbarHeight);
        } else if (scrollTop <= navbarHeight) {
            const progress = Math.min(1, (scrollTop - startScrollPoint) / (navbarHeight - startScrollPoint));
            const easedProgress = 1 - Math.pow(1 - progress, 2);
            const newOffset = navbarHeight * (1 - easedProgress);
            this.headerEstaFijo.set(false);
            this.offsetTop.set(Math.max(0, Math.round(newOffset)));
        } else {
            this.headerEstaFijo.set(true);
            this.offsetTop.set(0);
        }
    }

    // ============================================================================
    // CICLO DE VIDA
    // ============================================================================

    ngOnInit(): void {
        this.inicializarFormularios();
        this.suscribirAServicios();
        this.configurarFiltrosEnTiempoReal();
        this.cargarDatos();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ============================================================================
    // INICIALIZACIÓN
    // ============================================================================

    private inicializarFormularios(): void {
        // Obtener fecha guardada en localStorage si existe
        const fechaGuardada = this.service.obtenerFechaDeStorage();

        this.formularioFiltros = this.fb.group({
            tipoBusqueda: ['factura'],  // NUEVO: Tipo de búsqueda por defecto
            valorBusqueda: [''],        // NUEVO: Valor de búsqueda unificado
            fechaDesde: [fechaGuardada || ''],  // NUEVO: Cargar fecha guardada
            metodoPago: [''],
            estadoVerificacion: [''],
            estadoLiquidacion: ['']
        });
    }

    private suscribirAServicios(): void {
        this.service.liquidacionesFiltradas$
            .pipe(takeUntil(this.destroy$))
            .subscribe(liquidaciones => {
                this.liquidaciones.set(liquidaciones);
            });

        this.service.cargando$
            .pipe(takeUntil(this.destroy$))
            .subscribe(cargando => {
                this.cargando.set(cargando);
            });

        this.service.error$
            .pipe(takeUntil(this.destroy$))
            .subscribe(error => {
                this.error.set(error);
            });
    }

    private configurarFiltrosEnTiempoReal(): void {
        // Listener específico para el campo de fecha (hace petición al servidor)
        this.formularioFiltros.get('fechaDesde')?.valueChanges
            .pipe(
                debounceTime(500),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe(fecha => {
                if (fecha) {
                    this.service.guardarFechaEnStorage(fecha);
                    this.cargarDatosConFecha(fecha);
                }
            });

        // Listener para los demás filtros (solo aplica filtros locales, NO hace petición)
        this.formularioFiltros.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe(filtros => {
                // Excluir fechaDesde ya que tiene su propio listener
                const { fechaDesde, ...filtrosSinFecha } = filtros;
                // Aplicar filtros localmente (sin petición al servidor)
                this.aplicarFiltros(filtrosSinFecha);
            });
    }

    private cargarDatos(): void {
        // Verificar si hay fecha guardada en localStorage
        const fechaGuardada = this.service.obtenerFechaDeStorage();

        if (fechaGuardada) {
            this.service.cargarLiquidaciones(fechaGuardada).subscribe();
        } else {
            this.service.cargarLiquidaciones().subscribe();
        }

        this.service.cargarAgencias().subscribe();
    }

    private cargarDatosConFecha(fechaDesde: string): void {
        this.service.cargarLiquidaciones(fechaDesde).subscribe();
    }

    // ============================================================================
    // FILTROS
    // ============================================================================

    aplicarFiltros(filtros: Partial<FiltrosLiquidacion>): void {
        const filtrosLimpios = Object.entries(filtros)
            .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
            .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

        this.service.aplicarFiltros(filtrosLimpios);
    }

    limpiarFiltros(): void {
        // Obtener la fecha actual antes de resetear
        const fechaActual = this.formularioFiltros.get('fechaDesde')?.value;

        // Resetear solo los filtros de búsqueda, manteniendo la fecha
        this.formularioFiltros.patchValue({
            tipoBusqueda: 'factura',
            valorBusqueda: '',
            metodoPago: '',
            estadoVerificacion: '',
            estadoLiquidacion: ''
        });

        // Limpiar filtros en el servicio (solo filtros locales)
        this.service.limpiarFiltros();

        // NO eliminar fecha del localStorage
        // NO hacer petición al servidor
        // Solo reaplicar los filtros localmente con los datos actuales
    }

    /**
     * NUEVO: Limpiar solo el filtro de fecha
     */
    limpiarFiltroFecha(): void {
        this.formularioFiltros.patchValue({ fechaDesde: '' });
        this.service.eliminarFechaDeStorage();
        // Recargar datos sin filtro de fecha
        this.service.cargarLiquidaciones().subscribe();
    }

    // ============================================================================
    // SELECCIÓN
    // ============================================================================

    toggleSeleccionDetalle(detalleId: number, event?: Event): void {
        if (event) {
            event.stopPropagation();
        }

        this.service.toggleSeleccionDetalle(detalleId);

        // Forzar actualización completa del signal
        this.liquidaciones.update(liquidaciones => {
            return liquidaciones.map(liquidacion => ({
                ...liquidacion,
                detalles: liquidacion.detalles.map(detalle => ({ ...detalle }))
            }));
        });
    }

    toggleSeleccionFactura(numeroFactura: string, event?: Event): void {
        if (event) {
            event.stopPropagation();
        }

        this.service.toggleSeleccionFactura(numeroFactura);

        // Forzar actualización completa del signal
        this.liquidaciones.update(liquidaciones => {
            return liquidaciones.map(liquidacion => ({
                ...liquidacion,
                detalles: liquidacion.detalles.map(detalle => ({ ...detalle }))
            }));
        });
    }

    toggleSeleccionGlobal(event?: Event): void {
        if (event) {
            event.stopPropagation();
        }

        this.service.toggleSeleccionGlobal();

        // Forzar actualización completa del signal
        this.liquidaciones.update(liquidaciones => {
            return liquidaciones.map(liquidacion => ({
                ...liquidacion,
                detalles: liquidacion.detalles.map(detalle => ({ ...detalle }))
            }));
        });
    }

    limpiarSelecciones(): void {
        this.service.limpiarSelecciones();

        // Forzar actualización completa del signal
        this.liquidaciones.update(liquidaciones => {
            return liquidaciones.map(liquidacion => ({
                ...liquidacion,
                detalles: liquidacion.detalles.map(detalle => ({ ...detalle }))
            }));
        });
    }

    // ============================================================================
    // FUNCIONES DE DESCARGA EN EXCEL
    // ============================================================================

    async descargarTablaGastos(): Promise<void> {
        const liquidaciones = this.liquidaciones();
        if (liquidaciones.length === 0) {
            await Swal.fire({
                icon: 'warning',
                title: 'Sin datos',
                text: 'No hay datos para descargar',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        const haySeleccionados = liquidaciones.some(liq =>
            liq.detalles.some(detalle => detalle.seleccionado)
        );

        if (haySeleccionados) {
            const resultado = await Swal.fire({
                title: 'Tipo de Descarga',
                text: 'Seleccione qué desea descargar:',
                icon: 'question',
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonText: 'Solo Seleccionados',
                denyButtonText: 'Todos los Datos',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#3085d6',
                denyButtonColor: '#28a745'
            });

            if (resultado.isConfirmed) {
                this.descargarSeleccionados();
            } else if (resultado.isDenied) {
                this.descargarTodosLosDatos();
            }
        } else {
            this.descargarTodosLosDatos();
        }
    }

    private descargarSeleccionados(): void {
        const liquidaciones = this.liquidaciones();
        const liquidacionesConSeleccionados = liquidaciones.filter(liq =>
            liq.detalles.some(detalle => detalle.seleccionado)
        );

        if (liquidacionesConSeleccionados.length === 1) {
            this.descargarFacturaIndividual(liquidacionesConSeleccionados[0]);
        } else {
            this.descargarMultiplesFacturas(liquidacionesConSeleccionados, true);
        }
    }

    private descargarTodosLosDatos(): void {
        const liquidaciones = this.liquidaciones();
        this.descargarMultiplesFacturas(liquidaciones, false);
    }

    private descargarFacturaIndividual(liquidacion: LiquidacionPorFactura): void {
        const detallesParaDescargar = liquidacion.detalles.filter(detalle => detalle.seleccionado);

        const datosGastos = this.prepararDatosGastos(detallesParaDescargar, liquidacion.factura);
        const datosRetenciones = this.prepararDatosRetenciones(liquidacion.retenciones);

        const wb = XLSX.utils.book_new();

        const wsGastos = XLSX.utils.json_to_sheet(datosGastos);
        XLSX.utils.book_append_sheet(wb, wsGastos, 'Gastos');

        if (datosRetenciones.length > 0) {
            const wsRetenciones = XLSX.utils.json_to_sheet(datosRetenciones);
            XLSX.utils.book_append_sheet(wb, wsRetenciones, 'Retenciones');
        }

        const nombreArchivo = `Factura_${liquidacion.factura.numero_dte}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, nombreArchivo);
    }

    private descargarMultiplesFacturas(liquidaciones: LiquidacionPorFactura[], soloSeleccionados: boolean): void {
        const wb = XLSX.utils.book_new();

        liquidaciones.forEach((liquidacion, index) => {
            const detalles = soloSeleccionados
                ? liquidacion.detalles.filter(detalle => detalle.seleccionado)
                : liquidacion.detalles;

            if (detalles.length === 0) return;

            const datosGastos = this.prepararDatosGastos(detalles, liquidacion.factura);
            const nombreHojaGastos = `F${index + 1}_Gastos`.substring(0, 31);
            const wsGastos = XLSX.utils.json_to_sheet(datosGastos);
            XLSX.utils.book_append_sheet(wb, wsGastos, nombreHojaGastos);

            if (liquidacion.retenciones.length > 0) {
                const datosRetenciones = this.prepararDatosRetenciones(liquidacion.retenciones);
                const nombreHojaRetenciones = `F${index + 1}_Retenciones`.substring(0, 31);
                const wsRetenciones = XLSX.utils.json_to_sheet(datosRetenciones);
                XLSX.utils.book_append_sheet(wb, wsRetenciones, nombreHojaRetenciones);
            }
        });

        const tipoDescarga = soloSeleccionados ? 'Seleccionados' : 'Todas';
        const nombreArchivo = `Liquidaciones_${tipoDescarga}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, nombreArchivo);
    }

    descargarFactura(liquidacion: LiquidacionPorFactura): void {
        this.descargarFacturaIndividual(liquidacion);
    }

    private prepararDatosGastos(detalles: DetalleLiquidacion[], factura: FacturaResumen): any[] {
        return detalles.map(detalle => ({
            'Factura': factura.numero_dte,
            'Orden': detalle.numero_orden,
            'Nombre Gasto': detalle.nombre_gasto,
            'Agencia Gasto': detalle.agencia_gasto,
            'Descripción': detalle.descripcion,
            'Monto': this.convertirANumero(detalle.monto),
            'Total Anticipos': this.convertirANumero(detalle.total_anticipos),
            'Área/Presupuesto': `${detalle.area_presupuesto}/${detalle.nombre_presupuesto}`,
            'Cuenta Contable': detalle.cuenta_contable,
            'Fecha Creación': this.formatFecha(detalle.fecha_creacion),
            'Fecha Modificación': this.formatFecha(detalle.fecha_actualizacion),
            'Forma de Pago': detalle.forma_pago,
            'Usuario': detalle.usuario,
            'Estado Verificación': detalle.estado_verificacion,
            'Comprobante Contabilidad': detalle.comprobante_contabilidad || '',
            'Comprobante Tesorería': detalle.comprobante_tesoreria || '',
            'Tiene Cambios Pendientes': detalle.tiene_cambios_pendientes ? 'Sí' : 'No',
            'Cantidad Cambios': detalle.cantidad_cambios || 0
        }));
    }

    private prepararDatosRetenciones(retenciones: RetencionFactura[]): any[] {
        return retenciones.map(retencion => ({
            'Código': retencion.codigo || 'N/A',
            'Nombre': retencion.nombre,
            'Monto': this.convertirANumero(retencion.monto),
            'Cuenta Contable': retencion.cuenta_contable || 'N/A',
            'Fecha Retención': this.formatFecha(retencion.fecha_retencion),
            'Creado Por': retencion.creado_por_nombre || 'N/A'
        }));
    }

    private convertirANumero(monto: any): number {
        if (typeof monto === 'number') {
            return monto;
        }

        if (typeof monto === 'string') {
            const numeroLimpio = monto.replace(/[Q,\s$]/g, '');
            const numero = parseFloat(numeroLimpio);
            return isNaN(numero) ? 0 : numero;
        }

        return 0;
    }

    // ============================================================================
    // ACCIONES MASIVAS
    // ============================================================================

    async verificarSeleccionados(): Promise<void> {
        const detallesSeleccionados = this.service.obtenerDetallesSeleccionados();

        if (detallesSeleccionados.length === 0) {
            await Swal.fire({
                icon: 'warning',
                title: 'Sin selección',
                text: 'Debe seleccionar al menos un detalle para verificar',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        const resultado = await Swal.fire({
            icon: 'question',
            title: 'Confirmar Verificación Masiva',
            text: `¿Confirma que desea verificar ${detallesSeleccionados.length} detalle(s) seleccionado(s)?`,
            showCancelButton: true,
            confirmButtonText: 'Sí, verificar',
            cancelButtonText: 'Cancelar'
        });

        if (resultado.isConfirmed) {
            const ids = detallesSeleccionados.map(d => d.id);
            this.service.verificarDetallesMasivo(ids).subscribe(exito => {
                if (exito) {
                    this.limpiarSelecciones();
                }
            });
        }
    }

    async asignarComprobanteSeleccionados(): Promise<void> {
        const detallesSeleccionados = this.service.obtenerDetallesSeleccionados();

        if (detallesSeleccionados.length === 0) {
            await Swal.fire({
                icon: 'warning',
                title: 'Sin selección',
                text: 'Debe seleccionar al menos un detalle para asignar comprobante',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        const resultado = await Swal.fire({
            icon: 'question',
            title: 'Confirmar Asignación Masiva',
            text: `¿Confirma que desea asignar comprobante a ${detallesSeleccionados.length} detalle(s) seleccionado(s)?`,
            showCancelButton: true,
            confirmButtonText: 'Sí, asignar',
            cancelButtonText: 'Cancelar'
        });

        if (resultado.isConfirmed) {
            this.modoComprobante.set('masivo');
            this.mostrarModalComprobante.set(true);
        }
    }

    // ============================================================================
    // ACCIONES INDIVIDUALES
    // ============================================================================

    async verificarDetalle(detalle: DetalleLiquidacion): Promise<void> {
        let mensaje: string = MENSAJES_LIQUIDACIONES.CONFIRMACION.VERIFICAR_DETALLE;

        if (detalle.tiene_cambios_pendientes) {
            mensaje = 'Este detalle tiene cambios pendientes. ¿Desea verificarlo de todas formas?';
        }

        const resultado = await Swal.fire({
            icon: 'question',
            title: 'Confirmar Verificación',
            text: mensaje,
            showCancelButton: true,
            confirmButtonText: 'Sí, verificar',
            cancelButtonText: 'Cancelar'
        });

        if (resultado.isConfirmed) {
            this.service.verificarDetalle(detalle.id).subscribe();
        }
    }

    asignarComprobanteDetalle(detalle: DetalleLiquidacion): void {
        let mensaje = '¿Confirma que desea asignar comprobante a este detalle?';

        if (detalle.tiene_cambios_pendientes) {
            mensaje = 'Este detalle tiene cambios pendientes. ¿Desea asignar comprobante de todas formas?';
        }

        if (detalle.comprobante_contabilidad) {
            mensaje = 'Este detalle ya tiene un comprobante asignado. ¿Desea reemplazarlo?';
        }

        Swal.fire({
            icon: 'question',
            title: 'Confirmar Asignación',
            text: mensaje,
            showCancelButton: true,
            confirmButtonText: 'Sí, asignar',
            cancelButtonText: 'Cancelar'
        }).then((resultado) => {
            if (resultado.isConfirmed) {
                this.detalleSeleccionadoModal.set(detalle);
                this.modoComprobante.set('individual');
                this.mostrarModalComprobante.set(true);
            }
        });
    }

    solicitarCambioDetalle(detalle: DetalleLiquidacion): void {
        if (!EstadosHelper.puedeSolicitarCambio(detalle)) {
            Swal.fire({
                icon: 'warning',
                title: 'No se puede solicitar cambio',
                text: 'No se pueden solicitar cambios en detalles que ya tienen comprobante asignado',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        this.detalleSeleccionadoModal.set(detalle);
        this.mostrarModalCambio.set(true);
    }

    verCambiosDetalle(detalle: DetalleLiquidacion): void {
        this.detalleSeleccionadoModal.set(detalle);
        this.mostrarModalVerCambios.set(true);
    }

    verDetalleCompleto(detalle: DetalleLiquidacion): void {
        const liquidacion = this.liquidaciones().find(liq =>
            liq.detalles.some(d => d.id === detalle.id)
        );

        if (liquidacion) {
            this.detalleSeleccionadoModal.set(detalle);
            this.facturaSeleccionadaModal.set(liquidacion.factura);
            this.retencionesSeleccionadasModal.set(liquidacion.retenciones);
            this.mostrarModalVerDetalle.set(true);
        }
    }

    // ============================================================================
    // MANEJADORES DE MODALES
    // ============================================================================

    onComprobanteConfirmado(datos: any): void {
        if (this.modoComprobante() === 'individual') {
            const detalle = this.detalleSeleccionadoModal();
            if (detalle) {
                this.service.asignarComprobante(detalle.id, datos).subscribe(exito => {
                    if (exito) {
                        this.cerrarModalComprobante();
                    }
                });
            }
        } else {
            const detallesSeleccionados = this.service.obtenerDetallesSeleccionados();
            const ids = detallesSeleccionados.map(d => d.id);
            this.service.asignarComprobanteMasivo(ids, datos).subscribe(exito => {
                if (exito) {
                    this.limpiarSelecciones();
                    this.cerrarModalComprobante();
                }
            });
        }
    }

    onCambioConfirmado(datos: any): void {
        const detalle = this.detalleSeleccionadoModal();
        if (detalle) {
            this.service.crearCambioSolicitado(detalle, datos.descripcion_cambio).subscribe(exito => {
                if (exito) {
                    this.cerrarModalCambio();
                }
            });
        }
    }

    // ============================================================================
    // MÉTODOS AUXILIARES PARA TEMPLATE
    // ============================================================================

    cerrarModalComprobante(): void {
        this.mostrarModalComprobante.set(false);
        this.detalleSeleccionadoModal.set(null);
    }

    cerrarModalCambio(): void {
        this.mostrarModalCambio.set(false);
        this.detalleSeleccionadoModal.set(null);
    }

    cerrarModalVerCambios(): void {
        this.mostrarModalVerCambios.set(false);
        this.detalleSeleccionadoModal.set(null);
    }

    cerrarModalVerDetalle(): void {
        this.mostrarModalVerDetalle.set(false);
        this.detalleSeleccionadoModal.set(null);
        this.facturaSeleccionadaModal.set(null);
        this.retencionesSeleccionadasModal.set([]);
    }

    refrescarDatos(): void {
        const fechaDesde = this.formularioFiltros.get('fechaDesde')?.value;
        this.service.refrescarDatos(fechaDesde).subscribe();
    }

    facturaCompleta(factura: LiquidacionPorFactura): boolean {
        return factura.detalles.length > 0 && factura.detalles.every(detalle => detalle.seleccionado);
    }

    facturaIndeterminada(factura: LiquidacionPorFactura): boolean {
        const seleccionados = factura.detalles.filter(detalle => detalle.seleccionado).length;
        return seleccionados > 0 && seleccionados < factura.detalles.length;
    }

    scrollToTop(): void {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    obtenerDatosPago(detalle: DetalleLiquidacion): string {
        switch (detalle.forma_pago) {
            case 'deposito':
                return `Socio: ${detalle.id_socio || 'N/A'}<br>Nombre: ${detalle.nombre_socio || 'N/A'}<br>Cuenta: ${detalle.numero_cuenta_deposito || 'N/A'}<br>Obs: ${detalle.observaciones_deposito || ''}`;
            case 'transferencia':
                return `Cuenta: ${detalle.nombre_cuenta || 'N/A'}<br>Número: ${detalle.numero_cuenta || 'N/A'}<br>Banco: ${detalle.nombre_banco || 'N/A'}<br>Tipo: ${detalle.tipo || 'N/A'}<br>Obs: ${detalle.observaciones_transferencia || ''}`;
            case 'cheque':
                return `Beneficiario: ${detalle.nombre_beneficiario || 'N/A'}<br>Consignación: ${detalle.consignacion || 'N/A'}<br>No Negociable: ${detalle.no_negociable || 'N/A'}<br>Obs: ${detalle.observaciones_cheque || ''}`;
            default:
                return 'N/A';
        }
    }

    obtenerDatosTesoreria(detalle: DetalleLiquidacion): string {
        if (detalle.comprobante_tesoreria) {
            return `Comp: ${detalle.comprobante_tesoreria || ''}<br>Fecha: ${detalle.fecha_transferencia}<br>Banco Transferencia: ${detalle.nombre}`;
        }
        return 'Sin comprobante';
    }

    trackByFactura(index: number, liquidacion: LiquidacionPorFactura): string {
        return liquidacion.factura.numero_dte;
    }

    trackByDetalle(index: number, detalle: DetalleLiquidacion): number {
        return detalle.id;
    }
}