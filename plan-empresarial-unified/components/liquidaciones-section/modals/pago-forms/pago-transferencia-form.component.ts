import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed, input, output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PlanEmpresarialService } from '../../../../services/plan-empresarial.service';
import { DatosFormularioPago, PayloadTransferencia, BancoPE, TipoCuentaPE } from '../../../../models/plan-empresarial.models';

/**
 * Formulario específico para pagos por transferencia bancaria
 */
@Component({
    selector: 'app-pago-transferencia-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <div class="bg-gray-50 rounded-lg p-4">
      <form [formGroup]="formulario" class="space-y-4">
        
        <!-- Información de la cuenta de destino -->
        <div class="bg-purple-50 p-4 rounded-md border border-purple-100">
          <h3 class="text-sm font-medium text-purple-800 mb-3 flex items-center">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
            </svg>
            Datos de la cuenta bancaria
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Nombre del titular -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Nombre del titular <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                formControlName="nombre_cuenta"
                class="w-full text-sm border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                [class.border-red-300]="esInvalido('nombre_cuenta')"
                placeholder="Nombre completo del titular de la cuenta">
              <div *ngIf="esInvalido('nombre_cuenta')" class="text-red-500 text-xs mt-1">
                {{ obtenerMensajeError('nombre_cuenta') }}
              </div>
            </div>

            <!-- Número de cuenta -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Número de cuenta <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                formControlName="numero_cuenta"
                class="w-full text-sm border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                [class.border-red-300]="esInvalido('numero_cuenta')"
                placeholder="Número de cuenta bancaria">
              <div *ngIf="esInvalido('numero_cuenta')" class="text-red-500 text-xs mt-1">
                {{ obtenerMensajeError('numero_cuenta') }}
              </div>
            </div>

            <!-- Banco -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Banco <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <select
                  formControlName="banco_id"
                  class="w-full text-sm border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  [class.border-red-300]="esInvalido('banco_id')">
                  <option value="">Seleccione un banco</option>
                  <option *ngFor="let banco of bancos(); trackBy: trackByBanco" [value]="banco.id_banco">
                    {{ banco.nombre }}
                  </option>
                </select>
                <div *ngIf="cargandoBancos()" class="absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg class="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              </div>
              <div *ngIf="esInvalido('banco_id')" class="text-red-500 text-xs mt-1">
                {{ obtenerMensajeError('banco_id') }}
              </div>
            </div>

            <!-- Tipo de cuenta -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Tipo de cuenta <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <select
                  formControlName="tipo_cuenta_id"
                  class="w-full text-sm border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  [class.border-red-300]="esInvalido('tipo_cuenta_id')">
                  <option value="">Seleccione tipo de cuenta</option>
                  <option *ngFor="let tipo of tiposCuenta(); trackBy: trackByTipoCuenta" [value]="tipo.id_tipo_cuenta">
                    {{ tipo.nombre }}
                  </option>
                </select>
                <div *ngIf="cargandoTiposCuenta()" class="absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg class="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              </div>
              <div *ngIf="esInvalido('tipo_cuenta_id')" class="text-red-500 text-xs mt-1">
                {{ obtenerMensajeError('tipo_cuenta_id') }}
              </div>
            </div>
          </div>
        </div>

        <!-- Observaciones -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
          <textarea
            rows="3"
            formControlName="observaciones"
            placeholder="Información adicional sobre la transferencia..."
            class="w-full text-sm border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none">
          </textarea>
        </div>

        <!-- Resumen (solo se muestra si el formulario es válido) -->
        <div *ngIf="formulario.valid" class="bg-gray-100 p-4 rounded-md border">
          <h3 class="text-sm font-medium text-gray-800 mb-2 flex items-center">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            Resumen de la transferencia
          </h3>
          <div class="space-y-1 text-xs text-gray-600">
            <div class="flex justify-between">
              <span class="font-medium">Beneficiario:</span>
              <span>{{ formulario.get('nombre_cuenta')?.value }}</span>
            </div>
            <div class="flex justify-between">
              <span class="font-medium">Cuenta:</span>
              <span>{{ formulario.get('numero_cuenta')?.value }}</span>
            </div>
            <div class="flex justify-between">
              <span class="font-medium">Banco:</span>
              <span>{{ obtenerNombreBanco() }}</span>
            </div>
            <div class="flex justify-between">
              <span class="font-medium">Tipo:</span>
              <span>{{ obtenerNombreTipoCuenta() }}</span>
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
            class="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            Confirmar transferencia
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
    
    input:focus, select:focus, textarea:focus {
      box-shadow: 0 0 0 2px rgba(147, 51, 234, 0.1);
    }
    
    button:disabled {
      cursor: not-allowed;
    }
    
    @media (max-width: 640px) {
      .grid-cols-2 {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PagoTransferenciaFormComponent implements OnInit {

    // ============================================================================
    // DEPENDENCIAS Y INPUTS/OUTPUTS
    // ============================================================================

    private readonly servicio = inject(PlanEmpresarialService);
    private readonly fb = inject(FormBuilder);

    readonly data = input<DatosFormularioPago | null>(null);
    readonly guardar = output<PayloadTransferencia>();
    readonly cancelar = output<void>();

    // ============================================================================
    // SIGNALS DE ESTADO
    // ============================================================================

    readonly cargandoBancos = signal(false);
    readonly cargandoTiposCuenta = signal(false);

    // ============================================================================
    // COMPUTED SIGNALS
    // ============================================================================

    readonly bancos = computed(() => this.servicio.bancos());
    readonly tiposCuenta = computed(() => this.servicio.tiposCuenta());

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
            nombre_cuenta: ['', [
                Validators.required,
                Validators.minLength(3),
                Validators.maxLength(100)
            ]],
            numero_cuenta: ['', [
                Validators.required,
                Validators.minLength(8),
                Validators.maxLength(50),
                Validators.pattern(/^[0-9\-]+$/)
            ]],
            banco_id: ['', [Validators.required]],
            tipo_cuenta_id: ['', [Validators.required]],
            observaciones: ['', [Validators.maxLength(500)]]
        });
    }

    private cargarDatosExistentes(): void {
        const datos = this.data();
        if (!datos) return;

        // Si hay datos previos (modo edición), cargarlos
        this.formulario.patchValue({
            nombre_cuenta: datos.nombre_cuenta || '',
            numero_cuenta: datos.numero_cuenta || '',
            banco_id: datos.banco_id || '',
            tipo_cuenta_id: datos.tipo_cuenta_id || '',
            observaciones: datos.observaciones || ''
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

        if (errores['required']) {
            const mensajes: { [key: string]: string } = {
                'nombre_cuenta': 'El nombre del titular es obligatorio',
                'numero_cuenta': 'El número de cuenta es obligatorio',
                'banco_id': 'Debe seleccionar un banco',
                'tipo_cuenta_id': 'Debe seleccionar el tipo de cuenta'
            };
            return mensajes[campo] || 'Este campo es obligatorio';
        }

        if (errores['minlength']) {
            const requiredLength = errores['minlength'].requiredLength;
            return `Mínimo ${requiredLength} caracteres`;
        }

        if (errores['maxlength']) {
            const requiredLength = errores['maxlength'].requiredLength;
            return `Máximo ${requiredLength} caracteres`;
        }

        if (errores['pattern']) {
            return 'Solo se permiten números y guiones';
        }

        return 'Campo inválido';
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
        const payload: PayloadTransferencia = {
            ...this.data(), // Datos base del formulario principal
            nombre_cuenta: valores.nombre_cuenta,
            numero_cuenta: valores.numero_cuenta,
            banco_id: parseInt(valores.banco_id),
            tipo_cuenta_id: parseInt(valores.tipo_cuenta_id),
            observaciones: valores.observaciones || undefined
        };

        this.guardar.emit(payload);
    }

    private marcarTodoComoTocado(): void {
        Object.keys(this.formulario.controls).forEach(key => {
            this.formulario.get(key)?.markAsTouched();
        });
    }

    // ============================================================================
    // UTILIDADES
    // ============================================================================

    obtenerNombreBanco(): string {
        const bancoId = this.formulario.get('banco_id')?.value;
        if (!bancoId) return '';

        const banco = this.bancos().find(b => b.id_banco === parseInt(bancoId));
        return banco?.nombre || '';
    }

    obtenerNombreTipoCuenta(): string {
        const tipoId = this.formulario.get('tipo_cuenta_id')?.value;
        if (!tipoId) return '';

        const tipo = this.tiposCuenta().find(t => t.id_tipo_cuenta === parseInt(tipoId));
        return tipo?.nombre || '';
    }

    // ============================================================================
    // TRACK BY FUNCTIONS
    // ============================================================================

    trackByBanco(index: number, banco: BancoPE): number {
        return banco.id_banco;
    }

    trackByTipoCuenta(index: number, tipo: TipoCuentaPE): number {
        return tipo.id_tipo_cuenta;
    }
}