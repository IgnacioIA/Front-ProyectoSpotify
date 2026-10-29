import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../features/users/data-access/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  // El filtrado de canciones sigue en Home; el header solo expone el texto ingresado.
  @Input() filtroTexto: string = '';
  @Output() filtroTextoChange = new EventEmitter<string>();
  @Output() tituloClick = new EventEmitter<void>();

  @Input() menuAbierto: boolean = false;
  @Output() menuToggle = new EventEmitter<void>();

  constructor(
    readonly authService: AuthService,
    private router: Router
  ) { }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/']);
  }
}
