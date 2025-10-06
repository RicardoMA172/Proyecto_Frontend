import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  //private apiUrl = 'http://127.0.0.1:8000/api/productos';
  private apiUrl = 'http://localhost:8000/api';

  //Inyectar HttpClient
  constructor(private http: HttpClient) { }

  //PARA EL DASHBOARD
  getDashboard(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard`);
  }
  //NO SE SI SE OCUPE 
  /*
  //MOSTRAR GRAFICAS
  getLatest(limit: number = 20): Observable<any> {
    return this.http.get(`${this.apiUrl}/device/latest?limit=${limit}`);
  }*/

  


}



