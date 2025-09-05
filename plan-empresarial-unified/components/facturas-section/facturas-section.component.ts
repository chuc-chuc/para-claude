import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal, computed, output } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';

import { PlanEmpresarialService } from '../../services/plan-empresarial.service';
import { ModalRegistrarFacturaComponent } from './modals/modal-registrar-factura.component';
import { ModalSolicitarAutorizacionComponent } from './modals/modal-solicitar-autorizacion.component';

import {
  FacturaPE,
  AutorizacionEstado,
  ValidacionVencimiento,
  RegistrarFacturaPayload,
  SolicitarAutorizacionFacturaPayload
} from '../../models/plan-empresarial.models';

/**
 * Sección de gestión de facturas - Estilo minimalista y funcional
 * Incluye búsqueda, visualización de detalles, registro y autorización
 */
@Component({
  selector: 'app-factura-section',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalRegistrarFacturaComponent,
    ModalSolicitarAutorizacionComponent
  ],
  template: `
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 class="text-sm font-medium text-gray-900">Gestión de Facturas</h2>
        
        <div class="flex items-center gap-2">
          <!-- Indicador de estado -->
          <div *ngIf="facturaActiva()" class="flex items-center gap-2 px-2 py-1 bg-blue-50 rounded-md">
            <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span class="text-xs font-medium text-blue-700">{{ facturaActiva()?.numero_dte }}</span>
          </div>
          
          <!-- Botón registrar nueva -->
          <button 
            (click)="abrirModalRegistrar()"
            class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
            title="Registrar nueva factura">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Buscador -->
      <div class="p-4 border-b border-gray-100">
        <div class="flex gap-2">
          <div class="flex-1 relative">
            <input
              [formControl]="searchControl"
              type="search"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Buscar por número DTE (mín. 3 caracteres)"
              [class.border-red-300]="searchControl.invalid && searchControl.touched">
            
            <!-- Loading indicator en el input -->
            <div *ngIf="cargandoFactura()" 
                 class="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div class="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          </div>
          
          <button
            (click)="buscarManual()"
            [disabled]="!searchControl.valid || cargandoFactura()"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors">
            Buscar
          </button>
        </div>
        
        <!-- Error de validación -->
        <div *ngIf="searchControl.invalid && searchControl.touched" class="mt-1 text-xs text-red-600">
          Mínimo 3 caracteres requeridos
        </div>
      </div>

      <!-- Contenido principal -->
      <div class="p-4">
        <!-- Loading global -->
        <div *ngIf="cargandoFactura()" class="text-center py-8">
          <div class="inline-flex items-center gap-2 text-gray-500">
            <div class="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            <span class="text-sm">Buscando factura...</span>
          </div>
        </div>

        <!-- Sin factura -->
        <div *ngIf="!cargandoFactura() && !facturaActiva()" class="text-center py-8">
          <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <p class="text-sm text-gray-600">Busque una factura para ver sus detalles</p>
        </div>

        <!-- Detalle de factura -->
        <div *ngIf="!cargandoFactura() && facturaActiva() as factura" class="space-y-4">
          
          <!-- Badges de estado -->
          <div class="flex flex-wrap gap-2">
            <!-- Estado liquidación -->
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  [ngClass]="obtenerClaseEstadoLiquidacion(factura.estado_liquidacion)">
              {{ factura.estado_liquidacion }}
            </span>
            
            <!-- Estado vencimiento -->
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  [ngClass]="obtenerClaseVencimiento()">
              <span *ngIf="cargandoValidacion()">Validando...</span>
              <span *ngIf="!cargandoValidacion() && validacionVencimiento()">
                {{ validacionVencimiento()!.excedeDias ? 'Fuera de tiempo' : 'Dentro de tiempo' }}
                ({{ validacionVencimiento()!.diasTranscurridos }} días)
              </span>
              <span *ngIf="!cargandoValidacion() && !validacionVencimiento()">Sin validar</span>
            </span>
            
            <!-- Estado autorización -->
            <span *ngIf="factura.estado_autorizacion && factura.estado_autorizacion !== 'ninguna'"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  [ngClass]="obtenerClaseAutorizacion(factura.estado_autorizacion)">
              {{ factura.estado_autorizacion | titlecase }}
            </span>
          </div>
          
          <!-- Información básica -->
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-500">Número DTE:</span>
              <p class="font-medium text-gray-900">{{ factura.numero_dte }}</p>
            </div>
            <div>
              <span class="text-gray-500">Fecha Emisión:</span>
              <p class="font-medium text-gray-900">{{ factura.fecha_emision | date:'dd/MM/yyyy' }}</p>
            </div>
            <div>
              <span class="text-gray-500">Tipo DTE:</span>
              <p class="font-medium text-gray-900">{{ factura.tipo_dte }}</p>
            </div>
            <div>
              <span class="text-gray-500">Autorización:</span>
              <p class="font-medium text-gray-900">{{ factura.numero_autorizacion }}</p>
            </div>
            <div class="col-span-2">
              <span class="text-gray-500">Emisor:</span>
              <p class="font-medium text-gray-900">{{ factura.nombre_emisor }}</p>
            </div>
            <div>
              <span class="text-gray-500">Monto Total:</span>
              <p class="font-semibold text-gray-900">
                {{ factura.moneda === 'USD' ? '$' : 'Q' }}{{ factura.monto_total | number:'1.2-2' }}
              </p>
            </div>
            <div>
              <span class="text-gray-500">Monto Liquidado:</span>
              <p class="font-semibold text-green-600">
                {{ factura.moneda === 'USD' ? '$' : 'Q' }}{{ (factura.monto_liquidado || 0) | number:'1.2-2' }}
              </p>
            </div>
          </div>

          <!-- Información de vencimiento -->
          <div *ngIf="validacionVencimiento()" 
               class="p-3 rounded-md border"
               [ngClass]="obtenerClaseVencimiento()">
            <div class="text-sm">
              <div class="font-medium mb-1">Estado de Vencimiento</div>
              <p class="text-xs opacity-90">{{ validacionVencimiento()!.mensaje }}</p>
              
              <div class="mt-2 text-xs space-y-1">
                <div><strong>Días transcurridos:</strong> {{ validacionVencimiento()!.diasTranscurridos }}</div>
                <div *ngIf="validacionVencimiento()!.fechaInicioCalculo">
                  <strong>Cálculo desde:</strong> {{ validacionVencimiento()!.fechaInicioCalculo | date:'dd/MM/yyyy' }}
                </div>
              </div>
            </div>
          </div>

          <!-- Información de autorización -->
          <div *ngIf="factura.estado_autorizacion && factura.estado_autorizacion !== 'ninguna'"
               class="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div class="text-sm">
              <div class="font-medium text-amber-800 mb-2">Información de Autorización</div>
              <div class="space-y-1 text-xs text-amber-700">
                <div><strong>Estado:</strong> {{ factura.estado_autorizacion | titlecase }}</div>
                <div *ngIf="factura.motivo_autorizacion">
                  <strong>Motivo:</strong> {{ factura.motivo_autorizacion }}
                </div>
                <div *ngIf="factura.fecha_solicitud">
                  <strong>Fecha solicitud:</strong> {{ factura.fecha_solicitud | date:'dd/MM/yyyy HH:mm' }}
                </div>
                <div *ngIf="factura.fecha_autorizacion">
                  <strong>Fecha autorización:</strong> {{ factura.fecha_autorizacion | date:'dd/MM/yyyy HH:mm' }}
                </div>
                <div *ngIf="factura.comentarios_autorizacion">
                  <strong>Comentarios:</strong> {{ factura.comentarios_autorizacion }}
                </div>
              </div>
            </div>
          </div>

          <!-- Acciones -->
          <div class="flex gap-2 pt-2">
            <!-- Botón principal de acción -->
            <button *ngIf="puedeActuar(factura)"
                    (click)="ejecutarAccionPrincipal(factura)"
                    class="flex-1 px-4 py-2 text-sm font-medium text-white rounded-md transition-colors"
                    [ngClass]="obtenerClaseBotonPrincipal(factura)">
              {{ obtenerTextoBotonPrincipal(factura) }}
            </button>
            
            <!-- Botón solicitar autorización -->
            <button *ngIf="requiereAutorizacion(factura)"
                    (click)="abrirModalAutorizacion()"
                    class="px-4 py-2 text-sm font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 rounded-md transition-colors">
              Solicitar Autorización
            </button>
          </div>
        </div>
      </div>

      <!-- Modales -->
      <app-modal-registrar-factura
        *ngIf="mostrarModalRegistrar()"
        (cerrar)="cerrarModalRegistrar()"
        (facturaRegistrada)="onFacturaRegistrada($event)">
      </app-modal-registrar-factura>

      <app-modal-solicitar-autorizacion
        *ngIf="mostrarModalAutorizacion() && facturaActiva() as factura"
        [numeroDte]="factura.numero_dte"
        [fechaEmision]="factura.fecha_emision"
        [diasTranscurridos]="validacionVencimiento()?.diasTranscurridos || 0"
        (cerrar)="cerrarModalAutorizacion()"
        (solicitudEnviada)="onSolicitudEnviada()">
      </app-modal-solicitar-autorizacion>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    /* Animaciones suaves para transiciones */
    .transition-colors {
      transition-property: color, background-color, border-color;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      transition-duration: 150ms;
    }
    
    /* Estado loading en input */
    input:disabled {
      background-color: #f9fafb;
      cursor: not-allowed;
    }
    
    /* Mejora visual para badges */
    .inline-flex {
      align-items: center;
    }
    
    /* Responsive adjustments */
    @media (max-width: 640px) {
      .grid-cols-2 {
        grid-template-columns: 1fr;
      }
      
      .flex {
        flex-direction: column;
      }
      
      .flex button {
        width: 100%;
      }
    }
  `]
})
export class FacturaSectionComponent implements OnInit, OnDestroy {

