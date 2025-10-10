import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, ViewChildren, QueryList } from '@angular/core';
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
  @ViewChild('homeChart') homeChart!: ElementRef<HTMLCanvasElement>;
  @ViewChildren('pollChart') pollCharts!: QueryList<ElementRef<HTMLCanvasElement>>;

  pollutants = [
    { key: 'co', label: 'CO (ppm)' },
    { key: 'nox', label: 'NOx (µg/m³)' },
    { key: 'sox', label: 'SOx (µg/m³)' },
    { key: 'pm10', label: 'PM10 (µg/m³)' },
    { key: 'pm25', label: 'PM2.5 (µg/m³)' }
  ];

  constructor(private caService: CalidadAireService) {}

  ngOnInit(): void {
    this.caService.getDashboard().subscribe(data => {
      this.resumen = data;
    });

    const today = new Date();
    this.caService.getLatestByDate(today, 50).subscribe(data => {
      this.todayData = data;
      // inicializar o actualizar las gráficas cuando lleguen los datos
      setTimeout(() => this.initAllCharts(), 0);
    });
  }

  ngAfterViewInit(): void {
    if (this.todayData.length) this.initChart(this.todayData);
  }

  private initChart(data: any[]) {
    if (!this.homeChart) {
      console.warn('homeChart canvas not available');
      return;
    }
    const ctx = this.homeChart.nativeElement as HTMLCanvasElement;
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

  private initAllCharts() {
    if (!this.pollCharts || !this.pollCharts.length) return;
    this.pollCharts.forEach((elRef: ElementRef<HTMLCanvasElement>, idx: number) => {
      const canvas: HTMLCanvasElement = elRef.nativeElement;
      const key = canvas.getAttribute('data-key');
      if (!key) return;
      const labels = this.todayData.map(d => {
        const fecha = new Date(d.fecha_hora.replace(' ', 'T'));
        const hours = fecha.getHours().toString().padStart(2, '0');
        const minutes = fecha.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      });
      const dataset = this.todayData.map(d => d[key]);
      // crear chart
      new Chart(canvas, {
        type: 'line',
        data: { labels, datasets: [{ label: this.pollutants[idx].label, data: dataset, borderColor: '#2980b9', backgroundColor: 'rgba(41,128,185,0.15)', fill: true }] },
        options: { responsive: true }
      });
    });
  }
}
