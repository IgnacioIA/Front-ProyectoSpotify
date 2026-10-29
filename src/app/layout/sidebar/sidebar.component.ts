import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AccionHome } from '../../features/home/data-access/home-navegacion.service';

interface OpcionMenu {
  accion: AccionHome;
  icono: string;
  texto: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Input() abierto: boolean = false;
  @Output() seleccion = new EventEmitter<AccionHome>();
  @Output() cerrar = new EventEmitter<void>();

  // Secciones y vistas que hoy existen dentro de Home
  readonly opciones: OpcionMenu[] = [
    { accion: 'canciones', icono: '🎵', texto: 'Canciones' },
    { accion: 'artistas', icono: '🎤', texto: 'Artistas' },
    { accion: 'playlists', icono: '📁', texto: 'Playlists' },
    { accion: 'favoritos', icono: '💚', texto: 'Favoritos' },
    { accion: 'historial', icono: '🕘', texto: 'Historial' }
  ];
}
