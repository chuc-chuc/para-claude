// ============================================================================
// MODAL SOLICITAR CAMBIO
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  DetalleConOrden,
  TIPOS_CAMBIO,
  TipoCambio,
  obtenerIconoTipoCambio,
  formatearMonto,
  validarDescripcionCambio
} from '../../models/liquidacion-verificacion.models';

@Component({
  selector: 'app-modal-solicitar-cambio',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-screen overflow-y-auto">

        <!-- Header -->
        <div class="px-6 py-4 border-b">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-orange-100 rounded-lg">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-orange-600">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Solicitar Cambio</h3>
                <p class="text-sm text-gray-600">Registrar solicitud de cambio para el detalle</p>
              </div>
            </div>
            <button (click)="cerrar.emit()" class="text-gray-400 hover:text-gray-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Contenido -->
        <div class="px-6 py-4">

          <!-- Información del Detalle -->
          <div class="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 class="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" x2="12" y1="8" y2="12"/>
                <line x1="12" x2="12.01" y1="16" y2="16"/>
              </svg>
              Información del Detalle
            </h4>
            
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-gray-500">Orden:</span>
                <p class="font-medium">#{{ detalle?.numero_orden }}</p>
              </div>
              <div>
                <span class="text-gray-500">Monto:</span>
                <p class="font-semibold text-green-600">{{ formatearMonto(detalle?.monto || 0) }}</p>
              </div>
              <div class="col-span-2">
                <span class="text-gray-500">Descripción:</span>
                <p class="font-medium">{{ detalle?.descripcion }}</p>
              </div>
              <div>
                <span class="text-gray-500">Área:</span>
                <p class="text-sm">{{ detalle?.orden?.area_nombre }}</p>
              </div>
              <div>
                <span class="text-gray-500">Presupuesto:</span>
                <p class="text-sm">{{ detalle?.orden?.tipo_presupuesto }}</p>
              </div>
            </div>
          </div>

          <!-- Formulario -->
          <form [formGroup]="formulario" class="space-y-6">

            <!-- Tipo de Cambio -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-3">
                Tipo de Cambio Solicitado *
              </label>
              <div class="space-y-2">
                <div 
                  *ngFor="let tipo of tiposCambio" 
                  class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  [class.border-orange-300]="formulario.get('tipo_cambio')?.value === tipo.key"
                  [class.bg-orange-50]="formulario.get('tipo_cambio')?.value === tipo.key">
                  
                  <input 
                    type="radio" 
                    [value]="tipo.key" 
                    formControlName="tipo_cambio"
                    class="mr-3 text-orange-600">
                  
                  <div class="flex items-center gap-3 flex-1">
                    <span class="text-lg">{{ tipo.icono }}</span>
                    <div>
                      <div class="font-medium text-gray-900">{{ tipo.label }}</div>
                      <div class="text-sm text-gray-500">{{ tipo.descripcion }}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div *ngIf="esInvalido('tipo_cambio')" class="text-red-500 text-sm mt-1">
                Seleccione el tipo de cambio a solicitar
              </div>
            </div>

            <!-- Valores (Condicional) -->
            <div *ngIf="mostrarCamposValores()" class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Valor Actual
                </label>
                <input 
                  type="text" 
                  formControlName="valor_anterior"
                  [placeholder]="obtenerPlaceholderValorAnterior()"
                  class="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Valor Solicitado
                </label>
                <input 
                  type="text" 
                  formControlName="valor_solicitado"
                  [placeholder]="obtenerPlaceholderValorSolicitado()"
                  class="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500">
              </div>
            </div>

            <!-- Descripción del Cambio -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Descripción del Cambio *
              </label>
              <textarea 
                formControlName="descripcion_cambio"
                rows="4"
                placeholder="Describe detalladamente el cambio que solicitas y por qué es necesario..."
                class="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                [class.border-red-300]="esInvalido('descripcion_cambio')"></textarea>
              
              <div class="flex justify-between items-center mt-1">
                <div *ngIf="esInvalido('descripcion_cambio')" class="text-red-500 text-sm">
                  <div *ngIf="formulario.get('descripcion_cambio')?.errors?.['required']">
                    La descripción del cambio es obligatoria
                  </div>
                  <div *ngIf="formulario.get('descripcion_cambio')?.errors?.['minlength']">
                    La descripción debe tener al menos 10 caracteres
                  </div>
                </div>
                
                <div class="text-xs text-gray-500">
                  {{ contadorCaracteres() }}/500 caracteres
                </div>
              </div>

              <!-- Validación en tiempo real -->
              <div *ngIf="mensajeValidacionDescripcion()" 
                   class="mt-2 p-2 rounded text-sm"
                   [class.bg-red-50]="!validacionDescripcionOk()"
                   [class.text-red-700]="!validacionDescripcionOk()"
                   [class.bg-green-50]="validacionDescripcionOk()"
                   [class.text-green-700]="validacionDescripcionOk()">
                {{ mensajeValidacionDescripcion() }}
              </div>
            </div>

            <!-- Justificación -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Justificación Adicional
              </label>
              <textarea 
                formControlName="justificacion"
                rows="3"
                placeholder="Información adicional o contexto que respalde la solicitud (opcional)..."
                class="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"></textarea>
              
              <div class="text-xs text-gray-500 mt-1">
                {{ contadorJustificacion() }}/1000 caracteres (opcional)
              </div>
            </div>

            <!-- Información de Proceso -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="flex items-start gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-blue-600 mt-0.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" x2="12" y1="8" y2="12"/>
                  <line x1="12" x2="12.01" y1="16" y2="16"/>
                </svg>
                <div class="text-sm">
                  <p class="font-medium text-blue-800 mb-1">Proceso de Solicitud</p>
                  <ul class="text-blue-700 space-y-1">
                    <li>• La solicitud será enviada para revisión</li>
                    <li>• Recibirás notificación sobre el estado</li>
                    <li>• El detalle será marcado como "con cambios pendientes"</li>
                  </ul>
                </div>
              </div>
            </div>
          </form>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t bg-gray-50">
          <div class="flex justify-between items-center">
            <!-- Información -->
            <div class="text-sm text-gray-600">
              <span class="font-medium">Orden #{{ detalle?.numero_orden }}</span>
              • {{ formatearMonto(detalle?.monto || 0) }}
            </div>

            <!-- Acciones -->
            <div class="flex gap-3">
              <button 
                type="button" 
                (click)="cerrar.emit()"
                class="px-4 py-2 text-gray-700 bg-white border rounded-md hover:bg-gray-50">
                Cancelar
              </button>
              
              <button 
                type="button" 
                (click)="confirmar()"
                [disabled]="formulario.invalid || !validacionDescripcionOk() || enviando()"
                class="px-6 py-2 text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2">
                
                <!-- Loading Spinner -->
                <div *ngIf="enviando()"
                     class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full">
                </div>
                
                <!-- Icono -->
                <svg *ngIf="!enviando()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m22 2-7 20-4-9-9-4Z"/>
                  <path d="M22 2 11 13"/>
                </svg>
                
                {{ enviando() ? 'Enviando...' : 'Enviar Solicitud' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ModalSolicitarCambioComponent implements OnInit {
  @Input() detalle: DetalleConOrden | null = null;

  @Output() cerrar = new EventEmitter<void>();
  @Output() confirmado = new EventEmitter<any>();

  readonly enviando = signal<boolean>(false);
  readonly mensajeValidacionDescripcion = signal<string>('');
  readonly validacionDescripcionOk = signal<boolean>(false);

  readonly formatearMonto = formatearMonto;

  formulario!: FormGroup;

  readonly tiposCambio = [
    {
      key: 'correccion_monto' as TipoCambio,
      label: 'Corrección de Monto',
      descripcion: 'El monto registrado no es correcto',
      icono: obtenerIconoTipoCambio('correccion_monto')
    },
    {
      key: 'correccion_descripcion' as TipoCambio,
      label: 'Corrección de Descripción',
      descripcion: 'La descripción del gasto no es precisa',
      icono: obtenerIconoTipoCambio('correccion_descripcion')
    },
    {
      key: 'correccion_agencia' as TipoCambio,
      label: 'Corrección de Agencia',
      descripcion: 'La agencia asignada no es la correcta',
      icono: obtenerIconoTipoCambio('correccion_agencia')
    },
    {
      key: 'otros' as TipoCambio,
      label: 'Otros Cambios',
      descripcion: 'Otro tipo de corrección necesaria',
      icono: obtenerIconoTipoCambio('otros')
    }
  ];

  constructor(private fb: FormBuilder) {
    this.inicializarFormulario();
  }

  ngOnInit(): void {
    this.configurarValidaciones();
  }

  // ============================================================================
  // INICIALIZACIÓN
  // ============================================================================

  private inicializarFormulario(): void {
    this.formulario = this.fb.group({
      tipo_cambio: ['', [Validators.required]],
      valor_anterior: [''],
      valor_solicitado: [''],
      descripcion_cambio: ['', [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(500)
      ]],
      justificacion: ['', [Validators.maxLength(1000)]]
    });
  }

  private configurarValidaciones(): void {
    // Validación de descripción en tiempo real
    this.formulario.get('descripcion_cambio')?.valueChanges.subscribe(valor => {
      this.validarDescripcionEnTiempoReal(valor);
    });

    // Limpiar valores cuando cambia el tipo
    this.formulario.get('tipo_cambio')?.valueChanges.subscribe(tipo => {
      if (tipo) {
        this.rellenarValoresSegunTipo(tipo);
      }
    });
  }

  private validarDescripcionEnTiempoReal(valor: string): void {
    const resultado = validarDescripcionCambio(valor);

    this.validacionDescripcionOk.set(resultado.valido);
    this.mensajeValidacionDescripcion.set(resultado.mensaje || '');
  }

  private rellenarValoresSegunTipo(tipo: string): void {
    if (!this.detalle) return;

    const valores: Record<string, { anterior: string, placeholder: string }> = {
      'correccion_monto': {
        anterior: this.formatearMonto(this.detalle.monto),
        placeholder: 'Nuevo monto'
      },
      'correccion_descripcion': {
        anterior: this.detalle.descripcion,
        placeholder: 'Nueva descripción'
      },
      'correccion_agencia': {
        anterior: this.detalle.orden.area_nombre,
        placeholder: 'Nueva agencia'
      }
    };

    if (valores[tipo]) {
      this.formulario.patchValue({
        valor_anterior: valores[tipo].anterior
      });
    }
  }

  // ============================================================================
  // UTILIDADES DEL TEMPLATE
  // ============================================================================

  mostrarCamposValores(): boolean {
    const tipo = this.formulario.get('tipo_cambio')?.value;
    return ['correccion_monto', 'correccion_descripcion', 'correccion_agencia'].includes(tipo);
  }

  obtenerPlaceholderValorAnterior(): string {
    const tipo = this.formulario.get('tipo_cambio')?.value;
    const placeholders: Record<string, string> = {
      'correccion_monto': 'Monto actual',
      'correccion_descripcion': 'Descripción actual',
      'correccion_agencia': 'Agencia actual'
    };
    return placeholders[tipo] || 'Valor actual';
  }

  obtenerPlaceholderValorSolicitado(): string {
    const tipo = this.formulario.get('tipo_cambio')?.value;
    const placeholders: Record<string, string> = {
      'correccion_monto': 'Nuevo monto correcto',
      'correccion_descripcion': 'Descripción corregida',
      'correccion_agencia': 'Agencia correcta'
    };
    return placeholders[tipo] || 'Nuevo valor';
  }

  contadorCaracteres(): number {
    const valor = this.formulario.get('descripcion_cambio')?.value || '';
    return valor.length;
  }

  contadorJustificacion(): number {
    const valor = this.formulario.get('justificacion')?.value || '';
    return valor.length;
  }

  // ============================================================================
  // VALIDACIONES
  // ============================================================================

  esInvalido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  // ============================================================================
  // ACCIONES
  // ============================================================================

  confirmar(): void {
    if (this.formulario.valid && this.validacionDescripcionOk()) {
      this.enviando.set(true);

      // Simular delay de envío
      setTimeout(() => {
        this.enviando.set(false);
        this.confirmado.emit(this.formulario.value);
      }, 1500);
    }
  }

  // ============================================================================
  // INFORMACIÓN CONTEXTUAL
  // ============================================================================

  get resumenSolicitud(): string {
    const tipo = this.formulario.get('tipo_cambio')?.value;
    const tipoInfo = this.tiposCambio.find(t => t.key === tipo);
    return tipoInfo ? `${tipoInfo.icono} ${tipoInfo.label}` : 'Solicitud de cambio';
  }

  get impactoEstimado(): string {
    const tipo = this.formulario.get('tipo_cambio')?.value;

    const impactos: Record<string, string> = {
      'correccion_monto': 'Requerirá validación contable',
      'correccion_descripcion': 'Actualización de registros',
      'correccion_agencia': 'Reasignación de responsabilidad',
      'otros': 'Revisión manual necesaria'
    };

    return impactos[tipo] || '';
  }
}