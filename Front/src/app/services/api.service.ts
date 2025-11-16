import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Servicio para comunicarse con el backend PHP
 */
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  
  // URL base del backend (cambiar según tu configuración)
  private apiUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) { }

  /**
   * Obtiene la información de un invitado por su UUID
   */
  obtenerInvitado(uuid: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/invitaciones/info/${uuid}`);
  }

  /**
   * Confirma o declina la asistencia de un invitado
   */
  confirmarAsistencia(uuid: string, confirma: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/invitaciones/confirmar/${uuid}`, {
      confirma: confirma
    });
  }

  /**
   * Obtiene todos los invitados de un evento
   */
  obtenerInvitadosPorEvento(eventoId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/eventos/${eventoId}/invitados`);
  }

  /**
   * Crea un nuevo invitado
   */
  crearInvitado(eventoId: number, datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/eventos/${eventoId}/invitados`, datos);
  }

  /**
   * Obtiene las estadísticas de confirmaciones de un evento
   */
  obtenerEstadisticas(eventoId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/eventos/${eventoId}/estadisticas`);
  }
}
