import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../data-access/auth.service';

// Perfil mínimo: muestra los datos devueltos por el login. El backend no expone un endpoint de perfil.
@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './perfil.component.html',
  styleUrls: ['../../ui/auth-form.css', './perfil.component.css']
})
export class PerfilComponent {
  constructor(readonly authService: AuthService) { }
}
