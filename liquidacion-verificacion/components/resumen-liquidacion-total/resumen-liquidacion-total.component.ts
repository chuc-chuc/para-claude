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
  templateUrl: './resumen-liquidacion-total.component.html',
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