import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-pago-transferencia-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './pago-transferencia-form.component.html'
})
export class PagoTransferenciaFormComponent {
  @Input() data: any | null = null;
  @Input() agencias: any[] = [];
  @Output() guardar = new EventEmitter<any>();
  @Output() cancelar = new EventEmitter<void>();

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      agencia: ['', Validators.required],
      descripcion: [''],
      banco: ['', Validators.required],
      cuenta: ['', Validators.required],
      referencia: ['', Validators.required],
      monto: [0, [Validators.required, Validators.min(0.01)]],
      correo_proveedor: ['']
    });
  }

  ngOnInit() {
    if (this.data) this.form.patchValue(this.data);
  }

  submit() {
    if (this.form.invalid) return;
    this.guardar.emit(this.form.value);
  }
}