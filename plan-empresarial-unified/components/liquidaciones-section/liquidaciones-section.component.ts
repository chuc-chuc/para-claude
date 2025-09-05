import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal, computed, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PlanEmpresarialService } from '../../services/plan-empresarial.service';
import { ModalDetalleLiquidacionComponent } from './modals/modal-detalle-liquidacion.component';
import { ModalConfirmarAccionComponent } from '../shared/modal-confirmar-accion.component';

import {
  FacturaPE,
  DetalleLiquidacionPE,
  ResumenLiquidacion,
  GuardarDetalleLiquidacionPayload,
  TipoPagoId
} from '../../models/plan-empresarial.models';

/**
 * Sección de gestión de liquidaciones - Estilo minimalista y funcional
 * Incluye tabla de detalles, resumen y acciones CRUD
 */
@Component({
  selector: 'app-liquidaciones-section',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalDetalleLiquidacionComponent,
    ModalConfirmarAccionComponent
  ],
  template: `
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 class="text-sm font-medium text-gray-900">Detalles de Liquidación</h2>
        
        <div class="flex items-center gap-2">
          <!-- Resumen rápido -->
          <div *ngIf="facturaActiva()" class="flex items-center gap-4 text-xs text-gray-500">
            <span>{{ resumenLiquidacion().cantidad_detalles }} detalles</span>
            <span class="font-medium" [ngClass]="obtenerClaseEstado()">
              Q{{ resumenLiquidacion().total_liquidado | number:'1.2-2' }} / 
              Q{{ resumenLiquidacion().monto_factura | number:'1.2-2' }}
            </span>
          </div>
          
          <!-- Botón agregar -->
          <button 
            *ngIf="puedeEditar()"
            (click)="abrirModalCrear()"
            class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
            title="Agregar detalle">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Contenido principal -->
      <div class="overflow-hidden">
        <!-- Sin factura -->
        <div *ngIf="!facturaActiva()" class="p-8 text-center">
          <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <p class="text-sm text-gray-600">Seleccione una factura para gestionar sus liquidaciones</p>
        </div>

        <!-- Loading -->
        <div *ngIf="estadoCarga() && facturaActiva()" class="p-8 text-center">
          <div class="inline-flex items-center gap-2 text-gray-500">
            <div class="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            <span class="text-sm">Cargando detalles...</span>
          </div>
        </div>

        <!-- Tabla de detalles -->
        <div *ngIf="!estadoCarga() && facturaActiva() && detalles().length > 0" class="overflow-x-auto">
          <table class="w-full text-sm">
            <!-- Header -->
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orden
                </th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agencia
                </th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Forma Pago
                </th>
                <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            
            <!-- Body -->
            <tbody class="bg-white divide-y divide-gray-100">
              <tr *ngFor="let detalle of detalles(); let i = index; trackBy: trackByDetalle"
                  class="hover:bg-gray-50 transition-colors">
                
                <!-- Número de orden -->
                <td class="px-3 py-3">
                  <span class="font-medium text-gray-900">#{{ detalle.numero_orden }}</span>
                </td>
                
                <!-- Agencia (editable inline) -->
                <td class="px-3 py-3">
                  <div class="min-w-0">
                    <span *ngIf="!detalle._editandoAgencia; else editandoAgencia"
                          class="cursor-pointer hover:text-blue-600 transition-colors truncate block"
                          (click)="iniciarEdicionAgencia(i)"
                          [title]="detalle.agencia">
                      {{ detalle.agencia || 'Sin asignar' }}
                    </span>
                    
                    <ng-template #editandoAgencia>
                      <select 
                        [(ngModel)]="detalle._agenciaTemp"
                        (blur)="guardarAgencia(i)"
                        (keydown.enter)="guardarAgencia(i)"
                        (keydown.escape)="cancelarEdicionAgencia(i)"
                        class="w-full text-xs border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="">Seleccionar...</option>
                        <option *ngFor="let agencia of agencias(); trackBy: trackByAgencia" 
                                [value]="agencia.nombre_liquidacion">
                          {{ agencia.nombre_liquidacion }}
                        </option>
                      </select>
                    </ng-template>
                  </div>
                </td>
                
                <!-- Descripción -->
                <td class="px-3 py-3">
                  <div class="max-w-xs">
                    <p class="truncate text-gray-900" [title]="detalle.descripcion">
                      {{ detalle.descripcion }}
                    </p>
                    <p *ngIf="detalle.correo_proveedor" class="text-xs text-gray-500 truncate">
                      {{ detalle.correo_proveedor }}
                    </p>
                  </div>
                </td>
                
                <!-- Monto (editable inline) -->
                <td class="px-3 py-3 text-right">
                  <div class="min-w-0">
                    <span *ngIf="!detalle._editandoMonto; else editandoMonto"
                          class="cursor-pointer hover:text-blue-600 font-medium transition-colors"
                          (click)="iniciarEdicionMonto(i)">
                      Q{{ detalle.monto | number:'1.2-2' }}
                    </span>
                    
                    <ng-template #editandoMonto>
                      <input 
                        type="number"
                        step="0.01"
                        min="0.01"
                        [(ngModel)]="detalle._montoTemp"
                        (blur)="guardarMonto(i)"
                        (keydown.enter)="guardarMonto(i)"
                        (keydown.escape)="cancelarEdicionMonto(i)"
                        class="w-20 text-xs text-right border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    </ng-template>
                  </div>
                </td>
                
                <!-- Forma de pago -->
                <td class="px-3 py-3 text-center">
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        [ngClass]="obtenerClaseTipoPago(detalle.forma_pago)">
                    {{ obtenerTextoTipoPago(detalle.forma_pago) }}
                  </span>
                </td>
                
                <!-- Acciones -->
                <td class="px-3 py-3">
                  <div class="flex items-center justify-center gap-1">
                    <!-- Ver detalle completo -->
                    <button 
                      (click)="verDetalleCompleto(detalle)"
                      class="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Ver detalle completo">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                    </button>
                    
                    <!-- Editar -->
                    <button 
                      *ngIf="puedeEditar()"
                      (click)="abrirModalEditar(detalle)"
                      class="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                      title="Editar detalle">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                    
                    <!-- Copiar -->
                    <button 
                      *ngIf="puedeEditar()"
                      (click)="copiarDetalle(detalle)"
                      class="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="Copiar detalle">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                      </svg>
                    </button>
                    
                    <!-- Eliminar -->
                    <button 
                      *ngIf="puedeEditar()"
                      (click)="confirmarEliminacion(detalle)"
                      class="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar detalle">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Sin detalles -->
        <div *ngIf="!estadoCarga() && facturaActiva() && detalles().length === 0" class="p-8 text-center">
          <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <p class="text-sm text-gray-600 mb-3">No hay detalles de liquidación</p>
          <button 
            *ngIf="puedeEditar()"
            (click)="abrirModalCrear()"
            class="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Agregar primer detalle
          </button>
        </div>
      </div>

      <!-- Footer con resumen -->
      <div *ngIf="facturaActiva() && detalles().length > 0" 
           class="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div class="flex justify-between items-center text-sm">
          <div class="flex items-center gap-4">
            <span class="text-gray-600">
              {{ resumenLiquidacion().cantidad_detalles }} {{ resumenLiquidacion().cantidad_detalles === 1 ? 'detalle' : 'detalles' }}
            </span>
            <span class="font-medium" [ngClass]="obtenerClaseEstado()">
              Total: Q{{ resumenLiquidacion().total_liquidado | number:'1.2-2' }}
            </span>
          </div>
          
          <div class="flex items-center gap-2">
            <!-- Badge de estado -->
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                  [ngClass]="obtenerClaseEstadoMonto()">
              {{ obtenerTextoEstadoMonto() }}
            </span>
            
            <!-- Botón guardar todo -->
            <button 
              *ngIf="puedeEditar() && tieneDetallesSinGuardar()"
              (click)="guardarTodosLosDetalles()"
              [disabled]="guardandoDetalle()"
              class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-md transition-colors">
              <svg *ngIf="!guardandoDetalle()" class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <svg *ngIf="guardandoDetalle()" class="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ guardandoDetalle() ? 'Guardando...' : 'Guardar Todo' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Modales -->
      <app-modal-detalle-liquidacion
        *ngIf="mostrarModalDetalle()"
        [visible]="mostrarModalDetalle()"
        [modo]="modoModal()"
        [detalle]="detalleEnEdicion()"
        (cerrar)="cerrarModalDetalle()"
        (guardar)="onDetalleGuardado($event)">
      </app-modal-detalle-liquidacion>

      <app-modal-confirmar-accion
        *ngIf="mostrarModalConfirmacion()"
        [titulo]="'Confirmar eliminación'"
        [mensaje]="'¿Está seguro de eliminar este detalle? Esta acción no se puede deshacer.'"
        [textoConfirmar]="'Eliminar'"
        [tipoConfirmar]="'danger'"
        (confirmar)="ejecutarEliminacion()"
        (cancelar)="cancelarEliminacion()">
      </app-modal-confirmar-accion>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    /* Animaciones suaves */
    .transition-colors {
      transition-property: color, background-color, border-color;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      transition-duration: 150ms;
    }
    
    /* Tabla responsive */
    @media (max-width: 768px) {
      table {
        font-size: 0.75rem;
      }
      
      .px-3 {
        padding-left: 0.5rem;
        padding-right: 0.5rem;
      }
    }
    
    /* Estados hover */
    tbody tr:hover {
      background-color: #f9fafb;
    }
    
    /* Inputs inline */
    input[type="number"] {
      -moz-appearance: textfield;
    }
    
    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  `]
})
export class LiquidacionesSectionComponent implements OnInit, OnDestroy {

