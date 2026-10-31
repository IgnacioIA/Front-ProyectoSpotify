import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlaylistService } from '../../data-access/playlist.service';
import { Playlist } from '../../models/playlist.model';
import { ReproductorService } from '../../../songs/data-access/reproductor.service';
import { CancionService } from '../../../songs/data-access/cancion.service';
import { Cancion } from '../../../songs/models/cancion.model';
import { formatearDuracion } from '../../../../shared/utils/formatear-duracion';
import { BusquedaService, filtrarCanciones } from '../../../search/data-access/busqueda.service';
import { EstadoCarga, mensajeError } from '../../../../shared/utils/mensaje-error';

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
  readonly estado = signal<EstadoCarga>('cargando');
  readonly error = signal<string | null>(null);

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
    this.cargar();
  }

  cargar(): void {
    this.estado.set('cargando');
    this.playlistService.cargarPlaylists().subscribe({
      next: () => this.estado.set('listo'),
      error: () => this.estado.set('error')
    });
  }

  crear(): void {
    if (this.creando()) return;

    const nombre = this.nombreNueva.trim();
    this.errorNombre.set(!nombre);
    if (!nombre) return;

    this.creando.set(true);
    this.error.set(null);
    this.playlistService.crearPlaylist(nombre).subscribe({
      next: (playlist) => {
        this.creando.set(false);
        this.nombreNueva = '';
        this.idSeleccionado.set(playlist.id);
      },
      error: (err) => {
        this.creando.set(false);
        this.error.set(mensajeError(err, 'crear la playlist'));
      }
    });
  }

  // Muestra la playlist de inmediato y la refresca con la versión del backend
  seleccionar(playlist: Playlist): void {
    this.idSeleccionado.set(playlist.id);
    this.playlistService.obtenerPlaylist(playlist.id).subscribe({
      error: (err) => this.error.set(mensajeError(err, 'actualizar la playlist'))
    });
  }

  // Eliminar playlist (US 12)
  eliminar(playlist: Playlist): void {
    if (this.procesando()) return;

    this.procesando.set(true);
    this.error.set(null);
    this.playlistService.eliminarPlaylist(playlist.id).subscribe({
      next: () => {
        this.procesando.set(false);
        if (this.idSeleccionado() === playlist.id) {
          this.idSeleccionado.set(null);
        }
      },
      error: (err) => {
        this.procesando.set(false);
        this.error.set(mensajeError(err, 'eliminar la playlist'));
      }
    });
  }

  // Eliminar canción de la playlist (US 13)
  quitarCancion(cancion: Cancion, playlist: Playlist): void {
    if (this.procesando()) return;

    this.procesando.set(true);
    this.error.set(null);
    this.playlistService.quitarCancion(playlist.id, cancion.id).subscribe({
      next: () => this.procesando.set(false),
      error: (err) => {
        this.procesando.set(false);
        this.error.set(mensajeError(err, 'quitar la canción de la playlist'));
      }
    });
  }

  // El servicio de playlists actualiza el corazón cuando el backend confirma el cambio
  toggleFavorito(cancion: Cancion): void {
    this.cancionService.toggleFavorito(cancion.id).subscribe({
      error: (err) => this.error.set(mensajeError(err, 'actualizar el favorito'))
    });
  }

  cerrarAviso(): void {
    this.error.set(null);
  }

  estaSonando(cancion: Cancion): boolean {
    return this.reproductor.cancionActual()?.id === cancion.id && this.reproductor.reproduciendo();
  }
}
