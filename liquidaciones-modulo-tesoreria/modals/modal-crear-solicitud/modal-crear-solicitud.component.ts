// ============================================================================
// MODAL: CREAR SOLICITUD DE TRANSFERENCIA
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, signal, computed, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule, X, Send, AlertCircle, CheckCircle } from 'lucide-angular';
import Swal from 'sweetalert2';

import {
    FacturaConSolicitud,
    BancoUsoPago,
    AreaAprobacion,
    CrearSolicitudTransferenciaPayload,
    FormatHelper,
    ValidadoresLiquidacion,
    OPCIONES_AREA_APROBACION
} from '../../models/liquidaciones-modulo-tesoreria.models';

import { LiquidacionesModuloTesoreriaService } from '../../services/liquidaciones-modulo-tesoreria.service';

@Component({
    selector: 'app-modal-crear-solicitud',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
    templateUrl: './modal-crear-solicitud.component.html',
    styleUrls: ['./modal-crear-solicitud.component.css']
})
export class ModalCrearSolicitudComponent implements OnInit {

    private readonly fb = inject(FormBuilder);
    private readonly service = inject(LiquidacionesModuloTesoreriaService);

    // ============================================================================
    // INPUTS Y OUTPUTS
    // ============================================================================

    @Input() factura: FacturaConSolicitud | null = null;
    @Output() cerrar = new EventEmitter<void>();
    @Output() confirmado = new EventEmitter<void>();

    // ============================================================================
    // ICONOS
    // ============================================================================

    readonly X = X;
    readonly Send = Send;
    readonly AlertCircle = AlertCircle;
    readonly CheckCircle = CheckCircle;

    // ============================================================================
    // ESTADO
    // ============================================================================

    readonly form: FormGroup;
    readonly procesando = signal<boolean>(false);
    readonly bancos = signal<BancoUsoPago[]>([]);
    readonly opcionesArea = OPCIONES_AREA_APROBACION;

    // ============================================================================
    // HELPERS
    // ============================================================================

    readonly formatMonto = FormatHelper.formatMonto;
    readonly formatFecha = FormatHelper.formatFecha;
    readonly getEtiquetaTipo = FormatHelper.getEtiquetaTipo;
    readonly getColorTipo = FormatHelper.getColorTipo;

    // ============================================================================
    // COMPUTED
    // ============================================================================

    /**
 * Monto máximo permitido (monto pendiente de pago)
 */
    readonly montoMaximo = computed(() => this.factura?.monto_pendiente_pago || 0);

    /**
 * Valida si el formulario es válido
 */
    get formularioValido(): boolean {
        return this.form?.valid || false;
    }

    // ============================================================================
    // CONSTRUCTOR
    // ============================================================================

    constructor() {
        this.form = this.fb.group({
            banco_origen_id: ['', Validators.required],
            area_aprobacion: ['', Validators.required],
            monto_total_solicitud: ['', [Validators.required, Validators.min(0.01)]]
        });
    }

    // ============================================================================
    // LIFECYCLE
    // ============================================================================

    ngOnInit(): void {
        this.cargarBancos();
        this.inicializarMontoMaximo();
    }

    // ============================================================================
    // INICIALIZACIÓN
    // ============================================================================

    private cargarBancos(): void {
        this.service.bancos$.subscribe(bancos => {
            this.bancos.set(bancos);
        });
    }

    private inicializarMontoMaximo(): void {
        if (this.factura) {
            this.form.patchValue({
                monto_total_solicitud: this.factura.monto_pendiente_pago
            });
        }
    }

    // ============================================================================
    // VALIDACIONES
    // ============================================================================

    /**
     * Valida el monto ingresado
     */
    validarMonto(): string | null {
        const monto = this.form.get('monto_total_solicitud')?.value;

        if (!monto || monto <= 0) {
            return 'El monto debe ser mayor a cero';
        }

        if (this.factura) {
            return ValidadoresLiquidacion.validarMontoSolicitud(
                monto,
                this.factura.monto_pendiente_pago
            );
        }

        return null;
    }

