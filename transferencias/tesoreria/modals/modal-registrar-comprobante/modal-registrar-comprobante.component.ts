// ============================================================================
// MODAL REGISTRAR COMPROBANTE
// Archivo: src/app/modules/transferencias/tesoreria/modals/modal-registrar-comprobante/modal-registrar-comprobante.component.ts
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { PreviewJustificacionModalComponent } from '../../../../preview-justificacion-modal/preview-justificacion-modal.component';

import { TransferenciasService } from '../../../services/transferencias.service';
import {
  SolicitudTransferencia,
  RegistrarComprobantePayload
} from '../../../models/transferencias.models';

@Component({
  selector: 'app-modal-registrar-comprobante',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-registrar-comprobante.component.html',
  styleUrls: ['./modal-registrar-comprobante.component.css']
})
export class ModalRegistrarComprobanteComponent implements OnInit, OnDestroy {

  @Input() solicitud!: SolicitudTransferencia;
  @Output() cerrar = new EventEmitter<void>();
  @Output() confirmado = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TransferenciasService);
  private readonly destroy$ = new Subject<void>();

  // ============================================================================
  // ESTADO
  // ============================================================================

  readonly formulario: FormGroup;
  readonly cargando = signal<boolean>(false);
  readonly archivoSeleccionado = signal<File | null>(null);
  readonly nombreArchivo = signal<string>('');

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  constructor() {
    this.formulario = this.fb.group({
      numero_registro_transferencia: ['', Validators.required],
      fecha_transferencia: ['', Validators.required],
      referencia_bancaria: [''],
      observaciones: ['']
    });
  }

  // ============================================================================
  // CICLO DE VIDA
  // ============================================================================

  ngOnInit(): void {
    // Establecer fecha máxima como hoy
    const hoy = new Date().toISOString().split('T')[0];
    const inputFecha = document.getElementById('fecha_transferencia') as HTMLInputElement;
    if (inputFecha) {
      inputFecha.max = hoy;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // MANEJO DE ARCHIVO
  // ============================================================================

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const archivo = input.files[0];

      // Validar tipo
      const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!tiposPermitidos.includes(archivo.type)) {
        Swal.fire({
          icon: 'error',
          title: 'Tipo de archivo no permitido',
          text: 'Solo se permiten archivos PDF o imágenes (JPG, PNG)',
          confirmButtonColor: '#3b82f6'
        });
        return;
      }

      // Validar tamaño (10 MB)
      const maxSize = 10 * 1024 * 1024;
      if (archivo.size > maxSize) {
        Swal.fire({
          icon: 'error',
          title: 'Archivo demasiado grande',
          text: 'El archivo no debe superar los 10 MB',
          confirmButtonColor: '#3b82f6'
        });
        return;
      }

      this.archivoSeleccionado.set(archivo);
      this.nombreArchivo.set(archivo.name);
    }
  }

  eliminarArchivo(): void {
    this.archivoSeleccionado.set(null);
    this.nombreArchivo.set('');

    const input = document.getElementById('archivo') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  }

  // ============================================================================
  // SUBMIT
  // ============================================================================

  onSubmit(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: 'Formulario incompleto',
        text: 'Por favor complete los campos requeridos',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    const payload: RegistrarComprobantePayload = {
      solicitud_id: this.solicitud.id,
      numero_registro_transferencia: this.formulario.value.numero_registro_transferencia,
      fecha_transferencia: this.formulario.value.fecha_transferencia,
      referencia_bancaria: this.formulario.value.referencia_bancaria || undefined,
      observaciones: this.formulario.value.observaciones || undefined
    };

    Swal.fire({
      icon: 'question',
      title: '¿Registrar comprobante?',
      text: 'Se completará la solicitud de transferencia',
      showCancelButton: true,
      confirmButtonText: 'Sí, registrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280'
    }).then((result) => {
      if (result.isConfirmed) {
        this.registrarComprobante(payload);
      }
    });
  }

  private registrarComprobante(payload: RegistrarComprobantePayload): void {
    this.cargando.set(true);

    this.service.registrarComprobante(payload, this.archivoSeleccionado() || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe(exito => {
        this.cargando.set(false);
        if (exito) {
          this.confirmado.emit();
        }
      });
  }

  onCerrar(): void {
    if (!this.cargando()) {
      this.cerrar.emit();
    }
  }

  // ============================================================================
  // VALIDACIONES
  // ============================================================================

  campoInvalido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!(control && control.invalid && control.touched);
  }
}