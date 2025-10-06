import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalidadAireService } from '../../servicios/calidad_aire/calidad-aire.service';
import { Chart, registerables } from 'chart.js';
import { interval, Subject, BehaviorSubject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';

Chart.register(...registerables);

@Component({
  selector: 'app-co',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './co.html',
  styleUrls: ['./co.css']
})
export class COComponent implements OnInit, AfterViewInit, OnDestroy {
  data: any[] = [];
  chartData: any[] = [];
  chart: any;
  avg: number = 0;
  min: number = 0;
  max: number = 0;

  today: Date = new Date();
  selectedDate: Date = new Date();
  visibleDates: Date[] = [];
  private destroy$ = new Subject<void>();
  private pollingIntervalMs = 5000;
  private tableLimit = 5;

  // 🔹 BehaviorSubject para manejar fecha seleccionada en polling
  private selectedDate$ = new BehaviorSubject<Date>(this.selectedDate);

  @ViewChild('hiddenDateInput') hiddenDateInput!: ElementRef<HTMLInputElement>;

  constructor(private caService: CalidadAireService) {}

  ngOnInit(): void {
    this.updateVisibleDates();
    this.loadDataForDate(this.selectedDate);

    // Polling gráfico
    interval(this.pollingIntervalMs)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.caService.getByDate(this.selectedDate$.value))
      )
      .subscribe(data => {
        this.chartData = data;
        this.initChart(this.chartData);
        this.computeStats(this.chartData);
      });

    // Polling tabla
    interval(this.pollingIntervalMs)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          if (this.isToday(this.selectedDate$.value)) {
            return this.caService.getLatestByDate(this.selectedDate$.value, this.tableLimit);
          } else {
            return this.caService.getByDate(this.selectedDate$.value);
          }
        })
      )
      .subscribe(latest => {
        // 🔹 Filtrar por la fecha seleccionada para evitar desfase
        const selDateStr = this.selectedDate.toISOString().split('T')[0];
        this.data = latest.filter((r: any) => r.fecha_hora.startsWith(selDateStr));
      });
  }

  ngAfterViewInit(): void {
    if (this.chartData.length) this.initChart(this.chartData);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDataForDate(date: Date) {
    this.selectedDate = new Date(date);
    this.selectedDate$.next(this.selectedDate); // 🔹 actualizar BehaviorSubject
    this.updateVisibleDates();

    // Datos para la gráfica
    this.caService.getByDate(date).subscribe(data => {
      console.log('Datos recibidos:', data.length, data); // 👈 para verificar cantidad de registros
      this.chartData = data;
      this.initChart(this.chartData);
      this.computeStats(this.chartData);
    });

    // Tabla de registros
    if (this.isToday(date)) {
      // Solo últimos N registros para hoy
      this.caService.getLatestByDate(date, this.tableLimit).subscribe(latest => {
        // 🔹 Filtrar por la fecha seleccionada para evitar desfase
        const selDateStr = this.selectedDate.toISOString().split('T')[0];
        this.data = latest.filter((r: any) => r.fecha_hora.startsWith(selDateStr));
      });
    } else {
      // Todos los registros del día para fechas pasadas
      this.caService.getByDate(date).subscribe(allData => {
        const selDateStr = this.selectedDate.toISOString().split('T')[0];
        this.data = allData.filter((r: any) => r.fecha_hora.startsWith(selDateStr));
      });
    }
  }

  // ✅ NUEVA VERSIÓN — Muestra los 294 puntos, pero con eje X simplificado
  private initChart(data: any[]) {
    const ctx = document.getElementById('coChart') as HTMLCanvasElement;
    if (!ctx) return;

    // 🔹 Limpia el canvas si ya existía una gráfica
    if (this.chart) {
      this.chart.destroy();
      const context = ctx.getContext('2d');
      if (context) context.clearRect(0, 0, ctx.width, ctx.height);
    }

    if (!data?.length) return;

    // 🔹 Etiquetas horarias (sin "Z")
    const labels = data.map(d => {
      const fecha = new Date(d.fecha_hora);
      const hours = fecha.getHours().toString().padStart(2, '0');
      const minutes = fecha.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    });

    // 🔹 Datos de CO
    const coValues = data.map(d => d.co);

    // 🔹 Crear gráfica
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'CO (ppm)',
          data: coValues,
          borderColor: '#2980b9',
          backgroundColor: 'rgba(41, 128, 185, 0.2)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,      // 🔹 Muestra la línea continua sin puntos individuales
          borderWidth: 1,
        }]
      },
      options: {
        responsive: true,
        animation: false,      // 🔹 Sin animación para rendimiento
        plugins: { 
          legend: { position: 'top' } 
        },
        scales: {
          x: {
            type: 'category',
            display: true,
            ticks: {
              // 🔹 Muestra una etiqueta cada 3 horas aprox
              callback: function (value, index) {
                if (index % 3 === 0) {
                  return labels[index];
                }
                return '';
              },
              maxRotation: 0,
              autoSkip: false
            },
            title: {
              display: true,
              text: 'Hora del día'
            },
            grid: { display: false }
          },
          y: {
            display: true,
            beginAtZero: true,
            title: {
              display: true,
              text: 'Concentración de CO (ppm)'
            }
          }
        }
      }
    });

    console.log('Graficando', data.length, 'puntos');
  }

  // 🔹 Calcular estadísticas básicas usando solo registros del día seleccionado
  private computeStats(data: any[]) {
    if (!data?.length) return;
    const selDateStr = this.selectedDate.toISOString().split('T')[0];
    const filtered = data.filter(d => d.fecha_hora.startsWith(selDateStr));
    const vals = filtered.map(r => Number(r.co) || 0);
    if (!vals.length) return;
    const sum = vals.reduce((a, b) => a + b, 0);
    this.avg = sum / vals.length;
    this.min = Math.min(...vals);
    this.max = Math.max(...vals);
  }

  // Actualizar fechas visibles en el calendario
  private updateVisibleDates() {
    this.visibleDates = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(this.selectedDate.getTime()); // copiar fecha seleccionada
      d.setDate(d.getDate() + i);
      this.visibleDates.push(d);
    }
  }

  // Verificar si la fecha es hoy
  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  // Formatear fecha para mostrar en calendario
  formatDate(date: Date): string {
    if (this.isToday(date)) return 'Hoy';
    return `${date.getDate().toString().padStart(2,'0')}/${(date.getMonth()+1).toString().padStart(2,'0')}`;
  }

  // Seleccionar fecha
  selectDate(date: Date) {
    this.loadDataForDate(date);
  }

  // Clase CSS para fechas en el calendario
  getDateClass(date: Date): string {
    if (this.isToday(date)) return 'today';
    if (date.toDateString() === this.selectedDate.toDateString()) return 'selected';
    return '';
  }

  // Abrir selector de fecha oculto
  openCalendar() {
    this.hiddenDateInput.nativeElement.click();
  }

  // Manejar selección de fecha desde el input oculto
  onDatePicked(event: any) {
    const pickedDate = new Date(event.target.value);
    if (!isNaN(pickedDate.getTime())) {
      this.selectDate(pickedDate);
    }
  }

  // Navegación fechas
  shiftVisibleDates(direction: number) {
    // direction: -1 → izquierda, 1 → derecha
    this.visibleDates = this.visibleDates.map(d => {
      const newDate = new Date(d.getTime());
      newDate.setDate(newDate.getDate() + direction);
      return newDate;
    });
  }

}
