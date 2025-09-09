// ============================================================================
// MODAL DETALLE LIQUIDACIÓN - CORREGIDO PARA USAR SERVICIO
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, signal, OnInit, OnDestroy, inject, Input, Output, EventEmitter } from '@angular/core';
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
    templateUrl: './modal-detalle-liquidacion.component.html'
})
export class ModalDetalleLiquidacionComponent implements OnInit, OnDestroy {

    @Input() visible = false;
    @Input() modo: 'crear' | 'editar' = 'crear';
    @Input() registro: DetalleLiquidacionPE | null = null;
    @Output() visibleChange = new EventEmitter<boolean>();

    private readonly service = inject(FacturasPlanEmpresarialService);
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

        // IMPORTANTE: Cargar catálogos al inicializar
        this.service.cargarCatalogos().subscribe();
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

        // Cargar datos para edición si existen
        if (this.registro) {
            this.cargarDatosParaEdicion();
        }
    }

    configurarSuscripciones() {
        this.formularioPrincipal.get('forma_pago')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(value => {
                this.tipoSeleccionado.set(value);
                this.manejarCambiosFormaPago(value);
            });

        this.formularioPrincipal.get('monto')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(monto => {
                this.validarMontoConServicio(monto);
            });
    }

    sincronizarDatosConServicio() {
        // Suscripción a la factura actual
        this.service.facturaActual$
            .pipe(takeUntil(this.destroy$))
            .subscribe(factura => {
                this.facturaActual.set(factura);
                this.facturaActualId = factura?.id || null;
            });

        // Suscripción a agencias
        this.service.agencias$
            .pipe(takeUntil(this.destroy$))
            .subscribe(agencias => this.agenciasDisponibles.set(agencias));

        // Suscripción a bancos
        this.service.bancos$
            .pipe(takeUntil(this.destroy$))
            .subscribe(bancos => this.bancosDisponibles.set(bancos));

        // Suscripción a tipos de cuenta
        this.service.tiposCuenta$
            .pipe(takeUntil(this.destroy$))
            .subscribe(tipos => this.tiposCuentaDisponibles.set(tipos));

        // Suscripción a órdenes
        this.service.ordenes$
            .pipe(takeUntil(this.destroy$))
            .subscribe(ordenes => {
                const ordenesConPendiente = ordenes.filter(orden => orden.monto_pendiente > 0);
                this.ordenesDisponibles.set(ordenesConPendiente);
            });

        // Estados de carga
        this.service.cargandoCatalogos$
            .pipe(takeUntil(this.destroy$))
            .subscribe(loading => {
                this.cargandoBancos.set(loading);
                this.cargandoTiposCuenta.set(loading);
                this.cargandoDatos = loading;
            });

        // IMPORTANTE: Evaluar formulario específico después de cargar datos
        if (this.modo === 'editar' && this.registro) {
            // Pequeño delay para asegurar que los datos estén cargados
            setTimeout(() => {
                this.evaluarFormularioEspecificoParaEdicion();
            }, 100);
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

        this.tipoSeleccionado.set(this.registro.forma_pago || '');
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
            this.mostrarFormularioEspecifico.set(true);

            const bancoControl = this.formularioPrincipal.get('banco');
            const cuentaControl = this.formularioPrincipal.get('cuenta');

            if (bancoControl && cuentaControl) {
                bancoControl.clearValidators();
                cuentaControl.clearValidators();
                bancoControl.updateValueAndValidity();
                cuentaControl.updateValueAndValidity();
            }
        } else {
            this.mostrarFormularioEspecifico.set(false);
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
            this.mostrarFormularioEspecifico.set(true);
            console.log(`[CAMBIO] Mostrando formulario específico para: ${forma_pago}`);
        } else {
            bancoControl.clearValidators();
            cuentaControl.clearValidators();
            bancoControl.setValue('');
            cuentaControl.setValue('');
            this.mostrarFormularioEspecifico.set(false);
            console.log(`[CAMBIO] Ocultando formulario específico para: ${forma_pago}`);
        }

        bancoControl.updateValueAndValidity();
        cuentaControl.updateValueAndValidity();
    }

    requiereFormularioEspecifico(formaPago?: string): boolean {
        if (!formaPago) return false;
        // Qué formas de pago requieren formulario específico
        return ['deposito', 'transferencia', 'cheque'].includes(formaPago);
    }

    // ============================================================================
    // VALIDACIONES
    // ============================================================================

    validarMontoConServicio(monto: number | null) {
        if (!this.facturaActual() || monto === null || monto === undefined) return;

        const montoControl = this.formularioPrincipal.get('monto');
        if (!montoControl) return;

        // Validación simple de monto disponible
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

    onSubmit() {
        this.onGuardarBasico();
    }

    completarGuardado() {
        if (!this.datosFormularioCompletos) return;

        this.submitting = true;

        // Crear payload compatible con el servicio
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
        this.mostrarFormularioEspecifico.set(false);
        this.tipoSeleccionado.set('');
        this.datosFormularioCompletos = null;
    }

    marcarCamposComoTocados() {
        Object.keys(this.formularioPrincipal.controls).forEach(key => {
            this.formularioPrincipal.get(key)?.markAsTouched();
        });
    }

    resetearFormulario() {
        this.formularioPrincipal.reset();
        this.formularioPrincipal.get('forma_pago')?.setValue('');
        this.tipoSeleccionado.set('');
        this.mostrarFormularioEspecifico.set(false);
        this.datosFormularioCompletos = null;
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

    get ordenesAutorizadas(): OrdenPE[] {
        return this.ordenesDisponibles().filter(orden =>
            orden.monto_pendiente > 0
        );
    }

    get infoFactura() {
        const factura = this.facturaActual();
        if (!factura) return null;

        return {
            numero: factura.numero_dte || 'Sin número',
            proveedor: factura.nombre_emisor || 'Sin emisor',
            total: this.formatearMonto(factura.monto_total || 0),
            disponible: this.formatearMonto(this.montoDisponible)
        };
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

    validarFormularioCompleto(): boolean {
        const formularioPrincipalValido = this.formularioPrincipal.valid;

        if (!this.requiereFormularioEspecifico(this.tipoSeleccionado())) {
            return formularioPrincipalValido;
        }

        return formularioPrincipalValido && this.datosFormularioCompletos !== null;
    }

    get ordenSeleccionadaInfo(): OrdenPE | undefined {
        const no = this.formularioPrincipal.get('numero_orden')?.value;
        return this.ordenesDisponibles().find(o => o.numero_orden.toString() === no);
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

    obtenerTextoFormaPago(formaPago: string): string {
        const forma = FORMAS_PAGO.find(f => f.id === formaPago);
        return forma?.nombre || formaPago || 'Sin especificar';
    }
}