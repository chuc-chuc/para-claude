import { Component, Input, Output, EventEmitter, inject, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, Send, Edit3, AlertCircle } from 'lucide-angular';
import Swal from 'sweetalert2';

import { LiquidacionesModuloTesoreriaService } from '../../services/liquidaciones-modulo-tesoreria.service';
import {
    FacturaConSolicitud,
    TipoLiquidacion,
    CrearSolicitudTransferenciaPayload,
    EditarSolicitudTransferenciaPayload,
    FormatHelper,
    OPCIONES_AREA_APROBACION,
    BancoUsoPago
} from '../../models/liquidaciones-modulo-tesoreria.models';

@Component({
    selector: 'app-modal-crear-solicitud',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
    templateUrl: './modal-crear-solicitud.component.html',
    styleUrls: ['./modal-crear-solicitud.component.css']
})
export class ModalCrearSolicitudComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    public readonly service = inject(LiquidacionesModuloTesoreriaService);

    @Input({ required: true }) factura!: FacturaConSolicitud;
    @Input({ required: true }) tipoSolicitud!: TipoLiquidacion; // ← NUEVO: tipo desde el tab activo
    @Input() modoEdicion = false;
    @Output() cerrar = new EventEmitter<void>();
    @Output() confirmado = new EventEmitter<void>();

    // Exponemos para el template
    readonly FormatHelper = FormatHelper;
    readonly OPCIONES_AREA_APROBACION = OPCIONES_AREA_APROBACION;

    // Iconos
    readonly icons = { X, Send, Edit3, AlertCircle };

    // Bancos
    readonly bancos = signal<BancoUsoPago[]>([]);

    readonly form = this.fb.group({
        banco_origen_id: ['', Validators.required],
        area_aprobacion: ['', Validators.required],
        monto_total_solicitud: ['', [Validators.required, Validators.min(0.01)]]
    });

    readonly procesando = signal(false);
    readonly montoMaximo = computed(() => this.factura.monto_pendiente_pago);

    readonly esEdicion = computed(() => this.modoEdicion);
    readonly titulo = computed(() => this.esEdicion() ? 'Editar Solicitud' : 'Crear Solicitud de Transferencia');
    readonly colorHeader = computed(() =>
        this.esEdicion() ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-green-600 to-emerald-600'
    );
    readonly colorBoton = computed(() =>
        this.esEdicion() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
    );

    ngOnInit(): void {
        // Cargar bancos
        this.service.cargarBancos().subscribe(exito => {
            if (exito) {
                this.bancos.set(this.service.obtenerBancosActuales());
            }
        });

        // Si es edición, cargar datos existentes
        if (this.modoEdicion && this.factura.solicitud) {
            this.form.patchValue({
                banco_origen_id: this.factura.solicitud.banco_origen_id.toString(),
                area_aprobacion: this.factura.solicitud.area_aprobacion,
                monto_total_solicitud: this.factura.solicitud.monto_total_solicitud.toString()
            });
        } else {
            // Si es creación, establecer monto máximo por defecto
            this.form.patchValue({
                monto_total_solicitud: this.factura.monto_pendiente_pago.toString()
            });
        }
    }

    onCerrar(): void {
        if (this.procesando()) return;
        this.cerrar.emit();
    }

    establecerMontoMaximo(): void {
        this.form.patchValue({ monto_total_solicitud: this.montoMaximo().toString() });
    }

    async submit(): Promise<void> {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            Swal.fire('Error', 'Complete todos los campos requeridos', 'warning');
            return;
        }

        const valores = this.form.value;
        const monto = parseFloat(valores.monto_total_solicitud!);

        // Validar monto solo en creación
        if (!this.modoEdicion && monto > this.montoMaximo()) {
            Swal.fire('Monto inválido', 'No puede exceder el monto pendiente', 'error');
            return;
        }

        const bancoSeleccionado = this.bancos().find(b => b.id === parseInt(valores.banco_origen_id!));
        const areaLabel = OPCIONES_AREA_APROBACION.find(a => a.value === valores.area_aprobacion!)?.label || valores.area_aprobacion!;

        const confirm = await Swal.fire({
            title: this.esEdicion() ? '¿Guardar cambios?' : '¿Crear solicitud?',
            html: `
        <div class="text-left space-y-3 text-sm">
          <div class="bg-gray-50 rounded-lg p-4 border">
            <p><strong>Factura:</strong> ${this.factura.numero_factura}</p>
            <p><strong>Emisor:</strong> ${this.factura.nombre_emisor}</p>
            <p><strong>Tipo:</strong> ${FormatHelper.getEtiquetaTipo(this.tipoSolicitud)}</p>
            <p><strong>Banco:</strong> ${bancoSeleccionado?.nombre} - ${bancoSeleccionado?.cuenta}</p>
            <p><strong>Área:</strong> ${areaLabel}</p>
            <p><strong>Monto:</strong> ${FormatHelper.formatMonto(monto)}</p>
          </div>
        </div>
      `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: this.esEdicion() ? 'Guardar' : 'Crear',
            cancelButtonText: 'Cancelar',
            width: '560px'
        });

        if (!confirm.isConfirmed) return;

        this.procesando.set(true);
        Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const payload = this.esEdicion()
            ? {
                solicitud_id: this.factura.solicitud!.id,
                tipo_solicitud: this.tipoSolicitud, // ← NUEVO
                banco_origen_id: parseInt(valores.banco_origen_id!),
                area_aprobacion: valores.area_aprobacion!,
                monto_total_solicitud: monto
            } as EditarSolicitudTransferenciaPayload
            : {
                facturas: [{
                    numero_factura: this.factura.numero_factura,
                    detalle_liquidacion_id: this.factura.primer_detalle_id
                }],
                tipo_solicitud: this.tipoSolicitud, // ← NUEVO
                banco_origen_id: parseInt(valores.banco_origen_id!),
                area_aprobacion: valores.area_aprobacion!,
                monto_total_solicitud: monto
            } as CrearSolicitudTransferenciaPayload;

        const accion$ = this.esEdicion()
            ? this.service.editarSolicitudTransferencia(payload as EditarSolicitudTransferenciaPayload)
            : this.service.crearSolicitudTransferencia(payload as CrearSolicitudTransferenciaPayload);

        accion$.subscribe({
            next: (exito) => {
                if (exito) {
                    Swal.fire('¡Éxito!', this.esEdicion() ? 'Cambios guardados' : 'Solicitud creada', 'success');
                    this.confirmado.emit();
                }
            },
            error: () => {
                this.procesando.set(false);
                Swal.fire('Error', 'Ocurrió un error inesperado', 'error');
            },
            complete: () => this.procesando.set(false)
        });
    }
}