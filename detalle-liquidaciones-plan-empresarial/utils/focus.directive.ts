// utils/focus.directive.ts
import { AfterViewInit, Directive, ElementRef, Input } from '@angular/core';

/**
 * AutoFocus y/o Select al cargar el elemento.
 * Uso:
 *   <input appFocus [focusDelay]="100" [selectOnFocus]="true" />
 */
@Directive({
    selector: '[appFocus]',
    standalone: true
})
export class FocusDirective implements AfterViewInit {
    @Input() focusDelay = 0;
    @Input() selectOnFocus = false;

    constructor(private el: ElementRef<HTMLElement>) { }

    ngAfterViewInit(): void {
        const doFocus = () => {
            this.el.nativeElement.focus();
            if (this.selectOnFocus && this.el.nativeElement instanceof HTMLInputElement) {
                this.el.nativeElement.select();
            }
        };

        if (this.focusDelay > 0) {
            setTimeout(doFocus, this.focusDelay);
        } else {
            // Siguiente tick
            setTimeout(doFocus);
        }
    }
}