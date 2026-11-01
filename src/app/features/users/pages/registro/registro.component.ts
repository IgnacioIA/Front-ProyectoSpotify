
import { Component, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
  codigo = '';

  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);
  // Email de la cuenta recién creada: solo en memoria, mientras dura la verificación
  readonly emailPendiente = signal<string | null>(null);
  readonly verificada = signal(false);

  constructor(private readonly authService: AuthService) {}

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
      next: (usuario) => {
        this.limpiarContrasenia();
        this.enviando.set(false);
        this.nombreUsuario = usuario.nombreUsuario;
        this.emailPendiente.set(usuario.email);
      },
      error: (err: unknown) => {
        this.limpiarContrasenia();
        this.enviando.set(false);
        this.error.set(mensajeErrorAuth(err));
      }
    });
  }

  verificar(form: NgForm): void {
    const email = this.emailPendiente();
    if (this.enviando() || !email) return;

    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set(null);

    this.authService.verificar({ email, codigo: this.codigo }).subscribe({
      next: () => {
        this.enviando.set(false);
        this.emailPendiente.set(null);
        this.verificada.set(true);
      },
      error: (err: unknown) => {
        this.enviando.set(false);
        this.error.set(mensajeErrorAuth(err));
      }
    });
  }

  private limpiarContrasenia(): void {
    this.contrasenia = '';
  }
}
