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
        if (res?.token) {
          localStorage.setItem('token', res.token);
          window.dispatchEvent(new Event('auth-changed'));
        }
        this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.mensaje = err?.error?.errors ? JSON.stringify(err.error.errors) : 'Error al registrar';
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
