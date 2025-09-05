import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal, computed, input, output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgSelectModule } from '@ng-select/ng-select';

import { PlanEmpresarialService } from '../../../services/plan-empresarial.service';

// Formularios específicos de pago
import { PagoDepositoFormComponent } from './pago-forms/pago-deposito-form.component';
import { PagoTransferenciaFormComponent } from './pago-forms/pago-transferencia-form.component';
import { PagoChequeFormComponent } from './pago-forms/pago-cheque-form.component';
import { PagoTarjetaFormComponent } from './pago-forms/pago-tarjeta-form.component';
import { PagoAnticipoFormComponent } from './pago-forms/pago-anticipo-form.component';

import {
    DetalleLiquidacionPE,
    GuardarDetalleLiquidacionPayload,
    TipoPagoId,
    ValidadorMonto,
    OrdenPE,
    AgenciaPE
} from '../../../models/plan-empresarial.models';

/**
 * Modal para crear/editar detalles de liquidación
 * Incluye formularios específicos por tipo de pago
 */
@Component({
    selector: 'app-modal-detalle-liquidacion',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        NgSelectModule,
        PagoDepositoFormComponent,
        PagoTransferenciaFormComponent,
        PagoChequeFormComponent,
        PagoTarjetaFormComponent,
        PagoAnticipoFormComponent
    ],
    template: `
    <div *ngIf="visible()" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50">
      <div class="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        
        <!-- Header -->
        <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <!-- Icono del modal -->
            <div class="p-2 bg-blue-50 rounded-lg">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            
            <!-- Título e información -->
            <div>
              <h3 class="text-lg font-semibold text-gray-800">
                {{ modo() === 'crear' ? 'Agregar Detalle' : 'Editar Detalle' }}
              </h3>
              <p class="text-sm text-gray-500 flex flex-wrap items-center gap-1">
                <!-- Badge de factura -->
                <span *ngIf="facturaActiva()" 
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  Factura #{{ facturaActiva()?.numero_dte }}
                </span>
                
                <!-- Badge de monto factura -->
                <span *ngIf="facturaActiva()" 
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                  Monto: Q{{ facturaActiva()?.monto_total | number:'1.2-2' }}
                </span>
                
                <!-- Badge de monto pendiente -->
                <span *ngIf="facturaActiva()" 
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                      [ngClass]="obtenerClaseMontoPendiente()">
                  {{ obtenerTextoMontoPendiente() }}
                </span>
              </p>
            </div>
          </div>
          
          <!-- Botón cerrar -->
          <button 
            (click)="cerrar.emit()"
            class="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            title="Cerrar">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Contenido principal con scroll -->
        <div class="p-5 overflow-y-auto max-h-[calc(90vh-120px)]">
          <!-- Indicador de carga -->
          <div *ngIf="cargandoDatos()" class="flex justify-center items-center p-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span class="ml-3 text-gray-600">Cargando datos...</span>
          </div>

          <!-- Formulario principal -->
          <form [formGroup]="formularioPrincipal" class="space-y-4" *ngIf="!cargandoDatos()">
            
            <!-- Número de orden y forma de pago -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Número de orden -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Número de Orden <span class="text-red-500">*</span>
                </label>
                <ng-select 
                  formControlName="numero_orden"
                  placeholder="Seleccionar orden..."
                  [searchable]="true"
                  [clearable]="true"
                  bindLabel="displayText"
                  bindValue="numero_orden"
                  [ngClass]="{'border-red-300': campoInvalido('numero_orden')}">
                  <ng-option *ngFor="let orden of ordenesDisponibles(); trackBy: trackByOrden" 
                             [value]="orden.numero_orden">
                    <div class="flex flex-col w-full">
                      <div class="flex justify-between">
                        <span>Orden #{{ orden.numero_orden }}</span>
                        <span class="text-sm text-gray-500">Q{{ orden.total | number:'1.2-2' }}</span>
                      </div>
                      <div class="text-xs text-gray-500 mt-0.5">
                        <span *ngIf="orden.area">Área: {{ orden.area }}</span>
                        <span *ngIf="orden.presupuesto"> · Presupuesto: {{ orden.presupuesto }}</span>
                      </div>
                    </div>
                  </ng-option>
                </ng-select>
                <div *ngIf="campoInvalido('numero_orden')" class="text-red-500 text-xs mt-1">
                  {{ obtenerErrorMensaje('numero_orden') }}
                </div>
              </div>

              <!-- Forma de pago -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Forma de pago <span class="text-red-500">*</span>
                </label>
                <select 
                  formControlName="forma_pago"
                  class="w-full text-sm border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  [ngClass]="{'border-red-300': campoInvalido('forma_pago')}">
                  <option value="" disabled>Seleccionar forma de pago...</option>
                  <option *ngFor="let tipo of tiposPago(); trackBy: trackByTipoPago" [value]="tipo.id">
                    {{ tipo.nombre }}
                  </option>
                </select>
                <div *ngIf="campoInvalido('forma_pago')" class="text-red-500 text-xs mt-1">
                  {{ obtenerErrorMensaje('forma_pago') }}
                </div>
              </div>
            </div>

            <!-- Agencia y Monto -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Agencia -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Agencia <span class="text-red-500">*</span>
                </label>
                <ng-select 
                  formControlName="agencia"
                  placeholder="Seleccionar agencia..."
                  [searchable]="true"
                  [clearable]="true"
                  bindLabel="nombre_liquidacion"
                  bindValue="nombre_liquidacion"
                  [ngClass]="{'border-red-300': campoInvalido('agencia')}">
                  <ng-option *ngFor="let agencia of agenciasDisponibles(); trackBy: trackByAgencia" 
                             [value]="agencia.nombre_liquidacion">
                    {{ agencia.nombre_liquidacion }}
                  </ng-option>
                </ng-select>
                <div *ngIf="campoInvalido('agencia')" class="text-red-500 text-xs mt-1">
                  {{ obtenerErrorMensaje('agencia') }}
                </div>
              </div>

              <!-- Monto -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Monto <span class="text-red-500">*</span>
                </label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">Q</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0.01" 
                    formControlName="monto"
                    placeholder="0.00"
                    class="w-full text-sm border rounded-md py-2 pl-8 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    [ngClass]="{'border-red-300': campoInvalido('monto')}">
                </div>
                <div *ngIf="campoInvalido('monto')" class="text-red-500 text-xs mt-1">
                  {{ obtenerErrorMensaje('monto') }}
                </div>
              </div>
            </div>

            <!-- Descripción -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Descripción del gasto <span class="text-red-500">*</span>
              </label>
              <textarea 
                rows="3" 
                formControlName="descripcion"
                placeholder="Detalle el gasto realizado..."
                class="w-full text-sm border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                [ngClass]="{'border-red-300': campoInvalido('descripcion')}">
              </textarea>
              <div *ngIf="campoInvalido('descripcion')" class="text-red-500 text-xs mt-1">
                {{ obtenerErrorMensaje('descripcion') }}
              </div>
              <div *ngIf="!campoInvalido('descripcion') && formularioPrincipal.get('descripcion')?.value" 
                   class="text-gray-500 text-xs mt-1">
                {{ formularioPrincipal.get('descripcion')?.value.length }} / 200 caracteres
              </div>
            </div>

            <!-- Correo proveedor -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Correo del proveedor
              </label>
              <input 
                type="email" 
                formControlName="correo_proveedor"
                placeholder="correo@proveedor.com"
                class="w-full text-sm border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                [ngClass]="{'border-red-300': campoInvalido('correo_proveedor')}">
              <div *ngIf="campoInvalido('correo_proveedor')" class="text-red-500 text-xs mt-1">
                {{ obtenerErrorMensaje('correo_proveedor') }}
              </div>
            </div>

            <!-- FORMULARIOS ESPECÍFICOS POR TIPO DE PAGO -->
            <div *ngIf="mostrarFormularioEspecifico()" class="mt-6 border-t pt-4">
              <h4 class="text-md font-medium text-gray-900 mb-4">
                Información específica para {{ obtenerTextoTipoPago() }}
              </h4>

              <!-- Host de subformularios específicos -->
              <ng-container [ngSwitch]="tipoSeleccionado()">
                <!-- Formulario de depósito -->
                <app-pago-deposito-form 
                  *ngSwitchCase="'deposito'"
                  [data]="obtenerDatosFormulario()"
                  (guardar)="onGuardarDesdeFormulario($event)"
                  (cancelar)="cerrarFormularioEspecifico()">
                </app-pago-deposito-form>

                <!-- Formulario de transferencia -->
                <app-pago-transferencia-form 
                  *ngSwitchCase="'transferencia'"
                  [data]="obtenerDatosFormulario()"
                  (guardar)="onGuardarDesdeFormulario($event)"
                  (cancelar)="cerrarFormularioEspecifico()">
                </app-pago-transferencia-form>

                <!-- Formulario de cheque -->
                <app-pago-cheque-form 
                  *ngSwitchCase="'cheque'"
                  [data]="obtenerDatosFormulario()"
                  (guardar)="onGuardarDesdeFormulario($event)"
                  (cancelar)="cerrarFormularioEspecifico()">
                </app-pago-cheque-form>

                <!-- Formulario de tarjeta -->
                <app-pago-tarjeta-form 
                  *ngSwitchCase="'tarjeta'"
                  [data]="obtenerDatosFormulario()"
                  (guardar)="onGuardarDesdeFormulario($event)"
                  (cancelar)="cerrarFormularioEspecifico()">
                </app-pago-tarjeta-form>

                <!-- Formulario de anticipo -->
                <app-pago-anticipo-form 
                  *ngSwitchCase="'anticipo'"
                  [data]="obtenerDatosFormulario()"
                  (guardar)="onGuardarDesdeFormulario($event)"
                  (cancelar)="cerrarFormularioEspecifico()">
                </app-pago-anticipo-form>
              </ng-container>
            </div>
          </form>
        </div>

        <!-- Footer con botones de acción -->
        <div *ngIf="!mostrarFormularioEspecifico()" 
             class="px-4 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <!-- Botón Cancelar -->
          <button 
            type="button" 
            (click)="cerrar.emit()"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            Cancelar
          </button>

          <!-- Botón Guardar -->
          <button 
            type="button" 
            (click)="onGuardarBasico()" 
            [disabled]="formularioPrincipal.invalid || enviando()"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <svg *ngIf="!enviando()" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <svg *ngIf="enviando()" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ enviando() ? 'Procesando...' : (modo() === 'editar' ? 'Actualizar' : 'Agregar') }}</span>
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
    
    /* Input focus states */
    input:focus,
    select:focus,
    textarea:focus {
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
    }
    
    /* ng-select custom styles */
    ::ng-deep .ng-select.custom-ng-select {
      min-height: 38px;
    }
    
    ::ng-deep .ng-select.custom-ng-select .ng-select-container {
      border-radius: 0.375rem;
      border: 1px solid #d1d5db;
    }
    
    ::ng-deep .ng-select.custom-ng-select.ng-select-focused .ng-select-container {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
    }
    
    ::ng-deep .ng-select.is-invalid .ng-select-container {
      border-color: #fca5a5;
    }
    
    /* Disabled state */
    button:disabled {
      cursor: not-allowed;
    }
    
    /* Responsive adjustments */
    @media (max-width: 640px) {
      .grid-cols-2 {
        grid-template-columns: 1fr;
      }
      
      .max-w-4xl {
        max-width: 100%;
        margin: 1rem;
      }
    }
  `]
})
export class ModalDetalleLiquidacionComponent implements OnInit, OnDestroy {

