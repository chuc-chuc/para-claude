import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, input, output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { DatosFormularioPago, PayloadSimple } from '../../../../models/plan-empresarial.models';

/**
 * Formulario específico para pagos con tarjeta de crédito
 */
@Component({
    selector: 'app-pago-tarjeta-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <div class="bg-gray-50 rounded-lg p-4">
      <form [formGroup]="formulario" class="space-y-4">
        
        <!-- Información del pago con tarjeta -->
        <div class="bg-yellow-50 p-4 rounded-md border border-yellow-100">
          <h3 class="text-sm font-medium text-yellow-800 mb-2 flex items-center">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
            </svg>
            Pago con Tarjeta de Crédito
          </h3>
          <p class="text-sm text-gray-700 mb-3">
            El pago se realizará mediante tarjeta de crédito corporativa. 
            Puede agregar una nota opcional con información adicional sobre la transacción.
          </p>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Nota adicional (opcional)
            </label>
            <textarea
              formControlName="nota"
              rows="3"
              placeholder="Información adicional sobre el pago con tarjeta..."
              class="w-full text-sm border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 resize-none"
              [class.border-red-300]="esInvalido('nota')">
            </textarea>
            <div class="flex justify-between items-center mt-1">
              <div *ngIf="esInvalido('nota')" class="text-red-500 text-xs">
                {{ obtenerMensajeError('nota') }}
              </div>
              <div class="text-xs text-gray-500">
                {{ obtenerContadorCaracteres() }} / 300 caracteres
              </div>
            </div>
          </div>
        </div>

        <!-- Información importante -->
        <div class="bg-blue-50 p-4 rounded-md border border-blue-100">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div class="ml-3 text-sm">
              <p class="text-blue-800 font-medium">Información del pago</p>
              <p class="text-blue-700 mt-1">
                Este pago será procesado a través de la tarjeta de crédito corporativa. 
                Asegúrese de que el monto y la descripción sean correctos antes de confirmar.
              </p>
            </div>
          </div>
        </div>

        <!-- Resumen (solo se muestra si hay una nota) -->
        <div *ngIf="formulario.get('nota')?.value" class="bg-gray-100 p-4 rounded-md border">
          <h3 class="text-sm font-medium text-gray-800 mb-2 flex items-center">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            Resumen del pago
          </h3>
          <div class="text-xs text-gray-600">
            <div class="flex justify-between items-start">
              <span class="font-medium">Nota adicional:</span>
              <span class="ml-2 text-right max-w-xs">{{ formulario.get('nota')?.value }}</span>
            </div>
          </div>
        </div>

        <!-- Botones de acción -->
        <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            (click)="cancelar.emit()"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          
          <button
            type="button"
            (click)="onSubmit()"
            [disabled]="formulario.invalid"
            class="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            Confirmar pago con tarjeta
          </button>
        </div>
      </form>
    </div>
  `,
    styles: [`
    :host {
      display: block;
    }
    
    .transition-colors {
      transition-property: color, background-color, border-color;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      transition-duration: 150ms;
    }
    
    textarea:focus {
      box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.1);
    }
    
    button:disabled {
      cursor: not-allowed;
    }
  `]
})
export class PagoTarjetaFormComponent implements OnInit {

    // ============================================================================
    // DEPENDENCIAS Y INPUTS/OUTPUTS
    // ============================================================================

    private readonly fb = inject(FormBuilder);

    readonly data = input<DatosFormularioPago | null>(null);
    readonly guardar = output<PayloadSimple>();
    readonly cancelar = output<void>();

    // ============================================================================
    // FORMULARIO
    // ============================================================================

    formulario!: FormGroup;

    // ============================================================================
    // LIFECYCLE
    // ============================================================================

    ngOnInit(): void {
        this.inicializarFormulario();
        this.cargarDatosExistentes();
    }

    // ============================================================================
    // INICIALIZACIÓN
    // ============================================================================

    private inicializarFormulario(): void {
        this.formulario = this.fb.group({
            nota: ['', [Validators.maxLength(300)]]
        });
    }

    private cargarDatosExistentes(): void {
        const datos = this.data();
        if (!datos) return;

        this.formulario.patchValue({
            nota: datos.nota || ''
        });
    }

    // ============================================================================
    // VALIDACIONES
    // ============================================================================

    esInvalido(campo: string): boolean {
        const control = this.formulario.get(campo);
        return !!(control && control.invalid && (control.dirty || control.touched));
    }

    obtenerMensajeError(campo: string): string {
        const control = this.formulario.get(campo);
        if (!control || !control.errors) return '';

        const errores = control.errors;

        if (errores['maxlength']) {
            const requiredLength = errores['maxlength'].requiredLength;
            return `Máximo ${requiredLength} caracteres`;
        }

        return 'Campo inválido';
    }

    obtenerContadorCaracteres(): number {
        return this.formulario.get('nota')?.value?.length || 0;
    }

    // ============================================================================
    // ENVÍO
    // ============================================================================

    onSubmit(): void {
        if (this.formulario.invalid) {
            this.marcarTodoComoTocado();
            return;
        }

        const valores = this.formulario.value;
        const payload: PayloadSimple = {
            ...this.data(), // Datos base del formulario principal
            nota: valores.nota || undefined
        };

        this.guardar.emit(payload);
    }

    private marcarTodoComoTocado(): void {
        Object.keys(this.formulario.controls).forEach(key => {
            this.formulario.get(key)?.markAsTouched();
        });
    }
}