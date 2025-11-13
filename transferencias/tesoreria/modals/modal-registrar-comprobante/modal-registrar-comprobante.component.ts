// modal-registrar-comprobante.component.ts (OPTIMIZADO)

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { PreviewJustificacionModalComponent } from '../../../../preview-justificacion-modal/preview-justificacion-modal.component';

import { TransferenciasService } from '../../../services/transferencias.service';
import { SolicitudTransferencia, RegistrarComprobantePayload } from '../../../models/transferencias.models';

@Component({
  selector: 'app-modal-registrar-comprobante',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PreviewJustificacionModalComponent],
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

  readonly formulario: FormGroup;
  readonly cargando = signal<boolean>(false);
  readonly archivoSeleccionado = signal<File | null>(null);
  readonly nombreArchivo = signal<string>('');
  readonly mostrarPreview = signal<boolean>(false);
  readonly driveIdPreview = signal<string>('');

  // Tipos permitidos
  private readonly TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  private readonly MAX_SIZE = 10 * 1024 * 1024; // 10 MB

  constructor() {
    this.formulario = this.fb.group({
      numero_registro_transferencia: ['', Validators.required],
      fecha_transferencia: ['', Validators.required],
      referencia_bancaria: [''],
      observaciones: ['']
    });
  }

  ngOnInit(): void {
    this.configurarFechaMaxima();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private configurarFechaMaxima(): void {
    const hoy = new Date().toISOString().split('T')[0];
    const inputFecha = document.getElementById('fecha_transferencia') as HTMLInputElement;
    if (inputFecha) inputFecha.max = hoy;
  }

  // ============================================================================
  // MANEJO DE ARCHIVO
  // ============================================================================

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const archivo = input.files[0];

    if (!this.validarArchivo(archivo)) {
      this.limpiarInputArchivo();
      return;
    }

    this.archivoSeleccionado.set(archivo);
    this.nombreArchivo.set(archivo.name);
  }

  private validarArchivo(archivo: File): boolean {
    // Validar tipo
    if (!this.TIPOS_PERMITIDOS.includes(archivo.type)) {
      Swal.fire({
        icon: 'error',
        title: 'Tipo no permitido',
        text: 'Solo se permiten archivos PDF o imágenes (JPG, PNG)',
        confirmButtonColor: '#3b82f6'
      });
      return false;
    }

    // Validar tamaño
    if (archivo.size > this.MAX_SIZE) {
      Swal.fire({
        icon: 'error',
        title: 'Archivo muy grande',
        text: 'El archivo no debe superar los 10 MB',
        confirmButtonColor: '#3b82f6'
      });
      return false;
    }

    return true;
  }

  eliminarArchivo(): void {
    this.archivoSeleccionado.set(null);
    this.nombreArchivo.set('');
    this.limpiarInputArchivo();
  }

  private limpiarInputArchivo(): void {
    const input = document.getElementById('archivo') as HTMLInputElement;
    if (input) input.value = '';
  }

  // ============================================================================
  // PREVIEW DE COMPROBANTE
  // ============================================================================

  abrirPreviewComprobante(): void {
    if (!this.archivoSeleccionado()) {
      Swal.fire('Información', 'Seleccione un archivo primero', 'info');
      return;
    }

    // Mostrar preview del archivo local
    const archivo = this.archivoSeleccionado()!;
    const reader = new FileReader();

    reader.onload = (e) => {
      Swal.fire({
        title: 'Vista previa',
        html: `<iframe src="${e.target?.result}" style="width:100%; height:500px; border:none;"></iframe>`,
        width: '80%',
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#3b82f6'
      });
    };

    reader.readAsDataURL(archivo);
  }

  verComprobanteExistente(): void {
    // Si la solicitud ya tiene comprobante registrado, mostrarlo
    if (this.solicitud.cantidad_archivos && this.solicitud.cantidad_archivos > 0) {
      this.service.obtenerDetalleSolicitud(this.solicitud.id).subscribe(detalle => {
        if (detalle?.archivos && detalle.archivos.length > 0) {
          const archivo = detalle.archivos[0];
          this.driveIdPreview.set(archivo.drive_id);
          this.mostrarPreview.set(true);
        }
      });
    }
  }

  cerrarPreview(): void {
    this.mostrarPreview.set(false);
    this.driveIdPreview.set('');
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
        text: 'Complete los campos requeridos',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    Swal.fire({
      icon: 'question',
      title: '¿Registrar comprobante?',
      html: `
        <div class="text-left">
          <p class="mb-2">Se completará la solicitud:</p>
          <ul class="text-sm text-gray-700">
            <li><strong>Código:</strong> ${this.solicitud.codigo_solicitud}</li>
            <li><strong>Registro:</strong> ${this.formulario.value.numero_registro_transferencia}</li>
            <li><strong>Fecha:</strong> ${this.formulario.value.fecha_transferencia}</li>
          </ul>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, registrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280'
    }).then((result) => {
      if (result.isConfirmed) {
        this.registrarComprobante();
      }
    });
  }

  private registrarComprobante(): void {
    this.cargando.set(true);

    const payload: RegistrarComprobantePayload = {
      solicitud_id: this.solicitud.id,
      numero_registro_transferencia: this.formulario.value.numero_registro_transferencia,
      fecha_transferencia: this.formulario.value.fecha_transferencia,
      referencia_bancaria: this.formulario.value.referencia_bancaria || undefined,
      observaciones: this.formulario.value.observaciones || undefined
    };

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

  campoInvalido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!(control && control.invalid && control.touched);
  }
}