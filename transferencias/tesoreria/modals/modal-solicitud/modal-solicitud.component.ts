// src/app/modules/transferencias/tesoreria/modals/modal-solicitud/modal-solicitud.component.ts

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, inject, signal, OnInit, OnDestroy, computed} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { TransferenciasService } from '../../../services/transferencias.service';
import {
    SolicitudTransferencia,
    BancoUsoPago,
    AreaAprobacion,
    CrearSolicitudPayload,
    EditarSolicitudPayload,
    ETIQUETAS_AREA
} from '../../../models/transferencias.models';

@Component({
    selector: 'app-modal-solicitud',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './modal-solicitud.component.html',
    styleUrls: ['./modal-solicitud.component.css']
})
export class ModalSolicitudComponent implements OnInit, OnDestroy {

    @Input() solicitud: SolicitudTransferencia | null = null;
    @Output() cerrar = new EventEmitter<void>();
    @Output() confirmado = new EventEmitter<void>();

    private readonly fb = inject(FormBuilder);
    private readonly service = inject(TransferenciasService);
    private readonly destroy$ = new Subject<void>();

    readonly formulario: FormGroup = this.fb.group({
        banco_origen_id: ['', Validators.required],
        area_aprobacion: ['', Validators.required],
        monto_total_solicitud: ['', [Validators.required, Validators.min(0.01)]],
        facturas: this.fb.array([])
    });

    readonly bancos = signal<BancoUsoPago[]>([]);
    readonly cargando = signal<boolean>(false);

    readonly areasAprobacion = [
        { value: 'gerencia_financiera' as AreaAprobacion, label: ETIQUETAS_AREA.gerencia_financiera },
        { value: 'jefe_contabilidad' as AreaAprobacion, label: ETIQUETAS_AREA.jefe_contabilidad }
    ];

    readonly esEdicion = computed(() => !!this.solicitud);

    get facturas(): FormArray {
        return this.formulario.get('facturas') as FormArray;
    }

    ngOnInit(): void {
        this.cargarBancos();
        if (this.esEdicion()) {
            this.cargarDatosEdicion();
        } else {
            this.agregarFactura();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private cargarBancos(): void {
        this.service.cargarBancos().pipe(takeUntil(this.destroy$)).subscribe();
        this.service.bancos$.pipe(takeUntil(this.destroy$)).subscribe(bancos => this.bancos.set(bancos));
    }

    private cargarDatosEdicion(): void {
        const facturas = this.solicitud!.facturas_numeros.split(',');
        const ids = this.solicitud!.detalles_liquidacion_ids.split(',');

        facturas.forEach((num, i) => {
            this.facturas.push(this.fb.group({
                numero_factura: [num.trim(), Validators.required],
                detalle_liquidacion_id: [parseInt(ids[i]) || '', [Validators.required, Validators.min(1)]]
            }));
        });

        this.formulario.patchValue({
            banco_origen_id: this.solicitud!.banco_origen_id,
            area_aprobacion: this.solicitud!.area_aprobacion,
            monto_total_solicitud: this.solicitud!.monto_total_solicitud
        });
    }

    agregarFactura(): void {
        this.facturas.push(this.fb.group({
            numero_factura: ['', Validators.required],
            detalle_liquidacion_id: ['', [Validators.required, Validators.min(1)]]
        }));
    }

    eliminarFactura(index: number): void {
        if (this.facturas.length > 1) {
            this.facturas.removeAt(index);
        } else {
            Swal.fire('Atención', 'Debe haber al menos una factura', 'warning');
        }
    }

    onSubmit(): void {
        if (this.formulario.invalid) {
            this.formulario.markAllAsTouched();
            Swal.fire('Error', 'Complete todos los campos requeridos', 'warning');
            return;
        }

        const facturas = this.formulario.value.facturas.map((f: any) => ({
            numero_factura: f.numero_factura,
            detalle_liquidacion_id: parseInt(f.detalle_liquidacion_id)
        }));

        if (this.esEdicion()) {
            const payload: EditarSolicitudPayload = {
                solicitud_id: this.solicitud!.id,
                banco_origen_id: this.formulario.value.banco_origen_id,
                area_aprobacion: this.formulario.value.area_aprobacion,
                monto_total_solicitud: parseFloat(this.formulario.value.monto_total_solicitud),
                facturas
            };
            this.confirmar('¿Editar solicitud?', 'Se reenviará para aprobación', '#f59e0b', () => this.service.editarSolicitud(payload));
        } else {
            const payload: CrearSolicitudPayload = {
                banco_origen_id: this.formulario.value.banco_origen_id,
                area_aprobacion: this.formulario.value.area_aprobacion,
                monto_total_solicitud: parseFloat(this.formulario.value.monto_total_solicitud),
                facturas
            };
            this.confirmar('¿Crear solicitud?', 'Se creará una nueva transferencia', '#10b981', () => this.service.crearSolicitud(payload));
        }
    }

    private confirmar(titulo: string, texto: string, color: string, accion: () => any): void {
        Swal.fire({
            title: texto,            
            icon: 'question',
            showCancelButton: true, confirmButtonText: 'Sí', cancelButtonText: 'Cancelar',
            confirmButtonColor: color, cancelButtonColor: '#6b7280'
        }).then(result => {
            if (result.isConfirmed) {
                this.cargando.set(true);
                accion().pipe(takeUntil(this.destroy$)).subscribe((exito: boolean) => {
                    this.cargando.set(false);
                    if (exito) this.confirmado.emit();
                });
            }
        });
    }

    onCerrar(): void {
        if (!this.cargando()) this.cerrar.emit();
    }

    campoInvalido(campo: string): boolean {
        const c = this.formulario.get(campo);
        return !!(c && c.invalid && c.touched);
    }

    facturaInvalida(i: number, campo: string): boolean {
        const c = this.facturas.at(i).get(campo);
        return !!(c && c.invalid && c.touched);
    }
}