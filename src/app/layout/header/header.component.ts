import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../features/users/data-access/auth.service';
import { BusquedaService } from '../../features/search/data-access/busqueda.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnDestroy {
  // Cada página filtra su lista con este texto; al hacer una pausa se abre la búsqueda global.
  @Input() filtroTexto: string = '';
  @Output() filtroTextoChange = new EventEmitter<string>();
  @Output() tituloClick = new EventEmitter<void>();

  @Input() menuAbierto: boolean = false;
  @Output() menuToggle = new EventEmitter<void>();

  private busquedaPendiente?: ReturnType<typeof setTimeout>;

  constructor(
    readonly authService: AuthService,
    private router: Router,
    private busqueda: BusquedaService
  ) { }

  ngOnDestroy(): void {
    clearTimeout(this.busquedaPendiente);
  }

  alEscribir(texto: string): void {
    this.filtroTextoChange.emit(texto);
    clearTimeout(this.busquedaPendiente);
    this.busquedaPendiente = setTimeout(() => this.buscar(texto), 350);
  }

  // Dentro de resultados se reemplaza la URL: Atrás no recorre cada término y lleva a la pantalla anterior
  buscar(texto: string): void {
    // Enter o la lupa adelantan la búsqueda pendiente: no debe dispararse después
    clearTimeout(this.busquedaPendiente);

    const buscado = texto.trim();
    const enResultados = this.router.url.split('?')[0] === '/buscar';

    if (!buscado) {
      if (enResultados) {
        this.router.navigateByUrl(this.busqueda.origen ?? '/', { replaceUrl: true });
      }
    } else if (!enResultados) {
      this.busqueda.origen = this.router.url;
      this.router.navigate(['/buscar'], { queryParams: { q: buscado } });
    } else if (this.router.parseUrl(this.router.url).queryParams['q'] !== buscado) {
      this.router.navigate(['/buscar'], { queryParams: { q: buscado }, replaceUrl: true });
    }
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/']);
  }
}
