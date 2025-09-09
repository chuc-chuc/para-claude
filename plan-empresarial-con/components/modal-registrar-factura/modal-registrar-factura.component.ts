// ============================================================================
// MODAL REGISTRAR FACTURA - CON CIERRE AL HACER CLIC FUERA
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, HostListener, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { FacturasPlanEmpresarialService } from '../../services/facturas-plan-empresarial.service';
import {
    RegistrarFacturaPayload,
    TIPOS_DTE,
    AUTORIZACIONES,
    MONEDAS,
    validarFactura
} from '../../models/facturas-plan-empresarial.models';

@Component({
    selector: 'app-modal-registrar-factura',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
        <!-- Modal con cierre al hacer clic fuera -->
        <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50"
             (click)="onBackdropClick($event)">
            
            <div class="relative bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4"
                 (click)="$event.stopPropagation()">
                
                <!-- Header -->
                <div class="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-800">Registrar Nueva Factura</h3>
                    <button (click)="cerrar.emit()" 
                        class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <svg class="text-gray-400" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <!-- Contenido -->
                <div class="p-5">
                    <form [formGroup]="form" (ngSubmit)="guardar()" class="space-y-4">
                        
                        <!-- Primera fila -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium mb-1">
                                    Número Factura <span class="text-red-500">*</span>
                                </label>
                                <input type="text" 
                                    formControlName="numero_dte"
                                    class="w-full text-sm border rounded-md py-2 px-3"
                                    [class.border-red-300]="isFieldInvalid('numero_dte')"
                                    placeholder="Ej: 123456789">
                                <div *ngIf="isFieldInvalid('numero_dte')" class="text-red-500 text-xs mt-1">
                                    Campo requerido
                                </div>
                            </div>

                            <div>
                                <label class="block text-sm font-medium mb-1">
                                    Fecha Emisión <span class="text-red-500">*</span>
                                </label>
                                <input type="date" 
                                    formControlName="fecha_emision"
                                    class="w-full text-sm border rounded-md py-2 px-3"
                                    [class.border-red-300]="isFieldInvalid('fecha_emision')">
                                <div *ngIf="isFieldInvalid('fecha_emision')" class="text-red-500 text-xs mt-1">
                                    Campo requerido
                                </div>
                            </div>
                        </div>

                        <!-- Segunda fila -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium mb-1">
                                    Autorización <span class="text-red-500">*</span>
                                </label>
                                <select formControlName="numero_autorizacion"
                                    class="w-full text-sm border rounded-md py-2 px-3"
                                    [class.border-red-300]="isFieldInvalid('numero_autorizacion')">
                                    <option value="">Seleccione una autorización</option>
                                    <option *ngFor="let auth of autorizaciones" [value]="auth.codigo">
                                        {{ auth.nombre }}
                                    </option>
                                </select>
                                <div *ngIf="isFieldInvalid('numero_autorizacion')" class="text-red-500 text-xs mt-1">
                                    Campo requerido
                                </div>
                            </div>

                            <div>
                                <label class="block text-sm font-medium mb-1">
                                    Tipo DTE <span class="text-red-500">*</span>
                                </label>
                                <select formControlName="tipo_dte"
                                    class="w-full text-sm border rounded-md py-2 px-3"
                                    [class.border-red-300]="isFieldInvalid('tipo_dte')">
                                    <option value="">Seleccione un tipo</option>
                                    <option *ngFor="let tipo of tiposDte" [value]="tipo.codigo">
                                        {{ tipo.nombre }}
                                    </option>
                                </select>
                                <div *ngIf="isFieldInvalid('tipo_dte')" class="text-red-500 text-xs mt-1">
                                    Campo requerido
                                </div>
                            </div>
                        </div>

                        <!-- Tercera fila -->
                        <div>
                            <label class="block text-sm font-medium mb-1">
                                Nombre del Emisor <span class="text-red-500">*</span>
                            </label>
                            <input type="text" 
                                formControlName="nombre_emisor"
                                class="w-full text-sm border rounded-md py-2 px-3"
                                [class.border-red-300]="isFieldInvalid('nombre_emisor')"
                                placeholder="Nombre completo del emisor">
                            <div *ngIf="isFieldInvalid('nombre_emisor')" class="text-red-500 text-xs mt-1">
                                Campo requerido
                            </div>
                        </div>

                        <!-- Cuarta fila -->
                        <div class="grid grid-cols-3 gap-2">
                            <div>
                                <label class="block text-sm font-medium mb-1">Moneda</label>
                                <select formControlName="moneda"
                                    class="w-full text-sm border rounded-md py-2 px-3">
                                    <option *ngFor="let moneda of monedas" [value]="moneda">
                                        {{ moneda }}
                                    </option>
                                </select>
                            </div>
                            <div class="col-span-2">
                                <label class="block text-sm font-medium mb-1">
                                    Monto Total <span class="text-red-500">*</span>
                                </label>
                                <input type="number" 
                                    step="0.01" 
                                    min="0.01"
                                    formControlName="monto_total"
                                    class="w-full text-sm border rounded-md py-2 px-3"
                                    [class.border-red-300]="isFieldInvalid('monto_total')"
                                    placeholder="0.00">
                                <div *ngIf="isFieldInvalid('monto_total')" class="text-red-500 text-xs mt-1">
                                    Monto debe ser mayor a 0
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

                        <!-- Botones -->
                        <div class="flex justify-end gap-2 pt-4 border-t">
                            <button type="button" 
                                (click)="cerrar.emit()"
                                class="px-4 py-2 text-sm border rounded-md hover:bg-gray-50 transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" 
                                [disabled]="form.invalid || guardando"
                                class="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                {{ guardando ? 'Guardando...' : 'Registrar Factura' }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `
})
export class ModalRegistrarFacturaComponent {

