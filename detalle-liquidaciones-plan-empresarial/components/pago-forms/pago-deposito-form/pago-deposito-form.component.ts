// components/pago-forms/pago-deposito-form/pago-deposito-form.component.ts
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-pago-deposito-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './pago-deposito-form.component.html'
})
export class PagoDepositoFormComponent implements OnInit {
  @Input() data: any | null = null;
  @Input() agencias: any[] = [];
  @Output() guardar = new EventEmitter<any>();
  @Output() cancelar = new EventEmitter<void>();

  form: FormGroup;

  // Lista de bancos hardcodeada (puedes cambiarla por un servicio)
  bancos = [
    'Banco Industrial',
    'Banrural',
    'Banco G&T Continental',
    'BAM',
    'Banco Promerica',
    'Banco Agromercantil',
    'Banco de los Trabajadores',
    'Vivibanco'
  ];

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      banco: ['', Validators.required],
      cuenta: ['', Validators.required],
      tipo_cuenta: ['Monetaria'], // Valor por defecto
      numero_boleta: [''],
      fecha_deposito: [new Date().toISOString().split('T')[0]], // Fecha actual
      observaciones: ['']
    });
  }

  ngOnInit() {
    // Cargar datos existentes si los hay
    if (this.data) {
      this.form.patchValue({
        banco: this.data.banco || '',
        cuenta: this.data.cuenta || '',
        tipo_cuenta: this.data.tipo_cuenta || 'Monetaria',
        numero_boleta: this.data.numero_boleta || '',
        fecha_deposito: this.data.fecha_deposito || new Date().toISOString().split('T')[0],
        observaciones: this.data.observaciones || ''
      });
    }
  }

  submit() {
    if (this.form.invalid) {
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
      return;
    }

    // Emitir los datos del formulario específico
    const formData = this.form.value;

    // Combinar con datos base si existen
    const payload = {
      ...this.data, // Datos del formulario principal
      ...formData,  // Datos específicos del formulario de depósito
      forma_pago: 'deposito'
    };

    this.guardar.emit(payload);
  }

  // Método para verificar si un campo es inválido
  campoInvalido(campo: string): boolean {
    const control = this.form.get(campo);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  // Método para obtener mensaje de error
  obtenerErrorMensaje(campo: string): string {
    const control = this.form.get(campo);
    if (!control) return '';

    if (control.hasError('required')) return 'Este campo es obligatorio';
    if (control.hasError('minlength')) {
      const requiredLength = control.errors?.['minlength'].requiredLength;
      return `Mínimo ${requiredLength} caracteres`;
    }
    if (control.hasError('maxlength')) {
      const requiredLength = control.errors?.['maxlength'].requiredLength;
      return `Máximo ${requiredLength} caracteres`;
    }

    return 'Campo inválido';
  }
}