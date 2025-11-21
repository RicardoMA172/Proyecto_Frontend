import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../servicios/auth/auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent implements OnDestroy {
  form = new FormBuilder().group({
    name: [''],
    email: [''],
    password: [''],
    passwordConfirm: [''],
  });

  mensaje = '';
  sub?: Subscription;
  showPassword = false;
  showPasswordConfirm = false;

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    console.log('RegisterComponent.onSubmit called', this.form.value);

    if (this.form.invalid) return;

    const name = this.form.get('name')?.value ?? '';
    const email = this.form.get('email')?.value ?? '';
    const password = this.form.get('password')?.value ?? '';
    const passwordConfirm = this.form.get('passwordConfirm')?.value ?? '';

    if (password !== passwordConfirm) {
      this.mensaje = 'Las contraseñas no coinciden.';
      return;
    }
    this.mensaje = 'Registrando...';

    this.sub = this.auth.register({ name, email, password }).subscribe({
      next: (res) => {
        // No hacer auto-login: redirigimos al login para que el usuario inicie sesión.
        // Mostramos un mensaje breve y navegamos a la ruta de auth (login).
        this.mensaje = 'Cuenta creada correctamente. Por favor, inicia sesión.';

        // Desenfocar cualquier input activo para evitar que el zoom/teclado quede persistente
        try { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); } catch(e) {}
        try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any }); } catch(e) { window.scrollTo(0,0); }

        // Navegar a la pantalla de login con un flag para mostrar un aviso.
        // No guardamos token ni disparamos 'auth-changed'.
        this.router.navigate(['/auth'], { queryParams: { registered: '1' } });
      },
      error: (err) => {
        this.mensaje = err?.error?.errors ? JSON.stringify(err.error.errors) : 'Error al registrar';
      }
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  togglePasswordConfirm() {
    this.showPasswordConfirm = !this.showPasswordConfirm;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