    private readonly service = inject(FacturasPlanEmpresarialService);

    @Output() cerrar = new EventEmitter<void>();
    @Output() facturaRegistrada = new EventEmitter<void>();

    // ============================================================================
    // ESTADO DEL COMPONENTE
    // ============================================================================

    guardando = false;
    erroresValidacion: string[] = [];

    // Catálogos
    readonly tiposDte = TIPOS_DTE;
    readonly autorizaciones = AUTORIZACIONES;
    readonly monedas = MONEDAS;

    // Formulario
    readonly form = new FormGroup({
        numero_dte: new FormControl('', [
            Validators.required,
            Validators.pattern(/^[A-Za-z0-9\-]{1,25}$/)
        ]),
        fecha_emision: new FormControl(new Date().toISOString().split('T')[0], [
            Validators.required
        ]),
        numero_autorizacion: new FormControl('', [Validators.required]),
        tipo_dte: new FormControl('', [Validators.required]),
        nombre_emisor: new FormControl('', [
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(200)
        ]),
        monto_total: new FormControl<number | null>(null, [
            Validators.required,
            Validators.min(0.01)
        ]),
        moneda: new FormControl<'GTQ' | 'USD'>('GTQ', [Validators.required])
    });

    // ============================================================================
    // MANEJO DE EVENTOS
    // ============================================================================

    /**
     * Manejar clic en el backdrop para cerrar modal
     */
    @HostListener('click', ['$event'])
    onBackdropClick(event: MouseEvent): void {
        // Solo cerrar si el clic fue en el backdrop (no en el contenido del modal)
        if (event.target === event.currentTarget) {
            this.cerrar.emit();
        }
    }

    /**
     * Prevenir cierre accidental con Escape si hay datos
     */
    @HostListener('document:keydown.escape', ['$event'])
    onEscapeKey(event: KeyboardEvent): void {
        if (!this.form.dirty || confirm('¿Está seguro que desea cerrar sin guardar?')) {
            this.cerrar.emit();
        }
    }

    // ============================================================================
    // ACCIONES PRINCIPALES
    // ============================================================================

    /**
     * Guardar nueva factura
     */
    guardar(): void {
        if (this.guardando || this.form.invalid) return;

        // Limpiar errores previos
        this.erroresValidacion = [];

        // Obtener valores del formulario
        const formValue = this.form.value;
        const payload: RegistrarFacturaPayload = {
            numero_dte: (formValue.numero_dte || '').toUpperCase().trim(),
            fecha_emision: formValue.fecha_emision!,
            numero_autorizacion: formValue.numero_autorizacion!,
            tipo_dte: formValue.tipo_dte!,
            nombre_emisor: (formValue.nombre_emisor || '').toUpperCase().trim(),
            monto_total: Number(formValue.monto_total),
            moneda: formValue.moneda!
        };

        // Validar payload
        const validacion = validarFactura(payload);
        if (!validacion.valido) {
            this.erroresValidacion = validacion.errores;
            return;
        }

        // Enviar al servicio
        this.guardando = true;
        this.service.registrarFactura(payload).subscribe({
            next: (exito) => {
                if (exito) {
                    this.facturaRegistrada.emit();
                    this.cerrar.emit();
                }
            },
            error: (error) => {
                console.error('Error al registrar factura:', error);
                this.erroresValidacion = ['Error inesperado al registrar la factura'];
            },
            complete: () => {
                this.guardando = false;
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
        if (errors['required']) return 'Este campo es requerido';
        if (errors['pattern']) return 'Formato inválido';
        if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
        if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
        if (errors['min']) return 'El valor debe ser mayor a 0';

        return 'Campo inválido';
    }

    /**
     * Resetear formulario
     */
    resetearFormulario(): void {
        this.form.reset({
            fecha_emision: new Date().toISOString().split('T')[0],
            moneda: 'GTQ'
        });
        this.erroresValidacion = [];
    }

    /**
     * Verificar si el formulario tiene cambios sin guardar
     */
    tieneParaGuardar(): boolean {
        return this.form.dirty && this.form.valid;
    }
}