// ============================================================================
// COMPONENTE PRINCIPAL UNIFICADO - PLAN EMPRESARIAL
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { PlanEmpresarialService } from './services/plan-empresarial.service';
import {
    FacturaPE,
    OrdenPlanEmpresarial,
    DetalleLiquidacionPE,
    AnticipoPendientePE,
    EstadoLiquidacion,
    TipoAnticipo
} from './models/plan-empresarial.models';

// Componentes modales
import { ModalRegistrarFacturaComponent } from './components/modal-registrar-factura.component';
import { ModalAutorizacionComponent } from './components/modal-autorizacion.component';
import { ModalDetalleLiquidacionComponent } from './components/modal-detalle-liquidacion.component';
import { ModalAnticiposComponent } from './components/modal-anticipos.component';

@Component({
    selector: 'app-plan-empresarial',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ModalRegistrarFacturaComponent,
        ModalAutorizacionComponent,
        ModalDetalleLiquidacionComponent,
        ModalAnticiposComponent
    ],
    template: `
    <div class="p-6 max-w-full mx-auto space-y-6">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <h1 class="text-2xl font-bold text-gray-900">
          Plan Empresarial
        </h1>
        <div class="flex items-center gap-3">
          <button 
            (click)="abrirRegistrarFactura()"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">
            Registrar Factura
          </button>
          <button 
            (click)="refrescar()"
            class="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Panel Superior: Órdenes y Búsqueda de Facturas -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Órdenes -->
        <div class="bg-white rounded-lg shadow border overflow-hidden">
          <div class="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
            <h2 class="text-lg font-medium text-gray-900">Órdenes Autorizadas</h2>
            <span class="text-sm text-gray-500">{{ ordenes().length }} órdenes</span>
          </div>
          
          <div *ngIf="cargandoOrdenes()" class="p-8 text-center">
            <div class="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p class="text-gray-600 text-sm">Cargando órdenes...</p>
          </div>

          <div *ngIf="!cargandoOrdenes() && ordenes().length === 0" class="p-8 text-center">
            <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-gray-400">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <p class="text-gray-600">No hay órdenes disponibles</p>
          </div>

          <div *ngIf="!cargandoOrdenes() && ordenes().length > 0" class="max-h-80 overflow-y-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 sticky top-0">
                <tr class="border-b">
                  <th class="px-4 py-2 text-left font-medium text-gray-700">Orden</th>
                  <th class="px-4 py-2 text-right font-medium text-gray-700">Total</th>
                  <th class="px-4 py-2 text-right font-medium text-gray-700">Pendiente</th>
                  <th class="px-4 py-2 text-center font-medium text-gray-700">Anticipos</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr *ngFor="let orden of ordenes(); trackBy: trackByOrden" 
                    class="hover:bg-gray-50 transition-colors">
                  <td class="px-4 py-3">
                    <div>
                      <span class="font-medium text-gray-900">#{{ orden.numeroOrden }}</span>
                      <div *ngIf="orden.area || orden.presupuesto" class="text-xs text-gray-500 mt-1">
                        <span *ngIf="orden.area">{{ orden.area }}</span>
                        <span *ngIf="orden.area && orden.presupuesto"> • </span>
                        <span *ngIf="orden.presupuesto">{{ orden.presupuesto }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-right font-medium text-gray-900">
                    {{ formatearMonto(orden.total) }}
                  </td>
                  <td class="px-4 py-3 text-right">
                    <span *ngIf="orden.montoPendiente > 0" 
                          class="inline-flex px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                      {{ formatearMonto(orden.montoPendiente) }}
                    </span>
                    <span *ngIf="orden.montoPendiente <= 0" 
                          class="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      Completo
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <button *ngIf="orden.anticiposPendientesOTardios > 0"
                            (click)="abrirAnticipos(orden.numeroOrden)"
                            class="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-full transition-colors">
                      {{ orden.anticiposPendientesOTardios }}
                    </button>
                    <span *ngIf="orden.anticiposPendientesOTardios === 0" 
                          class="inline-flex items-center justify-center w-6 h-6 text-xs text-gray-400 bg-gray-100 rounded-full">
                      -
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Búsqueda y Detalle de Factura -->
        <div class="bg-white rounded-lg shadow border overflow-hidden">
          <div class="px-4 py-3 border-b bg-gray-50">
            <h2 class="text-lg font-medium text-gray-900">Detalle de Factura</h2>
          </div>
          
          <!-- Buscador -->
          <div class="p-4 border-b">
            <div class="flex gap-2">
              <input 
                [formControl]="searchControl"
                type="search" 
                placeholder="Buscar por número DTE..."
                class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              <button 
                (click)="buscarManual()"
                class="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                Buscar
              </button>
            </div>
          </div>

          <!-- Estado de carga -->
          <div *ngIf="cargandoFactura()" class="p-8 text-center">
            <div class="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p class="text-gray-600 text-sm">Buscando factura...</p>
          </div>

          <!-- Sin factura -->
          <div *ngIf="!cargandoFactura() && !facturaActual()" class="p-8 text-center">
            <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-gray-400">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
            </div>
            <p class="text-gray-600">Busque una factura para ver su detalle</p>
          </div>

          <!-- Detalle de factura -->
          <div *ngIf="facturaActual() as factura" class="p-4 space-y-4">
            <!-- Badges de estado -->
            <div class="flex flex-wrap gap-2">
              <span class="px-2 py-1 text-xs font-medium rounded-full" 
                    [ngClass]="obtenerColorEstado(factura.estado_liquidacion || 'Pendiente')">
                {{ factura.estado_liquidacion || 'Pendiente' }}
              </span>
              <span *ngIf="validacionVencimiento()" 
                    class="px-2 py-1 text-xs font-medium rounded-full"
                    [ngClass]="validacionVencimiento()!.excedeDias ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'">
                {{ validacionVencimiento()!.excedeDias ? 'Fuera de tiempo' : 'Dentro de tiempo' }}
                ({{ validacionVencimiento()!.diasTranscurridos }} días)
              </span>
              <span *ngIf="factura.estado_autorizacion && factura.estado_autorizacion !== 'ninguna'"
                    class="px-2 py-1 text-xs font-medium rounded-full capitalize"
                    [ngClass]="obtenerColorAutorizacion(factura.estado_autorizacion)">
                {{ factura.estado_autorizacion }}
              </span>
            </div>

            <!-- Información básica -->
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-gray-500">Número DTE:</span>
                <p class="font-medium">{{ factura.numero_dte }}</p>
              </div>
              <div>
                <span class="text-gray-500">Fecha:</span>
                <p class="font-medium">{{ formatearFecha(factura.fecha_emision) }}</p>
              </div>
              <div>
                <span class="text-gray-500">Emisor:</span>
                <p class="font-medium">{{ factura.nombre_emisor }}</p>
              </div>
              <div>
                <span class="text-gray-500">Monto:</span>
                <p class="font-medium">{{ formatearMonto(factura.monto_total) }}</p>
              </div>
            </div>

            <!-- Acciones -->
            <div class="flex gap-2 pt-2">
              <button *ngIf="puedeLiquidar(factura)"
                      (click)="iniciarLiquidacion()"
                      class="px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors">
                Liquidar
              </button>
              <button *ngIf="requiereAutorizacion(factura)"
                      (click)="abrirAutorizacion()"
                      class="px-3 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors">
                Solicitar Autorización
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Panel Inferior: Liquidaciones -->
      <div *ngIf="facturaActual()" class="bg-white rounded-lg shadow border overflow-hidden">
        <div class="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
          <h2 class="text-lg font-medium text-gray-900">Detalle de Liquidación</h2>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-500">
              {{ detalles().length }} registros • {{ formatearMonto(totalLiquidado()) }}
            </span>
            <button 
              (click)="agregarDetalle()"
              [disabled]="!puedeEditarDetalles()"
              class="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50">
              Agregar
            </button>
          </div>
        </div>

        <!-- Estado de carga de detalles -->
        <div *ngIf="cargandoDetalles()" class="p-8 text-center">
          <div class="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p class="text-gray-600 text-sm">Cargando detalles...</p>
        </div>

        <!-- Tabla de detalles -->
        <div *ngIf="!cargandoDetalles()" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr class="border-b">
                <th class="px-4 py-3 text-left font-medium text-gray-700">Orden</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700">Agencia</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700">Descripción</th>
                <th class="px-4 py-3 text-right font-medium text-gray-700">Monto</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700">Forma Pago</th>
                <th class="px-4 py-3 text-center font-medium text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr *ngFor="let detalle of detalles(); let i = index; trackBy: trackByDetalle" 
                  class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 font-medium">#{{ detalle.numero_orden }}</td>
                <td class="px-4 py-3">
                  <span *ngIf="!detalle._editandoAgencia; else editAgencia" 
                        class="cursor-pointer hover:text-blue-600"
                        (click)="editarAgencia(i)">
                    {{ detalle.agencia || 'Sin especificar' }}
                  </span>
                  <ng-template #editAgencia>
                    <select 
                      [(ngModel)]="detalle._agenciaTemp"
                      (blur)="guardarAgencia(i)"
                      (keydown.enter)="guardarAgencia(i)"
                      (keydown.escape)="cancelarEdicionAgencia(i)"
                      class="w-full text-sm border rounded px-2 py-1">
                      <option value="">Seleccione agencia</option>
                      <option *ngFor="let agencia of agencias(); trackBy: trackByAgencia" 
                              [value]="agencia.nombre_liquidacion">
                        {{ agencia.nombre_liquidacion }}
                      </option>
                    </select>
                  </ng-template>
                </td>
                <td class="px-4 py-3">
                  <div class="max-w-xs truncate" [title]="detalle.descripcion">
                    {{ detalle.descripcion }}
                  </div>
                </td>
                <td class="px-4 py-3 text-right">
                  <span *ngIf="!detalle._editandoMonto; else editMonto" 
                        class="cursor-pointer hover:text-blue-600"
                        (click)="editarMonto(i)">
                    {{ formatearMonto(detalle.monto) }}
                  </span>
                  <ng-template #editMonto>
                    <input 
                      type="number" 
                      [(ngModel)]="detalle._montoTemp"
                      (blur)="guardarMonto(i)"
                      (keydown.enter)="guardarMonto(i)"
                      (keydown.escape)="cancelarEdicionMonto(i)"
                      class="w-20 text-sm border rounded px-2 py-1 text-right"
                      min="0" 
                      step="0.01">
                  </ng-template>
                </td>
                <td class="px-4 py-3">
                  <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                        [ngClass]="obtenerColorTipoPago(detalle.forma_pago)">
                    {{ obtenerTextoTipoPago(detalle.forma_pago) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-center gap-1">
                    <button 
                      (click)="editarDetalle(i)"
                      class="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Editar">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                      </svg>
                    </button>
                    <button 
                      (click)="copiarDetalle(i)"
                      class="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="Copiar">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                      </svg>
                    </button>
                    <button 
                      (click)="eliminarDetalle(i)"
                      class="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="detalles().length === 0">
                <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                  <div class="flex flex-col items-center gap-2">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-gray-400">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 16v-4"/>
                      <path d="M12 8h.01"/>
                    </svg>
                    <p>Sin registros de liquidación</p>
                    <p class="text-xs">Use "Agregar" para crear uno nuevo</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Resumen -->
        <div *ngIf="facturaActual()" class="px-4 py-3 border-t bg-gray-50">
          <div class="flex justify-between items-center text-sm">
            <span class="text-gray-600">
              {{ detalles().length }} {{ detalles().length === 1 ? 'registro' : 'registros' }}
            </span>
            <div class="flex items-center gap-4">
              <span class="text-gray-600">
                Total: {{ formatearMonto(totalLiquidado()) }} / {{ formatearMonto(facturaActual()!.monto_total) }}
              </span>
              <span class="px-2 py-1 text-xs font-medium rounded-full"
                    [ngClass]="obtenerColorEstadoMonto()">
                {{ obtenerTextoEstadoMonto() }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Modales -->
      <app-modal-registrar-factura 
        *ngIf="modales.registrarFactura()"
        (cerrar)="cerrarModalRegistrarFactura()"
        (facturaCreada)="onFacturaCreada($event)">
      </app-modal-registrar-factura>

      <app-modal-autorizacion 
        *ngIf="modales.autorizacion() && facturaActual()"
        [factura]="facturaActual()!"
        [validacion]="validacionVencimiento()"
        (cerrar)="cerrarModalAutorizacion()"
        (autorizada)="onAutorizacionSolicitada()">
      </app-modal-autorizacion>

      <app-modal-detalle-liquidacion 
        *ngIf="modales.detalleLiquidacion().visible"
        [modo]="modales.detalleLiquidacion().modo"
        [detalle]="modales.detalleLiquidacion().detalle"
        [factura]="facturaActual()"
        (cerrar)="cerrarModalDetalle()"
        (guardado)="onDetalleGuardado()">
      </app-modal-detalle-liquidacion>

      <app-modal-anticipos 
        *ngIf="modales.anticipos().visible"
        [numeroOrden]="modales.anticipos().numeroOrden"
        (cerrar)="cerrarModalAnticipos()"
        (solicitudEnviada)="onSolicitudEnviada()">
      </app-modal-anticipos>
    </div>
  `
})
export class PlanEmpresarialComponent implements OnInit, OnDestroy {
    private readonly service = inject(PlanEmpresarialService);
    private readonly destroy$ = new Subject<void>();

