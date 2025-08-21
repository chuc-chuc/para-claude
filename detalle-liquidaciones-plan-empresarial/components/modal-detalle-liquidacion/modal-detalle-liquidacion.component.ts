import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PagoDepositoFormComponent } from '../pago-forms/pago-deposito-form/pago-deposito-form.component';
import { PagoTransferenciaFormComponent } from '../pago-forms/pago-transferencia-form/pago-transferencia-form.component';
import { PagoChequeFormComponent } from '../pago-forms/pago-cheque-form/pago-cheque-form.component';
import { PagoTarjetaSelectComponent } from '../pago-forms/pago-tarjeta-select/pago-tarjeta-select.component';
import { PagoAnticipoSelectComponent } from '../pago-forms/pago-anticipo-select/pago-anticipo-select.component';

@Component({
  selector: 'app-modal-detalle-liquidizacion',
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
export class ModalDetalleLiquidizacionComponent {
  @Input() visible = false;
  @Input() modo: 'crear' | 'editar' = 'crear';
  @Input() registro: any | null = null;
  @Input() agencias: any[] = [];
  @Input() tiposPago: any[] = [];
  @Input() factura: any | null = null;

  @Output() guardar = new EventEmitter<any>();
  @Output() cancelar = new EventEmitter<void>();

  tipoSeleccionado = signal<string>('');

  ngOnInit() {
    const tipo = this.registro?.forma_pago || this.tiposPago?.[0]?.id || '';
    this.tipoSeleccionado.set(tipo);
  }

  onGuardarBasico() {
    this.guardar.emit({ ...this.registro, forma_pago: this.tipoSeleccionado() });
  }

  onGuardarDesdeForm(payload: any) {
    const merged = { ...(this.registro || {}), ...payload, forma_pago: this.tipoSeleccionado() };
    this.guardar.emit(merged);
  }
}