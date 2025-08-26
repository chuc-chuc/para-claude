// ============================================================================
// MODAL SOLICITAR AUTORIZACIÓN - CORREGIDO CON FACADE UNIFICADO
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// USAR FACADE Y MODELOS UNIFICADOS
import { PlanEmpresarialContainerFacade } from '../../../plan-empresarial-container/plan-empresarial-container.facade';

@Component({
  selector: 'app-modal-solicitar-autorizacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-solicitar-autorizacion.component.html'
})
export class ModalSolicitarAutorizacionComponent implements OnInit {
  @Input() numeroDte = '';
  @Input() fechaEmision = '';
  @Input() diasTranscurridos = 0;

  @Output() cerrar = new EventEmitter<void>();
  @Output() solicitudEnviada = new EventEmitter<void>();

  form!: FormGroup;
  enviando = false;

  constructor(private facade: PlanEmpresarialContainerFacade) { } // ✅ FACADE UNIFICADO

  ngOnInit(): void {
    this.form = new FormGroup({
      motivo: new FormControl('', [Validators.required, Validators.minLength(10), Validators.maxLength(500)])
    });
  }

  cerrarModal(): void {
    this.cerrar.emit();
  }

  enviar(): void {
    if (this.form.invalid || this.enviando) return;
    this.enviando = true;

    // ✅ USAR MÉTODO DEL FACADE UNIFICADO
    this.facade.solicitarAutorizacion(
      {
        numero_dte: this.numeroDte,
        motivo: this.form.get('motivo')?.value,
        dias_transcurridos: this.diasTranscurridos
      },
      () => {
        this.enviando = false;
        this.solicitudEnviada.emit();
        this.cerrar.emit();
      }
    );
  }
}