    // === ESTADO PRINCIPAL ===
    readonly ordenes = signal<OrdenPlanEmpresarial[]>([]);
    readonly cargandoOrdenes = signal<boolean>(false);
    readonly facturaActual = signal<FacturaPE | null>(null);
    readonly cargandoFactura = signal<boolean>(false);
    readonly detalles = signal<DetalleLiquidacionPE[]>([]);
    readonly cargandoDetalles = signal<boolean>(false);
    readonly agencias = signal<any[]>([]);
    readonly tiposPago = signal<any[]>([]);

    // === ESTADO DE MODALES ===
    readonly modales = {
        registrarFactura: signal<boolean>(false),
        autorizacion: signal<boolean>(false),
        detalleLiquidacion: signal<{ visible: boolean; modo: 'crear' | 'editar'; detalle: DetalleLiquidacionPE | null }>({
            visible: false, modo: 'crear', detalle: null
        }),
        anticipos: signal<{ visible: boolean; numeroOrden: number }>({
            visible: false, numeroOrden: 0
        })
    };

    // === VALIDACIÓN DE VENCIMIENTO ===
    readonly validacionVencimiento = signal<any>(null);

    // === CONTROLES ===
    readonly searchControl = new FormControl('');

    // === COMPUTED ===
    readonly totalLiquidado = computed(() =>
        this.detalles().reduce((sum, d) => sum + (d.monto || 0), 0)
    );

