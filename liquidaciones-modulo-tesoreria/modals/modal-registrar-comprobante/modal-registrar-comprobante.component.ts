// ============================================================================
// MODAL: REGISTRAR COMPROBANTE DE TRANSFERENCIA
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, signal, computed, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule, X, CheckCircle, Upload, FileText, AlertCircle } from 'lucide-angular';
import Swal from 'sweetalert2';

import {
    SolicitudTransferencia,
    RegistrarComprobantePayload,
    FormatHelper
} from '../../models/liquidaciones-modulo-tesoreria.models';

import { LiquidacionesModuloTesoreriaService } from '../../services/liquidaciones-modulo-tesoreria.service';

@Component({
    selector: 'app-modal-registrar-comprobante',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
    templateUrl: './modal-registrar-comprobante.component.html',
    styleUrls: ['./modal-registrar-comprobante.component.css']
})
export class ModalRegistrarComprobanteComponent implements OnInit {

    private readonly fb = inject(FormBuilder);
    private readonly service = inject(LiquidacionesModuloTesoreriaService);

    // ============================================================================
    // INPUTS Y OUTPUTS
    // ============================================================================

    @Input() solicitud: SolicitudTransferencia | null = null;
    @Output() cerrar = new EventEmitter<void>();
    @Output() confirmado = new EventEmitter<void>();

    // ============================================================================
    // ICONOS
    // ============================================================================

    readonly X = X;
    readonly CheckCircle = CheckCircle;
    readonly Upload = Upload;
    readonly FileText = FileText;
    readonly AlertCircle = AlertCircle;

    // ============================================================================
    // ESTADO
    // ============================================================================

    readonly form: FormGroup;
    readonly procesando = signal<boolean>(false);
    readonly archivoSeleccionado = signal<File | null>(null);

    // ============================================================================
    // HELPERS
    // ============================================================================

    readonly formatMonto = FormatHelper.formatMonto;
    readonly formatFecha = FormatHelper.formatFecha;
    readonly formatTamano = FormatHelper.formatTamano;
    readonly getEtiquetaArea = FormatHelper.getEtiquetaArea;

    // ============================================================================
    // COMPUTED
    // ============================================================================

    readonly formularioValido = computed(() => this.form?.valid || false);
    readonly tieneArchivo = computed(() => this.archivoSeleccionado() !== null);

    // ============================================================================
    // CONSTRUCTOR
    // ============================================================================

    constructor() {
        this.form = this.fb.group({
            numero_registro_transferencia: ['', Validators.required],
            fecha_transferencia: ['', Validators.required],
            referencia_bancaria: [''],
            observaciones: ['']
        });
    }

    // ============================================================================
    // LIFECYCLE
    // ============================================================================

    ngOnInit(): void {
        this.inicializarFecha();
    }

    // ============================================================================
    // INICIALIZACIÓN
    // ============================================================================

    private inicializarFecha(): void {
        // Establecer fecha actual por defecto
        const hoy = new Date().toISOString().split('T')[0];
        this.form.patchValue({
            fecha_transferencia: hoy
        });
    }

    // ============================================================================
    // MANEJO DE ARCHIVOS
    // ============================================================================

    onArchivoSeleccionado(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const archivo = input.files[0];

            // Validar tipo de archivo (PDF, imágenes)
            const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
            if (!tiposPermitidos.includes(archivo.type)) {
                Swal.fire({
                    icon: 'error',
                    title: 'Archivo No Válido',
                    text: 'Solo se permiten archivos PDF o imágenes (JPG, PNG)',
                    confirmButtonColor: '#ef4444'
                });
                return;
            }

            // Validar tamaño (máx 10MB)
            const tamanoMaximo = 10 * 1024 * 1024; // 10MB
            if (archivo.size > tamanoMaximo) {
                Swal.fire({
                    icon: 'error',
                    title: 'Archivo Muy Grande',
                    text: 'El archivo no debe superar 10MB',
                    confirmButtonColor: '#ef4444'
                });
                return;
            }

            this.archivoSeleccionado.set(archivo);
        }
    }

    removerArchivo(): void {
        this.archivoSeleccionado.set(null);
        // Resetear input file
        const input = document.getElementById('archivo-comprobante') as HTMLInputElement;
        if (input) {
            input.value = '';
        }
    }

    // ============================================================================
    // VALIDACIONES
    // ============================================================================

    obtenerErrorCampo(campo: string): string {
        const control = this.form.get(campo);

        if (!control || !control.errors) return '';

        if (control.errors['required']) {
            return 'Este campo es requerido';
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

    async onRegistrarComprobante(): Promise<void> {
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

        if (!this.solicitud) return;

        // Confirmación
        const result = await Swal.fire({
            title: '¿Registrar Comprobante?',
            html: this.generarHTMLConfirmacion(),
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, registrar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            width: '600px'
        });

        if (result.isConfirmed) {
            this.ejecutarRegistro();
        }
    }

    private generarHTMLConfirmacion(): string {
        const valores = this.form.value;

        return `
            <div class="text-left space-y-3">
                <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p class="text-sm mb-2"><strong>Código Solicitud:</strong> ${this.solicitud!.codigo_solicitud}</p>
                    <p class="text-sm mb-2"><strong>Monto:</strong> ${this.formatMonto(this.solicitud!.monto_total_solicitud)}</p>
                    <p class="text-sm mb-2"><strong>N° Registro:</strong> ${valores.numero_registro_transferencia}</p>
                    <p class="text-sm mb-2"><strong>Fecha:</strong> ${this.formatFecha(valores.fecha_transferencia)}</p>
                    ${valores.referencia_bancaria ? `<p class="text-sm mb-2"><strong>Referencia:</strong> ${valores.referencia_bancaria}</p>` : ''}
                    ${this.tieneArchivo() ? `<p class="text-sm"><strong>Archivo:</strong> ${this.archivoSeleccionado()!.name}</p>` : ''}
                </div>
                <div class="bg-green-50 rounded-lg p-3 border border-green-200">
                    <p class="text-xs text-green-800">
                        <strong>Nota:</strong> Al registrar el comprobante, la solicitud se marcará como COMPLETADA 
                        y se actualizarán los detalles de liquidación correspondientes.
                    </p>
                </div>
            </div>
        `;
    }

    private ejecutarRegistro(): void {
        if (!this.solicitud) return;

        this.procesando.set(true);

        // Mostrar loading
        Swal.fire({
            title: 'Procesando...',
            html: 'Registrando comprobante de transferencia',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const valores = this.form.value;

        const payload: RegistrarComprobantePayload = {
            solicitud_id: this.solicitud.id,
            numero_registro_transferencia: valores.numero_registro_transferencia,
            fecha_transferencia: valores.fecha_transferencia,
            referencia_bancaria: valores.referencia_bancaria || undefined,
            observaciones: valores.observaciones || undefined
        };

        this.service.registrarComprobante(payload, this.archivoSeleccionado() || undefined).subscribe({
            next: (exito) => {
                this.procesando.set(false);

                if (exito) {
                    Swal.fire({
                        icon: 'success',
                        title: '¡Comprobante Registrado!',
                        text: 'La transferencia ha sido completada correctamente',
                        confirmButtonColor: '#10b981',
                        timer: 3000
                    });
                    this.confirmado.emit();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'No se pudo registrar el comprobante. Intente nuevamente.',
                        confirmButtonColor: '#ef4444'
                    });
                }
            },
            error: () => {
                this.procesando.set(false);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Ocurrió un error al registrar el comprobante',
                    confirmButtonColor: '#ef4444'
                });
            }
        });
    }
}