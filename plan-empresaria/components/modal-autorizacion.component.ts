// ============================================================================
// MODAL SOLICITAR AUTORIZACIÓN
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { PlanEmpresarialService } from '../services/plan-empresarial.service';
import {
    FacturaPE,
    ValidacionVencimiento,
    SolicitarAutorizacionPayload,
    CONFIGURACION,
    MENSAJES_VALIDACION
} from '../models/plan-empresarial.models';

@Component({
    selector: 'app-modal-autorizacion',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
      <div class="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-orange-50 rounded-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                   stroke-width="2" class="text-orange-600">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4"/>
                <path d="M12 16h.01"/>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Solicitar Autorización Especial</h3>
              <p class="text-sm text-gray-500">Factura fuera del tiempo permitido</p>
            </div>
          </div>
          <button 
            (click)="cerrar.emit()"
            class="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Contenido -->
        <div class="p-6 space-y-6">
          
          <!-- Información de la factura -->
          <div class="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h4 class="text-sm font-medium text-orange-800 mb-3">Información de la Factura</h4>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-orange-700">Número DTE:</span>
                <p class="font-medium text-orange-900">{{ factura.numero_dte }}</p>
              </div>
              <div>
                <span class="text-orange-700">Fecha Emisión:</span>
                <p class="font-medium text-orange-900">{{ formatearFecha(factura.fecha_emision) }}</p>
              </div>
              <div>
                <span class="text-orange-700">Emisor:</span>
                <p class="font-medium text-orange-900">{{ factura.nombre_emisor }}</p>
              </div>
              <div>
                <span class="text-orange-700">Monto:</span>
                <p class="font-medium text-orange-900">{{ formatearMonto(factura.monto_total) }}</p>
              </div>
            </div>
          </div>

          <!-- Estado de vencimiento -->
          <div *ngIf="validacion" class="border rounded-lg p-4" [ngClass]="validacion.claseCSS">
            <div class="flex items-start gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                   stroke-width="2" class="mt-0.5 flex-shrink-0">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 12l2 2 4-4"/>
              </svg>
              <div class="flex-1">
                <p class="font-medium text-sm mb-1">Estado del Vencimiento</p>
                <p class="text-sm">{{ validacion.mensaje }}</p>
                <div class="mt-2 text-xs">
                  <span class="font-medium">Días transcurridos:</span> {{ validacion.diasTranscurridos }}
                </div>
                <div *ngIf="validacion.fechaInicioCalculo" class="text-xs">
                  <span class="font-medium">Cálculo desde:</span> 
                  {{ formatearFecha(validacion.fechaInicioCalculo.toISOString()) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Formulario -->
          <form [formGroup]="formulario" (ngSubmit)="onSubmit()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Motivo de la Tardanza <span class="text-red-500">*</span>
              </label>
              <textarea 
                formControlName="motivo"
                rows="5"
                placeholder="Explique las razones por las cuales la liquidación se realizará fuera del tiempo permitido..."
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-vertical"
                [class.border-red-300]="esInvalido('motivo')"></textarea>
              
              <div class="flex justify-between items-center mt-1">
                <div *ngIf="esInvalido('motivo')" class="text-red-500 text-xs">
                  {{ obtenerMensajeError('motivo') }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ longitudTexto() }}/{{ CONFIGURACION.MAX_JUSTIFICACION }} caracteres
                </div>
              </div>
              
              <div *ngIf="!esInvalido('motivo') && longitudTexto() > 0" class="mt-2">
                <div class="w-full bg-gray-200 rounded-full h-1">
                  <div 
                    class="h-1 rounded-full transition-all duration-300"
                    [class]="obtenerColorBarra()"
                    [style.width.%]="porcentajeTexto()">
                  </div>
                </div>
              </div>
            </div>

            <!-- Información adicional -->
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div class="flex items-start gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                     stroke-width="2" class="text-gray-600 mt-0.5 flex-shrink-0">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4"/>
                  <path d="M12 8h.01"/>
                </svg>
                <div class="text-sm text-gray-700">
                  <p class="font-medium mb-1">Proceso de Autorización:</p>
                  <ul class="text-xs space-y-1 list-disc list-inside text-gray-600">
                    <li>Su solicitud será enviada al departamento correspondiente</li>
                    <li>Recibirá una notificación con la respuesta en un máximo de 24 horas</li>
                    <li>Una vez aprobada, podrá proceder con la liquidación de la factura</li>
                    <li>Si es rechazada, deberá contactar al supervisor para revisar el caso</li>
                  </ul>
                </div>
              </div>
            </div>

          </form>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
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
            class="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
            <svg *ngIf="enviando()" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            <span>{{ enviando() ? 'Enviando...' : 'Enviar Solicitud' }}</span>
          </button>
        </div>

      </div>
    </div>
  `
})
export class ModalAutorizacionComponent implements OnInit {
    @Input() factura!: FacturaPE;
    @Input() validacion?: ValidacionVencimiento | null;
    @Output() cerrar = new EventEmitter<void>();
    @Output() autorizada = new EventEmitter<void>();

    private readonly service = inject(PlanEmpresarialService);
    private readonly fb = inject(FormBuilder);

    readonly enviando = signal<boolean>(false);
    readonly CONFIGURACION = CONFIGURACION;

    readonly formulario: FormGroup;

    constructor() {
        this.formulario = this.fb.group({
            motivo: ['', [
                Validators.required,
                Validators.minLength(CONFIGURACION.MIN_JUSTIFICACION),
                Validators.maxLength(CONFIGURACION.MAX_JUSTIFICACION)
            ]]
        });
    }

    ngOnInit(): void {
        // Auto-focus en el textarea
        setTimeout(() => {
            const textarea = document.querySelector('textarea');
            textarea?.focus();
        }, 100);
    }

    onSubmit(): void {
        if (this.formulario.invalid || this.enviando()) return;

        this.marcarCamposComoTocados();

        if (this.formulario.valid) {
            this.enviarSolicitud();
        }
    }

    private enviarSolicitud(): void {
        this.enviando.set(true);

        const payload: SolicitarAutorizacionPayload = {
            numero_dte: this.factura.numero_dte,
            motivo: this.formulario.get('motivo')?.value.trim(),
            dias_transcurridos: this.validacion?.diasTranscurridos || 0
        };

        this.service.solicitarAutorizacion(payload).subscribe({
            next: (exito) => {
                this.enviando.set(false);
                if (exito) {
                    this.autorizada.emit();
                }
            },
            error: () => {
                this.enviando.set(false);
            }
        });
    }

    // === VALIDACIONES ===

    esInvalido(campo: string): boolean {
        const control = this.formulario.get(campo);
        return !!(control && control.invalid && (control.dirty || control.touched));
    }

    obtenerMensajeError(campo: string): string {
        const control = this.formulario.get(campo);
        if (!control || !control.errors) return '';

        const errores = control.errors;

        if (errores['required']) return MENSAJES_VALIDACION.CAMPO_REQUERIDO;
        if (errores['minlength']) {
            const min = errores['minlength'].requiredLength;
            const actual = errores['minlength'].actualLength;
            return `Mínimo ${min} caracteres. Actual: ${actual}/${min}`;
        }
        if (errores['maxlength']) {
            return `Máximo ${CONFIGURACION.MAX_JUSTIFICACION} caracteres`;
        }

        return 'Campo inválido';
    }

    // === UTILIDADES DE UI ===

    longitudTexto(): number {
        return this.formulario.get('motivo')?.value?.length || 0;
    }

    porcentajeTexto(): number {
        const longitud = this.longitudTexto();
        const maximo = CONFIGURACION.MAX_JUSTIFICACION;
        return Math.min((longitud / maximo) * 100, 100);
    }

    obtenerColorBarra(): string {
        const porcentaje = this.porcentajeTexto();
        if (porcentaje < 20) return 'bg-red-500';
        if (porcentaje < 50) return 'bg-yellow-500';
        if (porcentaje < 80) return 'bg-blue-500';
        if (porcentaje < 95) return 'bg-green-500';
        return 'bg-orange-500';
    }

    // === UTILIDADES DE FORMATO ===

    formatearFecha(fecha: string | Date): string {
        try {
            const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
            return fechaObj.toLocaleDateString('es-GT', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch {
            return '-';
        }
    }

    formatearMonto(monto: number): string {
        return new Intl.NumberFormat('es-GT', {
            style: 'currency',
            currency: 'GTQ',
            minimumFractionDigits: 2
        }).format(monto);
    }

    private marcarCamposComoTocados(): void {
        Object.keys(this.formulario.controls).forEach(campo => {
            this.formulario.get(campo)?.markAsTouched();
        });
    }
}