    readonly puedeEditarDetalles = computed(() => {
        const factura = this.facturaActual();
        return factura && factura.estado_id !== 2;
    });

    ngOnInit(): void {
        this.inicializarSuscripciones();
        this.cargarDatos();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private inicializarSuscripciones(): void {
        // Suscripciones al servicio
        this.service.ordenes$.pipe(takeUntil(this.destroy$))
            .subscribe(ordenes => this.ordenes.set(ordenes));

        this.service.cargandoOrdenes$.pipe(takeUntil(this.destroy$))
            .subscribe(cargando => this.cargandoOrdenes.set(cargando));

        this.service.facturaActual$.pipe(takeUntil(this.destroy$))
            .subscribe(factura => this.facturaActual.set(factura));

        this.service.cargandoFactura$.pipe(takeUntil(this.destroy$))
            .subscribe(cargando => this.cargandoFactura.set(cargando));

        this.service.detalles$.pipe(takeUntil(this.destroy$))
            .subscribe(detalles => this.detalles.set(detalles));

        this.service.cargandoDetalles$.pipe(takeUntil(this.destroy$))
            .subscribe(cargando => this.cargandoDetalles.set(cargando));

        this.service.agencias$.pipe(takeUntil(this.destroy$))
            .subscribe(agencias => this.agencias.set(agencias));

        this.service.tiposPago$.pipe(takeUntil(this.destroy$))
            .subscribe(tipos => this.tiposPago.set(tipos));

        // Búsqueda automática
        this.searchControl.valueChanges.pipe(
            debounceTime(1000),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe(termino => {
            if (termino && termino.length >= 3) {
                this.buscarFactura(termino);
            } else if (!termino) {
                this.limpiarFactura();
            }
        });
    }

    private cargarDatos(): void {
        this.service.cargarCatalogos().subscribe();
        this.service.cargarOrdenes().subscribe();
    }

    // === ACCIONES DE ÓRDENES ===
    abrirAnticipos(numeroOrden: number): void {
        this.modales.anticipos.set({ visible: true, numeroOrden });
    }

    // === ACCIONES DE FACTURAS ===
    buscarManual(): void {
        const termino = this.searchControl.value?.trim();
        if (termino) {
            this.buscarFactura(termino);
        }
    }

    private buscarFactura(numeroDte: string): void {
        this.service.buscarFactura(numeroDte).subscribe();
    }

    private limpiarFactura(): void {
        this.service.limpiarFactura();
    }

    abrirRegistrarFactura(): void {
        this.modales.registrarFactura.set(true);
    }

    abrirAutorizacion(): void {
        this.modales.autorizacion.set(true);
    }

    iniciarLiquidacion(): void {
        // Inicia el proceso de liquidación mostrando la sección de detalles
        // Ya está visible cuando hay factura cargada
    }

    // === ACCIONES DE DETALLES ===
    agregarDetalle(): void {
        this.modales.detalleLiquidacion.set({
            visible: true,
            modo: 'crear',
            detalle: null
        });
    }

    editarDetalle(index: number): void {
        const detalle = this.detalles()[index];
        if (detalle) {
            this.modales.detalleLiquidacion.set({
                visible: true,
                modo: 'editar',
                detalle: { ...detalle }
            });
        }
    }

    copiarDetalle(index: number): void {
        this.service.copiarDetalle(index).subscribe();
    }

    eliminarDetalle(index: number): void {
        this.service.eliminarDetalle(index).subscribe();
    }

    // === EDICIÓN INLINE ===
    editarAgencia(index: number): void {
        const detalles = this.detalles();
        const detalle = detalles[index];
        if (detalle && this.puedeEditarDetalles()) {
            detalle._editandoAgencia = true;
            detalle._agenciaTemp = detalle.agencia;
            this.detalles.set([...detalles]);
        }
    }

    guardarAgencia(index: number): void {
        const detalles = this.detalles();
        const detalle = detalles[index];
        if (detalle && detalle._editandoAgencia) {
            const nuevaAgencia = detalle._agenciaTemp?.trim();
            if (nuevaAgencia && nuevaAgencia !== detalle.agencia) {
                this.service.actualizarDetalle(index, { agencia: nuevaAgencia }).subscribe();
            }
            this.cancelarEdicionAgencia(index);
        }
    }

    cancelarEdicionAgencia(index: number): void {
        const detalles = this.detalles();
        const detalle = detalles[index];
        if (detalle) {
            detalle._editandoAgencia = false;
            delete detalle._agenciaTemp;
            this.detalles.set([...detalles]);
        }
    }

    editarMonto(index: number): void {
        const detalles = this.detalles();
        const detalle = detalles[index];
        if (detalle && this.puedeEditarDetalles()) {
            detalle._editandoMonto = true;
            detalle._montoTemp = detalle.monto;
            this.detalles.set([...detalles]);
        }
    }

    guardarMonto(index: number): void {
        const detalles = this.detalles();
        const detalle = detalles[index];
        if (detalle && detalle._editandoMonto) {
            const nuevoMonto = parseFloat(String(detalle._montoTemp || 0));
            if (nuevoMonto > 0 && nuevoMonto !== detalle.monto) {
                this.service.actualizarDetalle(index, { monto: nuevoMonto }).subscribe();
            }
            this.cancelarEdicionMonto(index);
        }
    }

    cancelarEdicionMonto(index: number): void {
        const detalles = this.detalles();
        const detalle = detalles[index];
        if (detalle) {
            detalle._editandoMonto = false;
            delete detalle._montoTemp;
            this.detalles.set([...detalles]);
        }
    }

    // === EVENTOS DE MODALES ===
    cerrarModalRegistrarFactura(): void {
        this.modales.registrarFactura.set(false);
    }

    onFacturaCreada(numeroDte: string): void {
        this.cerrarModalRegistrarFactura();
        this.searchControl.setValue(numeroDte);
        setTimeout(() => this.buscarFactura(numeroDte), 500);
    }

    cerrarModalAutorizacion(): void {
        this.modales.autorizacion.set(false);
    }

    onAutorizacionSolicitada(): void {
        this.cerrarModalAutorizacion();
        // Recargar factura después de solicitar autorización
        const numeroDte = this.facturaActual()?.numero_dte;
        if (numeroDte) {
            setTimeout(() => this.buscarFactura(numeroDte), 1000);
        }
    }

    cerrarModalDetalle(): void {
        this.modales.detalleLiquidacion.set({
            visible: false,
            modo: 'crear',
            detalle: null
        });
    }

    onDetalleGuardado(): void {
        this.cerrarModalDetalle();
        this.service.recargarDetalles().subscribe();
    }

    cerrarModalAnticipos(): void {
        this.modales.anticipos.set({ visible: false, numeroOrden: 0 });
    }

    onSolicitudEnviada(): void {
        // Recargar órdenes después de enviar solicitud
        this.service.cargarOrdenes().subscribe();
    }

    // === ACCIONES GENERALES ===
    refrescar(): void {
        this.service.cargarOrdenes().subscribe();
        this.service.cargarCatalogos().subscribe();

        const numeroDte = this.facturaActual()?.numero_dte;
        if (numeroDte) {
            this.buscarFactura(numeroDte);
        }
    }

    // === UTILIDADES DE VALIDACIÓN ===
    puedeLiquidar(factura: FacturaPE): boolean {
        if (factura.estado_liquidacion === 'Liquidado') return false;

        const validacion = this.validacionVencimiento();
        if (validacion?.requiereAutorizacion) {
            return factura.estado_autorizacion === 'aprobada';
        }

        return true;
    }

    requiereAutorizacion(factura: FacturaPE): boolean {
        const validacion = this.validacionVencimiento();
        return validacion?.requiereAutorizacion === true &&
            factura.estado_autorizacion !== 'aprobada';
    }

    // === UTILIDADES DE FORMATO ===
    formatearMonto(monto: number): string {
        return new Intl.NumberFormat('es-GT', {
            style: 'currency',
            currency: 'GTQ',
            minimumFractionDigits: 2
        }).format(monto);
    }

    formatearFecha(fecha: string): string {
        try {
            return new Date(fecha).toLocaleDateString('es-GT');
        } catch {
            return '-';
        }
    }

    // === UTILIDADES DE COLORES ===
    obtenerColorEstado(estado: string): string {
        const colores = {
            'Pendiente': 'bg-yellow-100 text-yellow-800',
            'En Revisión': 'bg-blue-100 text-blue-800',
            'Liquidado': 'bg-green-100 text-green-800'
        };
        return colores[estado as keyof typeof colores] || 'bg-gray-100 text-gray-800';
    }

    obtenerColorAutorizacion(estado: string): string {
        const colores = {
            'aprobada': 'bg-green-100 text-green-800',
            'pendiente': 'bg-amber-100 text-amber-800',
            'rechazada': 'bg-red-100 text-red-800'
        };
        return colores[estado as keyof typeof colores] || 'bg-gray-100 text-gray-800';
    }

    obtenerColorTipoPago(tipo: string): string {
        const colores = {
            'deposito': 'bg-blue-100 text-blue-800',
            'transferencia': 'bg-green-100 text-green-800',
            'cheque': 'bg-purple-100 text-purple-800',
            'tarjeta': 'bg-yellow-100 text-yellow-800',
            'anticipo': 'bg-orange-100 text-orange-800'
        };
        return colores[tipo as keyof typeof colores] || 'bg-gray-100 text-gray-800';
    }

    obtenerTextoTipoPago(tipo: string): string {
        const tipos = this.tiposPago();
        const tipoPago = tipos.find(t => t.id === tipo);
        return tipoPago?.nombre || tipo || 'Sin especificar';
    }

    obtenerColorEstadoMonto(): string {
        const factura = this.facturaActual();
        if (!factura) return 'bg-gray-100 text-gray-800';

        const total = this.totalLiquidado();
        const montoFactura = factura.monto_total;
        const diferencia = Math.abs(total - montoFactura);

        if (diferencia < 0.01) return 'bg-green-100 text-green-800';
        if (total > montoFactura) return 'bg-red-100 text-red-800';
        return 'bg-yellow-100 text-yellow-800';
    }

    obtenerTextoEstadoMonto(): string {
        const factura = this.facturaActual();
        if (!factura) return 'Sin datos';

        const total = this.totalLiquidado();
        const montoFactura = factura.monto_total;
        const diferencia = Math.abs(total - montoFactura);

        if (diferencia < 0.01) return 'Completo';
        if (total > montoFactura) return 'Excedido';
        return 'Incompleto';
    }

    // === TRACK BY FUNCTIONS ===
    trackByOrden = (index: number, orden: OrdenPlanEmpresarial) => orden.numeroOrden;
    trackByDetalle = (index: number, detalle: DetalleLiquidacionPE) => detalle.id || index;
    trackByAgencia = (index: number, agencia: any) => agencia.id;
}