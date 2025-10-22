import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  const token = localStorage.getItem('token');
  if (token) {
    return true;
  }

  // Si no hay token, redirigir a /auth
  return router.parseUrl('/auth');
};
