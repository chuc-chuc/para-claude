// ============================================================================
// MODAL VERIFICAR DETALLE SIMPLIFICADO
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  DetalleLiquidacion,
  EstadoVerificacion,
  formatearMonto,
  obtenerTextoEstado
} from '../../models/liquidacion-verificacion.models';

@Component({
  selector: 'app-modal-verificar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-verificar-detalle.component.html',
})
export class ModalVerificarComponent implements OnInit {
  @Input() detalle: DetalleLiquidacion | null = null;

  @Output() cerrar = new EventEmitter<void>();
  @Output() confirmado = new EventEmitter<any>();

  readonly guardando = signal<boolean>(false);
  readonly formatearMonto = formatearMonto;
  readonly obtenerTextoEstado = obtenerTextoEstado;

  formulario!: FormGroup;

  constructor(private fb: FormBuilder) {
    this.inicializarFormulario();
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  private inicializarFormulario(): void {
    this.formulario = this.fb.group({
      comprobante_contabilidad: ['', [Validators.required, Validators.minLength(3)]],
      fecha_registro_contabilidad: [this.fechaHoy, [Validators.required]],
      numero_acta: [''],
      estado_verificacion: ['verificado', [Validators.required]]
    });
  }

  private cargarDatos(): void {
    if (this.detalle && this.esModoEdicion()) {
      this.formulario.patchValue({
        comprobante_contabilidad: this.detalle.comprobante_contabilidad || '',
        fecha_registro_contabilidad: this.detalle.fecha_registro_contabilidad || this.fechaHoy,
        numero_acta: this.detalle.numero_acta || '',
        estado_verificacion: this.detalle.estado_verificacion || 'verificado'
      });
    }
  }

  confirmar(): void {
    if (this.formulario.valid) {
      this.guardando.set(true);

      setTimeout(() => {
        this.guardando.set(false);
        this.confirmado.emit(this.formulario.value);
      }, 1000);
    }
  }

  esModoEdicion(): boolean {
    return !!(this.detalle?.comprobante_contabilidad || this.detalle?.estado_verificacion === 'verificado');
  }

  esInvalido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  obtenerColorEstado(estado: EstadoVerificacion): string {
    const colores = {
      'pendiente': 'bg-yellow-100 text-yellow-800',
      'verificado': 'bg-green-100 text-green-800',
      'rechazado': 'bg-red-100 text-red-800'
    };
    return colores[estado] || colores['pendiente'];
  }

  get fechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }
}