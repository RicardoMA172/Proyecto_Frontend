import { Component, signal, inject, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from './servicios/auth/auth';

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
  // Perfil del usuario (nombre, email, password oculto)
  userProfile: any = null;
  showProfile = false;
  passwordVisible = false;

  private auth = inject(AuthService);

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

  // Cargar perfil desde backend (si hay token)
  loadProfile() {
    this.auth.getUser().subscribe({
      next: (res) => {
        this.userProfile = res;
        this.showProfile = true;
      },
      error: () => {
        this.userProfile = null;
        this.showProfile = false;
      }
    });
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  logout() {
    // borrar token localmente y redirigir a login
    localStorage.removeItem('token');
    this.userProfile = null;
    this.showProfile = false;
    this.router.navigateByUrl('/auth');
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
