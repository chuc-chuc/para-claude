import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pago-anticipo-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pago-anticipo-select.component.html'
})
export class PagoAnticipoSelectComponent {
  @Input() data: any | null = null;
  @Output() guardar = new EventEmitter<any>();
  @Output() cancelar = new EventEmitter<void>();

  nota = '';

  ngOnInit() {
    if (this.data?.nota) this.nota = this.data.nota;
  }

  submit() {
    this.guardar.emit({ nota: this.nota });
  }
}