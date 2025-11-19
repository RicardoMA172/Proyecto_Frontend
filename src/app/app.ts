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
  protected readonly title = signal('Plataforma digital para monitoreo de la calidad del aire');
  // Por defecto la barra lateral debe estar cerrada para evitar overlays al cargar
  sidebarClosed = true;
  showSidebar = true;
  // Perfil del usuario (nombre, email, password oculto)
  userProfile: any = null;
  showProfile = false;
  passwordVisible = false;
  isAuthenticated = !!localStorage.getItem('token');

  private auth = inject(AuthService);
  private authChangeHandler = () => {
    this.isAuthenticated = !!localStorage.getItem('token');
    // Al cambiar el estado de autenticación, sincronizar clases y sidebar para evitar
    // que el layout quede desincronizado cuando el usuario vuelva desde /auth.
    if (this.isAuthenticated) {
      try { document.body.classList.remove('auth-route'); } catch(e) {}
      this.showSidebar = true;
      // abrir la sidebar por defecto al entrar
      this.sidebarClosed = false;
    } else {
      this.userProfile = null;
      this.showProfile = false;
      try { document.body.classList.add('auth-route'); } catch(e) {}
      this.showSidebar = false;
      this.sidebarClosed = true;
    }
  };
  
  // Cerrar panel de perfil al clicar fuera
  private outsideClickHandler = (ev: MouseEvent) => {
    if (!this.showProfile) return;
    const path = (ev as any).composedPath ? (ev as any).composedPath() : (ev as any).path;
    const clickedInside = path ? path.some((el: any) => el && el.classList && (el.classList.contains('profile-panel') || el.classList.contains('topbar-right'))) : false;
    if (!clickedInside) this.showProfile = false;
  };
  // Router events
  private router = inject(Router);
  private sub = this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
    // Ocultar sidebar en rutas de auth
    const url: string = e.urlAfterRedirects ?? e.url ?? '';
    if (url.startsWith('/auth')) {
      // mantener la barra cerrada/oculta en rutas de autenticación (login/register)
      this.sidebarClosed = true;
      this.showSidebar = false;
      try { document.body.classList.add('auth-route'); } catch(e) {}
    } else {
      this.showSidebar = true;
      try { document.body.classList.remove('auth-route'); } catch(e) {}
    }
  });

  toggleSidebar() {
  this.sidebarClosed = !this.sidebarClosed;
  }
  

  // Cargar perfil desde backend (si hay token))
  loadProfile() {
    // Mostrar el panel inmediatamente para dar feedback visual
    this.showProfile = !this.showProfile;
    // Si acabamos de abrir el panel, cargamos el perfil; si lo cerramos, no hacemos petición
    if (!this.showProfile) return;
    this.auth.getUser().subscribe({
      next: (res) => {
        this.userProfile = res;
      },
      error: () => {
        this.userProfile = null;
        this.showProfile = false; // revertir si falla
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
    this.isAuthenticated = false;
    // asegurar estado inmediato del layout
    this.showSidebar = false;
    this.sidebarClosed = true;
    // notificar cambio de auth para que otras partes de la app actualicen su estado
    window.dispatchEvent(new Event('auth-changed'));
    this.router.navigateByUrl('/auth');
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    window.removeEventListener('auth-changed', this.authChangeHandler);
    window.removeEventListener('click', this.outsideClickHandler);
  }

  constructor() {
    // Escuchar cambios de auth (login/logout en otras partes de la app)
    window.addEventListener('auth-changed', this.authChangeHandler);
    // Cerrar panel de perfil al clicar fuera
    window.addEventListener('click', this.outsideClickHandler);
    // Al cargar la app, marcar si estamos en una ruta de auth para styling inicial
    try {
      const cur = this.router.url ?? (typeof location !== 'undefined' ? location.pathname : '');
      if (cur.startsWith('/auth')) {
        document.body.classList.add('auth-route');
        this.showSidebar = false;
        this.sidebarClosed = true;
      } else {
        document.body.classList.remove('auth-route');
      }
    } catch(e) {}
  }

  // Cerrar la sidebar automáticamente cuando se selecciona un item en dispositivos pequeños
  onMenuClick() {
    try {
      if (typeof window !== 'undefined' && window.innerWidth <= 800) {
        this.sidebarClosed = true;
      }
    } catch(e) {}
  }
}
