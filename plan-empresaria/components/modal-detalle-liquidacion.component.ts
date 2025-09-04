// ============================================================================
// MODAL DETALLE LIQUIDACIÓN
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { PlanEmpresarialService } from '../services/plan-empresarial.service';
import {
    DetalleLiquidacionPE,
    FacturaPE,
    GuardarDetalleLiquidacionPayload,
    TipoPago,
    AgenciaPE,
    OrdenAutorizadaPE,
    CONFIGURACION,
    MENSAJES_VALIDACION,
    COLORES_TIPO_PAGO
} from '../models/plan-empresarial.models';

// Componentes de formularios específicos
import { PagoDepositoFormComponent } from './pago-forms/pago-deposito-form.component';
import { PagoTransferenciaFormComponent } from './pago-forms/pago-transferencia-form.component';
import { PagoChequeFormComponent } from './pago-forms/pago-cheque-form.component';
import { PagoTarjetaFormComponent } from './pago-forms/pago-tarjeta-form.component';
import { PagoAnticipoFormComponent } from './pago-forms/pago-anticipo-form.component';

@Component({
    selector: 'app-modal-detalle-liquidacion',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        PagoDepositoFormComponent,
        PagoTransferenciaFormComponent,
        PagoChequeFormComponent,
        PagoTarjetaFormComponent,
        PagoAnticipoFormComponent
    ],
    template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
      <div class="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-50 rounded-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                   stroke-width="2" class="text-blue-600">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">
                {{ modo === 'crear' ? 'Agregar Detalle' : 'Editar Detalle' }}
              </h3>
              <div *ngIf="factura" class="flex items-center gap-2 text-sm text-gray-500">
                <span class="inline-flex px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                  Factura #{{ factura.numero_dte }}
                </span>
                <span class="inline-flex px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                  {{ formatearMonto(factura.monto_total) }}
                </span>
                <span class="inline-flex px-2 py-0.5 text-xs font-medium rounded"
                      [ngClass]="montoDisponible() > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                  {{ montoDisponible() > 0 ? 'Disponible' : 'Excedido' }}: {{ formatearMonto(Math.abs(montoDisponible())) }}
                </span>
              </div>
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

        <!-- Contenido principal -->
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          
          <!-- Indicador de carga -->
          <div *ngIf="cargandoDatos()" class="flex justify-center items-center p-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span class="ml-3 text-gray-600">Cargando datos...</span>
          </div>

          <!-- Formulario principal -->
          <form [formGroup]="formulario" *ngIf="!cargandoDatos()" class="space-y-6">
            
            <!-- Orden y Forma de Pago -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Número de Orden <span class="text-red-500">*</span>
                </label>
                <select 
                  formControlName="numero_orden"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  [class.border-red-300]="esInvalido('numero_orden')">
                  <option value="">Seleccionar orden...</option>
                  <option *ngFor="let orden of ordenesDisponibles(); trackBy: trackByOrden" 
                          [value]="orden.numero_orden">
                    <div class="flex justify-between">
                      <span>Orden #{{ orden.numero_orden }}</span>
                      <span>{{ formatearMonto(orden.total) }}</span>
                    </div>
                    <div *ngIf="orden.area || orden.presupuesto" class="text-xs text-gray-500">
                      <span *ngIf="orden.area">{{ orden.area }}</span>
                      <span *ngIf="orden.area && orden.presupuesto"> • </span>
                      <span *ngIf="orden.presupuesto">{{ orden.presupuesto }}</span>
                    </div>
                  </option>
                </select>
                <div *ngIf="esInvalido('numero_orden')" class="text-red-500 text-xs mt-1">
                  {{ obtenerMensajeError('numero_orden') }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Forma de Pago <span class="text-red-500">*</span>
                </label>
                <select 
                  formControlName="forma_pago"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  [class.border-red-300]="esInvalido('forma_pago')">
                  <option value="">Seleccionar forma de pago...</option>
                  <option *ngFor="let tipo of tiposPago(); trackBy: trackByTipoPago" [value]="tipo.id">
                    {{ tipo.nombre }}
                  </option>
                </select>
                <div *ngIf="esInvalido('forma_pago')" class="text-red-500 text-xs mt-1">
                  {{ obtenerMensajeError('forma_pago') }}
                </div>
              </div>
            </div>

            <!-- Agencia y Monto -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Agencia <span class="text-red-500">*</span>
                </label>
                <select 
                  formControlName="agencia"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  [class.border-red-300]="esInvalido('agencia')">
                  <option value="">Seleccionar agencia...</option>
                  <option *ngFor="let agencia of agencias(); trackBy: trackByAgencia" 
                          [value]="agencia.nombre_liquidacion">
                    {{ agencia.nombre_liquidacion }}
                  </option>
                </select>
                <div *ngIf="esInvalido('agencia')" class="text-red-500 text-xs mt-1">
                  {{ obtenerMensajeError('agencia') }}
                </div>
              </div>

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
                    class="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    [class.border-red-300]="esInvalido('monto')">
                </div>
                <div *ngIf="esInvalido('monto')" class="text-red-500 text-xs mt-1">
                  {{ obtenerMensajeError('monto') }}
                </div>
              </div>
            </div>

            <!-- Descripción -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Descripción del Gasto <span class="text-red-500">*</span>
              </label>
              <textarea 
                rows="3" 
                formControlName="descripcion"
                placeholder="Detalle el gasto realizado..."
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-vertical"
                [class.border-red-300]="esInvalido('descripcion')"></textarea>
              <div class="flex justify-between items-center mt-1">
                <div *ngIf="esInvalido('descripcion')" class="text-red-500 text-xs">
                  {{ obtenerMensajeError('descripcion') }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ longitudDescripcion() }}/{{ CONFIGURACION.MAX_DESCRIPCION }} caracteres
                </div>
              </div>
            </div>

            <!-- Correo Proveedor -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Correo del Proveedor
              </label>
              <input 
                type="email" 
                formControlName="correo_proveedor"
                placeholder="correo@proveedor.com"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                [class.border-red-300]="esInvalido('correo_proveedor')">
              <div *ngIf="esInvalido('correo_proveedor')" class="text-red-500 text-xs mt-1">
                {{ obtenerMensajeError('correo_proveedor') }}
              </div>
            </div>

            <!-- Formulario específico por tipo de pago -->
            <div *ngIf="mostrarFormularioEspecifico()" class="mt-6 border-t pt-6">
              <h4 class="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                      [ngClass]="obtenerColorTipoPago(tipoSeleccionado())">
                  {{ obtenerTextoTipoPago(tipoSeleccionado()) }}
                </span>
                <span class="text-sm text-gray-500">- Información específica</span>
              </h4>

              <ng-container [ngSwitch]="tipoSeleccionado()">
                <app-pago-deposito-form 
                  *ngSwitchCase="'deposito'"
                  [datosIniciales]="datosFormularioEspecifico()"
                  (datosCompletos)="onDatosEspecificosCompletos($event)">
                </app-pago-deposito-form>

                <app-pago-transferencia-form 
                  *ngSwitchCase="'transferencia'"
                  [datosIniciales]="datosFormularioEspecifico()"
                  (datosCompletos)="onDatosEspecificosCompletos($event)">
                </app-pago-transferencia-form>

                <app-pago-cheque-form 
                  *ngSwitchCase="'cheque'"
                  [datosIniciales]="datosFormularioEspecifico()"
                  (datosCompletos)="onDatosEspecificosCompletos($event)">
                </app-pago-cheque-form>

                <app-pago-tarjeta-form 
                  *ngSwitchCase="'tarjeta'"
                  [datosIniciales]="datosFormularioEspecifico()"
                  (datosCompletos)="onDatosEspecificosCompletos($event)">
                </app-pago-tarjeta-form>

                <app-pago-anticipo-form 
                  *ngSwitchCase="'anticipo'"
                  [datosIniciales]="datosFormularioEspecifico()"
                  (datosCompletos)="onDatosEspecificosCompletos($event)">
                </app-pago-anticipo-form>
              </ng-container>
            </div>

          </form>
        </div>

        <!-- Footer - Solo se muestra cuando NO hay formulario específico -->
        <div *ngIf="!mostrarFormularioEspecifico()" 
             class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button 
            type="button"
            (click)="cerrar.emit()"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button 
            type="button"
            (click)="guardarBasico()"
            [disabled]="formulario.invalid || guardando()"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
            <svg *ngIf="guardando()" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            <span>{{ guardando() ? 'Guardando...' : (modo === 'editar' ? 'Actualizar' : 'Guardar') }}</span>
          </button>
        </div>

      </div>
    </div>
  `
})
export class ModalDetalleLiquidacionComponent implements OnInit, OnDestroy {
    @Input() modo: 'crear' | 'editar' = 'crear';
    @Input() detalle: DetalleLiquidacionPE | null = null;
    @Input() factura: FacturaPE | null = null;
    @Output() cerrar = new EventEmitter<void>();
    @Output() guardado = new EventEmitter<void>();

    private readonly service = inject(PlanEmpresarialService);
    private readonly fb = inject(FormBuilder);
    private readonly destroy$ = new Subject<void>();

    readonly cargandoDatos = signal<boolean>(false);
    readonly guardando = signal<boolean>(false);
    readonly tiposPago = signal<TipoPago[]>([]);
    readonly agencias = signal<AgenciaPE[]>([]);
    readonly ordenesDisponibles = signal<OrdenAutorizadaPE[]>([]);
    readonly datosEspecificos = signal<any>(null);

    readonly CONFIGURACION = CONFIGURACION;

    readonly formulario: FormGroup;

    constructor() {
        this.formulario = this.fb.group({
            numero_orden: ['', Validators.required],
            agencia: ['', Validators.required],
            descripcion: ['', [
                Validators.required,
                Validators.minLength(CONFIGURACION.MIN_DESCRIPCION),
                Validators.maxLength(CONFIGURACION.MAX_DESCRIPCION)
            ]],
            monto: [null, [
                Validators.required,
                Validators.min(CONFIGURACION.MIN_MONTO)
            ]],
            correo_proveedor: ['', [Validators.email]],
            forma_pago: ['', Validators.required]
        });
    }

    ngOnInit(): void {
        this.cargarDatos();
        this.configurarSuscripciones();

        if (this.detalle && this.modo === 'editar') {
            this.cargarDatosDetalle();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private cargarDatos(): void {
        this.cargandoDatos.set(true);

        // Suscribirse a los datos del servicio
        this.service.tiposPago$.pipe(takeUntil(this.destroy$))
            .subscribe(tipos => this.tiposPago.set(tipos));

        this.service.agencias$.pipe(takeUntil(this.destroy$))
            .subscribe(agencias => this.agencias.set(agencias));

        this.service.ordenesAutorizadas$.pipe(takeUntil(this.destroy$))
            .subscribe(ordenes => this.ordenesDisponibles.set(ordenes));

        // Cargar catálogos si están vacíos
        this.service.cargarCatalogos().subscribe(() => {
            this.cargandoDatos.set(false);
        });
    }

    private configurarSuscripciones(): void {
        // Escuchar cambios en forma de pago
        this.formulario.get('forma_pago')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(tipo => {
                this.datosEspecificos.set(null);
            });

        // Validar monto al cambiar
        this.formulario.get('monto')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(monto => {
                this.validarMonto(monto);
            });
    }

    private cargarDatosDetalle(): void {
        if (!this.detalle) return;

        this.formulario.patchValue({
            numero_orden: this.detalle.numero_orden,
            agencia: this.detalle.agencia,
            descripcion: this.detalle.descripcion,
            monto: this.detalle.monto,
            correo_proveedor: this.detalle.correo_proveedor,
            forma_pago: this.detalle.forma_pago
        });

        // Cargar datos específicos si existen
        if (this.detalle.datos_especificos) {
            this.datosEspecificos.set(this.detalle.datos_especificos);
        }
    }

    // === COMPUTEDS Y SIGNALS ===

    tipoSeleccionado(): string {
        return this.formulario.get('forma_pago')?.value || '';
    }

    mostrarFormularioEspecifico(): boolean {
        const tipo = this.tipoSeleccionado();
        const tipoPago = this.tiposPago().find(t => t.id === tipo);
        return tipoPago?.requiereFormulario || false;
    }

    datosFormularioEspecifico(): any {
        return {
            ...this.formulario.value,
            ...this.datosEspecificos()
        };
    }

    montoDisponible(): number {
        return this.service.calcularMontoDisponible();
    }

    longitudDescripcion(): number {
        return this.formulario.get('descripcion')?.value?.length || 0;
    }

    // === VALIDACIONES ===

    private validarMonto(monto: number): void {
        if (!this.factura || !monto) return;

        const validacion = this.service.validarMonto(-1, monto);
        const control = this.formulario.get('monto');

        if (!validacion.esValido && control) {
            control.setErrors({ montoExcedido: true });
        } else if (control?.hasError('montoExcedido')) {
            const errores = { ...control.errors };
            delete errores['montoExcedido'];
            control.setErrors(Object.keys(errores).length ? errores : null);
        }
    }

    esInvalido(campo: string): boolean {
        const control = this.formulario.get(campo);
        return !!(control && control.invalid && (control.dirty || control.touched));
    }

    obtenerMensajeError(campo: string): string {
        const control = this.formulario.get(campo);
        if (!control || !control.errors) return '';

        const errores = control.errors;

        if (errores['required']) return MENSAJES_VALIDACION.CAMPO_REQUERIDO;
        if (errores['email']) return MENSAJES_VALIDACION.EMAIL_INVALIDO;
        if (errores['min']) return MENSAJES_VALIDACION.MONTO_MINIMO;
        if (errores['minlength']) return MENSAJES_VALIDACION.DESCRIPCION_MINIMA;
        if (errores['maxlength']) return MENSAJES_VALIDACION.DESCRIPCION_MAXIMA;
        if (errores['montoExcedido']) return MENSAJES_VALIDACION.MONTO_EXCEDIDO;

        return 'Campo inválido';
    }

    // === ACCIONES ===

    onDatosEspecificosCompletos(datos: any): void {
        this.datosEspecificos.set(datos);
        this.guardarCompleto();
    }

    guardarBasico(): void {
        if (this.formulario.invalid || this.guardando()) return;

        this.marcarCamposComoTocados();

        if (this.formulario.valid) {
            this.guardarCompleto();
        }
    }

    private guardarCompleto(): void {
        if (!this.factura) return;

        this.guardando.set(true);

        const valores = this.formulario.value;
        const payload: GuardarDetalleLiquidacionPayload = {
            id: this.detalle?.id || null,
            numero_factura: this.factura.numero_dte,
            numero_orden: valores.numero_orden,
            agencia: valores.agencia,
            descripcion: valores.descripcion,
            monto: Number(valores.monto),
            correo_proveedor: valores.correo_proveedor || null,
            forma_pago: valores.forma_pago,
            ...this.extraerCamposEspecificos(this.datosEspecificos())
        };

        this.service.guardarDetalle(payload).subscribe({
            next: (exito) => {
                this.guardando.set(false);
                if (exito) {
                    this.guardado.emit();
                }
            },
            error: () => {
                this.guardando.set(false);
            }
        });
    }

    private extraerCamposEspecificos(datos: any): Partial<GuardarDetalleLiquidacionPayload> {
        if (!datos) return {};

        const campos: Partial<GuardarDetalleLiquidacionPayload> = {};
        const tipo = this.tipoSeleccionado();

        switch (tipo) {
            case 'deposito':
                if (datos.id_socio) campos.id_socio = datos.id_socio;
                if (datos.nombre_socio) campos.nombre_socio = datos.nombre_socio;
                if (datos.numero_cuenta_deposito) campos.numero_cuenta_deposito = datos.numero_cuenta_deposito;
                if (datos.producto_cuenta) campos.producto_cuenta = datos.producto_cuenta;
                if (datos.observaciones) campos.observaciones = datos.observaciones;
                break;

            case 'transferencia':
                if (datos.nombre_cuenta) campos.nombre_cuenta = datos.nombre_cuenta;
                if (datos.numero_cuenta) campos.numero_cuenta = datos.numero_cuenta;
                if (datos.banco) campos.banco = String(datos.banco);
                if (datos.tipo_cuenta) campos.tipo_cuenta = Number(datos.tipo_cuenta);
                if (datos.observaciones) campos.observaciones = datos.observaciones;
                break;

            case 'cheque':
                if (datos.nombre_beneficiario) campos.nombre_beneficiario = datos.nombre_beneficiario;
                if (datos.consignacion) campos.consignacion = datos.consignacion;
                if (datos.no_negociable !== undefined) campos.no_negociable = datos.no_negociable;
                if (datos.observaciones) campos.observaciones = datos.observaciones;
                break;

            case 'tarjeta':
            case 'anticipo':
                if (datos.nota) campos.nota = datos.nota;
                break;
        }

        return campos;
    }

    // === UTILIDADES ===

    formatearMonto(monto: number): string {
        return new Intl.NumberFormat('es-GT', {
            style: 'currency',
            currency: 'GTQ',
            minimumFractionDigits: 2
        }).format(monto);
    }

    obtenerColorTipoPago(tipo: string): string {
        return COLORES_TIPO_PAGO[tipo as keyof typeof COLORES_TIPO_PAGO] || 'bg-gray-100 text-gray-800';
    }

    obtenerTextoTipoPago(tipo: string): string {
        const tipoPago = this.tiposPago().find(t => t.id === tipo);
        return tipoPago?.nombre || tipo || 'Sin especificar';
    }

    private marcarCamposComoTocados(): void {
        Object.keys(this.formulario.controls).forEach(campo => {
            this.formulario.get(campo)?.markAsTouched();
        });
    }

    // === TRACK BY FUNCTIONS ===

    trackByOrden = (index: number, orden: OrdenAutorizadaPE) => orden.id;
    trackByTipoPago = (index: number, tipo: TipoPago) => tipo.id;
    trackByAgencia = (index: number, agencia: AgenciaPE) => agencia.id;
}