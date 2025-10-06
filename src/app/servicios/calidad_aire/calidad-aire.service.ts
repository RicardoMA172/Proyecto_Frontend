import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

//Servicio para interactuar con la API de calidad del aire
@Injectable({
  providedIn: 'root'
})
export class CalidadAireService {
  private apiUrl = 'http://localhost:8000/api';

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
    const d = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return this.http.get(`${this.apiUrl}/device/by-date?date=${d}`);
  }

  // Obtener los últimos registros de un día específico
  getLatestByDate(date: Date, limit: number = 10): Observable<any> {
    const d = date.toISOString().split('T')[0];
    return this.http.get(`${this.apiUrl}/device/latest-by-date?date=${d}&limit=${limit}`);
  }


  
}
