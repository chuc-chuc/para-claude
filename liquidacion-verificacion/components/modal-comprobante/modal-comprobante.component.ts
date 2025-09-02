// ============================================================================
// MODAL COMPROBANTE - INDIVIDUAL Y MASIVO (CORREGIDO)
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  DetalleConOrden,
  Agencia,
  formatearMonto,
  validarComprobante,
  obtenerResumenSeleccion
} from '../../models/liquidacion-verificacion.models';

@Component({
  selector: 'app-modal-comprobante',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">

        <!-- Header -->
        <div class="px-6 py-4 border-b sticky top-0 bg-white">
          <div class="flex justify-between items-center">
            <div>
              <h3 class="text-lg font-semibold">
                {{ obtenerTituloModal() }}
              </h3>
              <p class="text-sm text-gray-600 mt-1">
                {{ obtenerDescripcionModal() }}
              </p>
            </div>
            <button (click)="cerrar.emit()" class="text-gray-400 hover:text-gray-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Contenido -->
        <div class="px-6 py-4">

          <!-- Resumen de Selección -->
          <div class="bg-blue-50 rounded-lg p-4 mb-6">
            <div class="flex items-center gap-3 mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-blue-600">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                <polyline points="9,9 9,15"/>
                <polyline points="15,9 15,15"/>
              </svg>
              <h4 class="font-medium text-blue-800">Detalles Seleccionados</h4>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span class="text-blue-600 font-medium">Total Detalles:</span>
                <p class="font-bold text-blue-800">{{ resumen().totalDetalles }}</p>
              </div>
              <div>
                <span class="text-blue-600 font-medium">Monto Total:</span>
                <p class="font-bold text-green-600">{{ formatearMonto(resumen().totalMonto) }}</p>
              </div>
              <div>
                <span class="text-blue-600 font-medium">Órdenes:</span>
                <p class="font-bold text-blue-800">{{ resumen().ordenes.size }}</p>
              </div>
              <div *ngIf="modo === 'masivo'">
                <span class="text-blue-600 font-medium">Facturas:</span>
                <p class="font-bold text-blue-800">{{ obtenerFacturasUnicas() }}</p>
              </div>
            </div>
          </div>

          <!-- Lista de Detalles (Expandible) -->
          <div class="border rounded-lg mb-6">
            <div class="px-4 py-3 bg-gray-50 border-b cursor-pointer" (click)="toggleMostrarDetalles()">
              <div class="flex justify-between items-center">
                <h4 class="font-medium text-gray-800">Ver Detalles Seleccionados</h4>
                <svg 
                  width="20" height="20" viewBox="0 0 24 24" fill="none" 
                  stroke="currentColor" stroke-width="2"
                  [class.rotate-180]="mostrarDetalles()">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>

            <div *ngIf="mostrarDetalles()" class="max-h-60 overflow-y-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 sticky top-0">
                  <tr>
                    <th class="px-3 py-2 text-left font-medium text-gray-700">Orden</th>
                    <th class="px-3 py-2 text-left font-medium text-gray-700">Descripción</th>
                    <th class="px-3 py-2 text-right font-medium text-gray-700">Monto</th>
                    <th class="px-3 py-2 text-left font-medium text-gray-700">Estado</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr *ngFor="let detalle of detalles" class="hover:bg-gray-50">
                    <td class="px-3 py-2">
                      <div class="font-medium">#{{ detalle.numero_orden }}</div>
                      <div class="text-xs text-gray-500">{{ detalle.orden.area_nombre }}</div>
                    </td>
                    <td class="px-3 py-2">
                      <div class="max-w-xs truncate" [title]="detalle.descripcion">
                        {{ detalle.descripcion }}
                      </div>
                      <div class="text-xs text-gray-500">{{ detalle.orden.tipo_presupuesto }}</div>
                    </td>
                    <td class="px-3 py-2 text-right font-semibold">
                      {{ formatearMonto(detalle.monto) }}
                    </td>
                    <td class="px-3 py-2">
                      <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                        [ngClass]="obtenerColorEstado(detalle.estado_verificacion)">
                        {{ obtenerTextoEstadoDetalle(detalle.estado_verificacion) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Formulario -->
          <form [formGroup]="formulario" class="space-y-6">

            <!-- Comprobante Contabilidad -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Número de Comprobante *
              </label>
              <input 
                type="text" 
                formControlName="comprobante_contabilidad" 
                placeholder="Ej: COMP-2024-001234"
                class="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                [class.border-red-300]="esInvalido('comprobante_contabilidad')">
              
              <div *ngIf="esInvalido('comprobante_contabilidad')" class="text-red-500 text-sm mt-1">
                <div *ngIf="formulario.get('comprobante_contabilidad')?.errors?.['required']">
                  El comprobante es obligatorio
                </div>
                <div *ngIf="formulario.get('comprobante_contabilidad')?.errors?.['minlength']">
                  El comprobante debe tener al menos 3 caracteres
                </div>
                <div *ngIf="formulario.get('comprobante_contabilidad')?.errors?.['pattern']">
                  Solo se permiten letras, números y guiones
                </div>
              </div>

              <!-- Validación en tiempo real -->
              <div *ngIf="mensajeValidacionComprobante()" 
                   class="mt-1 p-2 rounded text-sm"
                   [class.bg-red-50]="!validacionComprobanteOk()"
                   [class.text-red-700]="!validacionComprobanteOk()"
                   [class.bg-green-50]="validacionComprobanteOk()"
                   [class.text-green-700]="validacionComprobanteOk()">
                {{ mensajeValidacionComprobante() }}
              </div>
            </div>

            <!-- Agencia del Gasto -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Agencia del Gasto
              </label>
              <select 
                formControlName="agencia_gasto_id"
                class="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccione una agencia (opcional)</option>
                <option *ngFor="let agencia of agencias" [value]="agencia.id">
                  {{ agencia.nombre }}
                  <span *ngIf="agencia.direccion"> - {{ agencia.direccion }}</span>
                </option>
              </select>
            </div>

            <!-- Fecha de Registro -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Registro Contable
              </label>
              <input 
                type="date" 
                formControlName="fecha_registro_contabilidad"
                [max]="fechaMaxima"
                class="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>

            <!-- Número de Acta -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Número de Acta (Opcional)
              </label>
              <input 
                type="text" 
                formControlName="numero_acta" 
                placeholder="Ej: ACTA-2024-056"
                class="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>

            <!-- Observaciones (solo para masivo) -->
            <div *ngIf="modo === 'masivo'">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea 
                formControlName="observaciones"
                rows="3"
                placeholder="Observaciones adicionales para la asignación masiva..."
                class="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
            </div>
          </form>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
          <!-- Información -->
          <div class="text-sm text-gray-600">
            {{ obtenerTextoFooter() }}
          </div>

          <!-- Acciones -->
          <div class="flex gap-3">
            <button 
              type="button" 
              (click)="cerrar.emit()"
              class="px-4 py-2 text-gray-700 bg-white border rounded-md hover:bg-gray-50">
              Cancelar
            </button>
            
            <button 
              type="button" 
              (click)="confirmar()"
              [disabled]="formulario.invalid || !validacionComprobanteOk() || guardando()"
              class="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              
              <!-- Loading Spinner -->
              <div *ngIf="guardando()"
                   class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full">
              </div>
              
              <!-- Icono -->
              <svg *ngIf="!guardando()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              
              {{ guardando() ? 'Procesando...' : 'Asignar Comprobante' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ModalComprobanteComponent implements OnInit {
  @Input() modo: 'individual' | 'masivo' = 'individual';
  @Input() detalles: DetalleConOrden[] = [];
  @Input() agencias: Agencia[] = [];

  @Output() cerrar = new EventEmitter<void>();
  @Output() confirmado = new EventEmitter<any>();

  readonly guardando = signal<boolean>(false);
  readonly mostrarDetalles = signal<boolean>(false);
  readonly mensajeValidacionComprobante = signal<string>('');
  readonly validacionComprobanteOk = signal<boolean>(false);

  readonly formatearMonto = formatearMonto;

  formulario!: FormGroup;

  constructor(private fb: FormBuilder) {
    this.inicializarFormulario();
  }

  ngOnInit(): void {
    this.configurarValidacionComprobante();
  }

  // ============================================================================
  // INICIALIZACIÓN
  // ============================================================================

  private inicializarFormulario(): void {
    this.formulario = this.fb.group({
      comprobante_contabilidad: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        Validators.pattern(/^[A-Za-z0-9\-_]+$/)
      ]],
      agencia_gasto_id: [''],
      fecha_registro_contabilidad: [this.fechaHoy],
      numero_acta: [''],
      observaciones: ['']
    });
  }

  private configurarValidacionComprobante(): void {
    this.formulario.get('comprobante_contabilidad')?.valueChanges.subscribe(valor => {
      this.validarComprobanteEnTiempoReal(valor);
    });
  }

  private validarComprobanteEnTiempoReal(valor: string): void {
    const resultado = validarComprobante(valor);

    this.validacionComprobanteOk.set(resultado.valido);
    this.mensajeValidacionComprobante.set(resultado.mensaje || '');
  }

  // ============================================================================
  // CÁLCULOS Y RESÚMENES
  // ============================================================================

  resumen(): ReturnType<typeof obtenerResumenSeleccion> {
    return obtenerResumenSeleccion(this.detalles);
  }

  obtenerFacturasUnicas(): number {
    // Obtener facturas únicas (asumiendo que podemos extraerlo del contexto)
    const facturas = new Set(this.detalles.map(d => {
      // Idealmente esto vendría del modelo o contexto
      return d.numero_orden.substring(0, 3); // Placeholder
    }));
    return facturas.size;
  }

  // ============================================================================
  // MÉTODOS PARA EL TEMPLATE
  // ============================================================================

  obtenerTituloModal(): string {
    return this.modo === 'individual' ? 'Asignar Comprobante Individual' : 'Asignar Comprobante Masivo';
  }

  obtenerDescripcionModal(): string {
    if (this.modo === 'individual') {
      return 'Asignar comprobante a un detalle específico';
    } else {
      return 'Asignar comprobante a ' + this.detalles.length + ' detalles seleccionados';
    }
  }

  obtenerTextoFooter(): string {
    if (this.modo === 'individual') {
      return 'Asignación individual';
    } else {
      const resumen = this.resumen();
      return this.detalles.length + ' detalles • ' + this.formatearMonto(resumen.totalMonto);
    }
  }

  // ============================================================================
  // ACCIONES
  // ============================================================================

  toggleMostrarDetalles(): void {
    this.mostrarDetalles.set(!this.mostrarDetalles());
  }

  confirmar(): void {
    if (this.formulario.valid && this.validacionComprobanteOk()) {
      this.guardando.set(true);

      // Simular delay de procesamiento
      setTimeout(() => {
        this.guardando.set(false);
        this.confirmado.emit(this.formulario.value);
      }, 1500);
    }
  }

  // ============================================================================
  // UTILIDADES DE VALIDACIÓN
  // ============================================================================

  esInvalido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  // ============================================================================
  // UTILIDADES DE ESTILO
  // ============================================================================

  obtenerColorEstado(estado: string): string {
    const colores: Record<string, string> = {
      'pendiente': 'bg-yellow-100 text-yellow-800',
      'verificado': 'bg-green-100 text-green-800',
      'rechazado': 'bg-red-100 text-red-800'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800';
  }

  obtenerTextoEstadoDetalle(estado: string): string {
    const textos: Record<string, string> = {
      'pendiente': 'Pendiente',
      'verificado': 'Verificado',
      'rechazado': 'Rechazado'
    };
    return textos[estado] || estado;
  }

  // ============================================================================
  // UTILIDADES DE FECHA
  // ============================================================================

  get fechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  get fechaMaxima(): string {
    return this.fechaHoy;
  }

  // ============================================================================
  // INFORMACIÓN CONTEXTUAL
  // ============================================================================

  get textoConfirmacion(): string {
    if (this.modo === 'individual') {
      return 'Asignar el comprobante "' + this.formulario.value.comprobante_contabilidad + '" al detalle seleccionado';
    } else {
      return 'Asignar el comprobante "' + this.formulario.value.comprobante_contabilidad + '" a ' + this.detalles.length + ' detalles seleccionados';
    }
  }

  get resumenParaConfirmacion(): string {
    const resumen = this.resumen();
    return resumen.totalDetalles + ' detalles por un total de ' + this.formatearMonto(resumen.totalMonto);
  }

  // ============================================================================
  // VALIDACIONES AVANZADAS
  // ============================================================================

  validarConsistenciaDetalles(): { valido: boolean; advertencias: string[] } {
    const advertencias: string[] = [];

    // Verificar si hay detalles ya con comprobante
    const conComprobante = this.detalles.filter(d => d.comprobante_contabilidad);
    if (conComprobante.length > 0) {
      advertencias.push(conComprobante.length + ' detalles ya tienen comprobante asignado');
    }

    // Verificar si hay detalles de diferentes agencias
    const agenciasUnicas = new Set(this.detalles.map(d => d.orden.area_nombre));
    if (agenciasUnicas.size > 3) {
      advertencias.push('Los detalles pertenecen a ' + agenciasUnicas.size + ' áreas diferentes');
    }

    // Verificar montos muy diversos
    const montos = this.detalles.map(d => d.monto);
    const montoMin = Math.min(...montos);
    const montoMax = Math.max(...montos);
    if (montoMax / montoMin > 10) {
      advertencias.push('Hay gran variabilidad en los montos de los detalles');
    }

    return {
      valido: advertencias.length === 0,
      advertencias
    };
  }

  // ============================================================================
  // MÉTODOS DE UTILIDAD PARA EL TEMPLATE
  // ============================================================================

  obtenerIconoPorTipoPresupuesto(tipo: string): string {
    const iconos: Record<string, string> = {
      'Extraordinario': '🚨',
      'Regular': '📊',
      'Inversión': '🏗️',
      'Operativo': '⚙️'
    };
    return iconos[tipo] || '📋';
  }

  obtenerColorPorMonto(monto: number): string {
    if (monto >= 10000) return 'text-red-600 font-bold';
    if (monto >= 5000) return 'text-orange-600 font-semibold';
    if (monto >= 1000) return 'text-blue-600';
    return 'text-gray-600';
  }
}