    // ============================================================================
    // DEPENDENCIAS Y INPUTS/OUTPUTS
    // ============================================================================

    private readonly servicio = inject(PlanEmpresarialService);
    private readonly fb = inject(FormBuilder);

    // Inputs
    readonly visible = input<boolean>(false);
    readonly modo = input<'crear' | 'editar'>('crear');
    readonly detalle = input<DetalleLiquidacionPE | null>(null);

    // Outputs
    readonly cerrar = output<void>();
    readonly guardar = output<GuardarDetalleLiquidacionPayload>();

    // ============================================================================
    // SIGNALS DE ESTADO
    // ============================================================================

    readonly enviando = signal(false);
    readonly cargandoDatos = signal(false);
    readonly tipoSeleccionado = signal<TipoPagoId | ''>('');
    readonly mostrarFormularioEspecifico = signal(false);

    private readonly _datosFormularioCompletos = signal<any>(null);

    // ============================================================================
    // COMPUTED SIGNALS
    // ============================================================================

    readonly facturaActiva = computed(() => this.servicio.facturaActiva());
    readonly ordenesDisponibles = computed(() => this.servicio.ordenes().filter(o => o.puede_liquidar));
    readonly agenciasDisponibles = computed(() => this.servicio.agencias());
    readonly tiposPago = computed(() => this.servicio.tiposPago());

