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
  // Mensaje flash que aparece sobre el componente y se oculta automáticamente
  flashMessage = '';
  showFlash = false;
  private flashTimer: any = null;

  constructor() {
    // Si venimos de un registro exitoso, mostrar un mensaje flash para que el usuario inicie sesión
    try {
      const registered = this.route.snapshot.queryParamMap.get('registered');
      if (registered) {
        this.showFlashMessage('Cuenta creada correctamente. Por favor, inicia sesión.');
      }
    } catch (e) { /* ignore */ }
  }

  private showFlashMessage(msg: string, ms = 4000) {
    this.clearFlashTimer();
    this.flashMessage = msg;
    this.showFlash = true;
    this.flashTimer = setTimeout(() => {
      this.showFlash = false;
      this.flashMessage = '';
      this.flashTimer = null;
    }, ms);
  }

  private clearFlashTimer() {
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
      this.flashTimer = null;
    }
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

