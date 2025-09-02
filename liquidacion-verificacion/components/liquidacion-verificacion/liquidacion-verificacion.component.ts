// ============================================================================
// COMPONENTE PRINCIPAL - SISTEMA DE LIQUIDACIÓN
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { LiquidacionService } from '../../services/liquidacion-verificacion.service';
import { FacturaPendiente, DetalleConOrden, Agencia } from '../../models/liquidacion-verificacion.models';
import { formatearMonto, formatearFecha } from '../../utils/format.utils';

// Componentes
import { ModalSolicitarCambioComponent } from '../modal-solicitar-cambio/modal-solicitar-cambio.component';
import { ModalVerCambiosComponent } from '../modal-ver-cambios/modal-ver-cambios.component';
import { ModalComprobanteComponent } from '../modal-comprobante/modal-comprobante.component';

@Component({
  selector: 'app-liquidacion-verificacion',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalSolicitarCambioComponent,
    ModalVerCambiosComponent,
    ModalComprobanteComponent
  ],
  template: `
    <div class="p-6 max-w-full mx-auto space-y-6">

      <!-- Header -->
      <div class="bg-white rounded-lg shadow border p-6">
        <div class="flex justify-between items-center mb-4">
          <h1 class="text-2xl font-bold text-gray-900">
            Sistema de Liquidación
          </h1>
          
          <!-- Acciones Masivas -->
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-600">
              {{ detallesSeleccionados().length }} seleccionados
            </span>
            
            <button 
              *ngIf="detallesSeleccionados().length > 0"
              (click)="abrirModalComprobanteMasivo()"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" x2="8" y1="13" y2="13"/>
                <line x1="16" x2="8" y1="17" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
              Asignar Comprobante
            </button>
          </div>
        </div>

        <!-- Filtros -->
        <div class="flex gap-4 items-end">
          <div class="flex-1 max-w-md">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por DTE o Emisor
            </label>
            <input 
              type="text" 
              [formControl]="filtroControl" 
              placeholder="Buscar facturas..."
              class="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="cargando()" class="bg-white rounded-lg shadow border p-12 text-center">
        <div class="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p class="text-gray-600 mt-2">Cargando facturas...</p>
      </div>

      <!-- Lista de Facturas -->
      <div *ngIf="!cargando()" class="space-y-4">
        
        <!-- Factura -->
        <div 
          *ngFor="let factura of facturas(); trackBy: trackByFactura"
          class="bg-white rounded-lg shadow border overflow-hidden">
          
          <!-- Header de Factura -->
          <div class="px-6 py-4 bg-gray-50 border-b">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <!-- Checkbox Seleccionar Toda la Factura -->
                <input 
                  type="checkbox"
                  [checked]="todosDetallesSeleccionados(factura)"
                  [indeterminate]="algunosDetallesSeleccionados(factura)"
                  (change)="toggleFacturaCompleta(factura)"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">
                    DTE: {{ factura.numero_dte }}
                  </h3>
                  <p class="text-sm text-gray-600">{{ factura.nombre_emisor }}</p>
                </div>
              </div>

              <div class="flex items-center gap-4">
                <div class="text-right">
                  <div class="text-lg font-bold text-green-600">
                    {{ formatearMonto(factura.monto_total) }}
                  </div>
                  <div class="text-sm text-gray-500">
                    {{ formatearFecha(factura.fecha_emision) }}
                  </div>
                </div>
                
                <span class="px-3 py-1 rounded-full text-xs font-medium"
                  [ngClass]="obtenerColorEstadoLiquidacion(factura.estado_liquidacion)">
                  {{ factura.estado_liquidacion }}
                </span>
                
                <!-- Botón Expandir/Colapsar -->
                <button 
                  (click)="toggleExpandirFactura(factura.factura_id)"
                  class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <svg 
                    width="20" height="20" viewBox="0 0 24 24" fill="none" 
                    stroke="currentColor" stroke-width="2"
                    [class.rotate-180]="facturasExpandidas().has(factura.factura_id)">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                
                <!-- Botón Ver Retenciones -->
                <button 
                  (click)="verRetenciones(factura.numero_dte)"
                  class="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                  title="Ver retenciones">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect width="20" height="14" x="2" y="5" rx="2"/>
                    <line x1="2" x2="22" y1="10" y2="10"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Detalles (Expandibles) -->
          <div *ngIf="facturasExpandidas().has(factura.factura_id)" class="border-t">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 sticky top-0">
                  <tr>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 w-12">Sel</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700">Orden</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700">Descripción</th>
                    <th class="px-4 py-3 text-right font-medium text-gray-700">Monto</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700">Presupuesto</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700">Estado</th>
                    <th class="px-4 py-3 text-center font-medium text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  
                  <!-- Detalle -->
                  <tr 
                    *ngFor="let detalle of factura.detalles; trackBy: trackByDetalle"
                    class="hover:bg-gray-50"
                    [class.bg-green-50]="detalle.estado_verificacion === 'verificado'"
                    [class.bg-yellow-50]="detalle.tiene_cambios_pendientes">

                    <!-- Checkbox Individual -->
                    <td class="px-4 py-3">
                      <input 
                        type="checkbox"
                        [checked]="detallesSeleccionados().includes(detalle.detalle_id)"
                        (change)="toggleDetalleSeleccionado(detalle.detalle_id)"
                        class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    </td>

                    <!-- Número de Orden -->
                    <td class="px-4 py-3">
                      <div class="font-medium text-gray-900">#{{ detalle.numero_orden }}</div>
                      <div class="text-xs text-gray-500">{{ detalle.orden.area_nombre }}</div>
                      <div class="text-xs text-blue-600">
                        Liquid: {{ formatearMonto(detalle.orden.monto_liquidado) }}
                      </div>
                    </td>

                    <!-- Descripción -->
                    <td class="px-4 py-3">
                      <div class="max-w-xs">
                        <p class="text-gray-900 truncate" [title]="detalle.descripcion">
                          {{ detalle.descripcion }}
                        </p>
                        <div class="flex items-center gap-2 mt-1">
                          <span class="text-xs text-gray-500">{{ detalle.orden.tipo_presupuesto }}</span>
                          <span *ngIf="detalle.orden.total_anticipos > 0" 
                                class="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                            Ant: {{ formatearMonto(detalle.orden.total_anticipos) }}
                          </span>
                        </div>
                      </div>
                    </td>

                    <!-- Monto -->
                    <td class="px-4 py-3 text-right">
                      <div class="font-semibold text-gray-900">
                        {{ formatearMonto(detalle.monto) }}
                      </div>
                      <div class="text-xs text-gray-500">
                        Total Orden: {{ formatearMonto(detalle.orden.total) }}
                      </div>
                    </td>

                    <!-- Presupuesto -->
                    <td class="px-4 py-3">
                      <div class="text-sm">
                        <div class="font-medium">{{ detalle.orden.tipo_presupuesto }}</div>
                        <div class="text-xs text-gray-500">{{ detalle.orden.area_nombre }}</div>
                      </div>
                    </td>

                    <!-- Estado -->
                    <td class="px-4 py-3">
                      <div class="flex flex-col gap-1">
                        <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                          [ngClass]="obtenerColorEstadoVerificacion(detalle.estado_verificacion)">
                          {{ obtenerTextoEstadoVerificacion(detalle.estado_verificacion) }}
                        </span>
                        
                        <div *ngIf="detalle.comprobante_contabilidad" class="text-xs text-gray-600">
                          {{ detalle.comprobante_contabilidad }}
                        </div>
                        
                        <div *ngIf="detalle.agencia_gasto_nombre" class="text-xs text-blue-600">
                          {{ detalle.agencia_gasto_nombre }}
                        </div>
                        
                        <div *ngIf="detalle.cambios_pendientes_count > 0" 
                             class="flex items-center gap-1 text-xs text-orange-600">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" x2="12" y1="8" y2="12"/>
                            <line x1="12" x2="12.01" y1="16" y2="16"/>
                          </svg>
                          {{ detalle.cambios_pendientes_count }} cambios
                        </div>
                      </div>
                    </td>

                    <!-- Acciones -->
                    <td class="px-4 py-3">
                      <div class="flex items-center justify-center gap-1">
                        
                        <!-- Validar -->
                        <button 
                          (click)="validarDetalle(detalle)"
                          [disabled]="detalle.estado_verificacion === 'verificado'"
                          class="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Validar detalle">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </button>

                        <!-- Solicitar Cambios -->
                        <button 
                          (click)="abrirModalSolicitarCambio(detalle)"
                          class="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                          title="Solicitar cambios">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                          </svg>
                        </button>

                        <!-- Ver Cambios -->
                        <button 
                          (click)="abrirModalVerCambios(detalle)"
                          [disabled]="detalle.cambios_pendientes_count === 0"
                          class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed relative"
                          title="Ver cambios solicitados">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                          </svg>
                          <span 
                            *ngIf="detalle.cambios_pendientes_count > 0"
                            class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                            {{ detalle.cambios_pendientes_count }}
                          </span>
                        </button>

                        <!-- Comprobante Individual -->
                        <button 
                          (click)="abrirModalComprobanteIndividual(detalle)"
                          class="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                          title="Asignar comprobante">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>

                  <!-- Sin detalles -->
                  <tr *ngIf="factura.detalles.length === 0">
                    <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                      <div class="text-4xl mb-2">📋</div>
                      <p>Sin detalles de liquidación</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Sin facturas -->
        <div *ngIf="facturas().length === 0" class="bg-white rounded-lg shadow border p-12 text-center">
          <div class="text-gray-400 text-6xl mb-4">🏦</div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Sin facturas pendientes</h3>
          <p class="text-gray-600">No hay facturas pendientes de liquidación</p>
        </div>
      </div>

      <!-- Paginación -->
      <div *ngIf="paginacion() && paginacion()!.total_paginas > 1" 
           class="bg-white rounded-lg shadow border p-4">
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-700">
            Mostrando {{ (paginacion()!.pagina_actual - 1) * paginacion()!.limite + 1 }} - 
            {{ Math.min(paginacion()!.pagina_actual * paginacion()!.limite, paginacion()!.total) }} 
            de {{ paginacion()!.total }} facturas
          </div>
          
          <div class="flex items-center gap-2">
            <button 
              (click)="cambiarPagina(paginacion()!.pagina_actual - 1)"
              [disabled]="paginacion()!.pagina_actual <= 1"
              class="px-3 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Anterior
            </button>
            
            <span class="px-3 py-1 bg-blue-50 text-blue-700 rounded-md">
              {{ paginacion()!.pagina_actual }} / {{ paginacion()!.total_paginas }}
            </span>
            
            <button 
              (click)="cambiarPagina(paginacion()!.pagina_actual + 1)"
              [disabled]="paginacion()!.pagina_actual >= paginacion()!.total_paginas"
              class="px-3 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <!-- Modales -->
      <app-modal-solicitar-cambio
        *ngIf="modalSolicitarCambio().visible"
        [detalle]="modalSolicitarCambio().detalle"
        (cerrar)="cerrarModalSolicitarCambio()"
        (confirmado)="confirmarSolicitudCambio($event)">
      </app-modal-solicitar-cambio>

      <app-modal-ver-cambios
        *ngIf="modalVerCambios().visible"
        [detalle]="modalVerCambios().detalle"
        (cerrar)="cerrarModalVerCambios()">
      </app-modal-ver-cambios>

      <app-modal-comprobante
        *ngIf="modalComprobante().visible"
        [modo]="modalComprobante().modo"
        [detalles]="modalComprobante().detalles"
        [agencias]="agencias()"
        (cerrar)="cerrarModalComprobante()"
        (confirmado)="confirmarAsignacionComprobante($event)">
      </app-modal-comprobante>
    </div>
  `
})
export class LiquidacionVerificacionComponent implements OnInit, OnDestroy {

