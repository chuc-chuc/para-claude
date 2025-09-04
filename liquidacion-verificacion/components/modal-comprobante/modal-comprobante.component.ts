// ============================================================================
// MODAL COMPROBANTE - SIMPLIFICADO (ESTILOS ACTUALIZADOS)
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DetalleConOrden, Agencia, formatearMonto } from '../../models/liquidacion-verificacion.models';

@Component({
  selector: 'app-modal-comprobante',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-comprobante.component.html',
})
export class ModalComprobanteComponent implements OnInit {
  @Input() modo: 'individual' | 'masivo' = 'individual';
  @Input() detalles: DetalleConOrden[] = [];
  @Input() agencias: Agencia[] = [];

  @Output() cerrar = new EventEmitter<void>();
  @Output() confirmado = new EventEmitter<any>();

  formulario!: FormGroup;

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.formulario = this.fb.group({
      comprobante_contabilidad: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[A-Za-z0-9\-_]+$/)]],
      agencia_gasto_id: [''],
      fecha_registro_contabilidad: ['']
    });
  }

  obtenerTituloModal(): string {
    return this.modo === 'individual' ? 'Asignar Comprobante Individual' : 'Asignar Comprobante Masivo';
  }

  esInvalido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  confirmar(): void {
    if (this.formulario.valid) {
      this.confirmado.emit(this.formulario.value);
    }
  }
}