// ============================================================================
// TABLA DETALLE LIQUIDACIONES - CORREGIDA PARA USAR SERVICIO
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, ViewChild, ElementRef, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { ModalDetalleLiquidacionComponent } from '../modal-detalle-liquidacion/modal-detalle-liquidacion.component';
import { ModalConfirmarEliminacionComponent } from '../modal-confirmar-eliminacion/modal-confirmar-eliminacion.component';

import { FacturasPlanEmpresarialService } from '../../services/facturas-plan-empresarial.service';
import { DetalleLiquidacionPE, FORMAS_PAGO } from '../../models/facturas-plan-empresarial.models';

@Component({
    selector: 'app-tabla-detalle-liquidaciones',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ModalDetalleLiquidacionComponent,
        ModalConfirmarEliminacionComponent
    ],
    templateUrl: './tabla-detalle-liquidaciones.component.html'
})
export class TablaDetalleLiquidacionesComponent implements OnInit, OnDestroy {

    @ViewChild('montoInput') montoInput?: ElementRef<HTMLInputElement>;
    @ViewChild('agenciaInput') agenciaInput?: ElementRef<HTMLSelectElement>;

    private readonly service = inject(FacturasPlanEmpresarialService);
    private readonly destroy$ = new Subject<void>();

    // ============================================================================
    // ESTADO DEL COMPONENTE
    // ============================================================================

    readonly mostrarModalDetalle = signal(false);
    readonly modoModal = signal<'crear' | 'editar'>('crear');
    readonly mostrarModalEliminar = signal(false);
    readonly facturaActual = signal<any>(null);
    readonly detallesLiquidacion = signal<DetalleLiquidacionPE[]>([]);
    readonly agenciasDisponibles = signal<any[]>([]);
    readonly cargandoDetalles = signal<boolean>(false);
    readonly guardandoCambios = signal<boolean>(false);
    readonly puedeEditarDetalles = signal<boolean>(true);

    registroEnEdicion: DetalleLiquidacionPE | null = null;
    indexEnEdicion: number | null = null;
    indexAEliminar: number | null = null;
    cargandoDetalle = false;

    // Constantes
    readonly formasPago = FORMAS_PAGO;

