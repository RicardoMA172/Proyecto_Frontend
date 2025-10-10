import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalidadAireService } from '../../servicios/calidad_aire/calidad-aire.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit, AfterViewInit {
  resumen: any = {};
  todayData: any[] = [];
  chart: any;

  constructor(private caService: CalidadAireService) {}

  ngOnInit(): void {
    this.caService.getDashboard().subscribe(data => {
      this.resumen = data;
    });

    const today = new Date();
    this.caService.getLatestByDate(today, 50).subscribe(data => {
      this.todayData = data;
      if (this.chart) this.initChart(this.todayData);
    });
  }

  ngAfterViewInit(): void {
    if (this.todayData.length) this.initChart(this.todayData);
  }

  private initChart(data: any[]) {
    const ctx = document.getElementById('homeChart') as HTMLCanvasElement;
    if (!ctx) return;
    if (this.chart) this.chart.destroy();

    const labels = data.map(d => {
      const fecha = new Date(d.fecha_hora.replace(' ', 'T'));
      const hours = fecha.getHours().toString().padStart(2, '0');
      const minutes = fecha.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    });

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'CO (ppm) - Hoy',
            data: data.map(d => d.co),
            borderColor: '#2980b9',
            backgroundColor: 'rgba(41,128,185,0.2)',
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'top' } } }
    });
  }
}
