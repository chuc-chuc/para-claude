// ============================================================================
// MODAL CONFIRMAR ELIMINACIÓN - SIMPLIFICADO CON CIERRE AL HACER CLIC FUERA
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';

@Component({
    selector: 'app-modal-confirmar-eliminacion',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50"
         (click)="onBackdropClick($event)">
      
      <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
           (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-red-50 rounded-lg">
              <svg class="text-red-500" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-800">{{ titulo }}</h3>
          </div>
          <button (click)="cancelar.emit()" 
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg class="text-gray-400" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Contenido -->
        <div class="p-4">
          <p class="text-sm text-gray-700 mb-6">{{ mensaje }}</p>
          
          <div class="flex justify-end gap-3">
            <button type="button" 
              (click)="cancelar.emit()"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">
              Cancelar
            </button>
            <button type="button" 
              (click)="confirmar.emit()"
              class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors">
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ModalConfirmarEliminacionComponent {
    @Input() titulo = 'Confirmar acción';
    @Input() mensaje = '¿Está seguro que desea continuar?';

    @Output() confirmar = new EventEmitter<void>();
    @Output() cancelar = new EventEmitter<void>();

    /**
     * Manejar clic en el backdrop para cerrar modal
     */
    @HostListener('click', ['$event'])
    onBackdropClick(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            this.cancelar.emit();
        }
    }

    /**
     * Cerrar con Escape
     */
    @HostListener('document:keydown.escape', ['$event'])
    onEscapeKey(event: KeyboardEvent): void {
        this.cancelar.emit();
    }
}