// ============================================================================
// MODAL DETALLE LIQUIDACIÓN - COMPONENTE COMPLETO DESDE CERO
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, signal, OnInit, OnDestroy, inject, Input, Output, EventEmitter, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// IMPORTS PARA LOS FORMULARIOS DE TIPOS DE PAGO
import { PagoDepositoFormComponent } from '../pago-forms/pago-deposito-form/pago-deposito-form.component';
import { PagoTransferenciaFormComponent } from '../pago-forms/pago-transferencia-form/pago-transferencia-form.component';
import { PagoChequeFormComponent } from '../pago-forms/pago-cheque-form/pago-cheque-form.component';
import { PagoTarjetaSelectComponent } from '../pago-forms/pago-tarjeta-select/pago-tarjeta-select.component';
import { PagoAnticipoSelectComponent } from '../pago-forms/pago-anticipo-select/pago-anticipo-select.component';

import { FacturasPlanEmpresarialService } from '../../services/facturas-plan-empresarial.service';
import { DetalleLiquidacionPE, FORMAS_PAGO, AgenciaPE, BancoPE, TipoCuentaPE, OrdenPE, GuardarDetalleLiquidacionPayload } from '../../models/facturas-plan-empresarial.models';

@Component({
    selector: 'app-modal-detalle-liquidacion',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        PagoDepositoFormComponent,
        PagoTransferenciaFormComponent,
        PagoChequeFormComponent,
        PagoTarjetaSelectComponent,
        PagoAnticipoSelectComponent
    ],
    template: `
        <!-- Modal Overlay -->
        <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-black/50 transition-opacity" (click)="onOverlayClick()"></div>

            <!-- Modal Container -->
            <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden"
                (click)="onModalClick($event)">

                <!-- Header -->
                <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <!-- Icono del modal -->
                        <div class="p-2 bg-blue-50 dark:bg-blue-900 rounded-lg">
                            <svg class="text-blue-600 dark:text-blue-400" width="20" height="20" fill="none"
                                stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                                </path>
                            </svg>
                        </div>

                        <!-- Título e información -->
                        <div>
                            <h3 class="text-lg font-semibold text-gray-800 dark:text-white">
                                {{ modo === 'crear' ? 'Agregar detalle' : 'Editar detalle' }}
                            </h3>
                            <p class="text-sm text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-1">
                                <!-- Badge de factura -->
                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                    Factura #{{ facturaActual()?.numero_dte || '-' }}
                                </span>

                                <!-- Badge de monto factura -->
                                <span *ngIf="facturaActual()"
                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                                    Monto: Q{{ facturaActual()?.monto_total | number:'1.2-2' }}
                                </span>

                                <!-- Badge de monto pendiente -->
                                <span *ngIf="facturaActual()"
                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" [ngClass]="{
                                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300': calcularMontoPendiente() > 0,
                                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300': calcularMontoPendiente() <= 0
                                    }">
                                    {{ calcularMontoPendiente() > 0 ? 'Pendiente: Q' : 'Excedido: Q' }}{{
                                    math.abs(calcularMontoPendiente()) | number:'1.2-2' }}
                                </span>
                            </p>
                        </div>
                    </div>

                    <!-- Botón cerrar -->
                    <button
                        class="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 p-2 rounded-lg transition-colors"
                        (click)="onCancelar()" title="Cerrar">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <!-- Contenido principal con scroll -->
                <div class="p-5 overflow-y-auto max-h-[calc(90vh-120px)]">
                    <!-- Indicador de carga -->
                    <div *ngIf="cargandoDatos || cargandoOrdenes || cargandoAgencias"
                        class="flex justify-center items-center p-8">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <span class="ml-3 text-gray-600 dark:text-gray-300">Cargando datos...</span>
                    </div>

                    <!-- Formulario principal -->
                    <form [formGroup]="formularioPrincipal" class="space-y-4"
                        *ngIf="!cargandoDatos && !cargandoOrdenes && !cargandoAgencias">

                        <!-- Número de orden y forma de pago -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Número de orden -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Número de Orden <span class="text-red-500">*</span>
                                </label>
                                <select formControlName="numero_orden"
                                    class="w-full text-sm border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                    [ngClass]="{'border-red-300 dark:border-red-500': campoInvalido('numero_orden')}">
                                    <option value="">Seleccionar orden...</option>
                                    <!-- SOLO ÓRDENES SIN ANTICIPOS PENDIENTES -->
                                    <option *ngFor="let orden of obtenerOrdenesDisponibles(); trackBy: trackByOrden"
                                        [value]="orden.numero_orden">
                                        Orden #{{ orden.numero_orden }} - Q{{ orden.total | number:'1.2-2' }}
                                        <span *ngIf="orden.area"> ({{ orden.area }})</span>
                                    </option>
                                </select>

                                <!-- Info extra de la orden seleccionada -->
                                <div *ngIf="ordenSeleccionadaInfo" class="mt-2 flex flex-wrap gap-2">
                                    <span
                                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                        Área: {{ ordenSeleccionadaInfo.area || '—' }}
                                    </span>
                                    <span
                                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                                        Pendiente: Q{{ calcularMontoPendienteOrden(ordenSeleccionadaInfo) | number:'1.2-2' }}
                                    </span>
                                </div>
                                <div *ngIf="campoInvalido('numero_orden')" class="text-red-500 text-xs mt-1">
                                    {{ obtenerErrorMensaje('numero_orden') }}
                                </div>
                            </div>

                            <!-- Forma de pago -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Forma de pago <span class="text-red-500">*</span>
                                </label>
                                <select formControlName="forma_pago"
                                    class="w-full text-sm border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                    [ngClass]="{'border-red-300 dark:border-red-500': campoInvalido('forma_pago')}">
                                    <option value="">Seleccionar forma de pago...</option>
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
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Agencia <span class="text-red-500">*</span>
                                </label>
                                <select formControlName="agencia"
                                    class="w-full text-sm border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                    [ngClass]="{'border-red-300 dark:border-red-500': campoInvalido('agencia')}">
                                    <option value="">Seleccionar agencia...</option>
                                    <option *ngFor="let agencia of agenciasDisponibles(); trackBy: trackByAgencia"
                                        [value]="agencia.nombre_liquidacion">
                                        {{ agencia.nombre_liquidacion }}
                                    </option>
                                </select>
                                <div *ngIf="campoInvalido('agencia')" class="text-red-500 text-xs mt-1">
                                    {{ obtenerErrorMensaje('agencia') }}
                                </div>
                            </div>

                            <!-- Monto -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Monto <span class="text-red-500">*</span>
                                </label>
                                <div class="relative">
                                    <span
                                        class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400">Q</span>
                                    <input type="number" step="0.01" min="0.01" formControlName="monto" placeholder="0.00"
                                        class="w-full text-sm border rounded-md py-2 pl-8 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                        [ngClass]="{'border-red-300 dark:border-red-500': campoInvalido('monto')}">
                                </div>
                                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Disponible: Q{{ montoDisponible | number:'1.2-2' }}
                                </div>
                                <div *ngIf="campoInvalido('monto')" class="text-red-500 text-xs mt-1">
                                    {{ obtenerErrorMensaje('monto') }}
                                </div>
                            </div>
                        </div>

                        <!-- Descripción -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Descripción del gasto <span class="text-red-500">*</span>
                            </label>
                            <textarea rows="3" formControlName="descripcion" placeholder="Detalle el gasto realizado..."
                                class="w-full text-sm border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                [ngClass]="{'border-red-300 dark:border-red-500': campoInvalido('descripcion')}"></textarea>
                            <div *ngIf="campoInvalido('descripcion')" class="text-red-500 text-xs mt-1">
                                {{ obtenerErrorMensaje('descripcion') }}
                            </div>
                            <div *ngIf="!campoInvalido('descripcion') && formularioPrincipal.get('descripcion')?.value"
                                class="text-gray-500 dark:text-gray-400 text-xs mt-1">
                                {{ formularioPrincipal.get('descripcion')?.value.length }} / 200 caracteres
                            </div>
                        </div>

                        <!-- Correo proveedor -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Correo del proveedor (opcional)
                            </label>
                            <input type="email" formControlName="correo_proveedor" placeholder="correo@proveedor.com"
                                class="w-full text-sm border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                [ngClass]="{'border-red-300 dark:border-red-500': campoInvalido('correo_proveedor')}">
                            <div *ngIf="campoInvalido('correo_proveedor')" class="text-red-500 text-xs mt-1">
                                {{ obtenerErrorMensaje('correo_proveedor') }}
                            </div>
                        </div>

                        <!-- FORMULARIOS ESPECÍFICOS POR TIPO DE PAGO -->
                        <div *ngIf="mostrarFormularioEspecifico() && !cargandoDatos"
                            class="mt-6 border-t border-gray-200 dark:border-gray-600 pt-4">
                            <h4 class="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                Información específica para {{ obtenerTextoFormaPago(tipoSeleccionado()) }}
                            </h4>

                            <!-- Host de subformularios específicos -->
                            <ng-container [ngSwitch]="tipoSeleccionado()">
                                <!-- Formulario de depósito -->
  <app-form-pago-deposito *ngSwitchCase="'deposito'"
    [agencias]="agenciasDisponibles()" (guardar)="onGuardarDesdeForm($event)">
  </app-form-pago-deposito>

  <!-- Formulario de transferencia -->
  <app-form-pago-transferencia *ngSwitchCase="'transferencia'"
    [agencias]="agenciasDisponibles()" (guardar)="onGuardarDesdeForm($event)">
  </app-form-pago-transferencia>

  <!-- Formulario de cheque -->
  <app-form-pago-cheque *ngSwitchCase="'cheque'"
    [agencias]="agenciasDisponibles()" (guardar)="onGuardarDesdeForm($event)">
  </app-form-pago-cheque>

  <!-- Selector de tarjeta -->
  <app-select-pago-tarjeta *ngSwitchCase="'tarjeta'" [data]="registro"
    (guardar)="onGuardarDesdeForm($event)">
  </app-select-pago-tarjeta>

  <!-- Selector de anticipo -->
  <app-select-pago-anticipo *ngSwitchCase="'anticipo'" [data]="registro"
    (guardar)="onGuardarDesdeForm($event)">
  </app-select-pago-anticipo>
                            </ng-container>
                        </div>

                    </form>
                </div>

                <!-- Footer con botones de acción - Solo se muestra cuando NO hay formulario específico -->
                <div *ngIf="!mostrarFormularioEspecifico()"
                    class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-3">
                    <!-- Botón Cancelar -->
                    <button type="button" (click)="onCancelar()"
                        class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 flex items-center gap-2">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Cancelar</span>
                    </button>

                    <!-- Botón Guardar -->
                    <button type="button" (click)="onGuardarBasico()" [disabled]="!esFormularioValido || submitting"
                        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                        <svg *ngIf="!submitting" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        <svg *ngIf="submitting" class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                            </path>
                        </svg>
                        <span>
                            {{ submitting ? 'Procesando...' : (modo === 'editar' ? 'Actualizar' : 'Agregar') }}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    `
})
export class ModalDetalleLiquidacionNuevoComponent implements OnInit, OnDestroy, AfterViewInit {

