import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalidadAireService } from '../../servicios/calidad_aire/calidad-aire.service';
import { Chart, registerables } from 'chart.js';
import { interval, Subject, forkJoin } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';

Chart.register(...registerables);

@Component({
  selector: 'app-pm25',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pm25.html',
  styleUrls: ['./pm25.css']
})
export class Pm25Component implements OnInit, AfterViewInit, OnDestroy {
  data: any[] = [];
  chartData: any[] = [];
  chart: any;
  avg: number = 0;
  min: number = 0;
  max: number = 0;

  private destroy$ = new Subject<void>();
  private pollingIntervalMs = 5000; // 🔹 cada 5 segundos
  private fullRefreshIntervalMs = 5000; // 🔹 cada 5 segundos
  private tableLimit = 5;

  constructor(private caService: CalidadAireService) {}

  ngOnInit(): void {
    // 🔹 Carga inicial: todos para gráfica + últimos 5 para tabla
    forkJoin([
      this.caService.getAll(),
      this.caService.getLatest(this.tableLimit)
    ]).pipe(takeUntil(this.destroy$))
      .subscribe(([all, latest]) => {
        this.chartData = (all || []).sort((a: any, b: any) =>
          new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime()
        );

        this.initChart(this.chartData);
        this.computeStats(this.chartData);

        this.data = (latest || []).reverse(); // últimos 5 en la tabla
      });

    // 🔹 Polling incremental para gráfica (cada 5s)
    interval(this.pollingIntervalMs)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          if (!this.chartData.length) return this.caService.getAll();
          const lastTimestamp = this.chartData[this.chartData.length - 1].fecha_hora;
          return this.caService.getSince(lastTimestamp);
        })
      )
      .subscribe(newRecords => {
        if (!newRecords?.length) return;
        this.appendToChart(newRecords);
      });

    // 🔹 Refresh completo cada 5s (para reflejar eliminaciones/ediciones)
    interval(this.fullRefreshIntervalMs)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.caService.getAll())
      )
      .subscribe(all => {
        if (!all?.length) return;
        this.chartData = all.sort((a: any, b: any) =>
          new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime()
        );
        this.initChart(this.chartData);
        this.computeStats(this.chartData);
      });

    // 🔹 Polling para la tabla (últimos 5 registros)
    interval(this.pollingIntervalMs)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.caService.getLatest(this.tableLimit))
      )
      .subscribe(t => this.data = (t || []).reverse());
  }

  ngAfterViewInit(): void {
    if (this.chartData.length) {
      this.initChart(this.chartData);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 🔹 Inicializar gráfica solo con registros del día actual
    private initChart(data: any[]) {
    const today = new Date();
    const todayData = data.filter(d => new Date(d.fecha_hora).toDateString() === today.toDateString());

    const ctx = document.getElementById('pm25Chart') as HTMLCanvasElement;
    if (!ctx) return;
    if (this.chart) this.chart.destroy();

    const labels = todayData.map(d => {
      const fecha = new Date(d.fecha_hora);
      return fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // 🔹 quitar seconds
    });

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'PM2.5 (ppm)',
          data: todayData.map(d => d.pm25),
          borderColor: '#2980b9',
          backgroundColor: 'rgba(41, 128, 185, 0.2)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: { x: { display: true }, y: { display: true } }
      }
    });

    this.computeStats(todayData);
  }

  // 🔹 Agregar solo los nuevos registros del día actual
  private appendToChart(newRecords: any[]) {
    const today = new Date();
    const todayRecords = newRecords.filter(d => new Date(d.fecha_hora).toDateString() === today.toDateString());
    if (!todayRecords.length) return;

    todayRecords.forEach(r => this.chartData.push(r));

    todayRecords.forEach(r => {
      const hora = new Date(r.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // 🔹 quitar seconds
      this.chart.data.labels.push(hora);
      this.chart.data.datasets[0].data.push(r.pm25);
    });

    this.chart.update();
    this.computeStats(this.chartData.filter(d => new Date(d.fecha_hora).toDateString() === today.toDateString()));
  }

  // 🔹 Calcular estadísticas (promedio, min, max)
  private computeStats(data: any[]) {
    if (!data?.length) return;
    const vals = data.map(r => Number(r.pm25) || 0);
    const sum = vals.reduce((a, b) => a + b, 0);
    this.avg = sum / vals.length;
    this.min = Math.min(...vals);
    this.max = Math.max(...vals);
  }
}
