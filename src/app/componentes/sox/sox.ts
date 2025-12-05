import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { parseInputDate } from '../../utils/date.util';
import { CommonModule } from '@angular/common';
import { formatLocalDate } from '../../utils/date.util';
import { CalidadAireService } from '../../servicios/calidad_aire/calidad-aire.service';
import { AuthService } from '../../servicios/auth/auth';
import { Chart, registerables } from 'chart.js';
import { interval, Subject, BehaviorSubject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';

Chart.register(...registerables);

@Component({
  selector: 'app-sox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sox.html',
  styleUrls: ['./sox.css']
})
export class SoxComponent implements OnInit, AfterViewInit, OnDestroy {
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
  private pollingIntervalMs = 50000; // 50 segundos
  private tableLimit = 5;

  private selectedDate$ = new BehaviorSubject<Date>(this.selectedDate);
  isAdmin: boolean = false;

  @ViewChild('hiddenDateInput') hiddenDateInput!: ElementRef<HTMLInputElement>;

  constructor(private caService: CalidadAireService, private auth: AuthService) {}

  ngOnInit(): void {
    this.auth.getUser().subscribe({ next: (u:any) => this.isAdmin = u?.role === 'admin', error: () => this.isAdmin = false });
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
        this.computeStats(this.chartData, 'sox');
      });

    // Polling tabla
    interval(this.pollingIntervalMs)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.caService.getByDate(this.selectedDate$.value))
      )
      .subscribe(allData => {
        if (!allData || !Array.isArray(allData)) return;
        // Invertir y limitar a tableLimit
        this.data = allData.reverse().slice(0, this.tableLimit);
      });
  }

  downloadDayExport() {
  const dateStr = formatLocalDate(this.selectedDate);
    this.caService.exportDay(this.selectedDate).subscribe({
      next: (blob) => {
        const filename = `registros-${dateStr}.csv`;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => { console.error('Error descargando export:', err); alert('No se pudo descargar el archivo.'); }
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

    this.caService.getByDate(date).subscribe(data => {
      console.log('📊 Datos recibidos para gráfica:', data?.length ?? 0, data?.slice(0, 5));
      this.chartData = data || [];
      this.initChart(this.chartData);
      this.computeStats(this.chartData, 'sox');
    });

    // Para la tabla: siempre usamos getByDate (más confiable)
    this.caService.getByDate(date).subscribe(allData => {
      console.log('📋 Datos para tabla:', allData?.length ?? 0);
      if (!allData || !Array.isArray(allData)) {
        this.data = [];
        console.warn('⚠️ Datos inválidos recibidos:', allData);
        return;
      }
      // Invertir orden para mostrar los más recientes primero (como LatestByDate)
      this.data = allData.reverse().slice(0, this.tableLimit);
      console.log('📋 Tabla actualizada con', this.data.length, 'registros');
    });
  }

  private initChart(data: any[]) {
    const ctx = document.getElementById('soxChart') as HTMLCanvasElement;
    if (!ctx) return;
    if (this.chart) this.chart.destroy();

    const labels = data.map(d => {
      const fecha = new Date(d.fecha_hora.replace(' ', 'T')); // ✅ se convierte correctamente
      const hours = fecha.getHours().toString().padStart(2, '0');
      const minutes = fecha.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    });

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'SOX (ppm)',
          data: data.map(d => d.sox),
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

  // ✅ Corregido: calcula promedio, min y max correctamente
  private computeStats(data: any[], campo: string) {
    if (!data?.length) {
      this.avg = this.min = this.max = 0;
      return;
    }

  const selDateStr = formatLocalDate(this.selectedDate);

    const filtered = data.filter(d => {
      const fechaStr = d.fecha_hora.split(' ')[0]; // ✅ extrae "YYYY-MM-DD"
      return fechaStr === selDateStr;
    });

    const vals = filtered.map(r => Number(r[campo])).filter(v => !isNaN(v));

    if (!vals.length) {
      this.avg = this.min = this.max = 0;
      return;
    }

    const sum = vals.reduce((a, b) => a + b, 0);
    this.avg = parseFloat((sum / vals.length).toFixed(2));
    this.min = Math.min(...vals);
    this.max = Math.max(...vals);

    console.log(`📈 ${campo.toUpperCase()} — Promedio: ${this.avg}, Min: ${this.min}, Max: ${this.max}`);
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
    const pickedDate = parseInputDate(event.target.value);
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