    // ============================================================================
    // FORMULARIO
    // ============================================================================

    formularioPrincipal!: FormGroup;

    // ============================================================================
    // LIFECYCLE
    // ============================================================================

    ngOnInit(): void {
        this.inicializarFormulario();
        this.configurarSuscripciones();

        // Cargar datos para edición si existe detalle
        if (this.detalle()) {
            this.cargarDatosParaEdicion();
        }
    }

    ngOnDestroy(): void {
        // Cleanup automático con takeUntilDestroyed
    }

    // ============================================================================
    // INICIALIZACIÓN
    // ============================================================================

    private inicializarFormulario(): void {
        this.formularioPrincipal = this.fb.group({
            numero_orden: ['', [Validators.required]],
            agencia: ['', [Validators.required]],
            descripcion: ['', [
                Validators.required,
                Validators.minLength(5),
                Validators.maxLength(200)
            ]],
            monto: [null, [
                Validators.required,
                Validators.min(0.01)
            ]],
            correo_proveedor: ['', [Validators.email]],
            forma_pago: ['', [Validators.required]]
        });
    }

    private configurarSuscripciones(): void {
        // Cambios en forma de pago
        this.formularioPrincipal.get('forma_pago')?.valueChanges
            .pipe(takeUntilDestroyed())
            .subscribe(value => {
                this.tipoSeleccionado.set(value);
                this.manejarCambiosFormaPago(value);
            });

        // Validación de monto
        this.formularioPrincipal.get('monto')?.valueChanges
            .pipe(takeUntilDestroyed())
            .subscribe(monto => {
                this.validarMontoConFacade(monto);
            });
    }

