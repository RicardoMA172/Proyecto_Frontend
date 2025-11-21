import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../servicios/auth/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  fb = inject(FormBuilder);
  authService = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  mensaje = '';

  constructor() {
    // mensaje que aparece en el login tras registrarse correctamente
    try {
      const registered = this.route.snapshot.queryParamMap.get('registered');
      if (registered) {
        this.mensaje = 'Cuenta creada correctamente';
        // eliminar el query param para que al refrescar la página no vuelva a mostrarse
        try {
          this.router.navigate([], { relativeTo: this.route, queryParams: { registered: null }, replaceUrl: true });
        } catch (e) { /* ignore */ }
        // limpiar el mensaje después de unos segundos para mayor claridad
        setTimeout(() => { this.mensaje = ''; }, 5000);
      }
    } catch (e) { /* ignore */ }
  }

  onSubmit() {
    if (this.form.valid) {
      // Construir credenciales garantizando strings (evitar null/undefined)
      const credentials = {
        email: this.form.get('email')?.value ?? '',
        password: this.form.get('password')?.value ?? ''
      } as { email: string; password: string };

      this.authService.login(credentials).subscribe({
        next: (res) => {
          localStorage.setItem('token', res.token);
          window.dispatchEvent(new Event('auth-changed'));
          this.mensaje = 'Inicio de sesión exitoso ✅';
          // Si hay un elemento enfocado (teclado en móvil), desenfocarlo
          try { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); } catch(e) {}
          // Asegurar que la vista vuelva al tope y quitar cualquier zoom/resalte
          try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any }); } catch(e) { window.scrollTo(0,0); }
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.mensaje = 'Error al iniciar sesión ❌';
          console.error(err);
        },
      });
    }
  }
}

