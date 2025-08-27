// ============================================================================
// COMPONENTE PRINCIPAL - LIQUIDACIÓN Y VERIFICACIÓN
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// Componentes hijos
import { TablaDetallesVerificacionComponent } from '../tabla-detalles-verificacion/tabla-detalles-verificacion.component';
import { TablaRetencionesComponent } from '../tabla-retenciones/tabla-retenciones.component';
import { ResumenLiquidacionTotalComponent } from '../resumen-liquidacion-total/resumen-liquidacion-total.component';
import { ModalVerificarDetalleComponent } from '../modal-verificar-detalle/modal-verificar-detalle.component';
import { ModalRetencionComponent } from '../modal-retencion/modal-retencion.component';

// Servicios y modelos
import { LiquidacionVerificacionService } from '../../services/liquidacion-verificacion.service';
import {
  LiquidacionCompleta,
  DetalleLiquidacionVerificacion,
  RetencionFactura,
  TipoRetencion,
  formatearMonto,
  formatearFecha
} from '../../models/liquidacion-verificacion.models';

@Component({
  selector: 'app-liquidacion-verificacion',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TablaDetallesVerificacionComponent,
    TablaRetencionesComponent,
    ResumenLiquidacionTotalComponent,
    ModalVerificarDetalleComponent,
    ModalRetencionComponent
  ],
  template: `
    <div class="w-full min-h-screen bg-gray-50 dark:bg-gray-900">
      <div class="w-full mx-auto space-y-6 p-6">
        
        <!-- Header -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                Liquidación y Verificación
              </h1>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Gestione la verificación contable de liquidaciones y retenciones por factura
              </p>
            </div>
            
            <!-- Acciones principales -->
            <div class="flex items-center gap-3">
              <button 
                *ngIf="liquidacionActual()"
                (click)="exportarDatos()"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" x2="12" y1="15" y2="3"/>
                </svg>
                Exportar
              </button>
              
              <button 
                *ngIf="liquidacionActual()"
                (click)="recargarDatos()"
                [disabled]="loading()"
                class="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
                     [class.animate-spin]="loading()">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                </svg>
                Recargar
              </button>
            </div>
          </div>

          <!-- Búsqueda de Factura -->
          <div class="flex items-center gap-4">
            <div class="flex-1 max-w-md">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Número de Factura (DTE)
              </label>
              <div class="relative">
                <input 
                  type="text"
                  [formControl]="numeroFacturaControl"
                  placeholder="Ingrese el número DTE de la factura..."
                  class="w-full text-sm border border-gray-300 rounded-md py-3 pl-10 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:placeholder-gray-400">
                
                <!-- Icono de búsqueda -->
                <div class="absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <!-- Botón de limpiar -->
                <button 
                  *ngIf="numeroFacturaControl.value"
                  (click)="limpiarBusqueda()"
                  class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <!-- Mensaje de ayuda -->
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                💡 La búsqueda se realiza automáticamente mientras escribe
              </p>
            </div>
            
            <!-- Botón de búsqueda manual -->
            <div class="flex flex-col justify-end">
              <button 
                (click)="buscarManualmente()"
                [disabled]="!numeroFacturaControl.value || loading()"
                class="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                <svg *ngIf="!loading()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
                <svg *ngIf="loading()" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ loading() ? 'Buscando...' : 'Buscar' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Información de la Factura -->
        <div *ngIf="liquidacionActual() as liquidacion" 
             class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" x2="8" y1="13" y2="13"/>
              <line x1="16" x2="8" y1="17" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
            Información de la Factura
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Número DTE</span>
              <p class="text-lg font-semibold text-gray-900 dark:text-white">{{ liquidacion.factura.numero_dte }}</p>
            </div>
            <div>
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Emisor</span>
              <p class="text-sm text-gray-900 dark:text-white">{{ liquidacion.factura.nombre_emisor }}</p>
            </div>
            <div>
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha Emisión</span>
              <p class="text-sm text-gray-900 dark:text-white">{{ formatearFecha(liquidacion.factura.fecha_emision) }}</p>
            </div>
            <div>
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Monto Total</span>
              <p class="text-lg font-semibold text-green-600 dark:text-green-400">
                {{ formatearMonto(liquidacion.factura.monto_total) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Resumen de Liquidación -->
        <app-resumen-liquidacion-total 
          *ngIf="liquidacionActual()"
          [liquidacion]="liquidacionActual()!"
          (exportar)="exportarDatos()">
        </app-resumen-liquidacion-total>

        <!-- Contenido Principal: Detalles y Retenciones -->
        <div *ngIf="liquidacionActual(); else sinDatos" class="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          <!-- Tabla de Detalles de Liquidación -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Detalles de Liquidación</h3>
              <span class="text-sm text-gray-500">
                {{ liquidacionActual()!.detalles.length }} registros
              </span>
            </div>
            
            <app-tabla-detalles-verificacion 
              [detalles]="liquidacionActual()!.detalles"
              [loading]="loading()"
              (verificarDetalle)="abrirModalVerificacion($event)">
            </app-tabla-detalles-verificacion>
          </div>

          <!-- Tabla de Retenciones -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Retenciones</h3>
              <button 
                (click)="abrirModalNuevaRetencion()"
                class="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors flex items-center gap-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14"/>
                  <path d="M12 5v14"/>
                </svg>
                Agregar
              </button>
            </div>
            
            <app-tabla-retenciones 
              [retenciones]="liquidacionActual()!.retenciones"
              [tiposRetencion]="tiposRetencion()"
              [loading]="loadingRetenciones()"
              (editarRetencion)="abrirModalEditarRetencion($event)"
              (eliminarRetencion)="eliminarRetencion($event)">
            </app-tabla-retenciones>
          </div>
        </div>

        <!-- Estado Sin Datos -->
        <ng-template #sinDatos>
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Sin factura seleccionada</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Busque una factura por su número DTE para gestionar su liquidación y retenciones
            </p>
            <div class="text-xs text-gray-500 space-y-1">
              <p>💡 Ingrese el número de factura en el campo superior</p>
              <p>🔍 La búsqueda se realiza automáticamente</p>
              <p>📊 Podrá verificar detalles y gestionar retenciones</p>
            </div>
          </div>
        </ng-template>
      </div>

      <!-- Modales -->
      <app-modal-verificar-detalle 
        *ngIf="mostrarModalVerificacion()"
        [detalle]="detalleEnVerificacion()"
        [visible]="mostrarModalVerificacion()"
        (cerrar)="cerrarModalVerificacion()"
        (verificar)="confirmarVerificacion($event)">
      </app-modal-verificar-detalle>

      <app-modal-retencion 
        *ngIf="mostrarModalRetencion()"
        [visible]="mostrarModalRetencion()"
        [modo]="modoModalRetencion()"
        [retencion]="retencionEnEdicion()"
        [tiposRetencion]="tiposRetencion()"
        [numeroFactura]="liquidacionActual()?.factura.numero_dte || ''"
        (cerrar)="cerrarModalRetencion()"
        (guardar)="confirmarRetencion($event)">
      </app-modal-retencion>
    </div>
  `,
  styles: [`
    .custom-input:focus {
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
  `]
})
export class LiquidacionVerificacionComponent implements OnInit, OnDestroy {