    // ============================================================================
    // CARGA DE DATOS PARA EDICIÓN
    // ============================================================================

    private cargarDatosParaEdicion(): void {
        const detalleActual = this.detalle();
        if (!detalleActual) return;

        this.formularioPrincipal.patchValue({
            numero_orden: detalleActual.numero_orden || '',
            agencia: detalleActual.agencia || '',
            descripcion: detalleActual.descripcion || '',
            monto: detalleActual.monto || null,
            correo_proveedor: detalleActual.correo_proveedor || '',
            forma_pago: detalleActual.forma_pago || ''
        });

        this.tipoSeleccionado.set(detalleActual.forma_pago || '');
    }

    // ============================================================================
    // MANEJO DE FORMULARIOS ESPECÍFICOS
    // ============================================================================

    private manejarCambiosFormaPago(formaPago: TipoPagoId): void {
        const tiposPago = this.tiposPago();
        const tipoPago = tiposPago.find(t => t.id === formaPago);

        if (tipoPago?.requiereFormulario) {
            this.mostrarFormularioEspecifico.set(true);
        } else {
            this.mostrarFormularioEspecifico.set(false);
        }
    }

    cerrarFormularioEspecifico(): void {
        this.mostrarFormularioEspecifico.set(false);
    }

    // ============================================================================
    // GUARDADO
    // ============================================================================

