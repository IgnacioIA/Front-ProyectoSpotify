import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface OpcionMenu {
  ruta: string;
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
  // Avisa la ruta elegida para que el layout cierre el menú en pantallas pequeñas
  @Output() seleccion = new EventEmitter<string>();
  @Output() cerrar = new EventEmitter<void>();

  readonly opciones: OpcionMenu[] = [
    { ruta: '/', icono: '🏠', texto: 'Inicio' },
    { ruta: '/playlists', icono: '📁', texto: 'Playlists' },
    { ruta: '/favoritos', icono: '💚', texto: 'Favoritos' },
    { ruta: '/historial', icono: '🕘', texto: 'Historial' }
  ];
}