    ngOnInit(): void {
        this.inicializarSuscripciones();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ============================================================================
    // INICIALIZACIÓN
    // ============================================================================

    private inicializarSuscripciones(): void {
        // Suscripción a la factura actual
        this.service.facturaActual$
            .pipe(takeUntil(this.destroy$))
            .subscribe(factura => {
                this.facturaActual.set(factura);
                this.puedeEditarDetalles.set(!!factura && factura.estado_liquidacion !== 'Liquidado');
            });

        // Suscripción a los detalles de liquidación
        this.service.detallesLiquidacion$
            .pipe(takeUntil(this.destroy$))
            .subscribe(detalles => this.detallesLiquidacion.set(detalles));

        // Suscripción a las agencias
        this.service.agencias$
            .pipe(takeUntil(this.destroy$))
            .subscribe(agencias => this.agenciasDisponibles.set(agencias));

        // Suscripción a estados de carga
        this.service.cargandoDetalles$
            .pipe(takeUntil(this.destroy$))
            .subscribe(cargando => this.cargandoDetalles.set(cargando));

        this.service.procesandoLiquidacion$
            .pipe(takeUntil(this.destroy$))
            .subscribe(guardando => this.guardandoCambios.set(guardando));
    }

    // ============================================================================
    // ACCIONES PRINCIPALES
    // ============================================================================

    /**
     * Abrir modal para agregar nuevo detalle
     */
    abrirModal(): void {
        const factura = this.facturaActual();
        if (!factura?.numero_dte) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No hay factura seleccionada para agregar detalles'
            });
            return;
        }

        this.registroEnEdicion = this.crearDetalleVacio();
        this.indexEnEdicion = null;
        this.modoModal.set('crear');
        this.mostrarModalDetalle.set(true);
    }

    /**
     * Abrir modal para editar detalle existente
     */
    abrirModalEditar(index: number): void {
        const detalles = this.detallesLiquidacion();
        if (index < 0 || index >= detalles.length) return;

        const detalleAEditar = detalles[index];
        this.indexEnEdicion = index;
        this.registroEnEdicion = detalleAEditar ? { ...detalleAEditar } : null;
        this.modoModal.set('editar');
        this.mostrarModalDetalle.set(true);
    }

    /**
     * Confirmar eliminación de detalle
     */
    confirmarEliminacion(): void {
        if (this.indexAEliminar !== null) {
            const detalles = this.detallesLiquidacion();
            const detalle = detalles[this.indexAEliminar];

            if (detalle?.id) {
                // Eliminar desde el servicio si tiene ID
                this.service.eliminarDetalle(detalle.id).subscribe({
                    next: (success) => {
                        if (success) {
                            this.cancelarEliminacion();
                        }
                    }
                });
            } else {
                // Eliminar localmente si no tiene ID
                const nuevosDetalles = [...detalles];
                nuevosDetalles.splice(this.indexAEliminar, 1);
                this.detallesLiquidacion.set(nuevosDetalles);
                this.cancelarEliminacion();

                Swal.fire({
                    icon: 'success',
                    title: 'Eliminado',
                    text: 'Detalle eliminado correctamente',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        }
    }

    /**
     * Cancelar eliminación
     */
    cancelarEliminacion(): void {
        this.indexAEliminar = null;
        this.mostrarModalEliminar.set(false);
    }

    private crearDetalleVacio(): DetalleLiquidacionPE {
        return {
            id: undefined,
            numero_orden: '',
            agencia: '',
            descripcion: '',
            monto: 0,
            correo_proveedor: '',
            forma_pago: '',
            banco: '',
            cuenta: '',
            editando: false,
            guardando: false
        };
    }

    // ============================================================================
    // MÉTODOS DE EVENTO
    // ============================================================================

    onAgregar(): void {
        this.abrirModal();
    }

    onEditar(index: number): void {
        this.abrirModalEditar(index);
    }

    onEliminar(index: number): void {
        const detalles = this.detallesLiquidacion();
        if (index < 0 || index >= detalles.length) return;

        this.indexAEliminar = index;
        this.mostrarModalEliminar.set(true);
    }

    onCopiar(index: number): void {
        const detalles = this.detallesLiquidacion();
        if (index < 0 || index >= detalles.length) return;

        const detalleOriginal = detalles[index];

        if (detalleOriginal.id) {
            // Si tiene ID, usar el servicio para copiar
            this.service.copiarDetalle(detalleOriginal.id).subscribe({
                next: (success) => {
                    if (success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Copiado',
                            text: 'Detalle copiado correctamente',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    }
                }
            });
        } else {
            // Si no tiene ID, copiar localmente
            const copia: DetalleLiquidacionPE = {
                ...detalleOriginal,
                id: undefined,
                descripcion: '[COPIA] ' + detalleOriginal.descripcion
            };

            const nuevosDetalles = [...detalles];
            nuevosDetalles.splice(index + 1, 0, copia);
            this.detallesLiquidacion.set(nuevosDetalles);

            Swal.fire({
                icon: 'success',
                title: 'Copiado',
                text: 'Detalle copiado correctamente',
                timer: 2000,
                showConfirmButton: false
            });
        }
    }

    onGuardarTodo(): void {
        const detalles = this.detallesLiquidacion();
        if (detalles.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Atención',
                text: 'No hay detalles para guardar'
            });
            return;
        }

        // Usar el método del servicio para guardar todos
        this.service.guardarTodosLosDetalles().subscribe({
            next: (success) => {
                if (success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Guardado',
                        text: 'Todos los detalles han sido guardados correctamente',
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            }
        });
    }

    // ============================================================================
    // EDICIÓN INLINE - MONTO
    // ============================================================================

    iniciarEdicionMonto(index: number): void {
        if (!this.puedeEditarDetalles()) return;

        const detalles = this.detallesLiquidacion();
        const detalle = detalles[index];
        if (!detalle) return;

        this.cancelarTodasLasEdiciones();

        // IMPORTANTE: Asegurar que las propiedades existen
        detalle._editandoMonto = true;
        detalle._montoTemp = detalle.monto;

        // Actualizar el array para que Angular detecte el cambio
        const nuevosDetalles = [...detalles];
        nuevosDetalles[index] = { ...detalle };
        this.detallesLiquidacion.set(nuevosDetalles);

        setTimeout(() => {
            if (this.montoInput?.nativeElement) {
                this.montoInput.nativeElement.focus();
                this.montoInput.nativeElement.select();
            }
        }, 0);
    }

    guardarMonto(index: number): void {
        const detalles = this.detallesLiquidacion();
        const detalle = detalles[index];
        if (!detalle || !detalle._editandoMonto) return;

        const nuevoMonto = parseFloat(String(detalle._montoTemp || 0));

        if (isNaN(nuevoMonto) || nuevoMonto <= 0) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'El monto debe ser mayor a 0'
            });
            return;
        }

        if (nuevoMonto === detalle.monto) {
            this.cancelarEdicionMonto(index);
            return;
        }

        // Validar monto con la factura
        const factura = this.facturaActual();
        if (factura) {
            const totalOtrosDetalles = detalles
                .filter((_, i) => i !== index)
                .reduce((sum, d) => sum + d.monto, 0);

            const nuevoTotal = totalOtrosDetalles + nuevoMonto;

            if (nuevoTotal > factura.monto_total) {
                const disponible = factura.monto_total - totalOtrosDetalles;
                Swal.fire({
                    icon: 'error',
                    title: 'Monto excedido',
                    text: `El monto máximo disponible es Q${disponible.toFixed(2)}`
                });
                return;
            }
        }

        // Actualizar a través del servicio si tiene ID
        if (detalle.id) {
            console.log('Actualizando monto en servidor:', { id: detalle.id, monto: nuevoMonto });
            this.service.actualizarDetalle({ id: detalle.id, monto: nuevoMonto }).subscribe({
                next: (success) => {
                    if (success) {
                        detalle.monto = nuevoMonto;
                        detalle._editandoMonto = false;
                        delete detalle._montoTemp;

                        // Actualizar el array local
                        const nuevosDetalles = [...detalles];
                        nuevosDetalles[index] = detalle;
                        this.detallesLiquidacion.set(nuevosDetalles);
                    } else {
                        console.error('Error: El servicio retornó false');
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'No se pudo actualizar el monto'
                        });
                    }
                },
                error: (error) => {
                    console.error('Error en suscripción:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Error de conexión al actualizar el monto'
                    });
                }
            });
        } else {
            // Actualizar localmente si no tiene ID
            detalle.monto = nuevoMonto;
            detalle._editandoMonto = false;
            delete detalle._montoTemp;

            const nuevosDetalles = [...detalles];
            nuevosDetalles[index] = detalle;
            this.detallesLiquidacion.set(nuevosDetalles);

            Swal.fire({
                icon: 'success',
                title: 'Actualizado',
                text: 'Monto actualizado correctamente',
                timer: 1500,
                showConfirmButton: false
            });
        }
    }

    cancelarEdicionMonto(index: number): void {
        const detalles = this.detallesLiquidacion();
        const detalle = detalles[index];
        if (detalle) {
            detalle._editandoMonto = false;
            delete detalle._montoTemp;

            // Actualizar el array para que Angular detecte el cambio
            const nuevosDetalles = [...detalles];
            nuevosDetalles[index] = { ...detalle };
            this.detallesLiquidacion.set(nuevosDetalles);
        }
    }

    // ============================================================================
    // EDICIÓN INLINE - AGENCIA
    // ============================================================================

    iniciarEdicionAgencia(index: number): void {
        if (!this.puedeEditarDetalles()) return;

        const detalles = this.detallesLiquidacion();
        const detalle = detalles[index];
        if (!detalle) return;

        this.cancelarTodasLasEdiciones();
        (detalle as any)._editandoAgencia = true;
        (detalle as any)._agenciaTemp = detalle.agencia;

        setTimeout(() => {
            if (this.agenciaInput?.nativeElement) {
                this.agenciaInput.nativeElement.focus();
            }
        }, 0);
    }

    guardarAgencia(index: number): void {
        const detalles = this.detallesLiquidacion();
        const detalle = detalles[index];
        if (!detalle || !(detalle as any)._editandoAgencia) return;

        const nuevaAgencia = (detalle as any)._agenciaTemp?.trim();

        if (!nuevaAgencia) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Debe seleccionar una agencia'
            });
            return;
        }

        if (nuevaAgencia === detalle.agencia) {
            this.cancelarEdicionAgencia(index);
            return;
        }

        // Actualizar a través del servicio si tiene ID
        if (detalle.id) {
            this.service.actualizarDetalle({ id: detalle.id, agencia: nuevaAgencia }).subscribe({
                next: (success) => {
                    if (success) {
                        detalle.agencia = nuevaAgencia;
                        (detalle as any)._editandoAgencia = false;
                        delete (detalle as any)._agenciaTemp;

                        // Actualizar el array local
                        const nuevosDetalles = [...detalles];
                        nuevosDetalles[index] = detalle;
                        this.detallesLiquidacion.set(nuevosDetalles);
                    }
                }
            });
        } else {
            // Actualizar localmente si no tiene ID
            detalle.agencia = nuevaAgencia;
            (detalle as any)._editandoAgencia = false;
            delete (detalle as any)._agenciaTemp;

            const nuevosDetalles = [...detalles];
            nuevosDetalles[index] = detalle;
            this.detallesLiquidacion.set(nuevosDetalles);

            Swal.fire({
                icon: 'success',
                title: 'Actualizado',
                text: 'Agencia actualizada correctamente',
                timer: 1500,
                showConfirmButton: false
            });
        }
    }

    cancelarEdicionAgencia(index: number): void {
        const detalles = this.detallesLiquidacion();
        const detalle = detalles[index];
        if (detalle) {
            (detalle as any)._editandoAgencia = false;
            delete (detalle as any)._agenciaTemp;
        }
    }

    // ============================================================================
    // UTILIDADES
    // ============================================================================

    private cancelarTodasLasEdiciones(): void {
        const detalles = this.detallesLiquidacion();
        let cambios = false;

        detalles.forEach((detalle, index) => {
            if (detalle._editandoMonto) {
                detalle._editandoMonto = false;
                delete detalle._montoTemp;
                cambios = true;
            }
            if (detalle._editandoAgencia) {
                detalle._editandoAgencia = false;
                delete detalle._agenciaTemp;
                cambios = true;
            }
        });

        // Si hubo cambios, actualizar el array
        if (cambios) {
            this.detallesLiquidacion.set([...detalles]);
        }
    }

    async verDetalleCompleto(index: number): Promise<void> {
        const detalles = this.detallesLiquidacion();
        const detalle = detalles[index];
        if (!detalle) return;

        if (detalle.id) {
            // Si tiene ID, obtener detalle completo del servicio
            this.cargandoDetalle = true;

            Swal.fire({
                title: 'Cargando detalle...',
                html: 'Obteniendo información completa del registro',
                allowOutsideClick: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            this.service.obtenerDetalleCompleto(detalle.id).subscribe({
                next: (response) => {
                    Swal.close();
                    this.cargandoDetalle = false;

                    if (response && response.respuesta === 'success' && response.datos) {
                        this.mostrarDetalleCompleto(response.datos);
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'No se pudo obtener el detalle completo'
                        });
                    }
                },
                error: () => {
                    Swal.close();
                    this.cargandoDetalle = false;
                    Swal.fire({
                        icon: 'warning',
                        title: 'Advertencia',
                        text: 'Error al obtener el detalle'
                    });
                }
            });
        } else {
            // Si no tiene ID, mostrar información básica
            this.mostrarDetalleBasico(detalle);
        }
    }

    private mostrarDetalleCompleto(detalleCompleto: any): void {
        const html = `
            <div class="text-left space-y-3">
                <div><strong>Orden:</strong> ${detalleCompleto.numero_orden}</div>
                <div><strong>Agencia:</strong> ${detalleCompleto.agencia}</div>
                <div><strong>Descripción:</strong> ${detalleCompleto.descripcion}</div>
                <div><strong>Monto:</strong> Q${detalleCompleto.monto.toFixed(2)}</div>
                <div><strong>Forma de Pago:</strong> ${this.obtenerTextoFormaPago(detalleCompleto.forma_pago)}</div>
                <div><strong>Correo Proveedor:</strong> ${detalleCompleto.correo_proveedor || 'No especificado'}</div>
                ${detalleCompleto.banco ? `<div><strong>Banco:</strong> ${detalleCompleto.banco}</div>` : ''}
                ${detalleCompleto.cuenta ? `<div><strong>Cuenta:</strong> ${detalleCompleto.cuenta}</div>` : ''}
                ${detalleCompleto.fecha_creacion ? `<div><strong>Fecha Creación:</strong> ${detalleCompleto.fecha_creacion}</div>` : ''}
                ${detalleCompleto.fecha_actualizacion ? `<div><strong>Fecha Actualización:</strong> ${detalleCompleto.fecha_actualizacion}</div>` : ''}
            </div>
        `;

        Swal.fire({
            title: `Detalle de Liquidación #${detalleCompleto.id}`,
            html: html,
            width: '500px',
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#6b7280'
        });
    }

    private mostrarDetalleBasico(detalle: DetalleLiquidacionPE): void {
        const html = `
            <div class="text-left space-y-3">
                <div><strong>Orden:</strong> ${detalle.numero_orden}</div>
                <div><strong>Agencia:</strong> ${detalle.agencia}</div>
                <div><strong>Descripción:</strong> ${detalle.descripcion}</div>
                <div><strong>Monto:</strong> Q${detalle.monto.toFixed(2)}</div>
                <div><strong>Forma de Pago:</strong> ${this.obtenerTextoFormaPago(detalle.forma_pago)}</div>
                <div><strong>Correo Proveedor:</strong> ${detalle.correo_proveedor || 'No especificado'}</div>
                ${detalle.banco ? `<div><strong>Banco:</strong> ${detalle.banco}</div>` : ''}
                ${detalle.cuenta ? `<div><strong>Cuenta:</strong> ${detalle.cuenta}</div>` : ''}
            </div>
        `;

        Swal.fire({
            title: 'Detalle de Liquidación',
            html: html,
            width: '500px',
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#6b7280'
        });
    }

    obtenerTextoFormaPago(formaPago: string): string {
        const forma = this.formasPago.find(f => f.id === formaPago);
        return forma?.nombre || formaPago || 'Sin especificar';
    }

    obtenerClaseFormaPago(formaPago: string): string {
        const colores: { [key: string]: string } = {
            'deposito': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            'transferencia': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            'cheque': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
            'efectivo': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
        };
        return colores[formaPago] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }

    trackById(index: number, detalle: DetalleLiquidacionPE): any {
        return detalle?.id ?? index;
    }

    trackByAgencia(index: number, agencia: any): any {
        return agencia?.id ?? index;
    }
}