// components/modal-registrar-factura/modal-registrar-factura.component.ts
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FacturasPEFacade } from '../../services/facturas-pe.facade';
import { Moneda, RegistrarFacturaPayload } from '../../models/facturas-pe.models';

@Component({
  selector: 'app-modal-registrar-factura',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-registrar-factura.component.html'
})
export class ModalRegistrarFacturaComponent {
  @Output() cerrar = new EventEmitter<void>();
  @Output() facturaGuardada = new EventEmitter<void>();

  tiposDte = [
    { codigo: '1', nombre: 'RECIBO' },
    { codigo: '2', nombre: 'FACT' }
  ];
  autorizaciones = [
    { codigo: '1', nombre: 'COOPERATIVA EL BIENESTAR' },
    { codigo: '2', nombre: 'PEDRO NOE YAC' }
  ];
  monedas: Moneda[] = ['GTQ', 'USD'];

  form = new FormGroup({
    numero_dte: new FormControl('', [Validators.required, Validators.pattern(/^[A-Za-z0-9\-]{1,25}$/)]),
    fecha_emision: new FormControl(new Date().toISOString().split('T')[0], [Validators.required]),
    numero_autorizacion: new FormControl('', [Validators.required]),
    tipo_dte: new FormControl('', [Validators.required]),
    nombre_emisor: new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]),
    monto_total: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    moneda: new FormControl<Moneda>('GTQ', [Validators.required])
  });

  submitting = false;

  constructor(private facade: FacturasPEFacade) { }

  close() {
    this.cerrar.emit();
  }

  guardar() {
    if (this.submitting || this.form.invalid) return;
    this.submitting = true;

    const v = this.form.value;
    const payload: RegistrarFacturaPayload = {
      numero_dte: (v.numero_dte || '').toUpperCase(),
      fecha_emision: v.fecha_emision!,
      numero_autorizacion: v.numero_autorizacion!,
      tipo_dte: v.tipo_dte!,
      nombre_emisor: (v.nombre_emisor || '').toUpperCase(),
      monto_total: Number(v.monto_total),
      moneda: v.moneda!
    };

    this.facade.registrarFactura(payload, () => {
      this.submitting = false;
      this.facturaGuardada.emit();
      this.close();
    });
  }
}