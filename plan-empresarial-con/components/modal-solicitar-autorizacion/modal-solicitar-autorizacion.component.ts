// ============================================================================
// MODAL SOLICITAR AUTORIZACIÓN - CON CIERRE AL HACER CLIC FUERA
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit, HostListener, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { FacturasPlanEmpresarialService } from '../../services/facturas-plan-empresarial.service';
import {
    SolicitarAutorizacionPayload,
    validarAutorizacion,
    formatearFecha
} from '../../models/facturas-plan-empresarial.models';

@Component({
    selector: 'app-modal-solicitar-autorizacion',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
        <!-- Modal con cierre al hacer clic fuera -->
        <div class="fixed inset-0 bg-black/60 grid place-items-center z-50"
             (click)="onBackdropClick($event)">
            
            <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-3 overflow-hidden"
                 (click)="$event.stopPropagation()">
                
                <!-- Header -->
                <div class="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 class="text-lg font-extrabold text-gray-900">
                        Solicitar <span class="text-transparent bg-clip-text bg-gradient-to-r to-orange-600 from-gray-400">Autorización</span>
                    </h2>
                    <button (click)="cerrar.emit()" 
                        class="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <!-- Contenido -->
                <div class="p-4">
                    <!-- Información de la factura -->
                    <div class="mb-4 p-3 bg-gray-50 rounded border border-gray-200 text-sm">
                        <div class="grid grid-cols-2 gap-2">
                            <div class="text-gray-600">Número DTE:</div>
                            <div class="font-medium text-gray-800">{{ numeroDte }}</div>
                            
                            <div class="text-gray-600">Fecha Emisión:</div>
                            <div class="font-medium text-gray-800">{{ formatearFecha(fechaEmision) }}</div>
                            
                            <div class="text-gray-600">Días transcurridos:</div>
                            <div class="font-medium text-gray-800 text-red-600">{{ diasTranscurridos }} días</div>
                        </div>
                    </div>

                    <!-- Formulario -->
                    <form [formGroup]="form" (ngSubmit)="enviar()" class="space-y-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                Motivo de la tardanza <span class="text-red-500">*</span>
                            </label>
                            <textarea rows="4" 
                                formControlName="motivo"
                                class="w-full text-sm border border-gray-300 rounded-md p-2"
                                [class.border-red-300]="isFieldInvalid('motivo')"
                                placeholder="Explique detalladamente el motivo de la tardanza en la liquidación..."></textarea>
                            
                            <!-- Contador de caracteres -->
                            <div class="flex justify-between items-center text-xs mt-1">
                                <div *ngIf="isFieldInvalid('motivo')" class="text-red-500">
                                    {{ getFieldError('motivo') }}
                                </div>
                                <div class="text-gray-500">
                                    {{ form.get('motivo')?.value?.length || 0 }}/500 caracteres
                                </div>
                            </div>
                        </div>

                        <!-- Errores de validación -->
                        <div *ngIf="erroresValidacion.length > 0" 
                            class="bg-red-50 border border-red-200 rounded-md p-3">
                            <div class="text-sm text-red-800 font-medium mb-1">Errores encontrados:</div>
                            <ul class="text-sm text-red-700 list-disc list-inside space-y-1">
                                <li *ngFor="let error of erroresValidacion">{{ error }}</li>
                            </ul>
                        </div>

                        <!-- Información adicional -->
                        <div class="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <div class="text-sm text-blue-800">
                                <div class="font-medium mb-1">📋 Información importante:</div>
                                <ul class="text-xs space-y-1 list-disc list-inside">
                                    <li>La solicitud será enviada al departamento correspondiente para su revisión</li>
                                    <li>Una vez aprobada, podrá proceder con la liquidación de la factura</li>
                                    <li>El tiempo de respuesta estimado es de 1-2 días hábiles</li>
                                    <li>Recibirá una notificación cuando la solicitud sea procesada</li>
                                </ul>
                            </div>
                        </div>

                        <!-- Botones -->
                        <div class="flex justify-end gap-2 pt-2">
                            <button type="button" 
                                (click)="cerrar.emit()"
                                class="px-3 py-2 text-xs border rounded-md text-gray-700 hover:bg-gray-50 transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" 
                                [disabled]="form.invalid || enviando"
                                class="px-3 py-2 text-xs bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                {{ enviando ? 'Enviando...' : 'Enviar Solicitud' }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `
})
export class ModalSolicitarAutorizacionComponent implements OnInit {

    private readonly service = inject(FacturasPlanEmpresarialService);