  private readonly service = inject(LiquidacionService);
  private readonly destroy$ = new Subject<void>();

  // Estado principal
  readonly facturas = signal<FacturaPendiente[]>([]);
  readonly agencias = signal<Agencia[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly paginacion = signal<any>(null);

  // Estado de UI
  readonly facturasExpandidas = signal<Set<number>>(new Set());
  readonly detallesSeleccionados = signal<number[]>([]);

  // Modales
  readonly modalSolicitarCambio = signal<{ visible: boolean, detalle: DetalleConOrden | null }>({
    visible: false, detalle: null
  });
  readonly modalVerCambios = signal<{ visible: boolean, detalle: DetalleConOrden | null }>({
    visible: false, detalle: null
  });
  readonly modalComprobante = signal<{
    visible: boolean,
    modo: 'individual' | 'masivo',
    detalles: DetalleConOrden[]
  }>({
    visible: false, modo: 'individual', detalles: []
  });

  // Filtros
  readonly filtroControl = new FormControl('');

  // Paginación
  private paginaActual = 1;
  private readonly limite = 20;

  // Utilidades
  readonly formatearMonto = formatearMonto;
  readonly formatearFecha = formatearFecha;
  readonly Math = Math; // Hacer Math disponible en el template

  ngOnInit(): void {
    this.inicializarSuscripciones();
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // INICIALIZACIÓN
  // ============================================================================

  private inicializarSuscripciones(): void {
    // Filtro con debounce
    this.filtroControl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.paginaActual = 1;
        this.cargarFacturas();
      });

    // Suscripciones del servicio
    this.service.facturas$
      .pipe(takeUntil(this.destroy$))
      .subscribe(facturas => this.facturas.set(facturas));

    this.service.agencias$
      .pipe(takeUntil(this.destroy$))
      .subscribe(agencias => this.agencias.set(agencias));

    this.service.cargando$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cargando => this.cargando.set(cargando));

