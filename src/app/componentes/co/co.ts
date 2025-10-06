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

  private selectedDate$ = new BehaviorSubject<Date>(this.selectedDate);

  @ViewChild('hiddenDateInput') hiddenDateInput!: ElementRef<HTMLInputElement>;

  constructor(private caService: CalidadAireService) {}

  ngOnInit(): void {
    this.updateVisibleDates();
    this.loadDataForDate(this.selectedDate);

    // 🔄 Polling para la gráfica
    interval(this.pollingIntervalMs)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.caService.getByDate(this.selectedDate$.value))
      )
      .subscribe(data => {
        const filtered = this.filterBySelectedDate(data, this.selectedDate$.value);
        this.chartData = filtered;
        this.initChart(this.chartData);
        this.computeStats(this.chartData);
      });

    // 🔄 Polling para la tabla
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
        const filtered = this.filterBySelectedDate(latest, this.selectedDate$.value);
        this.data = filtered;
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
    this.selectedDate$.next(this.selectedDate);
    this.updateVisibleDates();

    // 🔹 Gráfica
    this.caService.getByDate(date).subscribe(data => {
      const filtered = this.filterBySelectedDate(data, date);
      this.chartData = filtered;
      this.initChart(this.chartData);
      this.computeStats(this.chartData);
    });

    // 🔹 Tabla
    if (this.isToday(date)) {
      this.caService.getLatestByDate(date, this.tableLimit).subscribe(latest => {
        this.data = this.filterBySelectedDate(latest, date);
      });
    } else {
      this.caService.getByDate(date).subscribe(allData => {
        this.data = this.filterBySelectedDate(allData, date);
      });
    }
  }

  // ✅ Función robusta para convertir y filtrar por fecha
  private filterBySelectedDate(data: any[], date: Date): any[] {
    const selYear = date.getFullYear();
    const selMonth = date.getMonth();
    const selDay = date.getDate();

    return data.filter((r: any) => {
      // Asegurarse de parsear correctamente la fecha del backend
      let fechaStr = r['fecha_hora'];
      if (!fechaStr) return false;

      // Reemplazar espacio por 'T' para formato ISO
      fechaStr = fechaStr.replace(' ', 'T');
      const fecha = new Date(fechaStr);

      if (isNaN(fecha.getTime())) return false;

      return (
        fecha.getFullYear() === selYear &&
        fecha.getMonth() === selMonth &&
        fecha.getDate() === selDay
      );
    });
  }

  private initChart(data: any[]) {
    const ctx = document.getElementById('coChart') as HTMLCanvasElement;
    if (!ctx) return;
    if (this.chart) this.chart.destroy();

    const labels = data.map((r: any) => {
      let fechaStr = r['fecha_hora']?.replace(' ', 'T');
      const fecha = new Date(fechaStr);
      const hours = fecha.getHours().toString().padStart(2, '0');
      const minutes = fecha.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    });

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'CO (ppm)',
          data: data.map((r: any) => r.co),
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
    if (!data?.length) {
      this.avg = 0;
      this.min = 0;
      this.max = 0;
      return;
    }

    const vals = data.map(r => Number(r.co) || 0);
    const sum = vals.reduce((a, b) => a + b, 0);
    this.avg = vals.length ? sum / vals.length : 0;
    this.min = vals.length ? Math.min(...vals) : 0;
    this.max = vals.length ? Math.max(...vals) : 0;
  }

  private updateVisibleDates() {
    this.visibleDates = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(this.selectedDate.getTime());
      d.setDate(d.getDate() + i);
      this.visibleDates.push(d);
    }
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  formatDate(date: Date): string {
    if (this.isToday(date)) return 'Hoy';
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;
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
    this.visibleDates = this.visibleDates.map(d => {
      const newDate = new Date(d.getTime());
      newDate.setDate(newDate.getDate() + direction);
      return newDate;
    });
  }
}