    onGuardarBasico(): void {
        if (this.formularioPrincipal.invalid) {
            this.marcarCamposComoTocados();
            return;
        }

        const formaPago = this.tipoSeleccionado();
        const tiposPago = this.tiposPago();
        const tipoPago = tiposPago.find(t => t.id === formaPago);

        // Si requiere formulario específico, no hacer nada
        if (tipoPago?.requiereFormulario) {
            return;
        }

        // Para formas de pago que NO requieren formulario específico
        this._datosFormularioCompletos.set({
            ...this.formularioPrincipal.value,
            forma_pago: formaPago
        });

        this.completarGuardado();
    }

    onGuardarDesdeFormulario(datosEspecificos: any): void {
        // Combinar datos del formulario principal con los específicos
        this._datosFormularioCompletos.set({
            ...this.formularioPrincipal.value,
            ...datosEspecificos,
            forma_pago: this.tipoSeleccionado()
        });

        this.completarGuardado();
    }

    private completarGuardado(): void {
        const datosCompletos = this._datosFormularioCompletos();
        if (!datosCompletos) return;

        const factura = this.facturaActiva();
        if (!factura) return;

        this.enviando.set(true);

        const payload: GuardarDetalleLiquidacionPayload = {
            id: this.detalle()?.id || null,
            numero_factura: factura.numero_dte,
            numero_orden: datosCompletos.numero_orden,
            agencia: datosCompletos.agencia,
            descripcion: datosCompletos.descripcion,
            monto: parseFloat(datosCompletos.monto),
            correo_proveedor: datosCompletos.correo_proveedor || null,
            forma_pago: datosCompletos.forma_pago,

            // Agregar campos específicos según el tipo
            ...this.extraerCamposEspecificos(datosCompletos)
        };

        // Emitir para que el padre maneje el guardado
        this.guardar.emit(payload);
        this.enviando.set(false);
    }

    private extraerCamposEspecificos(datos: any): Partial<GuardarDetalleLiquidacionPayload> {
        const especificos: any = {};

        switch (datos.forma_pago) {
            case 'deposito':
                if (datos.id_socio) especificos.id_socio = datos.id_socio;
                if (datos.nombre_socio) especificos.nombre_socio = datos.nombre_socio;
                if (datos.numero_cuenta_deposito) especificos.numero_cuenta_deposito = datos.numero_cuenta_deposito;
                if (datos.producto_cuenta) especificos.producto_cuenta = datos.producto_cuenta;
                if (datos.observaciones) especificos.observaciones = datos.observaciones;
                break;

            case 'cheque':
                if (datos.nombre_beneficiario) especificos.nombre_beneficiario = datos.nombre_beneficiario;
                if (datos.consignacion) especificos.consignacion = datos.consignacion;
                if (datos.no_negociable !== undefined) especificos.no_negociable = datos.no_negociable;
                if (datos.observaciones) especificos.observaciones = datos.observaciones;
                break;

            case 'transferencia':
                if (datos.nombre_cuenta) especificos.nombre_cuenta = datos.nombre_cuenta;
                if (datos.numero_cuenta) especificos.numero_cuenta = datos.numero_cuenta;
                if (datos.banco_id) especificos.banco_id = datos.banco_id;
                if (datos.tipo_cuenta_id) especificos.tipo_cuenta_id = datos.tipo_cuenta_id;
                if (datos.observaciones) especificos.observaciones = datos.observaciones;
                break;

            case 'tarjeta':
            case 'anticipo':
                if (datos.nota) especificos.nota = datos.nota;
                break;
        }

        return especificos;
    }

