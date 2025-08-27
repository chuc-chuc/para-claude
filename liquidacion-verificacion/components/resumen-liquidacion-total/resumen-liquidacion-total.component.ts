// ============================================================================
// COMPONENTE - RESUMEN LIQUIDACIÓN TOTAL
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import {
  LiquidacionCompleta,
  formatearMonto,
  obtenerTextoEstadoVerificacion,
  obtenerColorEstadoVerificacion
} from '../../models/liquidacion-verificacion.models';

@Component({
  selector: 'app-resumen-liquidacion-total',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Resumen General</h2>
              <p class="text-sm text-gray-600 dark:text-gray-400">Liquidación y retenciones de la factura</p>
            </div>
          </div>
          
          <!-- Acciones -->
          <div class="flex items-center gap-2">
            <button 
              (click)="exportar.emit()"
              class="px-3 py-1.5 text-xs font-medium text-blue-600 bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition-colors dark:bg-gray-700 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-gray-600 flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-15"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" x2="12" y1="15" y2="3"/>
              </svg>
              Exportar
            </button>
          </div>
        </div>
      </div>

      <!-- Contenido Principal -->
      <div class="p-6">
        
        <!-- Tarjetas de Métricas Principales -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          
          <!-- Total Liquidado -->
          <div class="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-green-700 dark:text-green-300">Total Liquidado</p>
                <p class="text-2xl font-bold text-green-900 dark:text-green-100">
                  {{ formatearMonto(liquidacion.totales.total_detalles) }}
                </p>
                <p class="text-xs text-green-600 dark:text-green-400 mt-1">
                  {{ liquidacion.totales.cantidad_detalles }} detalles
                </p>
              </div>
              <div class="p-3 bg-green-500 rounded-lg">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Total Retenciones -->
          <div class="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-red-700 dark:text-red-300">Total Retenciones</p>
                <p class="text-2xl font-bold text-red-900 dark:text-red-100">
                  {{ formatearMonto(liquidacion.totales.total_retenciones) }}
                </p>
                <p class="text-xs text-red-600 dark:text-red-400 mt-1">
                  {{ liquidacion.totales.cantidad_retenciones }} retenciones
                </p>
              </div>
              <div class="p-3 bg-red-500 rounded-lg">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M20 12H4m16 0l-4 4m4-4l-4-4"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Monto Neto -->
          <div class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-blue-700 dark:text-blue-300">Monto Neto</p>
                <p class="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {{ formatearMonto(liquidacion.totales.monto_neto) }}
                </p>
                <p class="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {{ calcularPorcentajeNeto() }}% de la factura
                </p>
              </div>
              <div class="p-3 bg-blue-500 rounded-lg">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Estado de Verificación -->
          <div class="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-purple-700 dark:text-purple-300">Verificación</p>
                <p class="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {{ liquidacion.estadisticas_verificacion.porcentaje_verificados }}%
                </p>
                <p class="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  {{ liquidacion.estadisticas_verificacion.verificados }}/{{ liquidacion.estadisticas_verificacion.total }} completados
                </p>
              </div>
              <div class="p-3 bg-purple-500 rounded-lg">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Sección de Progreso y Detalles -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <!-- Progreso de Verificación -->
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              Progreso de Verificación
            </h3>
            
            <!-- Barra de progreso principal -->
            <div class="mb-4">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-gray-600 dark:text-gray-300">Completado</span>
                <span class="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {{ liquidacion.estadisticas_verificacion.porcentaje_verificados }}%
                </span>
              </div>
              <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 overflow-hidden">
                <div class="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                     [style.width.%]="liquidacion.estadisticas_verificacion.porcentaje_verificados">
                </div>
              </div>
            </div>

            <!-- Desglose por estado -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span class="text-sm text-gray-700 dark:text-gray-300">Verificados</span>
                </div>
                <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ liquidacion.estadisticas_verificacion.verificados }}
                </span>
              </div>
              
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span class="text-sm text-gray-700 dark:text-gray-300">Pendientes</span>
                </div>
                <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ liquidacion.estadisticas_verificacion.pendientes }}
                </span>
              </div>
              
              <div *ngIf="liquidacion.estadisticas_verificacion.rechazados > 0" 
                   class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span class="text-sm text-gray-700 dark:text-gray-300">Rechazados</span>
                </div>
                <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ liquidacion.estadisticas_verificacion.rechazados }}
                </span>
              </div>
            </div>
          </div>

          <!-- Análisis Financiero -->
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              Análisis Financiero
            </h3>

            <div class="space-y-4">
              <!-- Comparación con monto factura -->
              <div class="bg-white dark:bg-gray-600 rounded-md p-3">
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm text-gray-600 dark:text-gray-300">Monto Factura</span>
                  <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {{ formatearMonto(liquidacion.factura.monto_total) }}
                  </span>
                </div>
                
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm text-gray-600 dark:text-gray-300">Total Liquidado</span>
                  <span class="text-sm font-semibold" [class]="obtenerColorComparacion('liquidado')">
                    {{ formatearMonto(liquidacion.totales.total_detalles) }}
                    ({{ calcularPorcentajeDelTotal('liquidado') }}%)
                  </span>
                </div>
                
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm text-gray-600 dark:text-gray-300">Total Retenido</span>
                  <span class="text-sm font-semibold text-red-600 dark:text-red-400">
                    {{ formatearMonto(liquidacion.totales.total_retenciones) }}
                    ({{ calcularPorcentajeDelTotal('retenciones') }}%)
                  </span>
                </div>
                
                <hr class="my-2 border-gray-200 dark:border-gray-500">
                
                <div class="flex justify-between items-center">
                  <span class="text-sm font-medium text-gray-800 dark:text-gray-200">Diferencia</span>
                  <span class="text-sm font-bold" [class]="obtenerColorDiferencia()">
                    {{ formatearMonto(calcularDiferencia()) }}
                  </span>
                </div>
              </div>

              <!-- Indicadores clave -->
              <div class="grid grid-cols-2 gap-3">
                <div class="text-center">
                  <div class="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {{ calcularPromedioDetalle() }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Promedio/Detalle</div>
                </div>
                
                <div class="text-center">
                  <div class="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {{ calcularPromedioRetencion() }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Promedio/Retención</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Alertas y Notificaciones -->
        <div class="mt-6 space-y-3">
          
          <!-- Alerta de diferencia significativa -->
          <div *ngIf="tieneDiferenciaSignificativa()" 
               class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div class="flex items-center gap-3">
              <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
              </svg>
              <div>
                <h4 class="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  Diferencia Detectada
                </h4>
                <p class="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {{ obtenerMensajeDiferencia() }}
                </p>
              </div>
            </div>
          </div>

          <!-- Alerta de verificación incompleta -->
          <div *ngIf="tieneVerificacionIncompleta()" 
               class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div class="flex items-center gap-3">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div>
                <h4 class="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Verificación Pendiente
                </h4>
                <p class="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {{ liquidacion.estadisticas_verificacion.pendientes }} detalles requieren verificación contable.
                </p>
              </div>
            </div>
          </div>

          <!-- Alerta de liquidación completa -->
          <div *ngIf="esLiquidacionCompleta()" 
               class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div class="flex items-center gap-3">
              <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div>
                <h4 class="text-sm font-medium text-green-800 dark:text-green-300">
                  ✅ Liquidación Completa
                </h4>
                <p class="text-sm text-green-700 dark:text-green-300 mt-1">
                  Todos los detalles han sido verificados exitosamente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ResumenLiquidacionTotalComponent {
  @Input() liquidacion!: LiquidacionCompleta;

  @Output() exportar = new EventEmitter<void>();

  // === UTILIDADES ===
  readonly formatearMonto = formatearMonto;
  readonly obtenerTextoEstadoVerificacion = obtenerTextoEstadoVerificacion;
  readonly obtenerColorEstadoVerificacion = obtenerColorEstadoVerificacion;

  // ============================================================================
  // CÁLCULOS PRINCIPALES
  // ============================================================================

  calcularPorcentajeNeto(): number {
    if (this.liquidacion.factura.monto_total === 0) return 0;
    return Math.round((this.liquidacion.totales.monto_neto / this.liquidacion.factura.monto_total) * 100);
  }

  calcularPorcentajeDelTotal(tipo: 'liquidado' | 'retenciones'): number {
    if (this.liquidacion.factura.monto_total === 0) return 0;

    const monto = tipo === 'liquidado'
      ? this.liquidacion.totales.total_detalles
      : this.liquidacion.totales.total_retenciones;

    return Math.round((monto / this.liquidacion.factura.monto_total) * 100);
  }

  calcularDiferencia(): number {
    return this.liquidacion.factura.monto_total - this.liquidacion.totales.total_detalles;
  }

  calcularPromedioDetalle(): string {
    if (this.liquidacion.totales.cantidad_detalles === 0) return 'Q0.00';

    const promedio = this.liquidacion.totales.total_detalles / this.liquidacion.totales.cantidad_detalles;
    return this.formatearMonto(promedio);
  }

  calcularPromedioRetencion(): string {
    if (this.liquidacion.totales.cantidad_retenciones === 0) return 'Q0.00';

    const promedio = this.liquidacion.totales.total_retenciones / this.liquidacion.totales.cantidad_retenciones;
    return this.formatearMonto(promedio);
  }

  // ============================================================================
  // VALIDACIONES Y ESTADOS
  // ============================================================================

  tieneDiferenciaSignificativa(): boolean {
    const diferencia = Math.abs(this.calcularDiferencia());
    return diferencia > 0.01; // Mayor a 1 centavo
  }

  tieneVerificacionIncompleta(): boolean {
    return this.liquidacion.estadisticas_verificacion.pendientes > 0 ||
      this.liquidacion.estadisticas_verificacion.rechazados > 0;
  }

  esLiquidacionCompleta(): boolean {
    return this.liquidacion.estadisticas_verificacion.verificados ===
      this.liquidacion.estadisticas_verificacion.total &&
      this.liquidacion.estadisticas_verificacion.total > 0 &&
      !this.tieneDiferenciaSignificativa();
  }

  obtenerMensajeDiferencia(): string {
    const diferencia = this.calcularDiferencia();

    if (diferencia > 0) {
      return `Falta liquidar ${this.formatearMonto(diferencia)} para completar el monto de la factura.`;
    } else if (diferencia < 0) {
      return `Los detalles exceden el monto de la factura por ${this.formatearMonto(Math.abs(diferencia))}.`;
    }

    return 'Los montos coinciden exactamente.';
  }

  // ============================================================================
  // UTILIDADES DE ESTILO
  // ============================================================================

  obtenerColorComparacion(tipo: 'liquidado' | 'retenciones'): string {
    const porcentaje = this.calcularPorcentajeDelTotal(tipo);

    if (tipo === 'liquidado') {
      if (porcentaje >= 95) return 'text-green-600 dark:text-green-400';
      if (porcentaje >= 80) return 'text-yellow-600 dark:text-yellow-400';
      return 'text-red-600 dark:text-red-400';
    }

    // Para retenciones, menos es mejor
    if (porcentaje <= 5) return 'text-green-600 dark:text-green-400';
    if (porcentaje <= 15) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }

  obtenerColorDiferencia(): string {
    const diferencia = this.calcularDiferencia();
    const diferenciaPorcentaje = Math.abs(diferencia / this.liquidacion.factura.monto_total) * 100;

    if (diferenciaPorcentaje < 1) return 'text-green-600 dark:text-green-400';
    if (diferenciaPorcentaje < 5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }

  obtenerColorProgreso(): string {
    const porcentaje = this.liquidacion.estadisticas_verificacion.porcentaje_verificados;

    if (porcentaje === 100) return 'from-green-400 to-green-600';
    if (porcentaje >= 75) return 'from-blue-400 to-blue-600';
    if (porcentaje >= 50) return 'from-yellow-400 to-yellow-600';
    return 'from-red-400 to-red-600';
  }

  // ============================================================================
  // INFORMACIÓN CONTEXTUAL
  // ============================================================================

  get estadoGeneral(): 'completo' | 'parcial' | 'pendiente' | 'con_problemas' {
    if (this.esLiquidacionCompleta()) return 'completo';

    if (this.liquidacion.estadisticas_verificacion.rechazados > 0 ||
      this.tieneDiferenciaSignificativa()) {
      return 'con_problemas';
    }

    if (this.liquidacion.estadisticas_verificacion.verificados > 0) {
      return 'parcial';
    }

    return 'pendiente';
  }

  get textoEstadoGeneral(): string {
    const estados = {
      'completo': 'Liquidación Completa',
      'parcial': 'Verificación Parcial',
      'pendiente': 'Pendiente de Verificar',
      'con_problemas': 'Requiere Atención'
    };
    return estados[this.estadoGeneral];
  }

  get colorEstadoGeneral(): string {
    const colores = {
      'completo': 'text-green-600 bg-green-100 border-green-200',
      'parcial': 'text-blue-600 bg-blue-100 border-blue-200',
      'pendiente': 'text-gray-600 bg-gray-100 border-gray-200',
      'con_problemas': 'text-red-600 bg-red-100 border-red-200'
    };
    return colores[this.estadoGeneral];
  }

  // ============================================================================
  // MÉTRICAS AVANZADAS
  // ============================================================================

  get metricas(): {
    eficienciaVerificacion: number;
    coberturaMonto: number;
    impactoRetenciones: number;
    velocidadProceso: string;
    riesgoContable: 'bajo' | 'medio' | 'alto';
  } {
    const stats = this.liquidacion.estadisticas_verificacion;
    const totales = this.liquidacion.totales;

    // Eficiencia de verificación (% verificados)
    const eficienciaVerificacion = stats.porcentaje_verificados;

    // Cobertura de monto (% del monto factura que está liquidado)
    const coberturaMonto = this.calcularPorcentajeDelTotal('liquidado');

    // Impacto de retenciones (% del monto factura que se retiene)
    const impactoRetenciones = this.calcularPorcentajeDelTotal('retenciones');

    // Velocidad de proceso (basado en cantidad vs verificados)
    let velocidadProceso = 'Normal';
    if (stats.total > 0) {
      const ratio = stats.verificados / stats.total;
      if (ratio >= 0.8) velocidadProceso = 'Rápida';
      else if (ratio <= 0.3) velocidadProceso = 'Lenta';
    }

    // Riesgo contable (basado en diferencias y rechazos)
    let riesgoContable: 'bajo' | 'medio' | 'alto' = 'bajo';
    if (stats.rechazados > 0 || this.tieneDiferenciaSignificativa()) {
      riesgoContable = 'alto';
    } else if (stats.pendientes > stats.total * 0.5) {
      riesgoContable = 'medio';
    }

    return {
      eficienciaVerificacion,
      coberturaMonto,
      impactoRetenciones,
      velocidadProceso,
      riesgoContable
    };
  }

  // ============================================================================
  // RECOMENDACIONES AUTOMÁTICAS
  // ============================================================================

  get recomendaciones(): string[] {
    const recomendaciones: string[] = [];
    const stats = this.liquidacion.estadisticas_verificacion;
    const metricas = this.metricas;

    // Recomendaciones basadas en verificación
    if (stats.pendientes > 0) {
      recomendaciones.push(`Verificar ${stats.pendientes} detalles pendientes para completar el proceso`);
    }

    if (stats.rechazados > 0) {
      recomendaciones.push(`Revisar y corregir ${stats.rechazados} detalles rechazados`);
    }

    // Recomendaciones basadas en montos
    if (this.tieneDiferenciaSignificativa()) {
      const diferencia = this.calcularDiferencia();
      if (diferencia > 0) {
        recomendaciones.push(`Agregar detalles por ${this.formatearMonto(diferencia)} para completar la liquidación`);
      } else {
        recomendaciones.push(`Revisar detalles que exceden el monto de factura por ${this.formatearMonto(Math.abs(diferencia))}`);
      }
    }

    // Recomendaciones basadas en retenciones
    if (metricas.impactoRetenciones > 20) {
      recomendaciones.push('El impacto de retenciones es alto (>20%), verificar que sean correctas');
    }

    if (this.liquidacion.totales.cantidad_retenciones === 0 && this.liquidacion.factura.monto_total > 5000) {
      recomendaciones.push('Considerar si aplican retenciones para este monto de factura');
    }

    // Recomendaciones de proceso
    if (metricas.velocidadProceso === 'Lenta') {
      recomendaciones.push('El proceso de verificación está avanzando lentamente, considerar priorizar');
    }

    return recomendaciones;
  }

  // ============================================================================
  // ACCIONES Y EVENTOS
  // ============================================================================

  onExportar(): void {
    this.exportar.emit();
  }

  // ============================================================================
  // UTILIDADES DE FORMATO
  // ============================================================================

  formatearPorcentaje(valor: number): string {
    return `${Math.round(valor)}%`;
  }

  obtenerIconoEstado(): string {
    const iconos = {
      'completo': '✅',
      'parcial': '⏳',
      'pendiente': '📋',
      'con_problemas': '⚠️'
    };
    return iconos[this.estadoGeneral];
  }

  obtenerTextoResumen(): string {
    const stats = this.liquidacion.estadisticas_verificacion;
    const totales = this.liquidacion.totales;

    return `${totales.cantidad_detalles} detalles por ${this.formatearMonto(totales.total_detalles)}, ` +
      `${totales.cantidad_retenciones} retenciones por ${this.formatearMonto(totales.total_retenciones)}, ` +
      `${stats.verificados}/${stats.total} verificados (${this.formatearPorcentaje(stats.porcentaje_verificados)})`;
  }

  // ============================================================================
  // INFORMACIÓN PARA TOOLTIPS
  // ============================================================================

  obtenerTooltipProgreso(): string {
    const stats = this.liquidacion.estadisticas_verificacion;
    return `Verificados: ${stats.verificados}\nPendientes: ${stats.pendientes}\nRechazados: ${stats.rechazados}`;
  }

  obtenerTooltipFinanciero(): string {
    const metricas = this.metricas;
    return `Cobertura: ${metricas.coberturaMonto}%\nImpacto Retenciones: ${metricas.impactoRetenciones}%\nRiesgo: ${metricas.riesgoContable}`;
  }

  // ============================================================================
  // COMPARACIONES HISTÓRICAS (si se implementa más adelante)
  // ============================================================================

  compararConPromedio(): { mejor: boolean; diferencia: number } {
    // Placeholder para futuras comparaciones con promedios históricos
    const promedioHistorico = 85; // Ejemplo: 85% de verificación promedio
    const actual = this.liquidacion.estadisticas_verificacion.porcentaje_verificados;

    return {
      mejor: actual >= promedioHistorico,
      diferencia: actual - promedioHistorico
    };
  }

  // ============================================================================
  // VALIDACIONES DE INTEGRIDAD
  // ============================================================================

  validarIntegridad(): { esValido: boolean; errores: string[] } {
    const errores: string[] = [];

    // Validar que los totales sumen correctamente
    const sumaCalculada = this.liquidacion.detalles.reduce((sum, d) => sum + d.monto, 0);
    if (Math.abs(sumaCalculada - this.liquidacion.totales.total_detalles) > 0.01) {
      errores.push('La suma de detalles no coincide con el total calculado');
    }

    const sumaRetenciones = this.liquidacion.retenciones.reduce((sum, r) => sum + r.monto, 0);
    if (Math.abs(sumaRetenciones - this.liquidacion.totales.total_retenciones) > 0.01) {
      errores.push('La suma de retenciones no coincide con el total calculado');
    }

    // Validar estadísticas
    const totalEstadisticas = this.liquidacion.estadisticas_verificacion.verificados +
      this.liquidacion.estadisticas_verificacion.pendientes +
      this.liquidacion.estadisticas_verificacion.rechazados;

    if (totalEstadisticas !== this.liquidacion.estadisticas_verificacion.total) {
      errores.push('Las estadísticas de verificación no suman correctamente');
    }

    return {
      esValido: errores.length === 0,
      errores
    };
  }

  // ============================================================================
  // DEBUGGING Y DESARROLLO
  // ============================================================================

  mostrarInfoCompleta(): void {
    console.group('📊 Información Completa del Resumen');
    console.log('Estado general:', this.estadoGeneral);
    console.log('Métricas:', this.metricas);
    console.log('Recomendaciones:', this.recomendaciones);
    console.log('Validación:', this.validarIntegridad());
    console.log('Liquidación completa:', this.liquidacion);
    console.groupEnd();
  }
}