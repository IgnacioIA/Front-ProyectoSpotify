import { Component, HostListener } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header/header.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { AccionHome, HomeNavegacionService } from './features/home/data-access/home-navegacion.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, SidebarComponent],
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

  // Las opciones del menú y el título llevan a Home, que resuelve la acción con su lógica
  seleccionar(accion: AccionHome): void {
    if (window.matchMedia('(max-width: 720px)').matches) {
      this.cerrarMenu();
    }
    this.router.navigate(['/']).then(() => this.homeNavegacion.emitirAccion(accion));
  }
}
