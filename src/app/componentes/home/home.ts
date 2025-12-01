import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, ViewChildren, QueryList, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalidadAireService } from '../../servicios/calidad_aire/calidad-aire.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);
// Prefer device pixel ratio for crisp canvases
try { (Chart.defaults as any).devicePixelRatio = window.devicePixelRatio || 1; } catch(e) {}
// Cap devicePixelRatio to avoid extremely large internal canvases on some devices
try { (Chart.defaults as any).devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2); } catch(e) {}

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
  private chartsInitialized: boolean = false;
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
      // Adaptive sizing: on very narrow screens increase the visual height ratio so chart content remains readable
      if (cssWidth < 380) {
        // use a taller aspect for small phones
        const adaptive = Math.round(cssWidth * 0.6);
        cssHeight = Math.max(cssHeight, adaptive);
      }
      cssHeight = Math.max(100, Math.floor(cssHeight));
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
  private createChartWithRetry(canvas: HTMLCanvasElement, wrapper: HTMLElement | null, createFn: () => any, attempts = 12, delay = 120) {
    const tryCreate = (remaining: number) => {
      try {
        // If wrapper exists but has no height yet, try to read CSS var --chart-height
        if (wrapper) {
          try {
            const cs = getComputedStyle(wrapper);
            const varH = cs.getPropertyValue('--chart-height')?.trim();
            const parsed = varH ? parseFloat(varH.replace('px','')) : NaN;
            // If wrapper height is very small but we have a CSS var, force that height on the wrapper
            if ((!wrapper.clientHeight || wrapper.clientHeight < 40) && !isNaN(parsed) && parsed > 20) {
              wrapper.style.height = `${parsed}px`;
            }
          } catch (e) {}
        }
        // If wrapper exists but has no height yet, try to read CSS var --chart-height and force it
        if (wrapper) {
          try {
            const cs = getComputedStyle(wrapper);
            const varH = cs.getPropertyValue('--chart-height')?.trim();
            const parsed = varH ? parseFloat(varH.replace('px','')) : NaN;
            if ((!wrapper.clientHeight || wrapper.clientHeight < 40) && !isNaN(parsed) && parsed > 20) {
              wrapper.style.height = `${parsed}px`;
            }
          } catch (e) {}
        }
        // ensure sizing
        this.setupCanvasSize(canvas, wrapper || undefined);
        // if canvas physical width still small, retry a few times (layout may not be settled yet)
        const physicalWidth = canvas.width || 0;
        const cssW = canvas.clientWidth || (wrapper ? wrapper.clientWidth : 0) || 0;
        // If CSS width is too small, try forcing a larger wrapper height for mobile
        if ((physicalWidth < 300 || cssW < 220) && wrapper && remaining > 0) {
          try {
            // force a conservative mobile height if CSS var absent
            const cs = getComputedStyle(wrapper);
            const varH = cs.getPropertyValue('--chart-height')?.trim();
            let forced = 220;
            if (varH) {
              const p = parseFloat(varH.replace('px',''));
              if (!isNaN(p) && p > 80) forced = p;
            }
            wrapper.style.height = `${forced}px`;
            // give layout a moment then retry
            setTimeout(() => tryCreate(remaining - 1), delay);
            return;
          } catch (e) {
            setTimeout(() => tryCreate(remaining - 1), delay);
            return;
          }
        }
        const cfg = createFn();
        const c = new Chart(canvas, cfg);
        try { c.update(); c.resize(); } catch(e) {}
        try { this.charts.push(c); } catch(e) {}
        // schedule extra redraws (some mobile browsers stabilize layout after a short delay)
        try { setTimeout(() => { try { this.setupCanvasSize(canvas, wrapper || undefined); c.resize(); c.update(); } catch(e){} }, 220); } catch(e){}
        try { setTimeout(() => { try { this.setupCanvasSize(canvas, wrapper || undefined); c.resize(); c.update(); } catch(e){} }, 700); } catch(e){}
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
    tryCreate(attempts * 2); // give more attempts on mobile
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
        // Wait a short moment to let Angular render canvases, then ensure charts exist/are resized
        setTimeout(() => this.initAllCharts(), 120);
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
      // Always call initAllCharts after a short delay: the function is idempotent
      // and will create missing charts or resize existing ones.
      setTimeout(() => this.initAllCharts(), 120);
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
            backgroundColor: 'rgba(41,128,185,0.18)',
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: (() => {
        const w = (window && window.innerWidth) || document.documentElement.clientWidth || 800;
        const isSmall = w < 420;
        const showLegend = !isSmall;
        const borderW = isSmall ? 3 : 2;
        const pointR = isSmall ? 3 : 2;
        return {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { left: 6, right: 6, top: 6, bottom: 6 } },
          plugins: {
            legend: { display: showLegend, position: 'bottom', labels: { boxWidth: 12, padding: 8, font: { size: showLegend ? 12 : 10 } } },
            tooltip: { mode: 'index', intersect: false }
          },
          elements: { line: { tension: 0.3, borderWidth: borderW }, point: { radius: pointR } },
          scales: {
            x: { display: true, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: isSmall ? 6 : 10, font: { size: isSmall ? 10 : 11 } }, grid: { display: false } },
            y: { display: true, ticks: { font: { size: isSmall ? 11 : 12 } }, grid: { color: 'rgba(0,0,0,0.04)' } }
          }
        };
      })()
    }));

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
        options: (() => {
          const w = (window && window.innerWidth) || document.documentElement.clientWidth || 800;
          const isSmall = w < 420;
          const showLegend = !isSmall;
          const borderW = w < 420 ? 3 : 2;
          const pointR = w < 420 ? 3 : 2;
          return {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { left: 6, right: 6, top: 6, bottom: 6 } },
            plugins: { legend: { display: showLegend, position: 'bottom', labels: { boxWidth: 12, padding: 6, font: { size: showLegend ? 11 : 10 } } }, tooltip: { mode: 'index', intersect: false } },
            elements: { line: { tension: 0.3, borderWidth: borderW }, point: { radius: pointR } },
            scales: {
              x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: isSmall ? 6 : 10, font: { size: isSmall ? 10 : 11 } }, grid: { display: false } },
              y: { ticks: { font: { size: isSmall ? 11 : 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } }
            }
          };
        })()
      }));
    });
  }

  // Inicializar todas las gráficas (pollCharts) — llamada desde ngOnInit y al cambiar pestaña
  private initAllCharts() {
    if (!this.pollCharts || !this.pollCharts.length) return;
    this.chartsInitialized = true;
    this.pollCharts.forEach((elRef: ElementRef<HTMLCanvasElement>, idx: number) => {
      const canvas: HTMLCanvasElement = elRef.nativeElement;
      const key = canvas.getAttribute('data-key');
      if (!key) return;
      // If a chart already exists for this canvas, just resize/update it instead of recreating
      try {
        const existing = (Chart as any).getChart(canvas);
        const wrapperExist = canvas.parentElement as HTMLElement | null;
        if (existing) {
          try { this.setupCanvasSize(canvas, wrapperExist || undefined); existing.resize(); existing.update(); } catch(e) {}
          return;
        }
      } catch(e) {}

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
        options: (() => {
          const w = (window && window.innerWidth) || document.documentElement.clientWidth || 800;
          const isSmall = w < 420;
          const showLegend = !isSmall;
          const borderW = w < 420 ? 3 : 2;
          const pointR = w < 420 ? 3 : 2;
          return {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { left: 6, right: 6, top: 6, bottom: 6 } },
            plugins: { legend: { display: showLegend, position: 'bottom', labels: { boxWidth: 12, padding: 6, font: { size: showLegend ? 11 : 10 } } }, tooltip: { mode: 'index', intersect: false } },
            elements: { line: { tension: 0.3, borderWidth: borderW }, point: { radius: pointR } },
            scales: {
              x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: isSmall ? 6 : 10, font: { size: isSmall ? 10 : 11 } }, grid: { display: false } },
              y: { ticks: { font: { size: isSmall ? 11 : 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } }
            }
          };
        })()
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