  private readonly service = inject(LiquidacionVerificacionService);
  private readonly destroy$ = new Subject<void>();

  // === ESTADO REACTIVO ===
  readonly liquidacionActual = signal<LiquidacionCompleta | null>(null);
  readonly tiposRetencion = signal<TipoRetencion[]>([]);
  readonly loading = signal<boolean>(false);
  readonly loadingRetenciones = signal<boolean>(false);

  // === MODALES ===
  readonly mostrarModalVerificacion = signal<boolean>(false);
  readonly mostrarModalRetencion = signal<boolean>(false);
  readonly modoModalRetencion = signal<'crear' | 'editar'>('crear');
  readonly detalleEnVerificacion = signal<DetalleLiquidacionVerificacion | null>(null);
  readonly retencionEnEdicion = signal<RetencionFactura | null>(null);

  // === CONTROLES DE FORMULARIO ===
  readonly numeroFacturaControl = new FormControl('', [Validators.required, Validators.minLength(3)]);

  // === UTILITARIOS ===
  readonly formatearMonto = formatearMonto;
  readonly formatearFecha = formatearFecha;

  ngOnInit(): void {
    this.inicializarSubscripciones();
    this.configurarBusquedaAutomatica();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // INICIALIZACIÓN
  // ============================================================================

  private inicializarSubscripciones(): void {
    // Liquidación actual
    this.service.liquidacionActual$
      .pipe(takeUntil(this.destroy$))
      .subscribe(liquidacion => {
        this.liquidacionActual.set(liquidacion);
      });

    // Tipos de retención
    this.service.tiposRetencion$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tipos => {
        this.tiposRetencion.set(tipos);
      });

    // Estados de carga
    this.service.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.loading.set(loading);
      });

    this.service.loadingRetenciones$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.loadingRetenciones.set(loading);
      });
  }

  private configurarBusquedaAutomatica(): void {
    this.numeroFacturaControl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(valor => {
        if (valor && valor.trim().length >= 3) {
          this.buscarFactura(valor.trim());
        } else if (!valor || valor.trim().length === 0) {
          this.service.limpiarLiquidacion();
        }
      });
  }

  // ============================================================================
  // BÚSQUEDA Y NAVEGACIÓN
  // ============================================================================

  buscarManualmente(): void {
    const numeroFactura = this.numeroFacturaControl.value?.trim();
    if (numeroFactura) {
      this.buscarFactura(numeroFactura);
    }
  }

  private buscarFactura(numeroFactura: string): void {
    this.service.buscarLiquidacion(numeroFactura)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  limpiarBusqueda(): void {
    this.numeroFacturaControl.setValue('');
    this.service.limpiarLiquidacion();
  }

  recargarDatos(): void {
    const numeroFactura = this.numeroFacturaControl.value?.trim();
    if (numeroFactura) {
      // Forzar recarga limpiando cache
      this.service.limpiarLiquidacion();
      setTimeout(() => {
        this.buscarFactura(numeroFactura);
      }, 100);
    }
  }

  // ============================================================================
  // GESTIÓN DE DETALLES DE LIQUIDACIÓN
  // ============================================================================

  abrirModalVerificacion(detalle: DetalleLiquidacionVerificacion): void {
    this.detalleEnVerificacion.set(detalle);
    this.mostrarModalVerificacion.set(true);
  }

  cerrarModalVerificacion(): void {
    this.mostrarModalVerificacion.set(false);
    this.detalleEnVerificacion.set(null);
  }

  confirmarVerificacion(datosVerificacion: any): void {
    const detalle = this.detalleEnVerificacion();
    if (!detalle) return;

    const payload = {
      id: detalle.id,
      comprobante_contabilidad: datosVerificacion.comprobante_contabilidad,
      fecha_registro_contabilidad: datosVerificacion.fecha_registro_contabilidad,
      numero_acta: datosVerificacion.numero_acta,
      estado_verificacion: datosVerificacion.estado_verificacion || 'verificado'
    };

    this.service.verificarDetalle(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe(success => {
        if (success) {
          this.cerrarModalVerificacion();
        }
      });
  }

  // ============================================================================
  // GESTIÓN DE RETENCIONES
  // ============================================================================

  abrirModalNuevaRetencion(): void {
    this.retencionEnEdicion.set(null);
    this.modoModalRetencion.set('crear');
    this.mostrarModalRetencion.set(true);
  }

  abrirModalEditarRetencion(retencion: RetencionFactura): void {
    this.retencionEnEdicion.set(retencion);
    this.modoModalRetencion.set('editar');
    this.mostrarModalRetencion.set(true);
  }

  cerrarModalRetencion(): void {
    this.mostrarModalRetencion.set(false);
    this.retencionEnEdicion.set(null);
  }

  confirmarRetencion(datosRetencion: any): void {
    const modo = this.modoModalRetencion();

    if (modo === 'crear') {
      this.crearRetencion(datosRetencion);
    } else {
      this.actualizarRetencion(datosRetencion);
    }
  }

  private crearRetencion(datos: any): void {
    const liquidacion = this.liquidacionActual();
    if (!liquidacion) return;

    const payload = {
      numero_factura: liquidacion.factura.numero_dte,
      tipo_retencion_id: datos.tipo_retencion_id,
      numero_retencion: datos.numero_retencion,
      monto: datos.monto,
      porcentaje: datos.porcentaje || null,
      base_calculo: datos.base_calculo || null,
      detalles: datos.detalles || null,
      fecha_retencion: datos.fecha_retencion,
      documento_soporte: datos.documento_soporte || null
    };

    this.service.crearRetencion(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe(success => {
        if (success) {
          this.cerrarModalRetencion();
        }
      });
  }

  private actualizarRetencion(datos: any): void {
    const retencion = this.retencionEnEdicion();
    if (!retencion) return;

    const payload = {
      id: retencion.id,
      tipo_retencion_id: datos.tipo_retencion_id,
      numero_retencion: datos.numero_retencion,
      monto: datos.monto,
      porcentaje: datos.porcentaje || null,
      base_calculo: datos.base_calculo || null,
      detalles: datos.detalles || null,
      fecha_retencion: datos.fecha_retencion,
      documento_soporte: datos.documento_soporte || null
    };

    this.service.actualizarRetencion(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe(success => {
        if (success) {
          this.cerrarModalRetencion();
        }
      });
  }

  eliminarRetencion(retencion: RetencionFactura): void {
    // Confirmación con SweetAlert2 o similar
    if (confirm(`¿Está seguro de eliminar la retención ${retencion.numero_retencion}?`)) {
      this.service.eliminarRetencion(retencion.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }
  }

  // ============================================================================
  // UTILIDADES Y EXPORTACIÓN
  // ============================================================================

  exportarDatos(): void {
    this.service.exportarLiquidacionCSV();
  }

  // ============================================================================
  // GETTERS DE CONVENIENCIA
  // ============================================================================

  get puedeAgregarRetenciones(): boolean {
    const liquidacion = this.liquidacionActual();
    if (!liquidacion) return false;

    const montoDisponible = this.service.obtenerMontoDisponibleRetenciones();
    return montoDisponible > 0;
  }

  get estadoLiquidacion(): string {
    const liquidacion = this.liquidacionActual();
    if (!liquidacion) return 'sin-datos';

    const stats = liquidacion.estadisticas_verificacion;

    if (stats.verificados === stats.total && stats.total > 0) {
      return 'completo';
    } else if (stats.verificados > 0) {
      return 'parcial';
    } else {
      return 'pendiente';
    }
  }

  get colorEstadoLiquidacion(): string {
    const estado = this.estadoLiquidacion;

    const colores = {
      'completo': 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
      'parcial': 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
      'pendiente': 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30',
      'sin-datos': 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30'
    };

    return colores[estado] || colores['sin-datos'];
  }

  get textoEstadoLiquidacion(): string {
    const estado = this.estadoLiquidacion;

    const textos = {
      'completo': 'Verificación Completa',
      'parcial': 'Verificación Parcial',
      'pendiente': 'Pendiente de Verificar',
      'sin-datos': 'Sin Datos'
    };

    return textos[estado] || textos['sin-datos'];
  }

  // ============================================================================
  // INFORMACIÓN CONTEXTUAL
  // ============================================================================

  get infoContextual(): any {
    const liquidacion = this.liquidacionActual();
    if (!liquidacion) return null;

    return {
      factura: {
        numero: liquidacion.factura.numero_dte,
        emisor: liquidacion.factura.nombre_emisor,
        monto: liquidacion.factura.monto_total,
        fecha: liquidacion.factura.fecha_emision
      },
      liquidacion: {
        totalDetalles: liquidacion.totales.cantidad_detalles,
        montoLiquidado: liquidacion.totales.total_detalles,
        totalRetenciones: liquidacion.totales.cantidad_retenciones,
        montoRetenciones: liquidacion.totales.total_retenciones,
        montoNeto: liquidacion.totales.monto_neto
      },
      verificacion: {
        progreso: liquidacion.estadisticas_verificacion.porcentaje_verificados,
        verificados: liquidacion.estadisticas_verificacion.verificados,
        pendientes: liquidacion.estadisticas_verificacion.pendientes,
        rechazados: liquidacion.estadisticas_verificacion.rechazados,
        total: liquidacion.estadisticas_verificacion.total
      },
      disponible: {
        paraRetenciones: this.service.obtenerMontoDisponibleRetenciones(),
        puedeAgregar: this.puedeAgregarRetenciones
      }
    };
  }

  // ============================================================================
  // DEBUGGING Y DESARROLLO
  // ============================================================================

  mostrarInfoDebug(): void {
    console.log('=== DEBUG INFO ===');
    console.log('Liquidación actual:', this.liquidacionActual());
    console.log('Info contextual:', this.infoContextual);
    console.log('Estados:', {
      loading: this.loading(),
      loadingRetenciones: this.loadingRetenciones(),
      estadoLiquidacion: this.estadoLiquidacion,
      puedeAgregarRetenciones: this.puedeAgregarRetenciones
    });
  }
}