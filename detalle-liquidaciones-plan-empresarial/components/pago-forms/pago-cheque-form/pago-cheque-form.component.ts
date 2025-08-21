import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-pago-cheque-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './pago-cheque-form.component.html'
})
export class PagoChequeFormComponent {
  @Input() data: any | null = null;
  @Input() agencias: any[] = [];
  @Output() guardar = new EventEmitter<any>();
  @Output() cancelar = new EventEmitter<void>();

  form;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      agencia: ['', Validators.required],
      descripcion: [''],
      banco: ['', Validators.required],
      numero_cheque: ['', Validators.required],
      beneficiario: ['', Validators.required],
      monto: [0, [Validators.required, Validators.min(0.01)]],
      correo_proveedor: ['']
    });
  }

  ngOnInit() { if (this.data) this.form.patchValue(this.data); }

  submit() {
    if (this.form.invalid) return;
    this.guardar.emit(this.form.value);
  }
}