  // ============================================================================
  // DEPENDENCIAS Y ESTADO
  // ============================================================================

  private readonly servicio = inject(PlanEmpresarialService);

  // Outputs para comunicación con el dashboard
  readonly facturaSeleccionada = output<FacturaPE>();
  readonly buscarFactura = output<string>();
  readonly registrarFactura = output<RegistrarFacturaPayload>();
  readonly solicitarAutorizacion = output<SolicitarAutorizacionFacturaPayload>();

  // ============================================================================
  // SIGNALS DE ESTADO
  // ============================================================================

  // Estados del servicio
  readonly facturaActiva = computed(() => this.servicio.facturaActiva());
  readonly cargandoFactura = computed(() => this.servicio.cargandoFacturas());
  readonly validacionVencimiento = computed(() => this.servicio.validacionVencimiento());
  readonly cargandoValidacion = signal(false);

  // Estados de UI
  readonly mostrarModalRegistrar = signal(false);
  readonly mostrarModalAutorizacion = signal(false);

  // Control de búsqueda
  readonly searchControl = new FormControl('', [
    Validators.required,
    Validators.minLength(3)
  ]);

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  ngOnInit(): void {
    this.configurarBusquedaAutomatica();
  }

  ngOnDestroy(): void {
    // La limpieza se maneja automáticamente con takeUntilDestroyed
  }

