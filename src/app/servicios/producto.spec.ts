import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private apiUrl = `${environment.apiUrl}/productos`;

  constructor(private http: HttpClient) { }

  getProductos(): Observable<any> {
    return this.http.get(this.apiUrl);
  }
  addProducto(producto: any): Observable<any> {
    return this.http.post(this.apiUrl, producto);
  }
}