    // ============================================================================
    // INPUTS Y OUTPUTS
    // ============================================================================

    @Input() numeroDte = '';
    @Input() fechaEmision = '';
    @Input() diasTranscurridos = 0;

    @Output() cerrar = new EventEmitter<void>();
    @Output() solicitudEnviada = new EventEmitter<void>();

    // ============================================================================
    // ESTADO DEL COMPONENTE
    // ============================================================================

    enviando = false;
    erroresValidacion: string[] = [];

    // Utilidades
    readonly formatearFecha = formatearFecha;

    // Formulario
    form!: FormGroup;

    ngOnInit(): void {
        this.inicializarFormulario();
    }

    // ============================================================================
    // INICIALIZACIÓN
    // ============================================================================

    private inicializarFormulario(): void {
        this.form = new FormGroup({
            motivo: new FormControl('', [
                Validators.required,
                Validators.minLength(10),
                Validators.maxLength(500)
            ])
        });
    }

    // ============================================================================
    // MANEJO DE EVENTOS
    // ============================================================================

    /**
     * Manejar clic en el backdrop para cerrar modal
     */
    @HostListener('click', ['$event'])
    onBackdropClick(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            this.cerrar.emit();
        }
    }

    /**
     * Prevenir cierre accidental con Escape si hay datos
     */
    @HostListener('document:keydown.escape', ['$event'])
    onEscapeKey(event: KeyboardEvent): void {
        if (!this.form.dirty || confirm('¿Está seguro que desea cerrar sin enviar la solicitud?')) {
            this.cerrar.emit();
        }
    }

    // ============================================================================
    // ACCIONES PRINCIPALES
    // ============================================================================

    /**
     * Enviar solicitud de autorización
     */
    enviar(): void {
        if (this.enviando || this.form.invalid) return;

        // Limpiar errores previos
        this.erroresValidacion = [];

        // Preparar payload
        const payload: SolicitarAutorizacionPayload = {
            numero_dte: this.numeroDte,
            motivo: this.form.get('motivo')?.value?.trim() || '',
            dias_transcurridos: this.diasTranscurridos
        };

        // Validar payload
        const validacion = validarAutorizacion(payload);
        if (!validacion.valido) {
            this.erroresValidacion = validacion.errores;
            return;
        }

        // Enviar al servicio
        this.enviando = true;
        this.service.solicitarAutorizacion(payload).subscribe({
            next: (exito) => {
                if (exito) {
                    this.solicitudEnviada.emit();
                    this.cerrar.emit();
                }
            },
            error: (error) => {
                console.error('Error al enviar solicitud:', error);
                this.erroresValidacion = ['Error inesperado al enviar la solicitud'];
            },
            complete: () => {
                this.enviando = false;
            }
        });
    }

    // ============================================================================
    // UTILIDADES
    // ============================================================================

    /**
     * Verificar si un campo tiene errores y ha sido tocado
     */
    isFieldInvalid(fieldName: string): boolean {
        const field = this.form.get(fieldName);
        return !!(field && field.invalid && (field.dirty || field.touched));
    }

    /**
     * Obtener mensaje de error específico para un campo
     */
    getFieldError(fieldName: string): string {
        const field = this.form.get(fieldName);
        if (!field || !field.errors || !this.isFieldInvalid(fieldName)) {
            return '';
        }

        const errors = field.errors;
        if (errors['required']) return 'El motivo es requerido';
        if (errors['minlength']) {
            const min = errors['minlength'].requiredLength;
            const actual = errors['minlength'].actualLength;
            return `Mínimo ${min} caracteres (actual: ${actual})`;
        }
        if (errors['maxlength']) {
            const max = errors['maxlength'].requiredLength;
            return `Máximo ${max} caracteres`;
        }

        return 'Campo inválido';
    }

    /**
     * Obtener información de urgencia basada en días transcurridos
     */
    obtenerInfoUrgencia(): { mensaje: string; clase: string } {
        if (this.diasTranscurridos <= 30) {
            return {
                mensaje: 'Solicitud normal',
                clase: 'text-blue-600'
            };
        } else if (this.diasTranscurridos <= 60) {
            return {
                mensaje: 'Solicitud urgente',
                clase: 'text-orange-600'
            };
        } else {
            return {
                mensaje: 'Solicitud muy urgente',
                clase: 'text-red-600'
            };
        }
    }

    /**
     * Verificar si el formulario tiene cambios sin guardar
     */
    tieneParaGuardar(): boolean {
        return this.form.dirty && this.form.valid;
    }
}