    this.service.paginacion$
      .pipe(takeUntil(this.destroy$))
      .subscribe(paginacion => this.paginacion.set(paginacion));
  }

  private cargarDatos(): void {
    this.service.cargarAgencias().subscribe();
    this.cargarFacturas();
  }

  private cargarFacturas(): void {
    this.service.cargarFacturasPendientes({
      limite: this.limite,
      offset: (this.paginaActual - 1) * this.limite,
      filtro: this.filtroControl.value || ''
    }).subscribe();
  }

  // ============================================================================
  // SELECCIÓN MÚLTIPLE
  // ============================================================================

  toggleDetalleSeleccionado(detalleId: number): void {
    const seleccionados = [...this.detallesSeleccionados()];
    const index = seleccionados.indexOf(detalleId);

    if (index > -1) {
      seleccionados.splice(index, 1);
    } else {
      seleccionados.push(detalleId);
    }

    this.detallesSeleccionados.set(seleccionados);
  }

  toggleFacturaCompleta(factura: FacturaPendiente): void {
    const todosSeleccionados = this.todosDetallesSeleccionados(factura);
    const detallesIds = factura.detalles.map(d => d.detalle_id);
    const seleccionadosActuales = [...this.detallesSeleccionados()];

    if (todosSeleccionados) {
      // Deseleccionar todos los de esta factura
      const nuevosSeleccionados = seleccionadosActuales.filter(id => !detallesIds.includes(id));
      this.detallesSeleccionados.set(nuevosSeleccionados);
    } else {
      // Seleccionar todos los de esta factura
      const idsNoSeleccionados = detallesIds.filter(id => !seleccionadosActuales.includes(id));
      this.detallesSeleccionados.set([...seleccionadosActuales, ...idsNoSeleccionados]);
    }
  }

  todosDetallesSeleccionados(factura: FacturaPendiente): boolean {
    const detallesIds = factura.detalles.map(d => d.detalle_id);
    const seleccionados = this.detallesSeleccionados();
    return detallesIds.length > 0 && detallesIds.every(id => seleccionados.includes(id));
  }

  algunosDetallesSeleccionados(factura: FacturaPendiente): boolean {
    const detallesIds = factura.detalles.map(d => d.detalle_id);
    const seleccionados = this.detallesSeleccionados();
    const algunosSeleccionados = detallesIds.some(id => seleccionados.includes(id));
    const todosSeleccionados = this.todosDetallesSeleccionados(factura);
    return algunosSeleccionados && !todosSeleccionados;
  }

  // ============================================================================
  // EXPANDIR/COLAPSAR FACTURAS
  // ============================================================================

  toggleExpandirFactura(facturaId: number): void {
    const expandidas = new Set(this.facturasExpandidas());

    if (expandidas.has(facturaId)) {
      expandidas.delete(facturaId);
    } else {
      expandidas.add(facturaId);
    }

    this.facturasExpandidas.set(expandidas);
  }

  // ============================================================================
  // ACCIONES DE DETALLES
  // ============================================================================

  validarDetalle(detalle: DetalleConOrden): void {
    if (confirm(`¿Validar el detalle de la orden #${detalle.numero_orden}?`)) {
      this.service.validarDetalle(detalle.detalle_id)
        .pipe(takeUntil(this.destroy$))
        .subscribe(success => {
          if (success) {
            this.cargarFacturas();
          }
        });
    }
  }

  // ============================================================================
  // MODALES
  // ============================================================================

  abrirModalSolicitarCambio(detalle: DetalleConOrden): void {
    this.modalSolicitarCambio.set({ visible: true, detalle });
  }

  cerrarModalSolicitarCambio(): void {
    this.modalSolicitarCambio.set({ visible: false, detalle: null });
  }

  confirmarSolicitudCambio(datos: any): void {
    const detalle = this.modalSolicitarCambio().detalle;
    if (!detalle) return;

    const payload = {
      detalle_id: detalle.detalle_id,
      ...datos
    };

    this.service.solicitarCambioDetalle(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe(success => {
        if (success) {
          this.cerrarModalSolicitarCambio();
          this.cargarFacturas();
        }
      });
  }

  abrirModalVerCambios(detalle: DetalleConOrden): void {
    this.modalVerCambios.set({ visible: true, detalle });
  }

  cerrarModalVerCambios(): void {
    this.modalVerCambios.set({ visible: false, detalle: null });
  }

  abrirModalComprobanteIndividual(detalle: DetalleConOrden): void {
    this.modalComprobante.set({
      visible: true,
      modo: 'individual',
      detalles: [detalle]
    });
  }

  abrirModalComprobanteMasivo(): void {
    const seleccionados = this.detallesSeleccionados();
    if (seleccionados.length === 0) return;

    const detalles = this.facturas()
      .flatMap(f => f.detalles)
      .filter(d => seleccionados.includes(d.detalle_id));

    this.modalComprobante.set({
      visible: true,
      modo: 'masivo',
      detalles
    });
  }

  cerrarModalComprobante(): void {
    this.modalComprobante.set({
      visible: false,
      modo: 'individual',
      detalles: []
    });
  }

  confirmarAsignacionComprobante(datos: any): void {
    const modal = this.modalComprobante();

    if (modal.modo === 'individual') {
      const payload = {
        detalle_id: modal.detalles[0].detalle_id,
        ...datos
      };

      this.service.asignarComprobanteDetalle(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe(success => {
          if (success) {
            this.cerrarModalComprobante();
            this.cargarFacturas();
          }
        });
    } else {
      const payload = {
        detalles_ids: modal.detalles.map(d => d.detalle_id),
        ...datos
      };

      this.service.asignarComprobanteMasivo(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe(success => {
          if (success) {
            this.detallesSeleccionados.set([]);
            this.cerrarModalComprobante();
            this.cargarFacturas();
          }
        });
    }
  }

  // ============================================================================
  // RETENCIONES
  // ============================================================================

  verRetenciones(numeroFactura: string): void {
    this.service.obtenerRetencionesFactura(numeroFactura)
      .pipe(takeUntil(this.destroy$))
      .subscribe(retenciones => {
        // Mostrar SweetAlert con las retenciones
        this.mostrarRetencionesSweetAlert(retenciones, numeroFactura);
      });
  }

  private mostrarRetencionesSweetAlert(retenciones: any[], numeroFactura: string): void {
    if (retenciones.length === 0) {
      // TODO: Implementar SweetAlert
      alert(`La factura ${numeroFactura} no tiene retenciones aplicadas.`);
      return;
    }

    const retencionesHtml = retenciones.map(ret => `
      <div class="text-left p-2 border-b">
        <strong>${ret.tipo_nombre} (${ret.tipo_codigo})</strong><br>
        <span class="text-sm">No. ${ret.numero_retencion}</span><br>
        <span class="text-lg font-bold text-red-600">${this.formatearMonto(ret.monto)}</span>
        ${ret.porcentaje ? `<span class="text-sm"> (${ret.porcentaje}%)</span>` : ''}
      </div>
    `).join('');

    const total = retenciones.reduce((sum, ret) => sum + ret.monto, 0);

    // TODO: Implementar SweetAlert con HTML personalizado
    alert(`Retenciones de la factura ${numeroFactura}:\n\n${retenciones.map(r =>
      `${r.tipo_nombre}: ${this.formatearMonto(r.monto)}`
    ).join('\n')}\n\nTotal: ${this.formatearMonto(total)}`);
  }

  // ============================================================================
  // PAGINACIÓN
  // ============================================================================

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina < 1) return;
    const pag = this.paginacion();
    if (pag && nuevaPagina > pag.total_paginas) return;

    this.paginaActual = nuevaPagina;
    this.cargarFacturas();
  }

  // ============================================================================
  // UTILIDADES DE ESTILO
  // ============================================================================

  obtenerColorEstadoLiquidacion(estado: string): string {
    const colores: Record<string, string> = {
      'Pendiente': 'bg-yellow-100 text-yellow-800',
      'Verificado': 'bg-blue-100 text-blue-800',
      'Liquidado': 'bg-green-100 text-green-800',
      'Pagado': 'bg-gray-100 text-gray-800'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800';
  }

  obtenerColorEstadoVerificacion(estado: string): string {
    const colores: Record<string, string> = {
      'pendiente': 'bg-yellow-100 text-yellow-800',
      'verificado': 'bg-green-100 text-green-800',
      'rechazado': 'bg-red-100 text-red-800'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800';
  }

  obtenerTextoEstadoVerificacion(estado: string): string {
    const textos: Record<string, string> = {
      'pendiente': 'Pendiente',
      'verificado': 'Verificado',
      'rechazado': 'Rechazado'
    };
    return textos[estado] || estado;
  }

  // ============================================================================
  // TRACK BY FUNCTIONS
  // ============================================================================

  trackByFactura(index: number, factura: FacturaPendiente): number {
    return factura.factura_id;
  }

  trackByDetalle(index: number, detalle: DetalleConOrden): number {
    return detalle.detalle_id;
  }
}