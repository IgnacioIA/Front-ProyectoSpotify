import { Component, HostListener } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header/header.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { PlayerBarComponent } from './layout/player-bar/player-bar.component';
import { HomeNavegacionService } from './features/home/data-access/home-navegacion.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, SidebarComponent, PlayerBarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  menuAbierto: boolean = false;

  constructor(
    private router: Router,
    readonly homeNavegacion: HomeNavegacionService
  ) { }

  alternarMenu(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  @HostListener('document:keydown.escape')
  cerrarMenu(): void {
    this.menuAbierto = false;
  }

  // Las opciones del menú navegan con routerLink; acá solo se cierra el menú en pantallas pequeñas.
  // Si ya se está en Inicio, la URL no cambia y Home vuelve a su vista principal con la acción.
  seleccionar(ruta: string): void {
    if (window.matchMedia('(max-width: 720px)').matches) {
      this.cerrarMenu();
    }
    if (ruta === '/') {
      this.homeNavegacion.emitirAccion('inicio');
    }
  }

  irAInicio(): void {
    this.seleccionar('/');
    this.router.navigate(['/']);
  }
}
