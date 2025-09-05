import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, input, output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { PlanEmpresarialService } from '../../../services/plan-empresarial.service';
import {
    SolicitarAutorizacionFacturaPayload,
    MENSAJES
} from '../../../models/plan-empresarial.models';

/**
 * Modal para solicitar autorización de factura fuera de tiempo
 * Estilo minimalista y funcional
 */
@Component({
    selector: 'app-modal-solicitar-autorizacion',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50">
      <div class="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-orange-50 rounded-lg">
              <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"/>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Solicitar Autorización</h3>
              <p class="text-sm text-gray-500">Factura fuera de tiempo</p>
            </div>
          </div>
          
          <button 
            (click)="cerrar.emit()" 
            class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Información de la factura -->
        <div class="p-4 bg-gray-50 border-b border-gray-200">
          <div class="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span class="text-gray-500">Número DTE:</span>
              <p class="font-medium text-gray-900">{{ numeroDte() }}</p>
            </div>
            <div>
              <span class="text-gray-500">Fecha Emisión:</span>
              <p class="font-medium text-gray-900">{{ fechaEmision() | date:'dd/MM/yyyy' }}</p>
            </div>
            <div>
              <span class="text-gray-500">Días Transcurridos:</span>
              <p class="font-semibold text-orange-600">{{ diasTranscurridos() }} días</p>
            </div>
          </div>
        </div>

        <!-- Formulario -->
        <div class="p-4">
          <form [formGroup]="formulario" (ngSubmit)="onSubmit()" class="space-y-4">
            
            <!-- Información importante -->
            <div class="p-3 bg-orange-50 border border-orange-200 rounded-md">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div class="ml-3 text-sm">
                  <p class="text-orange-800 font-medium">Autorización Requerida</p>
                  <p class="text-orange-700 mt-1">
                    Esta factura ha excedido el tiempo límite para su liquidación normal. 
                    Es necesario proporcionar una justificación para proceder.
                  </p>
                </div>
              </div>
            </div>

            <!-- Motivo/Justificación -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Motivo de la Tardanza <span class="text-red-500">*</span>
              </label>
              <textarea
                rows="4"
                formControlName="motivo"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                [class.border-red-300]="esInvalido('motivo')"
                placeholder="Explique detalladamente el motivo de la tardanza en la liquidación de esta factura...">
              </textarea>
              
              <!-- Contador de caracteres -->
              <div class="flex justify-between items-center mt-1">
                <div *ngIf="esInvalido('motivo')" class="text-red-500 text-xs">
                  {{ obtenerMensajeError('motivo') }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ obtenerContadorCaracteres() }} / 500 caracteres
                </div>
              </div>
            </div>

            <!-- Información adicional del proceso -->
            <div class="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div class="text-sm">
                <p class="text-blue-800 font-medium mb-2">Proceso de Autorización</p>
                <ul class="text-blue-700 space-y-1 text-xs">
                  <li>• La solicitud será enviada al supervisor correspondiente</li>
                  <li>• Recibirá una notificación del estado de la solicitud</li>
                  <li>• Una vez aprobada, podrá proceder con la liquidación</li>
                  <li>• El tiempo de respuesta aproximado es de 24-48 horas</li>
                </ul>
              </div>
            </div>

          </form>
        </div>

        <!-- Footer con acciones -->
        <div class="flex justify-end gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            (click)="cerrar.emit()"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          
          <button
            type="button"
            (click)="onSubmit()"
            [disabled]="formulario.invalid || enviando()"
            class="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-2">
            <svg *ngIf="enviando()" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
              </path>
            </svg>
            <span>{{ enviando() ? 'Enviando...' : 'Enviar Solicitud' }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    :host {
      display: block;
    }
    
    /* Overlay backdrop */
    .fixed.inset-0 {
      backdrop-filter: blur(4px);
    }
    
    /* Modal animation */
    .relative.bg-white {
      animation: modalSlideIn 0.2s ease-out;
    }
    
    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    
    /* Textarea focus */
    textarea:focus {
      box-shadow: 0 0 0 2px rgba(251, 146, 60, 0.1);
    }
    
    /* Disabled state */
    button:disabled {
      cursor: not-allowed;
    }
    
    /* Responsive adjustments */
    @media (max-width: 640px) {
      .grid-cols-3 {
        grid-template-columns: 1fr;
      }
      
      .max-w-lg {
        max-width: 100%;
        margin: 1rem;
      }
    }
  `]
})
export class ModalSolicitarAutorizacionComponent implements OnInit {

    // ============================================================================
    // DEPENDENCIAS Y INPUTS/OUTPUTS
    // ============================================================================

    private readonly servicio = inject(PlanEmpresarialService);
    private readonly fb = inject(FormBuilder);

    // Inputs
    readonly numeroDte = input.required<string>();
    readonly fechaEmision = input.required<string>();
    readonly diasTranscurridos = input.required<number>();

    // Outputs
    readonly cerrar = output<void>();
    readonly solicitudEnviada = output<SolicitarAutorizacionFacturaPayload>();

    // ============================================================================
    // ESTADO
    // ============================================================================

    readonly enviando = signal(false);

    formulario!: FormGroup;

    // ============================================================================
    // LIFECYCLE
    // ============================================================================

    ngOnInit(): void {
        this.inicializarFormulario();
    }

    // ============================================================================
    // INICIALIZACIÓN
    // ============================================================================

    private inicializarFormulario(): void {
        this.formulario = this.fb.group({
            motivo: ['', [
                Validators.required,
                Validators.minLength(10),
                Validators.maxLength(500)
            ]]
        });
    }

    // ============================================================================
    // ENVÍO DEL FORMULARIO
    // ============================================================================

    onSubmit(): void {
        if (this.formulario.invalid) {
            this.marcarTodoComoTocado();
            return;
        }

        this.enviando.set(true);

        const payload: SolicitarAutorizacionFacturaPayload = {
            numero_dte: this.numeroDte(),
            motivo: this.formulario.value.motivo.trim(),
            dias_transcurridos: this.diasTranscurridos()
        };

        // Usar el servicio para enviar la solicitud
        this.servicio.solicitarAutorizacionFactura(payload).subscribe({
            next: (exito) => {
                this.enviando.set(false);
                if (exito) {
                    this.solicitudEnviada.emit(payload);
                    this.cerrar.emit();
                }
            },
            error: () => {
                this.enviando.set(false);
            }
        });
    }

    // ============================================================================
    // VALIDACIÓN Y ERRORES
    // ============================================================================

    esInvalido(campo: string): boolean {
        const control = this.formulario.get(campo);
        return !!(control && control.invalid && (control.dirty || control.touched));
    }

    obtenerMensajeError(campo: string): string {
        const control = this.formulario.get(campo);
        if (!control || !control.errors) return '';

        const errores = control.errors;

        if (errores['required']) return 'Este campo es obligatorio';
        if (errores['minlength']) return `Mínimo ${errores['minlength'].requiredLength} caracteres`;
        if (errores['maxlength']) return `Máximo ${errores['maxlength'].requiredLength} caracteres`;

        return 'Campo inválido';
    }

    obtenerContadorCaracteres(): number {
        const valor = this.formulario.get('motivo')?.value || '';
        return valor.length;
    }

    private marcarTodoComoTocado(): void {
        Object.keys(this.formulario.controls).forEach(key => {
            this.formulario.get(key)?.markAsTouched();
        });
    }
}