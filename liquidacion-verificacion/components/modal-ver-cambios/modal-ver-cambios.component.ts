import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, signal, inject } from '@angular/core';
import {
  CambioSolicitado,
  DetalleConOrden, // Añade esta línea
  obtenerTextoTipoCambio,
  obtenerTextoEstadoCambio,
  obtenerColorEstadoCambio,
  obtenerIconoTipoCambio,
  formatearFechaHora
} from '../../models/liquidacion-verificacion.models';
import { LiquidacionService } from '../../services/liquidacion-verificacion.service';

@Component({
  selector: 'app-modal-ver-cambios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-ver-cambios.component.html',
})
export class ModalVerCambiosComponent implements OnInit {
  @Input() detalle: DetalleConOrden | null = null;

  @Output() cerrar = new EventEmitter<void>();

  private readonly service = inject(LiquidacionService);

  readonly cambios = signal<CambioSolicitado[]>([]);
  readonly cargando = signal<boolean>(false);

  readonly obtenerTextoTipoCambio = obtenerTextoTipoCambio;
  readonly obtenerTextoEstadoCambio = obtenerTextoEstadoCambio;
  readonly obtenerColorEstadoCambio = obtenerColorEstadoCambio;
  readonly formatearFechaHora = formatearFechaHora;

  ngOnInit(): void {
    if (this.detalle) {
      this.cargando.set(true);
      this.service.obtenerCambiosDetalle(this.detalle.detalle_id).subscribe(cambios => {
        this.cambios.set(cambios);
        this.cargando.set(false);
      });
    }
  }
}