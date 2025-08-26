// ============================================================================
// ÓRDENES PLAN EMPRESARIAL - CORREGIDO CON FACADE UNIFICADO
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal, inject, DestroyRef, Output, EventEmitter } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SolicitudAnticipoPEComponent } from '../solicitud-anticipo-pe/solicitud-anticipo-pe.component';

// USAR FACADE Y MODELOS UNIFICADOS
import { PlanEmpresarialContainerFacade } from '../../../plan-empresarial-container/plan-empresarial-container.facade';
import { OrdenPlanEmpresarial, ResumenOrdenesPE } from '../../../plan-empresarial-container/shared/models/plan-empresarial.models';

@Component({
  selector: 'app-ordenes-plan-empresarial',
  standalone: true,
  imports: [CommonModule, SolicitudAnticipoPEComponent],
  templateUrl: './ordenes-plan-empresarial.component.html'
})
export class OrdenesPlanEmpresarialComponent implements OnInit, OnDestroy {

  // === EVENTOS HACIA EL PADRE ===
  @Output() refrescar = new EventEmitter<void>();
  @Output() ordenSeleccionadaChange = new EventEmitter<OrdenPlanEmpresarial>();

  // UI local con signals
  modalVisible = signal(false);
  ordenSeleccionada = signal<number | null>(null);

  // estado local
  ordenes: OrdenPlanEmpresarial[] = [];
  cargandoOrdenes = false;

  // DestroyRef para usar takeUntilDestroyed en un contexto de inyección
  private readonly destroyRef = inject(DestroyRef);

  constructor(private facade: PlanEmpresarialContainerFacade) { } // ✅ FACADE UNIFICADO

  ngOnInit(): void {
    this.facade.ordenes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.ordenes = v);

    this.facade.cargandoOrdenes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.cargandoOrdenes = v);

    this.refrescarInterno();
  }

  ngOnDestroy(): void {
    // takeUntilDestroyed maneja la desuscripción.
  }

  // === Derivados como MÉTODOS (no computed) para que el template se actualice ===
  resumen(): ResumenOrdenesPE {
    return this.facade.getResumenOrdenes(this.ordenes);
  }

  // === ACCIONES ===
  refrescarInterno(): void {
    this.facade.cargarOrdenes();
  }

  refrescarPublico(): void {
    this.refrescarInterno();
    // Notificar al padre que se está refrescando
    this.refrescar.emit();
  }

  abrirModal(orden: OrdenPlanEmpresarial): void {
    this.ordenSeleccionada.set(orden.numeroOrden);
    this.modalVisible.set(true);

    // Notificar al padre sobre la orden seleccionada
    this.ordenSeleccionadaChange.emit(orden);
  }

  cerrarModal(): void {
    this.modalVisible.set(false);
    this.ordenSeleccionada.set(null);
  }

  /** Al completar una solicitud: refresca órdenes y mantiene el modal abierto */
  onSolicitudExitosa(): void {
    const no = this.ordenSeleccionada();
    this.refrescarInterno();
    if (no && this.modalVisible()) {
      // El hijo recargará sus datos al continuar visible con el mismo numeroOrden.
    }
  }

  // === MÉTODOS PÚBLICOS PARA CONTROL EXTERNO ===

  /**
   * Permite al padre actualizar las órdenes externamente
   */
  actualizarOrdenes(nuevasOrdenes: OrdenPlanEmpresarial[]): void {
    this.ordenes = nuevasOrdenes;
  }

  /**
   * Obtiene las órdenes actualmente cargadas
   */
  obtenerOrdenes(): OrdenPlanEmpresarial[] {
    return this.ordenes;
  }

  /**
   * Obtiene una orden específica por número
   */
  obtenerOrdenPorNumero(numeroOrden: number): OrdenPlanEmpresarial | undefined {
    return this.ordenes.find(o => o.numeroOrden === numeroOrden);
  }

  trackByOrden = (_: number, o: OrdenPlanEmpresarial) => o.numeroOrden;
}