  // ============================================================================
  // CONFIGURACIÓN DE BÚSQUEDA
  // ============================================================================

  private configurarBusquedaAutomatica(): void {
    this.searchControl.valueChanges.pipe(
      takeUntilDestroyed(),
      debounceTime(1500), // Esperar 1.5s después de que el usuario deje de escribir
      distinctUntilChanged(),
      filter(value => !!value && value.length >= 3) // Solo buscar con 3+ caracteres
    ).subscribe(value => {
      this.buscarFacturaInterno(value.trim());
    });
  }

  // ============================================================================
  // MÉTODOS DE BÚSQUEDA
  // ============================================================================

  buscarManual(): void {
    const valor = this.searchControl.value?.trim();
    if (valor && this.searchControl.valid) {
      this.buscarFacturaInterno(valor);
    }
  }

  private buscarFacturaInterno(numeroDte: string): void {
    if (!numeroDte) return;

    // Emitir evento hacia el dashboard/servicio
    this.buscarFactura.emit(numeroDte);

    // También buscar directamente en el servicio
    this.servicio.buscarFactura(numeroDte).subscribe(factura => {
      if (factura) {
        this.facturaSeleccionada.emit(factura);
      }
    });
  }

  limpiarBusqueda(): void {
    this.searchControl.setValue('');
    this.servicio.limpiarFactura();
  }

  // ============================================================================
  // GESTIÓN DE MODALES
  // ============================================================================

  abrirModalRegistrar(): void {
    this.mostrarModalRegistrar.set(true);
  }

  cerrarModalRegistrar(): void {
    this.mostrarModalRegistrar.set(false);
  }

  abrirModalAutorizacion(): void {
    this.mostrarModalAutorizacion.set(true);
  }

