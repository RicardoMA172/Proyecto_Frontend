import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

//Servicio para interactuar con la API de calidad del aire
@Injectable({
  providedIn: 'root'
})
export class CalidadAireService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  //PARA EL DASHBOARD
  getDashboard(): Observable<any> { return this.http.get(`${this.apiUrl}/dashboard`); }
  getCO(): Observable<any> { return this.http.get(`${this.apiUrl}/co`); }
  getNOx(): Observable<any> { return this.http.get(`${this.apiUrl}/nox`); }
  getSOx(): Observable<any> { return this.http.get(`${this.apiUrl}/sox`); }
  getPM10(): Observable<any> { return this.http.get(`${this.apiUrl}/pm10`); }
  getPM25(): Observable<any> { return this.http.get(`${this.apiUrl}/pm25`); }

  //PARA GRAFICAR ULTIMOS REGISTROS
  getLatest(limit: number = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}/device/latest?limit=${limit}`);
  }

  //PARA GRAFICAR TODOS LOS REGISTROS
  getAll(): Observable<any> {
    return this.http.get(`${this.apiUrl}/device/all`);
  }

  // PARA GRAFICAR DESDE UNA FECHA
  getSince(since: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/device/since?since=${encodeURIComponent(since)}`);
  }


  
  // Obtener todos los registros de un día específico
  getByDate(date: Date): Observable<any> {
    const raw = (date instanceof Date) ? date.toISOString().split('T')[0] : String(date);
    const encoded = encodeURIComponent(raw);
    console.debug('[CalidadAireService] getByDate -> date=', raw, ' encoded=', encoded, ' url=', `${this.apiUrl}/device/by-date?date=${encoded}`);
    return this.http.get(`${this.apiUrl}/device/by-date?date=${encoded}`);
  }

  // Obtener los últimos registros de un día específico
  getLatestByDate(date: Date, limit: number = 10): Observable<any> {
    const raw = (date instanceof Date) ? date.toISOString().split('T')[0] : String(date);
    const encoded = encodeURIComponent(raw);
    console.debug('[CalidadAireService] getLatestByDate -> date=', raw, ' encoded=', encoded, ' limit=', limit);
    return this.http.get(`${this.apiUrl}/device/latest-by-date?date=${encoded}&limit=${limit}`);
  }

  // Obtener los promedios de hoy
  getTodayAverage(): Observable<any> {
  return this.http.get(`${this.apiUrl}/device/today-average`);
}
  
}
