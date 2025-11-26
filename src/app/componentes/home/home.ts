import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, ViewChildren, QueryList, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalidadAireService } from '../../servicios/calidad_aire/calidad-aire.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);
// Prefer device pixel ratio for crisp canvases
try { (Chart.defaults as any).devicePixelRatio = window.devicePixelRatio || 1; } catch(e) {}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit, AfterViewInit {
  // track created charts to resize/destroy
  private charts: any[] = [];
  private observers: any[] = [];
  private resizeTimer: any = null;
  private handleResizeBound: any = null;
  resumen: any = {};
  todayData: any[] = [];
  chart: any;
  @ViewChild('homeChart') homeChart!: ElementRef<HTMLCanvasElement>;
  @ViewChildren('pollChart') pollCharts!: QueryList<ElementRef<HTMLCanvasElement>>;

  pollutants = [
    { key: 'temp', label: 'Temperatura (°C)', color: '#1abc9c' },
    { key: 'hum', label: 'Humedad (%)', color: '#3498db' },
    { key: 'amon', label: 'Amoníaco (ppm)', color: '#7f8c8d' },
    { key: 'co', label: 'CO (ppm)', color: '#2980b9' },
    { key: 'nox', label: 'NOx (µg/m³)', color: '#27ae60' },
    { key: 'sox', label: 'SOx (µg/m³)', color: '#f39c12' },
    { key: 'pm10', label: 'PM10 (µg/m³)', color: '#8e44ad' },
    { key: 'pm25', label: 'PM2.5 (µg/m³)', color: '#c0392b' },
  ];

  tabs: { id: 'summary' | 'charts'; label: string }[] = [
    { id: 'summary', label: 'Promedios' },
    { id: 'charts', label: 'Gráficas' }
  ];

  activeTab: 'summary' | 'charts' = 'summary';

  @ViewChildren('tabButton') tabButtons!: QueryList<ElementRef<HTMLButtonElement>>;

  constructor(private caService: CalidadAireService) {}

  ngOnDestroy(): void {
    // cleanup charts, observers and listeners
    try {
      if (this.handleResizeBound) window.removeEventListener('resize', this.handleResizeBound);
    } catch (e) {}
    this.charts.forEach(c => { try { c.destroy(); } catch (e) {} });
    this.charts = [];
    try { this.observers.forEach((o:any) => { try { o.disconnect(); } catch(e){} }); } catch(e){}
    this.observers = [];
  }

  private setupCanvasSize(canvas: HTMLCanvasElement, wrapper?: HTMLElement) {
    try {
      // visual width (CSS pixels)
      const cssWidth = Math.max(1, Math.floor(canvas.clientWidth || (wrapper ? wrapper.clientWidth : 0) || parseFloat(getComputedStyle(canvas).width) || 300));
      // prefer wrapper height if provided
      let cssHeight = 0;
      if (wrapper) cssHeight = wrapper.clientHeight || parseFloat(getComputedStyle(wrapper).height || '0');
      if (!cssHeight) {
        // try CSS variable --chart-height on wrapper
        try {
          const varH = wrapper ? getComputedStyle(wrapper).getPropertyValue('--chart-height') : '';
          if (varH) {
            const parsed = parseFloat(varH.replace('px',''));
            if (!isNaN(parsed) && parsed > 0) cssHeight = parsed;
          }
        } catch(e) {}
      }
      if (!cssHeight) cssHeight = parseFloat(getComputedStyle(canvas).height) || Math.round(cssWidth * 0.35);
      cssHeight = Math.max(80, Math.floor(cssHeight));
      const ratio = window.devicePixelRatio || 1;
      // set physical pixel size for crisp rendering
      canvas.width = Math.round(cssWidth * ratio);
      canvas.height = Math.round(cssHeight * ratio);
      // ensure CSS size remains
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
    } catch (e) { /* ignore */ }
  }

  private handleResize = () => {
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      this.charts.forEach((chart: any) => {
        try {
          const canvas = chart.canvas as HTMLCanvasElement;
          const wrapper = canvas.parentElement as HTMLElement | undefined;
          this.setupCanvasSize(canvas, wrapper);
          chart.resize();
          chart.update();
        } catch (e) {}
      });
    }, 150);
  }

  // Create chart with retries until wrapper height is available to avoid tiny initial canvas
  private createChartWithRetry(canvas: HTMLCanvasElement, wrapper: HTMLElement | null, createFn: () => any, attempts = 6, delay = 80) {
    const tryCreate = (remaining: number) => {
      try {
        // ensure sizing
        this.setupCanvasSize(canvas, wrapper || undefined);
        // if canvas height still small, retry
        if ((canvas.width || 0) < 200 && remaining > 0) {
          setTimeout(() => tryCreate(remaining - 1), delay);
          return;
        }
        const cfg = createFn();
        const c = new Chart(canvas, cfg);
        try { c.update(); c.resize(); } catch(e) {}
        try { this.charts.push(c); } catch(e) {}
        // observe wrapper if present
        try {
          if (wrapper && (window as any).ResizeObserver) {
            const ro = new (window as any).ResizeObserver(() => {
              try { this.setupCanvasSize(canvas, wrapper || undefined); c.resize(); c.update(); } catch (e) {}
            });
            ro.observe(wrapper);
            this.observers.push(ro);
          }
        } catch(e) {}
      } catch (e) {
        if (remaining > 0) setTimeout(() => tryCreate(remaining - 1), delay);
      }
    };
    tryCreate(attempts);
  }


  // 🔹 Modificada la función ngOnInit para cargar datos iniciales
  ngOnInit(): void {
    // bind resize handler
    try { this.handleResizeBound = this.handleResize.bind(this); window.addEventListener('resize', this.handleResizeBound); } catch (e) {}
  // Cargar promedios del día actual (reemplaza getDashboard)
  this.caService.getTodayAverage().subscribe({
    next: data => {
      // `data` contiene co,nox,sox,pm10,pm25,temp,hum,start,end
      // lo asignamos directamente a `resumen` para que el template lo consuma
      this.resumen = data ?? {};
    },
    error: err => {
      console.error('Error al obtener promedios del día:', err);
      this.resumen = {}; // fallback
    }
  });

  // Cargar datos para las gráficas del día
  const today = new Date();
  this.caService.getLatestByDate(today, 50).subscribe({
    next: data => {
      this.todayData = data;
      if (this.activeTab === 'charts') {
        setTimeout(() => this.initAllCharts(), 0);
      }
    },
    error: err => {
      console.error('Error al obtener datos de hoy:', err);
      this.todayData = [];
    }
  });
}





  // 🔹 Nueva función: cambiar pestaña
  setTab(tab: 'summary' | 'charts') {
    this.activeTab = tab;
    if (tab === 'charts') {
      setTimeout(() => this.initAllCharts(), 0);
    }
    setTimeout(() => {
      const arr = this.tabButtons ? this.tabButtons.toArray() : [];
      const idx = this.tabs.findIndex(t => t.id === tab);
      if (arr && arr[idx]) {
        try { arr[idx].nativeElement.focus(); } catch (e) {}
      }
    }, 0);
  }
  // Manejo de teclado para accesibilidad
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
      event.preventDefault();
      const id = this.tabs[index].id as 'summary' | 'charts';
      this.setTab(id);
      return;
    } else {
      return;
    }

    event.preventDefault();
    const id = this.tabs[newIndex].id as 'summary' | 'charts';
    this.setTab(id);
  }

  ngAfterViewInit(): void {
    if (this.todayData.length) this.initChart(this.todayData);
  }
  // 🔹 Modificada la función initChart para el contaminante CO
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

    const wrapper = ctx.parentElement as HTMLElement | null;
    this.createChartWithRetry(ctx, wrapper, () => ({
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
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } },
        scales: { x: { display: true }, y: { display: true } }
      }
    }));
  }
  // 🔹 Nueva función: inicializar todas las gráficas de contaminantes
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
      // ensure canvas CSS/physical size set before creating chart
      const wrapper = canvas.parentElement as HTMLElement | null;
      this.createChartWithRetry(canvas, wrapper, () => ({
        type: 'line',
        data: { labels, datasets: [{ label: this.pollutants[idx].label, data: dataset, borderColor: color, backgroundColor: this.hexToRgba(color, 0.15), fill: true, tension: 0.3 }] },
        options: { responsive: true, maintainAspectRatio: false }
      }));
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
