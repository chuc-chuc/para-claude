// ============================================================================
// MODAL SOLICITAR CAMBIO - SIMPLIFICADO (ESTILOS ACTUALIZADOS)
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DetalleConOrden, formatearMonto } from '../../models/liquidaciones-presupuesto.models';

@Component({
  selector: 'app-modal-solicitar-cambio-ti',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-solicitar-cambio.component.html',
})
export class ModalSolicitarCambioComponentti implements OnInit {
  @Input() detalle: DetalleConOrden | null = null;

  @Output() cerrar = new EventEmitter<void>();
  @Output() confirmado = new EventEmitter<any>();

  formulario!: FormGroup;

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.formulario = this.fb.group({
      descripcion_cambio: ['', [Validators.required, Validators.minLength(10)]]
    });
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