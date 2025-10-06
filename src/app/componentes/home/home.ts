import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalidadAireService } from '../../servicios/calidad_aire/calidad-aire.service';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit {
  resumen: any = {};

  constructor(private caService: CalidadAireService) {}

  ngOnInit(): void {
    this.caService.getDashboard().subscribe(data => {
      this.resumen = data;
    });
  }
}
