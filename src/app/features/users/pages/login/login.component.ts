import { Component, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService, mensajeErrorAuth } from '../../data-access/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['../../ui/auth-form.css']
})
export class LoginComponent {
  identificador: string = '';
  contrasenia: string = '';
  // Signals: el componente es OnPush y estos valores cambian al responder el backend
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);
  // Viene desde el registro exitoso
  readonly registrado = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router,
    route: ActivatedRoute
  ) {
    this.registrado.set(route.snapshot.queryParamMap.get('registrado') === '1');
    this.identificador = route.snapshot.queryParamMap.get('usuario') ?? '';
  }

  iniciarSesion(form: NgForm): void {
    if (this.enviando()) return;
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set(null);
    this.registrado.set(false);

    this.authService.iniciarSesion({
      identificador: this.identificador.trim(),
      contrasenia: this.contrasenia
    }).subscribe({
      next: () => {
        this.contrasenia = '';
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.enviando.set(false);
        this.contrasenia = '';
        this.error.set(mensajeErrorAuth(err));
      }
    });
  }
}
