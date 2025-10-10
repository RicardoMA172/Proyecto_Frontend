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
    // Agregar temperatura, humedad y amoníaco
    { key: 'temp', label: 'Temperatura (°C)', color: '#1abc9c' },
    { key: 'hum', label: 'Humedad (%)', color: '#3498db' },
    { key: 'amon', label: 'Amoníaco (ppm)', color: '#7f8c8d' },
    { key: 'co', label: 'CO (ppm)', color: '#2980b9' },
    { key: 'nox', label: 'NOx (µg/m³)', color: '#27ae60' },
    { key: 'sox', label: 'SOx (µg/m³)', color: '#f39c12' },
    { key: 'pm10', label: 'PM10 (µg/m³)', color: '#8e44ad' },
    { key: 'pm25', label: 'PM2.5 (µg/m³)', color: '#c0392b' },
  ];
  tabs = [
    { id: 'summary', label: 'Promedios' },
    { id: 'charts', label: 'Gráficas' }
  ];
  // pestaña activa: 'summary' | 'charts'
  activeTab: 'summary' | 'charts' = 'charts';

  @ViewChildren('tabButton') tabButtons!: QueryList<ElementRef<HTMLButtonElement>>;

  constructor(private caService: CalidadAireService) {}

  ngOnInit(): void {
    this.caService.getDashboard().subscribe(data => {
      this.resumen = data;
    });

    const today = new Date();
    this.caService.getLatestByDate(today, 50).subscribe(data => {
      this.todayData = data;
      // inicializar o actualizar las gráficas cuando lleguen los datos
      // si la pestaña de gráficas está activa, inicializamos ahora
      if (this.activeTab === 'charts') {
        setTimeout(() => this.initAllCharts(), 0);
      }
    });
  }

  setTab(tab: 'summary' | 'charts') {
    this.activeTab = tab;
    if (tab === 'charts') {
      // esperar a que Angular renderice los canvases y luego inicializar
      setTimeout(() => this.initAllCharts(), 0);
    }
    // move focus to active tab button if present
    setTimeout(() => {
      const arr = this.tabButtons ? this.tabButtons.toArray() : [];
      const idx = this.tabs.findIndex(t => t.id === tab);
      if (arr && arr[idx]) {
        try { arr[idx].nativeElement.focus(); } catch (e) {}
      }
    }, 0);
  }

  onTabKeydown(event: KeyboardEvent, index: number) {
    const key = event.key;
    const last = this.tabs.length - 1;
    let newIndex = index;
    if (key === 'ArrowRight' || key === 'ArrowDown') {
      newIndex = index === last ? 0 : index + 1;
    } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      newIndex = index === 0 ? last : index - 1;
    } else if (key === 'Home') {
      newIndex = 0;
    } else if (key === 'End') {
      newIndex = last;
    } else if (key === 'Enter' || key === ' ') {
      // activate current focused tab
      event.preventDefault();
      const id = this.tabs[index].id as 'summary' | 'charts';
      this.setTab(id);
      return;
    } else {
      return; // ignore other keys
    }

    event.preventDefault();
    // set active tab and move focus
    const id = this.tabs[newIndex].id as 'summary' | 'charts';
    this.setTab(id);
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
      const dataset = this.todayData.map(d => {
        const v = d[key];
        const n = Number(v);
        return isNaN(n) ? null : n;
      });
      const color = this.pollutants[idx]?.color || '#2980b9';
      // crear chart
      new Chart(canvas, {
        type: 'line',
        data: { labels, datasets: [{ label: this.pollutants[idx].label, data: dataset, borderColor: color, backgroundColor: this.hexToRgba(color, 0.15), fill: true }] },
        options: { responsive: true }
      });
    });
  }

  private hexToRgba(hex: string, alpha: number) {
    if (!hex) return `rgba(41,128,185,${alpha})`;
    const h = hex.replace('#', '');
    const bigint = parseInt(h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }
}
