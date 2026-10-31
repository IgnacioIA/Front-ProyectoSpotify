import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlaylistService } from '../../data-access/playlist.service';
import { Playlist } from '../../models/playlist.model';
import { ReproductorService } from '../../../songs/data-access/reproductor.service';
import { CancionService } from '../../../songs/data-access/cancion.service';
import { Cancion } from '../../../songs/models/cancion.model';
import { formatearDuracion } from '../../../../shared/utils/formatear-duracion';
import { BusquedaService, filtrarCanciones } from '../../../search/data-access/busqueda.service';

// Página de Playlists: listar, crear, seleccionar, eliminar y quitar canciones.
// Las canciones se agregan desde el botón "+ Playlist" de las filas de Inicio.
@Component({
  selector: 'app-playlists',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './playlists.component.html',
  styleUrls: ['./playlists.component.css']
})
export class PlaylistsComponent implements OnInit {
  nombreNueva: string = '';
  readonly formatearDuracion = formatearDuracion;

  // Signals porque el componente es OnPush y cambian dentro de respuestas HTTP
  readonly creando = signal(false);
  readonly procesando = signal(false);
  readonly errorNombre = signal(false);

  private readonly idSeleccionado = signal<number | null>(null);
  readonly seleccionada = computed(() =>
    this.playlistService.playlists().find(p => p.id === this.idSeleccionado()) ?? null
  );

  // El buscador del header filtra las canciones de la playlist seleccionada
  readonly cancionesFiltradas = computed(() =>
    filtrarCanciones(this.seleccionada()?.canciones || [], this.busqueda.texto())
  );

  constructor(
    readonly playlistService: PlaylistService,
    readonly reproductor: ReproductorService,
    private cancionService: CancionService,
    readonly busqueda: BusquedaService
  ) { }

  ngOnInit(): void {
    this.playlistService.cargarPlaylists().subscribe({
      error: (err) => console.error('Error al cargar las playlists:', err)
    });
  }

  crear(): void {
    if (this.creando()) return;

    const nombre = this.nombreNueva.trim();
    this.errorNombre.set(!nombre);
    if (!nombre) return;

    this.creando.set(true);
    this.playlistService.crearPlaylist(nombre).subscribe({
      next: (playlist) => {
        this.creando.set(false);
        this.nombreNueva = '';
        this.idSeleccionado.set(playlist.id);
      },
      error: (err) => {
        this.creando.set(false);
        console.error('Error al crear la playlist:', err);
      }
    });
  }

  // Muestra la playlist de inmediato y la refresca con la versión del backend
  seleccionar(playlist: Playlist): void {
    this.idSeleccionado.set(playlist.id);
    this.playlistService.obtenerPlaylist(playlist.id).subscribe({
      error: (err) => console.error('Error al obtener la playlist:', err)
    });
  }

  // Eliminar playlist (US 12)
  eliminar(playlist: Playlist): void {
    if (this.procesando()) return;

    this.procesando.set(true);
    this.playlistService.eliminarPlaylist(playlist.id).subscribe({
      next: () => {
        this.procesando.set(false);
        if (this.idSeleccionado() === playlist.id) {
          this.idSeleccionado.set(null);
        }
      },
      error: (err) => {
        this.procesando.set(false);
        console.error('Error al eliminar la playlist:', err);
      }
    });
  }

  // Eliminar canción de la playlist (US 13)
  quitarCancion(cancion: Cancion, playlist: Playlist): void {
    if (this.procesando()) return;

    this.procesando.set(true);
    this.playlistService.quitarCancion(playlist.id, cancion.id).subscribe({
      next: () => this.procesando.set(false),
      error: (err) => {
        this.procesando.set(false);
        console.error('Error al eliminar la canción de la playlist:', err);
      }
    });
  }

  // El servicio de playlists actualiza el corazón cuando el backend confirma el cambio
  toggleFavorito(cancion: Cancion): void {
    this.cancionService.toggleFavorito(cancion.id).subscribe({
      error: (err) => console.error('Error al actualizar favorito:', err)
    });
  }

  estaSonando(cancion: Cancion): boolean {
    return this.reproductor.cancionActual()?.id === cancion.id && this.reproductor.reproduciendo();
  }
}
