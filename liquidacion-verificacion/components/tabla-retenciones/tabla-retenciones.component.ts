// ============================================================================
// COMPONENTE - TABLA RETENCIONES
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import {
  RetencionFactura,
  TipoRetencion,
  formatearMonto,
  formatearFecha,
  trackByRetencionId
} from '../../models/liquidacion-verificacion.models';

@Component({
  selector: 'app-tabla-retenciones',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      
      <!-- Header de la tabla -->
      <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100">
            Retenciones Aplicadas ({{ retenciones.length }})
          </h4>
          
          <!-- Total de retenciones -->
          <div class="text-sm">
            <span class="text-gray-500 dark:text-gray-400">Total retenido:</span>
            <strong class="text-red-600 dark:text-red-400 ml-1">
              {{ formatearMonto(calcularTotalRetenciones()) }}
            </strong>
          </div>
        </div>
      </div>

      <!-- Loading state -->
      <div *ngIf="loading" class="flex items-center justify-center p-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        <span class="ml-3 text-gray-600 dark:text-gray-300">Procesando retenciones...</span>
      </div>

      <!-- Tabla -->
      <div *ngIf="!loading" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
            <tr class="text-left">
              <th class="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">Tipo</th>
              <th class="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">No. Retención</th>
              <th class="px-4 py-3 font-medium text-gray-700 dark:text-gray-200 text-right">Monto</th>
              <th class="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">%</th>
              <th class="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">Fecha</th>
              <th class="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">Detalles</th>
              <th class="px-4 py-3 font-medium text-gray-700 dark:text-gray-200 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr *ngFor="let retencion of retenciones; trackBy: trackByRetencionId"
                class="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
              
              <!-- Tipo de Retención -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <!-- Badge del tipo -->
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        [ngClass]="obtenerColorTipoRetencion(retencion.tipo_codigo!)">
                    {{ retencion.tipo_codigo }}
                  </span>
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {{ retencion.tipo_nombre }}
                </div>
              </td>

              <!-- Número de Retención -->
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900 dark:text-gray-100">
                  {{ retencion.numero_retencion }}
                </div>
                <div *ngIf="retencion.documento_soporte" class="text-xs text-gray-500 dark:text-gray-400">
                  📎 {{ obtenerNombreDocumento(retencion.documento_soporte) }}
                </div>
              </td>

              <!-- Monto -->
              <td class="px-4 py-3 text-right">
                <div class="font-semibold text-red-600 dark:text-red-400">
                  {{ formatearMonto(retencion.monto) }}
                </div>
                <div *ngIf="retencion.base_calculo" class="text-xs text-gray-500 dark:text-gray-400">
                  Base: {{ formatearMonto(retencion.base_calculo) }}
                </div>
              </td>

              <!-- Porcentaje -->
              <td class="px-4 py-3">
                <div *ngIf="retencion.porcentaje; else sinPorcentaje" 
                     class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ retencion.porcentaje }}%
                </div>
                <ng-template #sinPorcentaje>
                  <span class="text-gray-400 dark:text-gray-500 text-xs">N/A</span>
                </ng-template>
              </td>

              <!-- Fecha -->
              <td class="px-4 py-3">
                <div class="text-sm text-gray-900 dark:text-gray-100">
                  {{ formatearFecha(retencion.fecha_retencion) }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  Creada: {{ formatearFecha(retencion.fecha_creacion) }}
                </div>
              </td>

              <!-- Detalles -->
              <td class="px-4 py-3">
                <div *ngIf="retencion.detalles; else sinDetalles" class="max-w-xs">
                  <p class="text-sm text-gray-900 dark:text-gray-100 line-clamp-2" 
                     [title]="retencion.detalles">
                    {{ retencion.detalles }}
                  </p>
                </div>
                <ng-template #sinDetalles>
                  <span class="text-gray-400 dark:text-gray-500 text-xs">Sin detalles</span>
                </ng-template>
                
                <!-- Información adicional -->
                <div *ngIf="retencion.creado_por" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  por {{ retencion.creado_por }}
                </div>
              </td>

              <!-- Acciones -->
              <td class="px-4 py-3">
                <div class="flex items-center justify-center gap-1">
                  
                  <!-- Botón Ver Detalles -->
                  <button 
                    (click)="verDetalleRetencion(retencion)"
                    class="p-2 rounded-md hover:bg-blue-50 text-blue-600 dark:hover:bg-blue-900/30 dark:text-blue-400 transition-colors"
                    title="Ver detalles completos">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>

                  <!-- Botón Editar -->
                  <button 
                    (click)="editarRetencion.emit(retencion)"
                    class="p-2 rounded-md hover:bg-amber-50 text-amber-600 dark:hover:bg-amber-900/30 dark:text-amber-400 transition-colors"
                    title="Editar retención">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                      <path d="m15 5 4 4"/>
                    </svg>
                  </button>

                  <!-- Botón Copiar -->
                  <button 
                    (click)="copiarNumeroRetencion(retencion.numero_retencion)"
                    class="p-2 rounded-md hover:bg-purple-50 text-purple-600 dark:hover:bg-purple-900/30 dark:text-purple-400 transition-colors"
                    title="Copiar número de retención">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                    </svg>
                  </button>

                  <!-- Botón Eliminar -->
                  <button 
                    (click)="confirmarEliminacion(retencion)"
                    class="p-2 rounded-md hover:bg-red-50 text-red-600 dark:hover:bg-red-900/30 dark:text-red-400 transition-colors"
                    title="Eliminar retención">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 6h18"/>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      <line x1="10" x2="10" y1="11" y2="17"/>
                      <line x1="14" x2="14" y1="11" y2="17"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>

            <!-- Sin retenciones -->
            <tr *ngIf="retenciones.length === 0">
              <td colspan="7" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                <div class="flex flex-col items-center gap-3">
                  <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" 
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                  </svg>
                  <div>
                    <p class="text-sm font-medium">Sin retenciones aplicadas</p>
                    <p class="text-xs text-gray-400 mt-1">Use el botón "Agregar" para aplicar retenciones a esta factura</p>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer con estadísticas -->
      <div *ngIf="!loading && retenciones.length > 0" 
           class="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
        <div class="flex items-center justify-between text-sm">
          <div class="flex items-center gap-4">
            <span class="text-gray-600 dark:text-gray-300">
              <strong>{{ retenciones.length }}</strong> retenciones
            </span>
            
            <!-- Distribución por tipo -->
            <div class="flex gap-2">
              <div *ngFor="let tipo of obtenerDistribucionTipos()" 
                   class="flex items-center gap-1 text-xs">
                <span [ngClass]="obtenerColorTipoRetencion(tipo.codigo)">
                  {{ tipo.codigo }}
                </span>
                <span class="text-gray-500">({{ tipo.cantidad }})</span>
              </div>
            </div>
          </div>
          
          <!-- Total y promedio -->
          <div class="flex items-center gap-4 text-xs">
            <span class="text-gray-500">
              Total: <strong class="text-red-600 dark:text-red-400">{{ formatearMonto(calcularTotalRetenciones()) }}</strong>
            </span>
            <span class="text-gray-500">
              Promedio: <strong>{{ formatearMonto(calcularPromedioRetenciones()) }}</strong>
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
export class TablaRetencionesComponent {
  @Input() retenciones: RetencionFactura[] = [];
  @Input() tiposRetencion: TipoRetencion[] = [];
  @Input() loading = false;

  @Output() editarRetencion = new EventEmitter<RetencionFactura>();
  @Output() eliminarRetencion = new EventEmitter<RetencionFactura>();

  // === UTILIDADES IMPORTADAS ===
  readonly formatearMonto = formatearMonto;
  readonly formatearFecha = formatearFecha;
  readonly trackByRetencionId = trackByRetencionId;

  // ============================================================================
  // CÁLCULOS Y ESTADÍSTICAS
  // ============================================================================

  calcularTotalRetenciones(): number {
    return this.retenciones.reduce((sum, retencion) => sum + (retencion.monto || 0), 0);
  }

  calcularPromedioRetenciones(): number {
    if (this.retenciones.length === 0) return 0;
    return this.calcularTotalRetenciones() / this.retenciones.length;
  }

  obtenerDistribucionTipos(): { codigo: string; cantidad: number; total: number }[] {
    const distribucion = new Map<string, { cantidad: number; total: number }>();

    this.retenciones.forEach(retencion => {
      const codigo = retencion.tipo_codigo || 'OTROS';
      const actual = distribucion.get(codigo) || { cantidad: 0, total: 0 };
      distribucion.set(codigo, {
        cantidad: actual.cantidad + 1,
        total: actual.total + retencion.monto
      });
    });

    return Array.from(distribucion.entries()).map(([codigo, data]) => ({
      codigo,
      ...data
    })).sort((a, b) => b.total - a.total);
  }

  // ============================================================================
  // UTILIDADES DE PRESENTACIÓN
  // ============================================================================

  obtenerColorTipoRetencion(tipoCodigo: string): string {
    const colores: Record<string, string> = {
      'ISR': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      'IVA': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'IETAAP': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'OTROS': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    };

    return colores[tipoCodigo] || colores['OTROS'];
  }

  obtenerNombreDocumento(rutaCompleta: string): string {
    if (!rutaCompleta) return 'Sin documento';

    // Extraer solo el nombre del archivo
    const partesRuta = rutaCompleta.split('/');
    const nombreArchivo = partesRuta[partesRuta.length - 1];

    // Limitar longitud
    return nombreArchivo.length > 20
      ? nombreArchivo.substring(0, 17) + '...'
      : nombreArchivo;
  }

  obtenerTextoTipoRetencion(tipoId: number): string {
    const tipo = this.tiposRetencion.find(t => t.id === tipoId);
    return tipo?.nombre || 'Tipo desconocido';
  }

  // ============================================================================
  // ACCIONES DE LA TABLA
  // ============================================================================

  verDetalleRetencion(retencion: RetencionFactura): void {
    const contenido = this.generarContenidoDetalleRetencion(retencion);

    // Implementar modal personalizado o usar SweetAlert2
    alert(contenido); // Implementación temporal
  }

  confirmarEliminacion(retencion: RetencionFactura): void {
    const mensaje = `¿Está seguro de eliminar la retención ${retencion.numero_retencion}?\n\nTipo: ${retencion.tipo_nombre}\nMonto: ${this.formatearMonto(retencion.monto)}\n\nEsta acción no se puede deshacer.`;

    if (confirm(mensaje)) {
      this.eliminarRetencion.emit(retencion);
    }
  }

  copiarNumeroRetencion(numeroRetencion: string): void {
    if (numeroRetencion && navigator.clipboard) {
      navigator.clipboard.writeText(numeroRetencion).then(() => {
        // Mostrar notificación temporal
        console.log('Número de retención copiado:', numeroRetencion);
        this.mostrarNotificacionCopia();
      }).catch(err => {
        console.error('Error al copiar:', err);
      });
    }
  }

  private mostrarNotificacionCopia(): void {
    // Crear notificación temporal
    const notificacion = document.createElement('div');
    notificacion.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50 text-sm';
    notificacion.textContent = '📋 Número de retención copiado';
    document.body.appendChild(notificacion);

    setTimeout(() => {
      document.body.removeChild(notificacion);
    }, 3000);
  }

  // ============================================================================
  // GENERADORES DE CONTENIDO
  // ============================================================================

  private generarContenidoDetalleRetencion(retencion: RetencionFactura): string {
    return `
=== DETALLE DE RETENCIÓN ===
ID: ${retencion.id}
Número: ${retencion.numero_retencion}
Tipo: ${retencion.tipo_nombre} (${retencion.tipo_codigo})

=== MONTOS ===
Monto Retenido: ${this.formatearMonto(retencion.monto)}
${retencion.porcentaje ? `Porcentaje: ${retencion.porcentaje}%` : ''}
${retencion.base_calculo ? `Base de Cálculo: ${this.formatearMonto(retencion.base_calculo)}` : ''}

=== FECHAS ===
Fecha de Retención: ${this.formatearFecha(retencion.fecha_retencion)}
Fecha de Creación: ${this.formatearFecha(retencion.fecha_creacion)}
Última Actualización: ${this.formatearFecha(retencion.fecha_actualizacion)}

=== INFORMACIÓN ADICIONAL ===
${retencion.detalles ? `Detalles: ${retencion.detalles}` : 'Sin detalles adicionales'}
${retencion.documento_soporte ? `Documento: ${retencion.documento_soporte}` : 'Sin documento soporte'}
${retencion.creado_por ? `Creado por: ${retencion.creado_por}` : ''}
    `.trim();
  }

  // ============================================================================
  // UTILIDADES DE VALIDACIÓN
  // ============================================================================

  esRetencionCompleta(retencion: RetencionFactura): boolean {
    return !!(
      retencion.numero_retencion &&
      retencion.monto > 0 &&
      retencion.fecha_retencion &&
      retencion.tipo_retencion_id
    );
  }

  necesitaDocumentacion(retencion: RetencionFactura): boolean {
    // Determinar si según el tipo de retención necesita documentación
    const tiposQueRequierenDoc = ['ISR', 'IVA'];
    return tiposQueRequierenDoc.includes(retencion.tipo_codigo || '') && !retencion.documento_soporte;
  }

  // ============================================================================
  // EXPORTACIÓN
  // ============================================================================

  exportarRetencionesCSV(): void {
    const csvData = this.generarCSVRetenciones();
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `retenciones_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private generarCSVRetenciones(): string {
    const headers = [
      'ID', 'Numero_Retencion', 'Tipo_Codigo', 'Tipo_Nombre', 'Monto',
      'Porcentaje', 'Base_Calculo', 'Fecha_Retencion', 'Detalles',
      'Documento_Soporte', 'Creado_Por', 'Fecha_Creacion'
    ];

    const rows = this.retenciones.map(retencion => [
      retencion.id,
      retencion.numero_retencion,
      retencion.tipo_codigo || '',
      `"${retencion.tipo_nombre || ''}"`,
      retencion.monto,
      retencion.porcentaje || '',
      retencion.base_calculo || '',
      retencion.fecha_retencion,
      `"${retencion.detalles || ''}"`,
      retencion.documento_soporte || '',
      retencion.creado_por || '',
      retencion.fecha_creacion
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  // ============================================================================
  // GETTERS PARA ESTADÍSTICAS AVANZADAS
  // ============================================================================

  get estadisticasRetenciones(): {
    total: number;
    montoTotal: number;
    montoPromedio: number;
    tipoMasFrecuente: string;
    porcentajeMayor: number;
    documentosConSoporte: number;
    porcentajeConSoporte: number;
  } {
    if (this.retenciones.length === 0) {
      return {
        total: 0,
        montoTotal: 0,
        montoPromedio: 0,
        tipoMasFrecuente: 'N/A',
        porcentajeMayor: 0,
        documentosConSoporte: 0,
        porcentajeConSoporte: 0
      };
    }

    const distribucion = this.obtenerDistribucionTipos();
    const tipoMasFrecuente = distribucion.length > 0 ? distribucion[0].codigo : 'N/A';
    const porcentajeMayor = Math.max(...this.retenciones.map(r => r.porcentaje || 0));
    const documentosConSoporte = this.retenciones.filter(r => r.documento_soporte).length;

    return {
      total: this.retenciones.length,
      montoTotal: this.calcularTotalRetenciones(),
      montoPromedio: this.calcularPromedioRetenciones(),
      tipoMasFrecuente,
      porcentajeMayor,
      documentosConSoporte,
      porcentajeConSoporte: Math.round((documentosConSoporte / this.retenciones.length) * 100)
    };
  }

  // ============================================================================
  // FILTROS Y BÚSQUEDA
  // ============================================================================

  filtrarPorTipo(tipoCodigo: string): RetencionFactura[] {
    return this.retenciones.filter(r => r.tipo_codigo === tipoCodigo);
  }

  filtrarPorRangoMonto(minimo: number, maximo: number): RetencionFactura[] {
    return this.retenciones.filter(r => r.monto >= minimo && r.monto <= maximo);
  }

  buscarPorNumero(termino: string): RetencionFactura[] {
    const terminoLower = termino.toLowerCase();
    return this.retenciones.filter(r =>
      r.numero_retencion.toLowerCase().includes(terminoLower)
    );
  }

  // ============================================================================
  // UTILIDADES DE ORDENAMIENTO
  // ============================================================================

  ordenarPorMonto(ascendente: boolean = true): RetencionFactura[] {
    return [...this.retenciones].sort((a, b) =>
      ascendente ? a.monto - b.monto : b.monto - a.monto
    );
  }

  ordenarPorFecha(ascendente: boolean = true): RetencionFactura[] {
    return [...this.retenciones].sort((a, b) => {
      const fechaA = new Date(a.fecha_retencion).getTime();
      const fechaB = new Date(b.fecha_retencion).getTime();
      return ascendente ? fechaA - fechaB : fechaB - fechaA;
    });
  }

  ordenarPorTipo(): RetencionFactura[] {
    return [...this.retenciones].sort((a, b) =>
      (a.tipo_codigo || '').localeCompare(b.tipo_codigo || '')
    );
  }

  // ============================================================================
  // VALIDACIONES ADICIONALES
  // ============================================================================

  validarCoherenciaRetencion(retencion: RetencionFactura): { esValida: boolean; errores: string[] } {
    const errores: string[] = [];

    // Validar monto vs porcentaje y base
    if (retencion.porcentaje && retencion.base_calculo) {
      const montoCalculado = (retencion.base_calculo * retencion.porcentaje) / 100;
      const diferencia = Math.abs(montoCalculado - retencion.monto);

      if (diferencia > 0.01) { // Tolerancia de 1 centavo
        errores.push(`Monto inconsistente: calculado Q${montoCalculado.toFixed(2)}, registrado Q${retencion.monto.toFixed(2)}`);
      }
    }

    // Validar fecha de retención
    const fechaRetencion = new Date(retencion.fecha_retencion);
    const hoy = new Date();

    if (fechaRetencion > hoy) {
      errores.push('La fecha de retención no puede ser futura');
    }

    // Validar según tipo de retención
    const tipo = this.tiposRetencion.find(t => t.id === retencion.tipo_retencion_id);
    if (tipo?.requiere_autorizacion && !retencion.documento_soporte) {
      errores.push('Este tipo de retención requiere documento soporte');
    }

    return {
      esValida: errores.length === 0,
      errores
    };
  }

  obtenerRetencionesProblemáticas(): RetencionFactura[] {
    return this.retenciones.filter(retencion => {
      const validacion = this.validarCoherenciaRetencion(retencion);
      return !validacion.esValida;
    });
  }

  // ============================================================================
  // UTILIDADES DE FORMATO AVANZADAS
  // ============================================================================

  formatearPorcentaje(porcentaje: number | null | undefined): string {
    if (!porcentaje && porcentaje !== 0) return 'N/A';
    return `${porcentaje.toFixed(2)}%`;
  }

  obtenerColorPorMonto(monto: number): string {
    // Colores basados en rangos de monto
    if (monto >= 10000) return 'text-red-700 font-bold';
    if (monto >= 5000) return 'text-red-600 font-semibold';
    if (monto >= 1000) return 'text-red-500';
    return 'text-red-400';
  }

  calcularImpactoRelativo(monto: number): string {
    const total = this.calcularTotalRetenciones();
    if (total === 0) return '0%';

    const porcentaje = (monto / total) * 100;
    return `${porcentaje.toFixed(1)}%`;
  }

  // ============================================================================
  // ACCIONES MASIVAS
  // ============================================================================

  seleccionarTodas(): RetencionFactura[] {
    return [...this.retenciones];
  }

  exportarSeleccionadas(retencionesSeleccionadas: RetencionFactura[]): void {
    if (retencionesSeleccionadas.length === 0) {
      alert('No hay retenciones seleccionadas para exportar');
      return;
    }

    const csvData = this.generarCSVRetencionesSeleccionadas(retencionesSeleccionadas);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `retenciones_seleccionadas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private generarCSVRetencionesSeleccionadas(retenciones: RetencionFactura[]): string {
    const headers = [
      'ID', 'Numero_Retencion', 'Tipo', 'Monto', 'Porcentaje',
      'Fecha_Retencion', 'Impacto_Relativo'
    ];

    const rows = retenciones.map(retencion => [
      retencion.id,
      retencion.numero_retencion,
      retencion.tipo_codigo || '',
      retencion.monto,
      retencion.porcentaje || '',
      retencion.fecha_retencion,
      this.calcularImpactoRelativo(retencion.monto)
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  // ============================================================================
  // INFORMACIÓN CONTEXTUAL PARA TOOLTIPS
  // ============================================================================

  obtenerInfoTooltip(retencion: RetencionFactura): string {
    const validacion = this.validarCoherenciaRetencion(retencion);
    const impacto = this.calcularImpactoRelativo(retencion.monto);

    let tooltip = `💰 Representa el ${impacto} del total retenido\n`;
    tooltip += `📅 ${this.calcularDiasDesdeCreacion(retencion.fecha_creacion)} días desde creación\n`;

    if (retencion.documento_soporte) {
      tooltip += `📎 Con documento soporte\n`;
    }

    if (!validacion.esValida) {
      tooltip += `⚠️ ${validacion.errores.join(', ')}`;
    }

    return tooltip;
  }

  private calcularDiasDesdeCreacion(fechaCreacion: string): number {
    const fecha = new Date(fechaCreacion);
    const hoy = new Date();
    const diferencia = hoy.getTime() - fecha.getTime();
    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
  }

  // ============================================================================
  // INTEGRACIÓN CON COMPONENTES PADRE
  // ============================================================================

  notificarCambioTotal(): void {
    // Emitir evento personalizado si es necesario
    const eventoCustom = new CustomEvent('totalRetencionesChanged', {
      detail: {
        total: this.calcularTotalRetenciones(),
        cantidad: this.retenciones.length,
        distribucion: this.obtenerDistribucionTipos()
      }
    });

    document.dispatchEvent(eventoCustom);
  }

  // ============================================================================
  // DEBUGGING Y DESARROLLO
  // ============================================================================

  mostrarEstadisticasConsola(): void {
    console.group('📊 Estadísticas de Retenciones');
    console.log('Total retenciones:', this.retenciones.length);
    console.log('Monto total:', this.formatearMonto(this.calcularTotalRetenciones()));
    console.log('Distribución por tipo:', this.obtenerDistribucionTipos());
    console.log('Problemáticas:', this.obtenerRetencionesProblemáticas());
    console.log('Estadísticas completas:', this.estadisticasRetenciones);
    console.groupEnd();
  }
}