  // ============================================================================
  // DEPENDENCIAS Y INPUTS/OUTPUTS
  // ============================================================================

  private readonly servicio = inject(PlanEmpresarialService);

  // Inputs
  readonly facturaActiva = input<FacturaPE | null>(null);
  readonly estadoCarga = input<boolean>(false);
  readonly guardandoDetalle = input<boolean>(false);
  readonly resumenLiquidacion = input<ResumenLiquidacion | null>(null);
  readonly puedeEditar = input<boolean>(false);

  // Outputs
  readonly guardarDetalle = output<GuardarDetalleLiquidacionPayload>();
  readonly eliminarDetalle = output<number>();
  readonly copiarDetalle = output<number>();
  readonly actualizarDetalle = output<{ id: number, campo: 'monto' | 'agencia', valor: any }>();

  // ============================================================================
  // SIGNALS DE ESTADO LOCAL
  // ============================================================================

  private readonly _mostrarModalDetalle = signal(false);
  private readonly _modoModal = signal<'crear' | 'editar'>('crear');
  private readonly _detalleEnEdicion = signal<DetalleLiquidacionPE | null>(null);
  private readonly _mostrarModalConfirmacion = signal(false);
  private readonly _detalleAEliminar = signal<DetalleLiquidacionPE | null>(null);

