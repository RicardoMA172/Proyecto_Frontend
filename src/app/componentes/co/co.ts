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
      .subscribe(latest => this.data = latest);
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
      this.chartData = data;
      this.initChart(this.chartData);
      this.computeStats(this.chartData);
    });

    // Tabla de registros
    if (this.isToday(date)) {
      // Solo últimos N registros para hoy
      this.caService.getLatestByDate(date, this.tableLimit).subscribe(latest => {
        this.data = latest;
      });
    } else {
      // Todos los registros del día para fechas pasadas
      this.caService.getByDate(date).subscribe(allData => {
        this.data = allData;
      });
    }
  }

  private initChart(data: any[]) {
    const ctx = document.getElementById('coChart') as HTMLCanvasElement;
    if (!ctx) return;
    if (this.chart) this.chart.destroy();

    const labels = data.map(d => {
      const fecha = new Date(d.fecha_hora);
      return fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'CO (ppm)',
          data: data.map(d => d.co),
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
  }

  private computeStats(data: any[]) {
    if (!data?.length) return;
    const vals = data.map(r => Number(r.co) || 0);
    const sum = vals.reduce((a, b) => a + b, 0);
    this.avg = sum / vals.length;
    this.min = Math.min(...vals);
    this.max = Math.max(...vals);
  }

  private updateVisibleDates() {
    this.visibleDates = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(this.selectedDate.getTime()); // copiar fecha seleccionada
      d.setDate(d.getDate() + i);
      this.visibleDates.push(d);
    }
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  formatDate(date: Date): string {
    if (this.isToday(date)) return 'Hoy';
    return `${date.getDate().toString().padStart(2,'0')}/${(date.getMonth()+1).toString().padStart(2,'0')}`;
  }

  selectDate(date: Date) {
    this.loadDataForDate(date);
  }

  getDateClass(date: Date): string {
    if (this.isToday(date)) return 'today';
    if (date.toDateString() === this.selectedDate.toDateString()) return 'selected';
    return '';
  }

  openCalendar() {
    this.hiddenDateInput.nativeElement.click();
  }

  onDatePicked(event: any) {
    const pickedDate = new Date(event.target.value);
    if (!isNaN(pickedDate.getTime())) {
      this.selectDate(pickedDate);
    }
  }

  shiftVisibleDates(direction: number) {
  // direction: -1 → izquierda, 1 → derecha
  this.visibleDates = this.visibleDates.map(d => {
    const newDate = new Date(d.getTime());
    newDate.setDate(newDate.getDate() + direction);
    return newDate;
  });
}

}
