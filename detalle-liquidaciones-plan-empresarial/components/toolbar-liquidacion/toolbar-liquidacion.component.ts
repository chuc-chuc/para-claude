import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

@Component({
  selector: 'app-toolbar-liquidacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './toolbar-liquidacion.component.html'
})
export class ToolbarLiquidacionComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();

  @Input() isLoading = false;
  @Input() estadoLiquidacion: string | null = null;
  @Input() ocultarBotonLiquidar = false;
  @Input() searchText = '';

  @Output() buscarDTE = new EventEmitter<string>();
  @Output() liquidarClick = new EventEmitter<void>();
  @Output() registrarFacturaClick = new EventEmitter<void>();
  @Output() limpiarClick = new EventEmitter<void>();

  // No uses disabled en el template; contrólalo desde el FormControl
  searchControl = new FormControl<string>('', { nonNullable: true });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isLoading']) {
      if (this.isLoading) {
        this.searchControl.disable({ emitEvent: false });
      } else {
        this.searchControl.enable({ emitEvent: false });
      }
    }
    if (changes['searchText'] && !changes['searchText'].firstChange) {
      this.searchControl.setValue(this.searchText || '', { emitEvent: false });
    }
  }

  ngOnInit() {
    // Estado inicial
    if (this.isLoading) this.searchControl.disable({ emitEvent: false });
    this.searchControl.setValue(this.searchText || '', { emitEvent: false });

    // Espera 2s antes de emitir la búsqueda
    this.searchControl.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(2000), distinctUntilChanged())
      .subscribe((texto) => this.buscarDTE.emit((texto || '').trim()));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  limpiar() {
    this.searchControl.setValue('');
    this.limpiarClick.emit();
  }
}