  // ============================================================================
  // COMPUTED SIGNALS
  // ============================================================================

  readonly detalles = computed(() => this.servicio.detallesLiquidacion());
  readonly agencias = computed(() => this.servicio.agencias());
  readonly tiposPago = computed(() => this.servicio.tiposPago());

  readonly mostrarModalDetalle = this._mostrarModalDetalle.asReadonly();
  readonly modoModal = this._modoModal.asReadonly();
  readonly detalleEnEdicion = this._detalleEnEdicion.asReadonly();
  readonly mostrarModalConfirmacion = this._mostrarModalConfirmacion.asReadonly();

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  ngOnInit(): void {
    // La inicialización se maneja a través del servicio
  }

  ngOnDestroy(): void {
    // La limpieza se maneja automáticamente con takeUntilDestroyed
  }

  // ============================================================================
  // GESTIÓN DE MODALES
  // ============================================================================

  abrirModalCrear(): void {
    this._detalleEnEdicion.set(null);
    this._modoModal.set('crear');
    this._mostrarModalDetalle.set(true);
  }

  abrirModalEditar(detalle: DetalleLiquidacionPE): void {
    this._detalleEnEdicion.set({ ...detalle });
    this._modoModal.set('editar');
    this._mostrarModalDetalle.set(true);
  }

