import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../servicios/auth/auth';
import { Router } from '@angular/router';
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

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  mensaje = '';

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
          this.mensaje = 'Inicio de sesión exitoso ✅';
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