    // ============================================================================
    // VALIDACIONES
    // ============================================================================

    private validarMontoConFacade(monto: number | null): void {
        if (!monto || monto <= 0) return;

        const factura = this.facturaActiva();
        if (!factura) return;

        const detalleId = this.detalle()?.id || null;
        const validacion: ValidadorMonto = this.servicio.validarMonto(detalleId, monto);

        const montoControl = this.formularioPrincipal.get('monto');
        if (!montoControl) return;

        const errores = montoControl.errors || {};
        delete errores['montoExcedido'];
        delete errores['montoInsuficiente'];

        if (!validacion.es_valido) {
            if (validacion.mensaje?.includes('mayor a 0')) {
                errores['montoInsuficiente'] = true;
            } else if (validacion.mensaje?.includes('excede')) {
                errores['montoExcedido'] = {
                    montoDisponible: validacion.monto_disponible,
                    montoIngresado: monto
                };
            }
        }

        const tieneErrores = Object.keys(errores).length > 0;
        montoControl.setErrors(tieneErrores ? errores : null);
    }

    campoInvalido(campo: string): boolean {
        const control = this.formularioPrincipal.get(campo);
        return !!(control && control.invalid && (control.dirty || control.touched));
    }

    obtenerErrorMensaje(campo: string): string {
        const control = this.formularioPrincipal.get(campo);
        if (!control || !control.errors) return '';

        const errores = control.errors;

        if (errores['required']) return 'Este campo es obligatorio';
        if (errores['email']) return 'Ingrese un correo electrónico válido';
        if (errores['minlength']) return `Mínimo ${errores['minlength'].requiredLength} caracteres`;
        if (errores['maxlength']) return `Máximo ${errores['maxlength'].requiredLength} caracteres`;
        if (errores['min']) return `El valor mínimo es ${errores['min'].min}`;
        if (errores['montoExcedido']) return `El monto excede el disponible (Q${errores['montoExcedido'].montoDisponible?.toFixed(2)})`;
        if (errores['montoInsuficiente']) return 'El monto debe ser mayor a 0';

        return 'Campo inválido';
    }

    private marcarCamposComoTocados(): void {
        Object.keys(this.formularioPrincipal.controls).forEach(key => {
            this.formularioPrincipal.get(key)?.markAsTouched();
        });
    }

    // ============================================================================
    // UTILIDADES
    // ============================================================================

    obtenerDatosFormulario(): any {
        return {
            ...this.formularioPrincipal.value,
            factura_numero: this.facturaActiva()?.numero_dte
        };
    }

    obtenerTextoTipoPago(): string {
        const tiposPago = this.tiposPago();
        const tipo = tiposPago.find(t => t.id === this.tipoSeleccionado());
        return tipo?.nombre || 'Sin especificar';
    }

    calcularMontoDisponible(): number {
        const detalleId = this.detalle()?.id || null;
        return this.servicio.calcularMontoDisponible(detalleId);
    }

    obtenerClaseMontoPendiente(): string {
        const disponible = this.calcularMontoDisponible();
        if (disponible > 0) {
            return 'bg-green-100 text-green-800';
        } else {
            return 'bg-red-100 text-red-800';
        }
    }

    obtenerTextoMontoPendiente(): string {
        const disponible = this.calcularMontoDisponible();
        if (disponible > 0) {
            return `Disponible: Q${disponible.toFixed(2)}`;
        } else {
            return 'Sin monto disponible';
        }
    }

    // ============================================================================
    // TRACK BY FUNCTIONS
    // ============================================================================

    trackByOrden(index: number, orden: OrdenPE): string {
        return orden.numero_orden;
    }

    trackByTipoPago(index: number, tipo: any): string {
        return tipo.id;
    }

    trackByAgencia(index: number, agencia: AgenciaPE): number {
        return agencia.id;
    }
}