    @Input() visible = false;
    @Input() modo: 'crear' | 'editar' = 'crear';
    @Input() registro: DetalleLiquidacionPE | null = null;
    @Output() visibleChange = new EventEmitter<boolean>();

    private readonly service = inject(FacturasPlanEmpresarialService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly destroy$ = new Subject<void>();

    // ============================================================================
    // ESTADO DEL COMPONENTE
    // ============================================================================

    formularioPrincipal!: FormGroup;
    tipoSeleccionado = signal<string>('');
    mostrarFormularioEspecifico = signal(false);
    datosFormularioCompletos: any = null;

    submitting = false;

    // Datos del servicio
    facturaActual = signal<any>(null);
    agenciasDisponibles = signal<AgenciaPE[]>([]);
    bancosDisponibles = signal<BancoPE[]>([]);
    tiposCuentaDisponibles = signal<TipoCuentaPE[]>([]);
    ordenesDisponibles = signal<OrdenPE[]>([]);
    tiposPago = signal<any[]>(FORMAS_PAGO);

    // Estados de carga
    cargandoBancos = signal<boolean>(false);
    cargandoTiposCuenta = signal<boolean>(false);
    cargandoOrdenesAutorizadas = signal<boolean>(false);
    cargandoDatos = false;
    cargandoOrdenes = false;
    cargandoAgencias = false;

    public math = Math;
    facturaActualId: number | null = null;
    totalMontoRegistros: number = 0;

    ngOnInit() {
        this.inicializarFormulario();
        this.configurarSuscripciones();
        this.sincronizarDatosConServicio();
        this.service.cargarCatalogos().subscribe();
    }

    ngAfterViewInit() {
        this.cdr.detectChanges();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ============================================================================
    // INICIALIZACIÓN
    // ============================================================================

    inicializarFormulario() {
        this.formularioPrincipal = new FormGroup({
            numero_orden: new FormControl('', [Validators.required]),
            agencia: new FormControl('', [Validators.required]),
            descripcion: new FormControl('', [
                Validators.required,
                Validators.minLength(5),
                Validators.maxLength(200)
            ]),
            monto: new FormControl(null, [
                Validators.required,
                Validators.min(0.01)
            ]),
            correo_proveedor: new FormControl('', [Validators.email]),
            forma_pago: new FormControl('', [Validators.required]),
            banco: new FormControl(''),
            cuenta: new FormControl('')
        });

        if (this.registro) {
            this.cargarDatosParaEdicion();
        }
    }

    configurarSuscripciones() {
        this.formularioPrincipal.get('forma_pago')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(value => {
                setTimeout(() => {
                    this.tipoSeleccionado.set(value);
                    this.manejarCambiosFormaPago(value);
                    this.cdr.markForCheck();
                }, 0);
            });

        this.formularioPrincipal.get('monto')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(monto => {
                setTimeout(() => {
                    this.validarMontoConServicio(monto);
                }, 0);
            });
    }

    sincronizarDatosConServicio() {
        this.service.facturaActual$
            .pipe(takeUntil(this.destroy$))
            .subscribe(factura => {
                setTimeout(() => {
                    this.facturaActual.set(factura);
                    this.facturaActualId = factura?.id || null;
                    this.cdr.markForCheck();
                }, 0);
            });

        this.service.agencias$
            .pipe(takeUntil(this.destroy$))
            .subscribe(agencias => {
                setTimeout(() => {
                    this.agenciasDisponibles.set(agencias);
                    this.cdr.markForCheck();
                }, 0);
            });

        this.service.bancos$
            .pipe(takeUntil(this.destroy$))
            .subscribe(bancos => {
                setTimeout(() => {
                    this.bancosDisponibles.set(bancos);
                    this.cdr.markForCheck();
                }, 0);
            });

        this.service.tiposCuenta$
            .pipe(takeUntil(this.destroy$))
            .subscribe(tipos => {
                setTimeout(() => {
                    this.tiposCuentaDisponibles.set(tipos);
                    this.cdr.markForCheck();
                }, 0);
            });

        this.service.ordenes$
            .pipe(takeUntil(this.destroy$))
            .subscribe(ordenes => {
                setTimeout(() => {
                    this.ordenesDisponibles.set(ordenes);
                    this.cdr.markForCheck();
                }, 0);
            });

        this.service.cargandoCatalogos$
            .pipe(takeUntil(this.destroy$))
            .subscribe(loading => {
                setTimeout(() => {
                    this.cargandoBancos.set(loading);
                    this.cargandoTiposCuenta.set(loading);
                    this.cargandoDatos = loading;
                    this.cdr.markForCheck();
                }, 0);
            });

        if (this.modo === 'editar' && this.registro) {
            setTimeout(() => {
                this.evaluarFormularioEspecificoParaEdicion();
            }, 200);
        }
    }

    cargarDatosParaEdicion() {
        if (!this.registro || !this.formularioPrincipal) return;

        this.formularioPrincipal.patchValue({
            numero_orden: this.registro.numero_orden || '',
            agencia: this.registro.agencia || '',
            descripcion: this.registro.descripcion || '',
            monto: this.registro.monto || null,
            correo_proveedor: this.registro.correo_proveedor || '',
            forma_pago: this.registro.forma_pago || '',
            banco: this.registro.banco || '',
            cuenta: this.registro.cuenta || ''
        });

        setTimeout(() => {
            this.tipoSeleccionado.set(this.registro?.forma_pago || '');
            this.cdr.markForCheck();
        }, 0);
    }

    // ============================================================================
    // MANEJO DE FORMULARIOS ESPECÍFICOS
    // ============================================================================

    private evaluarFormularioEspecificoParaEdicion() {
        if (!this.registro) return;

        const formaPago = this.registro.forma_pago;
        if (!formaPago) return;

        if (this.requiereFormularioEspecifico(formaPago)) {
            console.log(`[EDICIÓN] Mostrando formulario específico para: ${formaPago}`);

            setTimeout(() => {
                this.mostrarFormularioEspecifico.set(true);

                const bancoControl = this.formularioPrincipal.get('banco');
                const cuentaControl = this.formularioPrincipal.get('cuenta');

                if (bancoControl && cuentaControl) {
                    bancoControl.clearValidators();
                    cuentaControl.clearValidators();
                    bancoControl.updateValueAndValidity();
                    cuentaControl.updateValueAndValidity();
                }

                this.cdr.markForCheck();
            }, 0);
        } else {
            setTimeout(() => {
                this.mostrarFormularioEspecifico.set(false);
                this.cdr.markForCheck();
            }, 0);
        }
    }

    manejarCambiosFormaPago(forma_pago: string) {
        const bancoControl = this.formularioPrincipal.get('banco');
        const cuentaControl = this.formularioPrincipal.get('cuenta');

        if (!bancoControl || !cuentaControl) return;

        if (this.requiereFormularioEspecifico(forma_pago)) {
            bancoControl.clearValidators();
            cuentaControl.clearValidators();
            bancoControl.setValue('');
            cuentaControl.setValue('');

            setTimeout(() => {
                this.mostrarFormularioEspecifico.set(true);
                console.log(`[CAMBIO] Mostrando formulario específico para: ${forma_pago}`);
                this.cdr.markForCheck();
            }, 0);
        } else {
            bancoControl.clearValidators();
            cuentaControl.clearValidators();
            bancoControl.setValue('');
            cuentaControl.setValue('');

            setTimeout(() => {
                this.mostrarFormularioEspecifico.set(false);
                console.log(`[CAMBIO] Ocultando formulario específico para: ${forma_pago}`);
                this.cdr.markForCheck();
            }, 0);
        }

        bancoControl.updateValueAndValidity();
        cuentaControl.updateValueAndValidity();
    }

    requiereFormularioEspecifico(formaPago?: string): boolean {
        if (!formaPago) return false;
        return ['deposito', 'transferencia', 'cheque'].includes(formaPago);
    }

    // ============================================================================
    // VALIDACIONES
    // ============================================================================

    validarMontoConServicio(monto: number | null) {
        if (!this.facturaActual() || monto === null || monto === undefined) return;

        const montoControl = this.formularioPrincipal.get('monto');
        if (!montoControl) return;

        const factura = this.facturaActual();
        const totalDetallesActuales = this.service.obtenerDetallesActuales()
            .reduce((sum, d) => sum + d.monto, 0);

        const montoDisponible = factura.monto_total - totalDetallesActuales;

        const errores = montoControl.errors || {};
        delete errores['montoExcedido'];
        delete errores['montoInsuficiente'];

        if (monto <= 0) {
            errores['montoInsuficiente'] = true;
        } else if (monto > montoDisponible) {
            errores['montoExcedido'] = {
                montoDisponible: montoDisponible,
                montoIngresado: monto
            };
        }

        const tieneErrores = Object.keys(errores).length > 0;
        montoControl.setErrors(tieneErrores ? errores : null);
    }

    calcularMontoDisponible(): number {
        const factura = this.facturaActual();
        if (!factura) return 0;

        const totalDetalles = this.service.obtenerDetallesActuales()
            .reduce((sum, d) => sum + d.monto, 0);

        return Math.max(0, factura.monto_total - totalDetalles);
    }

    calcularMontoPendiente(): number {
        return this.calcularMontoDisponible();
    }

    calcularMontoPendienteOrden(orden: OrdenPE): number {
        return orden.monto_pendiente || (orden.total - (orden.monto_liquidado || 0));
    }

    // ============================================================================
    // MÉTODOS DE GUARDADO
    // ============================================================================

    onGuardarDesdeForm(datosEspecificos: any) {
        this.datosFormularioCompletos = {
            ...this.formularioPrincipal.value,
            ...datosEspecificos,
            forma_pago: this.tipoSeleccionado(),
            factura_id: this.facturaActualId
        };

        this.completarGuardado();
    }

    onGuardarBasico() {
        if (!this.formularioPrincipal.valid) {
            this.marcarCamposComoTocados();
            return;
        }

        const formaPago = this.formularioPrincipal.get('forma_pago')?.value;

        if (this.requiereFormularioEspecifico(formaPago)) {
            return; // El formulario específico se muestra automáticamente
        } else {
            this.datosFormularioCompletos = {
                ...this.formularioPrincipal.value,
                forma_pago: this.tipoSeleccionado(),
                factura_id: this.facturaActualId
            };
            this.completarGuardado();
        }
    }

    completarGuardado() {
        if (!this.datosFormularioCompletos) return;

        this.submitting = true;

        const payload: GuardarDetalleLiquidacionPayload = {
            id: this.registro?.id,
            numero_factura: this.facturaActual()?.numero_dte || '',
            numero_orden: this.datosFormularioCompletos.numero_orden,
            agencia: this.datosFormularioCompletos.agencia,
            descripcion: this.datosFormularioCompletos.descripcion,
            monto: parseFloat(this.datosFormularioCompletos.monto),
            correo_proveedor: this.datosFormularioCompletos.correo_proveedor || '',
            forma_pago: this.datosFormularioCompletos.forma_pago,
            banco: this.datosFormularioCompletos.banco || '',
            cuenta: this.datosFormularioCompletos.cuenta || '',
            datos_especificos: this.extraerDatosEspecificos(this.datosFormularioCompletos)
        };

        this.service.guardarDetalle(payload).pipe(
            takeUntil(this.destroy$)
        ).subscribe({
            next: (success: boolean) => {
                this.submitting = false;
                if (success) {
                    this.cerrarModal();
                }
            },
            error: () => {
                this.submitting = false;
            }
        });
    }

    private extraerDatosEspecificos(datos: any): any {
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
                if (datos.banco) especificos.banco = datos.banco;
                if (datos.tipo_cuenta) especificos.tipo_cuenta = datos.tipo_cuenta;
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
    // MÉTODOS DE UI
    // ============================================================================

    onCancelar() {
        this.cerrarModal();
    }

    private cerrarModal() {
        this.resetearFormulario();
        this.visible = false;
        this.visibleChange.emit(false);

        setTimeout(() => {
            this.mostrarFormularioEspecifico.set(false);
            this.tipoSeleccionado.set('');
            this.datosFormularioCompletos = null;
            this.cdr.markForCheck();
        }, 0);
    }

    marcarCamposComoTocados() {
        Object.keys(this.formularioPrincipal.controls).forEach(key => {
            this.formularioPrincipal.get(key)?.markAsTouched();
        });
    }

    resetearFormulario() {
        this.formularioPrincipal.reset();
        this.formularioPrincipal.get('forma_pago')?.setValue('');
        this.submitting = false;
    }

    // ============================================================================
    // GETTERS Y UTILIDADES
    // ============================================================================

    get esFormularioValido(): boolean {
        return this.formularioPrincipal.valid;
    }

    get montoDisponible(): number {
        return this.calcularMontoDisponible();
    }

    // MÉTODO PRINCIPAL: Obtener órdenes disponibles para el select (SIN anticipos pendientes)
    obtenerOrdenesDisponibles(): OrdenPE[] {
        return this.ordenesDisponibles().filter(orden => {
            // En modo edición, permitir la orden actual aunque tenga anticipos
            if (this.modo === 'editar' && this.registro) {
                const esOrdenActual = orden.numero_orden.toString() === this.registro.numero_orden.toString();
                if (esOrdenActual) return true;
            }

            // Solo permitir órdenes sin anticipos pendientes
            return !orden.anticipos_pendientes || orden.anticipos_pendientes === 0;
        });
    }

    get ordenSeleccionadaInfo(): OrdenPE | undefined {
        const no = this.formularioPrincipal.get('numero_orden')?.value;
        return this.ordenesDisponibles().find(o => o.numero_orden.toString() === no);
    }

    campoInvalido(nombreCampo: string): boolean {
        const control = this.formularioPrincipal.get(nombreCampo);
        return !!(control && control.touched && control.errors);
    }

    obtenerErrorMensaje(nombreCampo: string): string | null {
        const control = this.formularioPrincipal.get(nombreCampo);

        if (!control || !control.touched || !control.errors) {
            return null;
        }

        const errores = control.errors;

        if (errores['required']) return 'Este campo es obligatorio';
        if (errores['email']) return 'Ingrese un correo electrónico válido';
        if (errores['minlength']) return `Mínimo ${errores['minlength'].requiredLength} caracteres`;
        if (errores['maxlength']) return `Máximo ${errores['maxlength'].requiredLength} caracteres`;
        if (errores['min']) return `El valor mínimo es ${errores['min'].min}`;
        if (errores['montoExcedido']) return `El monto excede el disponible (Q${errores['montoExcedido'].montoDisponible.toFixed(2)})`;
        if (errores['montoInsuficiente']) return 'El monto debe ser mayor a 0';

        return 'Campo inválido';
    }

    onModalClick(event: Event) {
        event.stopPropagation();
    }

    onOverlayClick() {
        this.onCancelar();
    }

    formatearMonto(monto: number): string {
        return new Intl.NumberFormat('es-GT', {
            style: 'currency',
            currency: 'GTQ',
            minimumFractionDigits: 2
        }).format(monto);
    }

    obtenerTextoFormaPago(formaPago: string): string {
        const forma = FORMAS_PAGO.find(f => f.id === formaPago);
        return forma?.nombre || formaPago || 'Sin especificar';
    }

    // Métodos de track para ngFor
    trackByOrden(index: number, orden: OrdenPE): number {
        return orden.numero_orden;
    }

    trackByTipoPago(index: number, tipo: any): string {
        return tipo.id;
    }

    trackByAgencia(index: number, agencia: AgenciaPE): number {
        return agencia.id;
    }

    trackByBanco(index: number, banco: BancoPE): number {
        return banco.id_banco;
    }
}