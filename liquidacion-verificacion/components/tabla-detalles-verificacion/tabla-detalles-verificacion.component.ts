// ============================================================================
// COMPONENTE - TABLA DETALLES VERIFICACIÓN
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import {
  DetalleLiquidacionVerificacion,
  formatearMonto,
  formatearFecha,
  obtenerTextoEstadoVerificacion,
  obtenerColorEstadoVerificacion,
  trackByDetalleId
} from '../../models/liquidacion-verificacion.models';

@Component({
  selector: 'app-tabla-detalles-verificacion',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      
      <!-- Header de la tabla -->
      <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100">
            Detalles de Liquidación ({{ detalles.length }})
          </h4>
          
          <!-- Indicador de estado general -->
          <div class="flex items-center gap-2 text-xs">
            <span class="text-gray-500">Estado:</span>
            <div class="flex gap-1">
              <span class="px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                ✓ {{ contarPorEstado('verificado') }}
              </span>
              <span class="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                ⏳ {{ contarPorEstado('pendiente') }}
              </span>
              <span *ngIf="contarPorEstado('rechazado') > 0" 
                    class="px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                ✗ {{ contarPorEstado('rechazado') }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading state -->
      <div *ngIf="loading" class="flex items-center justify-center p-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span class="ml-3 text-gray-600 dark:text-gray-300">Cargando detalles...</span>
      </div>

      <!-- Tabla -->
      <div *ngIf="!loading" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
            <tr class="text-left">
              <th class="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">Orden</th>
              <th class="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">Descripción</th>
              <th class="px-4 py-3 font-medium text-gray-700 dark:text-gray-200 text-right">Monto</th>
              <th class="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">Estado</th>
              <th class="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">Comprobante</th>
              <th class="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">Fecha Reg.</th>
              <th class="px-4 py-3 font-medium text-gray-700 dark:text-gray-200 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr *ngFor="let detalle of detalles; trackBy: trackByDetalleId"
                class="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                [class.bg-green-50]="detalle.estado_verificacion === 'verificado'"
                [class.dark:bg-green-900/10]="detalle.estado_verificacion === 'verificado'"
                [class.bg-red-50]="detalle.estado_verificacion === 'rechazado'"
                [class.dark:bg-red-900/10]="detalle.estado_verificacion === 'rechazado'">
              
              <!-- Número de Orden -->
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900 dark:text-gray-100">
                  #{{ detalle.numero_orden }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {{ detalle.agencia }}
                </div>
              </td>

              <!-- Descripción -->
              <td class="px-4 py-3">
                <div class="max-w-xs">
                  <p class="text-gray-900 dark:text-gray-100 line-clamp-2" 
                     [title]="detalle.descripcion">
                    {{ detalle.descripcion }}
                  </p>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                      {{ detalle.forma_pago | titlecase }}
                    </span>
                    <span *ngIf="detalle.correo_proveedor" 
                          class="text-xs text-blue-600 dark:text-blue-400">
                      📧
                    </span>
                  </div>
                </div>
              </td>

              <!-- Monto -->
              <td class="px-4 py-3 text-right">
                <div class="font-semibold text-gray-900 dark:text-gray-100">
                  {{ formatearMonto(detalle.monto) }}
                </div>
              </td>

              <!-- Estado de Verificación -->
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      [ngClass]="obtenerColorEstadoVerificacion(detalle.estado_verificacion)">
                  {{ obtenerTextoEstadoVerificacion(detalle.estado_verificacion) }}
                </span>
              </td>

              <!-- Comprobante Contabilidad -->
              <td class="px-4 py-3">
                <div *ngIf="detalle.comprobante_contabilidad; else sinComprobante">
                  <div class="font-medium text-gray-900 dark:text-gray-100">
                    {{ detalle.comprobante_contabilidad }}
                  </div>
                  <div *ngIf="detalle.numero_acta" class="text-xs text-gray-500 dark:text-gray-400">
                    Acta: {{ detalle.numero_acta }}
                  </div>
                </div>
                <ng-template #sinComprobante>
                  <span class="text-gray-400 dark:text-gray-500 text-xs">Sin comprobante</span>
                </ng-template>
              </td>

              <!-- Fecha Registro -->
              <td class="px-4 py-3">
                <div *ngIf="detalle.fecha_registro_contabilidad; else sinFecha">
                  <div class="text-sm text-gray-900 dark:text-gray-100">
                    {{ formatearFecha(detalle.fecha_registro_contabilidad) }}
                  </div>
                  <div *ngIf="detalle.verificado_por" class="text-xs text-gray-500 dark:text-gray-400">
                    por {{ detalle.verificado_por }}
                  </div>
                </div>
                <ng-template #sinFecha>
                  <span class="text-gray-400 dark:text-gray-500 text-xs">Sin registro</span>
                </ng-template>
              </td>

              <!-- Acciones -->
              <td class="px-4 py-3">
                <div class="flex items-center justify-center gap-1">
                  
                  <!-- Botón Ver Detalles -->
                  <button 
                    (click)="verDetalleCompleto(detalle)"
                    class="p-2 rounded-md hover:bg-blue-50 text-blue-600 dark:hover:bg-blue-900/30 dark:text-blue-400 transition-colors"
                    title="Ver detalles completos">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>

                  <!-- Botón Verificar/Editar -->
                  <button 
                    (click)="verificarDetalle.emit(detalle)"
                    class="p-2 rounded-md hover:bg-green-50 text-green-600 dark:hover:bg-green-900/30 dark:text-green-400 transition-colors"
                    [title]="detalle.estado_verificacion === 'verificado' ? 'Editar verificación' : 'Verificar detalle'">
                    <svg *ngIf="detalle.estado_verificacion === 'pendiente'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                    <svg *ngIf="detalle.estado_verificacion !== 'pendiente'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                      <path d="m15 5 4 4"/>
                    </svg>
                  </button>

                  <!-- Botón Historial (si está verificado) -->
                  <button 
                    *ngIf="detalle.estado_verificacion === 'verificado'"
                    (click)="verHistorial(detalle)"
                    class="p-2 rounded-md hover:bg-purple-50 text-purple-600 dark:hover:bg-purple-900/30 dark:text-purple-400 transition-colors"
                    title="Ver historial de verificación">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                      <path d="M3 3v5h5"/>
                      <path d="M12 7v5l4 2"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>

            <!-- Sin registros -->
            <tr *ngIf="detalles.length === 0">
              <td colspan="7" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                <div class="flex flex-col items-center gap-3">
                  <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" 
                          d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                  <div>
                    <p class="text-sm font-medium">Sin detalles de liquidación</p>
                    <p class="text-xs text-gray-400 mt-1">Esta factura no tiene detalles registrados</p>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer con resumen -->
      <div *ngIf="!loading && detalles.length > 0" 
           class="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
        <div class="flex items-center justify-between text-sm">
          <div class="flex items-center gap-4">
            <span class="text-gray-600 dark:text-gray-300">
              <strong>{{ detalles.length }}</strong> detalles
            </span>
            <span class="text-gray-600 dark:text-gray-300">
              Total: <strong class="text-green-600 dark:text-green-400">{{ formatearMonto(calcularTotalMonto()) }}</strong>
            </span>
          </div>
          
          <!-- Progreso de verificación -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500">Progreso:</span>
            <div class="w-24 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <div class="h-full bg-green-500 transition-all duration-300" 
                   [style.width.%]="calcularProgresoVerificacion()">
              </div>
            </div>
            <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
              {{ calcularProgresoVerificacion() }}%
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class TablaDetallesVerificacionComponent {
  @Input() detalles: DetalleLiquidacionVerificacion[] = [];
  @Input() loading = false;

  @Output() verificarDetalle = new EventEmitter<DetalleLiquidacionVerificacion>();

  // === UTILIDADES IMPORTADAS ===
  readonly formatearMonto = formatearMonto;
  readonly formatearFecha = formatearFecha;
  readonly obtenerTextoEstadoVerificacion = obtenerTextoEstadoVerificacion;
  readonly obtenerColorEstadoVerificacion = obtenerColorEstadoVerificacion;
  readonly trackByDetalleId = trackByDetalleId;

  // ============================================================================
  // MÉTODOS DE CONTEO Y CÁLCULOS
  // ============================================================================

  contarPorEstado(estado: string): number {
    return this.detalles.filter(d => d.estado_verificacion === estado).length;
  }

  calcularTotalMonto(): number {
    return this.detalles.reduce((sum, detalle) => sum + (detalle.monto || 0), 0);
  }

  calcularProgresoVerificacion(): number {
    if (this.detalles.length === 0) return 0;

    const verificados = this.contarPorEstado('verificado');
    return Math.round((verificados / this.detalles.length) * 100);
  }

  // ============================================================================
  // ACCIONES DE LA TABLA
  // ============================================================================

  verDetalleCompleto(detalle: DetalleLiquidacionVerificacion): void {
    const contenido = this.generarContenidoDetalleCompleto(detalle);

    // Aquí puedes implementar un modal personalizado o usar SweetAlert2
    alert(contenido); // Implementación temporal
  }

  verHistorial(detalle: DetalleLiquidacionVerificacion): void {
    const contenido = this.generarContenidoHistorial(detalle);

    // Implementar modal de historial
    alert(contenido); // Implementación temporal
  }

  // ============================================================================
  // GENERADORES DE CONTENIDO
  // ============================================================================

  private generarContenidoDetalleCompleto(detalle: DetalleLiquidacionVerificacion): string {
    return `
=== DETALLE COMPLETO ===
ID: ${detalle.id}
Orden: ${detalle.numero_orden}
Agencia: ${detalle.agencia}
Descripción: ${detalle.descripcion}
Monto: ${this.formatearMonto(detalle.monto)}
Forma de Pago: ${detalle.forma_pago}
Correo Proveedor: ${detalle.correo_proveedor || 'No especificado'}

=== INFORMACIÓN CONTABLE ===
Estado: ${this.obtenerTextoEstadoVerificacion(detalle.estado_verificacion)}
Comprobante: ${detalle.comprobante_contabilidad || 'No registrado'}
Fecha Registro: ${detalle.fecha_registro_contabilidad ? this.formatearFecha(detalle.fecha_registro_contabilidad) : 'No registrada'}
Número de Acta: ${detalle.numero_acta || 'No especificado'}
Verificado por: ${detalle.verificado_por || 'No especificado'}
Fecha Verificación: ${detalle.fecha_verificacion ? this.formatearFecha(detalle.fecha_verificacion) : 'No verificado'}

=== METADATOS ===
Creado: ${this.formatearFecha(detalle.fecha_creacion)}
Actualizado: ${this.formatearFecha(detalle.fecha_actualizacion)}
    `.trim();
  }

  private generarContenidoHistorial(detalle: DetalleLiquidacionVerificacion): string {
    return `
=== HISTORIAL DE VERIFICACIÓN ===
Detalle ID: ${detalle.id}

Fecha de Creación: ${this.formatearFecha(detalle.fecha_creacion)}
Última Actualización: ${this.formatearFecha(detalle.fecha_actualizacion)}
${detalle.fecha_verificacion ? `Fecha de Verificación: ${this.formatearFecha(detalle.fecha_verificacion)}` : ''}
${detalle.verificado_por ? `Verificado por: ${detalle.verificado_por}` : ''}

Estado Actual: ${this.obtenerTextoEstadoVerificacion(detalle.estado_verificacion)}
Comprobante: ${detalle.comprobante_contabilidad || 'Sin comprobante'}
    `.trim();
  }

  // ============================================================================
  // GETTERS PARA ESTADÍSTICAS
  // ============================================================================

  get estadisticasDetalle(): {
    total: number;
    verificados: number;
    pendientes: number;
    rechazados: number;
    progreso: number;
    montoTotal: number;
  } {
    const total = this.detalles.length;
    const verificados = this.contarPorEstado('verificado');
    const pendientes = this.contarPorEstado('pendiente');
    const rechazados = this.contarPorEstado('rechazado');

    return {
      total,
      verificados,
      pendientes,
      rechazados,
      progreso: this.calcularProgresoVerificacion(),
      montoTotal: this.calcularTotalMonto()
    };
  }

  // ============================================================================
  // UTILIDADES DE ESTADO
  // ============================================================================

  obtenerClaseFilaDetalle(detalle: DetalleLiquidacionVerificacion): string {
    const baseClasses = 'hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors';

    switch (detalle.estado_verificacion) {
      case 'verificado':
        return `${baseClasses} bg-green-50 dark:bg-green-900/10`;
      case 'rechazado':
        return `${baseClasses} bg-red-50 dark:bg-red-900/10`;
      default:
        return baseClasses;
    }
  }

  esDetalleCompleto(detalle: DetalleLiquidacionVerificacion): boolean {
    return !!(
      detalle.comprobante_contabilidad &&
      detalle.fecha_registro_contabilidad &&
      detalle.estado_verificacion === 'verificado'
    );
  }

  necesitaAtencion(detalle: DetalleLiquidacionVerificacion): boolean {
    return detalle.estado_verificacion === 'rechazado' ||
      (detalle.estado_verificacion === 'pendiente' && !detalle.comprobante_contabilidad);
  }

  // ============================================================================
  // FORMATEO Y PRESENTACIÓN
  // ============================================================================

  obtenerIconoEstado(estado: string): string {
    const iconos = {
      'verificado': '✓',
      'pendiente': '⏳',
      'rechazado': '✗'
    };
    return iconos[estado] || '?';
  }

  obtenerDescripcionCorta(descripcion: string, maxLength: number = 50): string {
    if (!descripcion) return 'Sin descripción';
    return descripcion.length > maxLength
      ? descripcion.substring(0, maxLength) + '...'
      : descripcion;
  }

  formatearFormaPago(formaPago: string): string {
    const formateos = {
      'deposito': 'Depósito',
      'transferencia': 'Transferencia',
      'cheque': 'Cheque',
      'tarjeta': 'Tarjeta',
      'anticipo': 'Anticipo'
    };
    return formateos[formaPago?.toLowerCase()] || formaPago?.charAt(0)?.toUpperCase() + formaPago?.slice(1) || 'No especificado';
  }

  // ============================================================================
  // ACCIONES ADICIONALES
  // ============================================================================

  copiarNumeroComprobante(comprobante: string): void {
    if (comprobante && navigator.clipboard) {
      navigator.clipboard.writeText(comprobante).then(() => {
        // Mostrar notificación temporal
        console.log('Comprobante copiado:', comprobante);
      });
    }
  }

  exportarDetalleCSV(): void {
    const csvData = this.generarCSVDetalles();
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `detalles_liquidacion_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private generarCSVDetalles(): string {
    const headers = [
      'ID', 'Numero_Orden', 'Agencia', 'Descripcion', 'Monto',
      'Forma_Pago', 'Estado_Verificacion', 'Comprobante_Contabilidad',
      'Fecha_Registro_Contabilidad', 'Numero_Acta', 'Verificado_Por'
    ];

    const rows = this.detalles.map(detalle => [
      detalle.id,
      detalle.numero_orden,
      detalle.agencia,
      `"${detalle.descripcion}"`,
      detalle.monto,
      detalle.forma_pago,
      detalle.estado_verificacion,
      detalle.comprobante_contabilidad || '',
      detalle.fecha_registro_contabilidad || '',
      detalle.numero_acta || '',
      detalle.verificado_por || ''
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}