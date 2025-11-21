import { Component, inject, OnDestroy } from '@angular/core';
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
export class LoginComponent implements OnDestroy {
  fb = inject(FormBuilder);
  authService = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  mensaje = '';
  showPassword = false;
  private _bodyClass = 'auth-route';

  constructor() {
    try { document.body.classList.add(this._bodyClass); } catch(e) {}
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

  ngOnDestroy(): void {
    try { document.body.classList.remove(this._bodyClass); } catch(e) {}
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
          // asegurar que cualquier input desenfoque al iniciar sesion
          try { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); } catch(e) {}
          // Si hay un elemento enfocado (teclado en móvil), desenfocarlo
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

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}

