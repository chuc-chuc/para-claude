import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Swal from 'sweetalert2';

import { OrdenesPEFacade } from '../../services/ordenes-pe.facade';
import {
  AnticipoPendientePE,
  EstadoLiquidacion,
  SolicitudAutorizacionPayload,
  TipoAnticipo
} from '../../models/ordenes-pe.models';

@Component({
  selector: 'app-solicitud-anticipo-pe',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './solicitud-anticipo-pe.component.html'
})
export class SolicitudAnticipoPEComponent implements OnChanges {
  @Input() isVisible = false;
  @Input() numeroOrden = 0;

  @Output() modalClosed = new EventEmitter<void>();
  @Output() solicitudExitosa = new EventEmitter<void>();

  anticipos: AnticipoPendientePE[] = [];
  cargando = false;
  enviando = false;

  private readonly destroyRef = inject(DestroyRef);

  // Config UI
  private readonly MIN_JUST = 20;

  readonly colorTipo: Record<TipoAnticipo, string> = {
    [TipoAnticipo.CHEQUE]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    [TipoAnticipo.EFECTIVO]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    [TipoAnticipo.TRANSFERENCIA]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
  };

  readonly colorEstado: Record<EstadoLiquidacion, { texto: string; color: string; dot: string }> = {
    [EstadoLiquidacion.NO_LIQUIDADO]: { texto: 'Sin liquidar', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', dot: 'bg-gray-400' },
    [EstadoLiquidacion.RECIENTE]: { texto: 'Reciente', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', dot: 'bg-green-500' },
    [EstadoLiquidacion.EN_TIEMPO]: { texto: 'En tiempo', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', dot: 'bg-yellow-500' },
    [EstadoLiquidacion.FUERA_DE_TIEMPO]: { texto: 'Fuera de tiempo', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', dot: 'bg-red-500' },
    [EstadoLiquidacion.LIQUIDADO]: { texto: 'Liquidado', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', dot: 'bg-emerald-500' }
  };

  constructor(private facade: OrdenesPEFacade) {
    this.facade.anticipos$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.anticipos = v);

    this.facade.cargandoAnticipos$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.cargando = v);

    this.facade.enviandoSolicitud$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.enviando = v);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const visibleChanged = 'isVisible' in changes;
    const numeroChanged = 'numeroOrden' in changes;

    if ((visibleChanged && this.isVisible && this.numeroOrden > 0) ||
      (numeroChanged && this.isVisible && this.numeroOrden > 0)) {
      this.facade.cargarAnticipos(this.numeroOrden);
    }
  }

  cerrar(): void {
    this.modalClosed.emit();
  }

  /** Un anticipo es "tardío" si está EN_TIEMPO o FUERA_DE_TIEMPO (criterio original) */
  esTardio(a: AnticipoPendientePE): boolean {
    return a.estadoLiquidacion === EstadoLiquidacion.EN_TIEMPO ||
      a.estadoLiquidacion === EstadoLiquidacion.FUERA_DE_TIEMPO;
  }
  /** Tardío por datos (motivo o días > permitidos) */
  private esFueraDeTiempoPorDatos(a: AnticipoPendientePE): boolean {
    const porMotivo = (a.motivoInclusion ?? '').toUpperCase() === 'FUERA_DE_TIEMPO';
    const porDias = (a.diasTranscurridos ?? null) !== null &&
      (a.diasPermitidos ?? null) !== null &&
      (a.diasTranscurridos as number) > (a.diasPermitidos as number);
    return porMotivo || porDias;
  }

  /** ¿Existe solicitud previa en curso? -> solo si hay nombre_estado "pendiente"/"en proceso"/"en revisión" */
  yaSolicitada(a: AnticipoPendientePE): boolean {
    const nombre = (a.ultimoSeguimiento?.nombreEstado || '').toLowerCase().trim();
    return ['pendiente', 'en proceso', 'en revisión', 'en revision'].includes(nombre);
  }

  /**
   * Puede solicitar si:
   * - requiere_autorizacion = true
   * - NO hay solicitud previa en curso
   * - y se cumple cualquiera:
   *   a) es tardío por clasificación, o
   *   b) es fuera de tiempo por datos (motivo / días), o
   *   c) está liquidado (autorización ex–post)
   */
  canSolicitar(a: AnticipoPendientePE): boolean {
    const requiere = !!a.requiereAutorizacion;
    const criterio =
      this.esTardio(a) ||
      this.esFueraDeTiempoPorDatos(a) ||
      a.estadoLiquidacion === EstadoLiquidacion.LIQUIDADO;

    return requiere && !this.yaSolicitada(a) && criterio;
  }

  // Derivados para UI
  hayAnticipos(): boolean {
    return !this.cargando && this.anticipos.length > 0;
  }
  sinAnticipos(): boolean {
    return !this.cargando && this.anticipos.length === 0;
  }
  tardiosCount(): number {
    return this.anticipos.filter(a => this.esTardio(a)).length;
  }

  diasResumen(a: AnticipoPendientePE): string | null {
    if (a.diasTranscurridos == null && a.diasPermitidos == null) return null;
    const t = a.diasTranscurridos ?? '-';
    const p = a.diasPermitidos ?? '-';
    return `${t}/${p} días`;
  }

  async solicitar(a: AnticipoPendientePE): Promise<void> {
    if (!this.canSolicitar(a)) return;

    const just = await this.pedirJustificacion(a);
    if (!just) return;

    const payload: SolicitudAutorizacionPayload = {
      id_solicitud: a.idSolicitud,
      justificacion: just,
      tipo: 'autorizacion'
    };

    this.facade.solicitarAutorizacion(payload, () => {
      this.facade.cargarAnticipos(this.numeroOrden);
      this.solicitudExitosa.emit();
    });
  }

  private async pedirJustificacion(a: AnticipoPendientePE): Promise<string | null> {
    const res = await Swal.fire({
      title: 'Justificación requerida',
      html: `
        <div class="text-left mb-2">
          <p class="text-sm text-gray-600">
            Autorizar anticipo <strong>${a.tipoAnticipo}</strong> por
            <strong>Q${a.monto.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </p>
        </div>
      `,
      input: 'textarea',
      inputPlaceholder: `Ingrese al menos ${this.MIN_JUST} caracteres...`,
      inputAttributes: { rows: '4', style: 'resize: vertical; min-height: 100px;', maxlength: '500' },
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      preConfirm: (v) => this.validarJustificacion(v),
      allowOutsideClick: false,
      width: '500px'
    });

    return res.isConfirmed ? (res.value as string) : null;
  }

  private validarJustificacion(v: string): string | false {
    const clean = (v ?? '').trim();
    if (!clean) {
      Swal.showValidationMessage('La justificación es requerida');
      return false;
    }
    if (clean.length < this.MIN_JUST) {
      Swal.showValidationMessage(`Mínimo ${this.MIN_JUST} caracteres. Actual: ${clean.length}/${this.MIN_JUST}`);
      return false;
    }
    return clean;
  }

  trackByAnticipo = (_: number, a: AnticipoPendientePE) => a.idSolicitud;
}