    /**
     * Obtiene mensaje de error del campo
     */
    obtenerErrorCampo(campo: string): string {
        const control = this.form.get(campo);

        if (!control || !control.errors) return '';

        if (control.errors['required']) {
            return 'Este campo es requerido';
        }

        if (control.errors['min']) {
            return 'El valor debe ser mayor a cero';
        }

        return 'Campo inválido';
    }

    // ============================================================================
    // ACCIONES
    // ============================================================================

    onCerrar(): void {
        if (this.procesando()) {
            return;
        }
        this.cerrar.emit();
    }

    onClickModal(event: Event): void {
        event.stopPropagation();
    }

    async onCrearSolicitud(): Promise<void> {
        // Validar formulario
        if (!this.form.valid) {
            Swal.fire({
                icon: 'warning',
                title: 'Formulario Incompleto',
                text: 'Por favor complete todos los campos requeridos',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        // Validar monto
        const errorMonto = this.validarMonto();
        if (errorMonto) {
            Swal.fire({
                icon: 'error',
                title: 'Monto Inválido',
                text: errorMonto,
                confirmButtonColor: '#ef4444'
            });
            return;
        }

        if (!this.factura) return;

        // Confirmación
        const result = await Swal.fire({
            title: '¿Crear Solicitud?',
            html: this.generarHTMLConfirmacion(),
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, crear solicitud',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            width: '600px'
        });

        if (result.isConfirmed) {
            this.ejecutarCreacion();
        }
    }

    private generarHTMLConfirmacion(): string {
        const valores = this.form.value;
        const banco = this.bancos().find(b => b.id === parseInt(valores.banco_origen_id));
        const area = this.opcionesArea.find(a => a.value === valores.area_aprobacion);

        return `
            <div class="text-left space-y-3">
                <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p class="text-sm mb-2"><strong>Factura:</strong> ${this.factura!.numero_factura}</p>
                    <p class="text-sm mb-2"><strong>Emisor:</strong> ${this.factura!.nombre_emisor}</p>
                    <p class="text-sm mb-2"><strong>Banco Origen:</strong> ${banco?.nombre || 'N/A'}</p>
                    <p class="text-sm mb-2"><strong>Cuenta:</strong> ${banco?.cuenta || 'N/A'}</p>
                    <p class="text-sm mb-2"><strong>Área de Aprobación:</strong> ${area?.label || 'N/A'}</p>
                    <p class="text-sm"><strong>Monto:</strong> ${this.formatMonto(valores.monto_total_solicitud)}</p>
                </div>
                <div class="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                    <p class="text-xs text-yellow-800">
                        <strong>Nota:</strong> La solicitud será enviada a aprobación y recibirá una notificación por correo.
                    </p>
                </div>
            </div>
        `;
    }

    private ejecutarCreacion(): void {
        if (!this.factura) return;

        this.procesando.set(true);

        // Mostrar loading
        Swal.fire({
            title: 'Procesando...',
            html: 'Creando solicitud de transferencia',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const valores = this.form.value;

        const payload: CrearSolicitudTransferenciaPayload = {
            facturas: [{
                numero_factura: this.factura.numero_factura,
                detalle_liquidacion_id: this.factura.primer_detalle_id
            }],
            banco_origen_id: parseInt(valores.banco_origen_id),
            area_aprobacion: valores.area_aprobacion,
            monto_total_solicitud: parseFloat(valores.monto_total_solicitud)
        };

        this.service.crearSolicitudTransferencia(payload).subscribe({
            next: (exito) => {
                this.procesando.set(false);

                if (exito) {
                    Swal.fire({
                        icon: 'success',
                        title: '¡Solicitud Creada!',
                        text: 'La solicitud ha sido creada y enviada a aprobación',
                        confirmButtonColor: '#10b981',
                        timer: 3000
                    });
                    this.confirmado.emit();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'No se pudo crear la solicitud. Intente nuevamente.',
                        confirmButtonColor: '#ef4444'
                    });
                }
            },
            error: () => {
                this.procesando.set(false);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Ocurrió un error al crear la solicitud',
                    confirmButtonColor: '#ef4444'
                });
            }
        });
    }

    /**
     * Establece el monto al máximo permitido
     */
    establecerMontoMaximo(): void {
        if (this.factura) {
            this.form.patchValue({
                monto_total_solicitud: this.factura.monto_pendiente_pago
            });
        }
    }
}