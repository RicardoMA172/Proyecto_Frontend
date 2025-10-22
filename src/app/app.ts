import { Component, signal, inject, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnDestroy {
  protected readonly title = signal('frontend');
  sidebarClosed = true;
  showSidebar = true;

  private router = inject(Router);
  private sub = this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
    // Ocultar sidebar en rutas de auth
    const url: string = e.urlAfterRedirects ?? e.url ?? '';
    if (url.startsWith('/auth')) {
      this.sidebarClosed = true;
      this.showSidebar = false;
    } else {
      this.showSidebar = true;
    }
  });

  toggleSidebar() {
    this.sidebarClosed = !this.sidebarClosed;
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