  cerrarModalAutorizacion(): void {
    this.mostrarModalAutorizacion.set(false);
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  onFacturaRegistrada(payload: RegistrarFacturaPayload): void {
    this.cerrarModalRegistrar();
    this.registrarFactura.emit(payload);

    // Buscar la factura recién registrada después de un breve delay
    setTimeout(() => {
      this.searchControl.setValue(payload.numero_dte);
      this.buscarFacturaInterno(payload.numero_dte);
    }, 1000);
  }

  onSolicitudEnviada(): void {
    this.cerrarModalAutorizacion();

    // Refrescar la factura actual
    const factura = this.facturaActiva();
    if (factura) {
      setTimeout(() => {
        this.buscarFacturaInterno(factura.numero_dte);
      }, 1000);
    }
  }

  // ============================================================================
  // LÓGICA DE ESTADO Y ACCIONES
  // ============================================================================

  puedeActuar(factura: FacturaPE): boolean {
    if (factura.estado_liquidacion === 'Liquidado') return false;
    return this.puedeLiquidar(factura) || this.requiereAutorizacion(factura);
  }

  puedeLiquidar(factura: FacturaPE): boolean {
    const validacion = this.validacionVencimiento();

    if (!validacion) return true; // Si no hay validación, permitir

    if (validacion.requiereAutorizacion) {
      return factura.estado_autorizacion === AutorizacionEstado.Aprobada;
    }

    return !validacion.excedeDias;
  }

  requiereAutorizacion(factura: FacturaPE): boolean {
    const validacion = this.validacionVencimiento();
    return validacion?.requiereAutorizacion === true &&
      factura.estado_autorizacion !== AutorizacionEstado.Aprobada;
  }

  ejecutarAccionPrincipal(factura: FacturaPE): void {
    if (this.requiereAutorizacion(factura)) {
      this.abrirModalAutorizacion();
    } else if (this.puedeLiquidar(factura)) {
      // Emitir evento para indicar que se puede proceder con la liquidación
      this.facturaSeleccionada.emit(factura);
    }
  }

  // ============================================================================
  // UTILIDADES DE ESTILO
  // ============================================================================

  obtenerClaseEstadoLiquidacion(estado?: string): string {
    const clases = {
      'Pendiente': 'bg-yellow-100 text-yellow-800',
      'En Revisión': 'bg-blue-100 text-blue-800',
      'Liquidado': 'bg-green-100 text-green-800'
    };
    return clases[estado as keyof typeof clases] || 'bg-gray-100 text-gray-800';
  }

  obtenerClaseVencimiento(): string {
    const validacion = this.validacionVencimiento();
    if (this.cargandoValidacion()) return 'bg-gray-50 border-gray-200 text-gray-600';
    if (!validacion) return 'bg-gray-50 border-gray-200 text-gray-600';

    return validacion.excedeDias
      ? 'bg-red-50 border-red-200 text-red-700'
      : 'bg-green-50 border-green-200 text-green-700';
  }

  obtenerClaseAutorizacion(estado?: AutorizacionEstado): string {
    const clases = {
      [AutorizacionEstado.Aprobada]: 'bg-green-100 text-green-800',
      [AutorizacionEstado.Pendiente]: 'bg-amber-100 text-amber-800',
      [AutorizacionEstado.Rechazada]: 'bg-red-100 text-red-800',
      [AutorizacionEstado.Ninguna]: 'bg-gray-100 text-gray-800'
    };
    return clases[estado || AutorizacionEstado.Ninguna] || 'bg-gray-100 text-gray-800';
  }

  obtenerClaseBotonPrincipal(factura: FacturaPE): string {
    if (this.requiereAutorizacion(factura)) {
      return 'bg-orange-600 hover:bg-orange-700';
    }
    return 'bg-green-600 hover:bg-green-700';
  }

  obtenerTextoBotonPrincipal(factura: FacturaPE): string {
    if (this.requiereAutorizacion(factura)) {
      return 'Solicitar Autorización';
    }
    return 'Proceder a Liquidar';
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS PARA CONTROL EXTERNO
  // ============================================================================

  /**
   * Permite buscar una factura específica desde el exterior
   */
  buscarFacturaPorDTE(numeroDte: string): void {
    this.searchControl.setValue(numeroDte);
    this.buscarFacturaInterno(numeroDte);
  }

  /**
   * Obtiene la factura actualmente cargada
   */
  obtenerFacturaActual(): FacturaPE | null {
    return this.facturaActiva();
  }

  /**
   * Verifica si hay una búsqueda en curso
   */
  estaBuscando(): boolean {
    return this.cargandoFactura();
  }

  /**
   * Obtiene el texto de búsqueda actual
   */
  obtenerTextoBusqueda(): string {
    return this.searchControl.value || '';
  }
}