  cerrarModalDetalle(): void {
    this._mostrarModalDetalle.set(false);
    this._detalleEnEdicion.set(null);
  }

  confirmarEliminacion(detalle: DetalleLiquidacionPE): void {
    this._detalleAEliminar.set(detalle);
    this._mostrarModalConfirmacion.set(true);
  }

  ejecutarEliminacion(): void {
    const detalle = this._detalleAEliminar();
    if (detalle?.id) {
      this.eliminarDetalle.emit(detalle.id);
    }
    this.cancelarEliminacion();
  }

  cancelarEliminacion(): void {
    this._mostrarModalConfirmacion.set(false);
    this._detalleAEliminar.set(null);
  }

  // ============================================================================
  // EDICIÓN INLINE
  // ============================================================================

  iniciarEdicionAgencia(index: number): void {
    if (!this.puedeEditar()) return;

    const detalles = this.detalles();
    const detalle = detalles[index];
    if (detalle) {
      this.cancelarTodasLasEdiciones();
      detalle._editandoAgencia = true;
      detalle._agenciaTemp = detalle.agencia;
    }
  }

  guardarAgencia(index: number): void {
    const detalles = this.detalles();
    const detalle = detalles[index];
    if (!detalle || !detalle._editandoAgencia) return;

    const nuevaAgencia = detalle._agenciaTemp?.trim();
    if (!nuevaAgencia) {
      this.servicio.mostrarMensaje('error', 'Debe seleccionar una agencia');
      return;
    }

    if (nuevaAgencia === detalle.agencia) {
      this.cancelarEdicionAgencia(index);
      return;
    }

    if (detalle.id) {
      this.actualizarDetalle.emit({
        id: detalle.id,
        campo: 'agencia',
        valor: nuevaAgencia
      });
    }

    detalle.agencia = nuevaAgencia;
    this.cancelarEdicionAgencia(index);
  }

  cancelarEdicionAgencia(index: number): void {
    const detalles = this.detalles();
    const detalle = detalles[index];
    if (detalle) {
      detalle._editandoAgencia = false;
      delete detalle._agenciaTemp;
    }
  }

  iniciarEdicionMonto(index: number): void {
    if (!this.puedeEditar()) return;

    const detalles = this.detalles();
    const detalle = detalles[index];
    if (detalle) {
      this.cancelarTodasLasEdiciones();
      detalle._editandoMonto = true;
      detalle._montoTemp = detalle.monto;
    }
  }

  guardarMonto(index: number): void {
    const detalles = this.detalles();
    const detalle = detalles[index];
    if (!detalle || !detalle._editandoMonto) return;

    const nuevoMonto = parseFloat(String(detalle._montoTemp || 0));

    if (isNaN(nuevoMonto) || nuevoMonto <= 0) {
      this.servicio.mostrarMensaje('error', 'El monto debe ser mayor a 0');
      return;
    }

    if (nuevoMonto === detalle.monto) {
      this.cancelarEdicionMonto(index);
      return;
    }

    // Validar monto con el servicio
    const validacion = this.servicio.validarMonto(detalle.id || null, nuevoMonto);
    if (!validacion.es_valido) {
      this.servicio.mostrarMensaje('error', validacion.mensaje || 'Monto inválido');
      return;
    }

    if (detalle.id) {
      this.actualizarDetalle.emit({
        id: detalle.id,
        campo: 'monto',
        valor: nuevoMonto
      });
    }

    detalle.monto = nuevoMonto;
    this.cancelarEdicionMonto(index);
  }

  cancelarEdicionMonto(index: number): void {
    const detalles = this.detalles();
    const detalle = detalles[index];
    if (detalle) {
      detalle._editandoMonto = false;
      delete detalle._montoTemp;
    }
  }

  private cancelarTodasLasEdiciones(): void {
    const detalles = this.detalles();
    detalles.forEach(detalle => {
      if (detalle._editandoMonto) {
        detalle._editandoMonto = false;
        delete detalle._montoTemp;
      }
      if (detalle._editandoAgencia) {
        detalle._editandoAgencia = false;
        delete detalle._agenciaTemp;
      }
    });
  }

