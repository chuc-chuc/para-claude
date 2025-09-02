// ============================================================================
// MODAL RETENCIÓN SIMPLIFICADO
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Retencion,
  TipoRetencion,
  formatearMonto
} from '../../models/liquidacion-verificacion.models';
import { LiquidacionVerificacionService } from '../../services/liquidacion-verificacion.service';

@Component({
  selector: 'app-modal-retencion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-retencion.component.html',
})
export class ModalRetencionComponent implements OnInit {
  @Input() modo: 'crear' | 'editar' = 'crear';
  @Input() retencion: Retencion | null = null;
  @Input() tiposRetencion: TipoRetencion[] = [];
  @Input() numeroFactura = '';

  @Output() cerrar = new EventEmitter<void>();
  @Output() confirmado = new EventEmitter<any>();

  private readonly service = inject(LiquidacionVerificacionService);

  readonly guardando = signal<boolean>(false);
  readonly mensajeValidacion = signal<string>('');
  readonly validacionOk = signal<boolean>(true);
  readonly montoDisponible = signal<number>(0);

  readonly formatearMonto = formatearMonto;

  formulario!: FormGroup;

  constructor(private fb: FormBuilder) {
    this.inicializarFormulario();
  }

  ngOnInit(): void {
    this.calcularMontoDisponible();
    this.cargarDatos();
  }

  private inicializarFormulario(): void {
    this.formulario = this.fb.group({
      tipo_retencion_id: ['', [Validators.required]],
      numero_retencion: ['', [Validators.required, Validators.minLength(3)]],
      monto: ['', [Validators.required, Validators.min(0.01)]],
      porcentaje: [''],
      fecha_retencion: [this.fechaHoy, [Validators.required]]
    });

    // Validar monto en tiempo real
    this.formulario.get('monto')?.valueChanges.subscribe(() => {
      this.validarMonto();
    });
  }

  private cargarDatos(): void {
    if (this.modo === 'editar' && this.retencion) {
      this.formulario.patchValue({
        tipo_retencion_id: this.retencion.tipo_retencion_id,
        numero_retencion: this.retencion.numero_retencion,
        monto: this.retencion.monto,
        porcentaje: this.retencion.porcentaje || '',
        fecha_retencion: this.retencion.fecha_retencion
      });
    }
  }

  private calcularMontoDisponible(): void {
    const liquidacion = this.service.obtenerLiquidacionActual();
    if (liquidacion) {
      let disponible = liquidacion.factura.monto_total - liquidacion.total_retenciones;

      // Si estamos editando, agregar el monto actual de la retención
      if (this.modo === 'editar' && this.retencion) {
        disponible += this.retencion.monto;
      }

      this.montoDisponible.set(Math.max(0, disponible));
    }
  }

  onTipoChange(event: any): void {
    const tipoId = parseInt(event.target.value);
    const tipo = this.tiposRetencion.find(t => t.id === tipoId);

    if (tipo?.porcentaje_default) {
      this.formulario.patchValue({
        porcentaje: tipo.porcentaje_default
      });
      this.calcularMontoPorPorcentaje();
    }
  }

  calcularMontoPorPorcentaje(): void {
    const porcentaje = this.formulario.get('porcentaje')?.value;
    const liquidacion = this.service.obtenerLiquidacionActual();

    if (porcentaje && liquidacion) {
      const montoCalculado = (liquidacion.factura.monto_total * porcentaje) / 100;
      this.formulario.patchValue({
        monto: Math.round(montoCalculado * 100) / 100
      }, { emitEvent: false });
      this.validarMonto();
    }
  }

  calcularPorcentajePorMonto(): void {
    const monto = this.formulario.get('monto')?.value;
    const liquidacion = this.service.obtenerLiquidacionActual();

    if (monto && liquidacion && liquidacion.factura.monto_total > 0) {
      const porcentajeCalculado = (monto / liquidacion.factura.monto_total) * 100;
      this.formulario.patchValue({
        porcentaje: Math.round(porcentajeCalculado * 100) / 100
      }, { emitEvent: false });
    }
  }

  private validarMonto(): void {
    const monto = this.formulario.get('monto')?.value;

    if (!monto || monto <= 0) {
      this.mensajeValidacion.set('El monto debe ser mayor a 0');
      this.validacionOk.set(false);
      return;
    }

    if (monto > this.montoDisponible()) {
      this.mensajeValidacion.set(`El monto excede el disponible: ${this.formatearMonto(this.montoDisponible())}`);
      this.validacionOk.set(false);
      return;
    }

    this.mensajeValidacion.set('');
    this.validacionOk.set(true);
  }

  confirmar(): void {
    if (this.formulario.valid && this.validacionOk()) {
      this.guardando.set(true);

      setTimeout(() => {
        this.guardando.set(false);
        this.confirmado.emit(this.formulario.value);
      }, 1000);
    }
  }

  esInvalido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  get fechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }
}