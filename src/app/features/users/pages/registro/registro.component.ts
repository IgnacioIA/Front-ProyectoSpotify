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
  nombreUsuario: string = '';
  email: string = '';
  contrasenia: string = '';
  // Signals: el componente es OnPush y estos valores cambian al responder el backend
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

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
        this.contrasenia = '';
        // El registro no inicia sesión: el backend solo crea la cuenta
        this.router.navigate(['/login'], {
          queryParams: { registrado: 1, usuario: usuario.nombreUsuario }
        });
      },
      error: (err) => {
        this.enviando.set(false);
        this.error.set(mensajeErrorAuth(err));
      }
    });
  }
}