  // ============================================================================
  // ACCIONES PRINCIPALES
  // ============================================================================

  verDetalleCompleto(detalle: DetalleLiquidacionPE): void {
    if (!detalle.id) return;

    this.servicio.obtenerDetalleCompleto(detalle.id).subscribe({
      next: (response) => {
        if (response.respuesta === 'success' && response.datos) {
          this.mostrarDetalleCompleto(response.datos);
        } else {
          this.servicio.mostrarMensaje('error', 'No se pudo obtener el detalle completo');
        }
      },
      error: () => {
        this.servicio.mostrarMensaje('error', 'Error al obtener el detalle');
      }
    });
  }

  copiarDetalle(detalle: DetalleLiquidacionPE): void {
    if (detalle.id) {
      this.copiarDetalle.emit(detalle.id);
    }
  }

  guardarTodosLosDetalles(): void {
    // Implementar lógica para guardar todos los detalles pendientes
    this.servicio.guardarTodosLosDetalles().subscribe();
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  onDetalleGuardado(payload: GuardarDetalleLiquidacionPayload): void {
    this.guardarDetalle.emit(payload);
    this.cerrarModalDetalle();
  }

  // ============================================================================
  // UTILIDADES DE UI
  // ============================================================================

  obtenerClaseEstado(): string {
    const resumen = this.resumenLiquidacion();
    if (!resumen) return 'text-gray-600';

    switch (resumen.estado_monto) {
      case 'completo':
        return 'text-green-600';
      case 'excedido':
        return 'text-red-600';
      default:
        return 'text-amber-600';
    }
  }

  obtenerClaseEstadoMonto(): string {
    const resumen = this.resumenLiquidacion();
    if (!resumen) return 'bg-gray-100 text-gray-800';

    switch (resumen.estado_monto) {
      case 'completo':
        return 'bg-green-100 text-green-800';
      case 'excedido':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-amber-100 text-amber-800';
    }
  }

  obtenerTextoEstadoMonto(): string {
    const resumen = this.resumenLiquidacion();
    if (!resumen) return 'Sin datos';

    switch (resumen.estado_monto) {
      case 'completo':
        return 'Completo';
      case 'excedido':
        return 'Excedido';
      default:
        return 'Pendiente';
    }
  }

  obtenerClaseTipoPago(tipoPago: TipoPagoId): string {
    const clases = {
      'deposito': 'bg-blue-100 text-blue-800',
      'transferencia': 'bg-green-100 text-green-800',
      'cheque': 'bg-purple-100 text-purple-800',
      'tarjeta': 'bg-yellow-100 text-yellow-800',
      'anticipo': 'bg-orange-100 text-orange-800'
    };
    return clases[tipoPago] || 'bg-gray-100 text-gray-800';
  }

  obtenerTextoTipoPago(tipoPago: TipoPagoId): string {
    const tiposPago = this.tiposPago();
    const tipo = tiposPago.find(t => t.id === tipoPago);
    return tipo?.nombre || tipoPago || 'Sin especificar';
  }

  tieneDetallesSinGuardar(): boolean {
    return this.detalles().some(detalle => !detalle.id);
  }

  private mostrarDetalleCompleto(detalleCompleto: any): void {
    // Implementar modal o popup para mostrar detalle completo
    // Por ahora, usar alert simple
    const tipoPago = this.obtenerTextoTipoPago(detalleCompleto.forma_pago);
    const mensaje = `
Detalle #${detalleCompleto.id}
Orden: ${detalleCompleto.numero_orden}
Agencia: ${detalleCompleto.agencia}
Monto: Q${detalleCompleto.monto}
Forma de pago: ${tipoPago}
Descripción: ${detalleCompleto.descripcion}
    `.trim();

    alert(mensaje); // Temporal, reemplazar con modal elegante
  }

  // ============================================================================
  // TRACK BY FUNCTIONS
  // ============================================================================

  trackByDetalle(index: number, detalle: DetalleLiquidacionPE): any {
    return detalle.id || index;
  }

  trackByAgencia(index: number, agencia: any): any {
    return agencia.id || index;
  }
}