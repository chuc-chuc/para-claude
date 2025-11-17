import { Component, Input, Output, EventEmitter, inject, signal, computed, effect, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
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
    // En modal-registrar-comprobante.component.ts
    @Input({ required: true }) solicitud!: SolicitudTransferencia;
    @Input() modoEdicion = false;
    @Output() cerrar = new EventEmitter<void>();
    @Output() confirmado = new EventEmitter<void>();

    // Iconos
    readonly icons = { X, CheckCircle, Upload, FileText, AlertCircle };

    // Formulario
    readonly form = this.fb.group({
        numero_registro_transferencia: ['', Validators.required],
        fecha_transferencia: ['', Validators.required],
        referencia_bancaria: [''],
        observaciones: ['']
    });

    // Estado reactivo
    readonly procesando = signal(false);
    readonly archivoSeleccionado = signal<File | null>(null);

    // Reactivo: formulario válido (¡AHORA SÍ FUNCIONA!)
    readonly formValid = signal(false);

    constructor() {
        // Efecto que escucha cambios en el formulario
        effect(() => {
            this.formValid.set(this.form.valid);
        });
    }

    ngOnInit(): void {
        const hoy = new Date().toISOString().split('T')[0];
        this.form.patchValue({ fecha_transferencia: hoy });

        if (this.modoEdicion && this.solicitud) {
            this.form.patchValue({
                numero_registro_transferencia: this.solicitud.numero_registro_transferencia || '',
                fecha_transferencia: this.solicitud.fecha_transferencia || hoy,
                referencia_bancaria: this.solicitud.referencia_bancaria || '',
                observaciones: this.solicitud.observaciones_transferencia || ''
            });
        }

        // actualiza la señal cada vez que cambie el form
        this.form.valueChanges.subscribe(() =>
            this.formValid.set(this.form.valid)
        );
        // valor inicial
        this.formValid.set(this.form.valid);
    }

    // Computed dinámicos
    readonly titulo = computed(() =>
        this.modoEdicion ? 'Editar Comprobante' : 'Registrar Comprobante'
    );

    readonly tituloBoton = computed(() =>
        this.modoEdicion ? 'Guardar Cambios' : 'Registrar Comprobante'
    );

    readonly colorHeader = computed(() =>
        this.modoEdicion
            ? 'bg-gradient-to-r from-orange-600 to-amber-600'
            : 'bg-gradient-to-r from-green-600 to-emerald-600'
    );

    readonly colorBoton = computed(() =>
        this.modoEdicion
            ? 'bg-orange-600 hover:bg-orange-700'
            : 'bg-green-600 hover:bg-green-700'
    );

    readonly tieneArchivo = computed(() => this.archivoSeleccionado() !== null);

    // Helpers expuestos al template
    readonly FormatHelper = FormatHelper;

    // === ARCHIVOS ===
    onArchivoSeleccionado(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;

        const archivo = input.files[0];
        const tipos = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        const maxSize = 10 * 1024 * 1024;

        if (!tipos.includes(archivo.type)) {
            Swal.fire('Error', 'Solo PDF, JPG o PNG', 'error');
            return;
        }
        if (archivo.size > maxSize) {
            Swal.fire('Error', 'Máximo 10MB', 'error');
            return;
        }

        this.archivoSeleccionado.set(archivo);
    }

    removerArchivo(): void {
        this.archivoSeleccionado.set(null);
        const input = document.getElementById('archivo-comprobante') as HTMLInputElement;
        if (input) input.value = '';
    }

    // === ACCIONES ===
    onCerrar(): void {
        if (this.procesando()) return;
        this.cerrar.emit();
    }

    onClickModal(event: Event): void {
        event.stopPropagation();
    }

    async onRegistrarComprobante(): Promise<void> {
        if (!this.formValid()) {
            this.form.markAllAsTouched();
            Swal.fire('Error', 'Complete los campos requeridos', 'warning');
            return;
        }

        const confirm = await Swal.fire({
            title: this.modoEdicion ? '¿Guardar cambios?' : '¿Completar transferencia?',
            html: this.generarHTMLConfirmacion(),
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: this.modoEdicion ? 'Guardar' : 'Completar',
            cancelButtonText: 'Cancelar',
            width: '600px'
        });

        if (!confirm.isConfirmed) return;

        this.procesando.set(true);
        Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const valores = this.form.value;
        const payload: any = {
            solicitud_id: this.solicitud.id,
            numero_registro_transferencia: valores.numero_registro_transferencia!,
            fecha_transferencia: valores.fecha_transferencia!,
            referencia_bancaria: valores.referencia_bancaria || undefined,
            observaciones: valores.observaciones || undefined
        };

        const observable = this.modoEdicion
            ? this.service.editarComprobanteTransferencia(payload)
            : this.service.registrarComprobante(payload, this.archivoSeleccionado() || undefined);

        observable.subscribe({
            next: (exito) => {
                if (exito) {
                    Swal.fire('¡Éxito!', this.modoEdicion ? 'Cambios guardados' : 'Transferencia completada', 'success');
                    this.confirmado.emit();
                } else {
                    Swal.fire('Error', 'No se pudo completar la acción', 'error');
                }
            },
            error: () => {
                Swal.fire('Error', 'Error del servidor', 'error');
            },
            complete: () => this.procesando.set(false)
        });
    }

    private generarHTMLConfirmacion(): string {
        if (!this.solicitud) return '<p>Error: solicitud no disponible</p>';

        const v = this.form.value;
        return `
    <div class="text-left space-y-4 text-sm">
      <div class="bg-gray-50 rounded-lg p-4 border">
        <p><strong>Solicitud:</strong> ${this.solicitud.codigo_solicitud}</p>
        <p><strong>Monto:</strong> ${FormatHelper.formatMonto(this.solicitud.monto_total_solicitud)}</p>
        <p><strong>N° Registro:</strong> ${v.numero_registro_transferencia}</p>
        <p><strong>Fecha:</strong> ${FormatHelper.formatFecha(v.fecha_transferencia)}</p>
        ${v.referencia_bancaria ? `<p><strong>Referencia:</strong> ${v.referencia_bancaria}</p>` : ''}
        ${this.tieneArchivo() ? `<p><strong>Archivo:</strong> ${this.archivoSeleccionado()!.name}</p>` : ''}
      </div>
    </div>
  `;
    }
}