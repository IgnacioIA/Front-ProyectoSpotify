
import { Component, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, mensajeErrorAuth } from '../../data-access/auth.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './registro.component.html',
  styleUrls: ['../../ui/auth-form.css']
})
export class RegistroComponent {
  nombreUsuario = '';
  email = '';
  contrasenia = '';

  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  registrarse(form: NgForm): void {
    if (this.enviando()) return;

    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set(null);

    this.authService.registrar({
      nombreUsuario: this.nombreUsuario.trim(),
      email: this.email.trim(),
      contrasenia: this.contrasenia
    }).subscribe({
      next: () => {
        this.limpiarContrasenia();
        this.router.navigate(['/']);
      },
      error: (err: unknown) => {
        this.limpiarContrasenia();
        this.enviando.set(false);
        this.error.set(mensajeErrorAuth(err));
      }
    });
  }

  private limpiarContrasenia(): void {
    this.contrasenia = '';
  }
}
