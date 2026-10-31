import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ArtistaService } from '../../../artists/data-access/artista.service';
import { Artista } from '../../../artists/models/artista.model';
import { HistorialService } from '../../../songs/data-access/historial.service';
import { Historial } from '../../../songs/models/historial.model';
import { CancionService } from '../../../songs/data-access/cancion.service';
import { ReproductorService } from '../../../songs/data-access/reproductor.service';
import { Cancion } from '../../../songs/models/cancion.model';
import { formatearDuracion } from '../../../../shared/utils/formatear-duracion';
import { PlaylistService } from '../../../playlists/data-access/playlist.service';
import { Playlist } from '../../../playlists/models/playlist.model';
import { Subscription } from 'rxjs';
import { AccionHome, HomeNavegacionService } from '../../data-access/home-navegacion.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit, OnDestroy {
  title = 'Front-ProyectoSpotify';
  canciones: any[] = [];
  soloFavoritas: boolean = false;

  // El texto lo ingresa el buscador del header
  get filtroTexto(): string {
    return this.homeNavegacion.filtroTexto();
  }

  // Las playlists se comparten con la página de Playlists a través del servicio
  get playlists(): Playlist[] {
    return this.playlistService.playlists();
  }

  nombreNuevaPlaylist: string = '';
  mostrarModalCrearPlaylist: boolean = false;
  playlistSeleccionada: any = null;
  cancionParaPlaylist: any = null;

  // Propiedades para artistas
  artistas: Artista[] = [];
  soloArtistasFavoritos: boolean = false;
  artistaSeleccionado: Artista | null = null;

  // Propiedades para historial de reproducción (US 9)
  historial: Historial[] = [];
  viendoHistorial: boolean = false;

  private apiUrl = 'http://localhost:8080/api/canciones';

  constructor(
    private cancionService: CancionService,
    private playlistService: PlaylistService,
    private artistaService: ArtistaService,
    private historialService: HistorialService,
    private cdr: ChangeDetectorRef,
    private homeNavegacion: HomeNavegacionService,
    readonly reproductor: ReproductorService
  ) {
    // Artista pedido desde la barra del reproductor (también si Home se crea al navegar desde otra página)
    effect(() => {
      const cancion = this.homeNavegacion.artistaSolicitado();
      if (cancion) {
        untracked(() => {
          this.homeNavegacion.artistaSolicitado.set(null);
          this.irArtistaDesdeReproductor(cancion);
        });
      }
    });
  }

  private suscripciones = new Subscription();

  ngOnInit(): void {
    // Opciones del menú lateral
    this.suscripciones.add(this.homeNavegacion.acciones$.subscribe(accion => this.ejecutarAccion(accion)));

    // El reproductor avisa cuando el backend registró una reproducción nueva (US 9)
    this.suscripciones.add(this.reproductor.reproduccionRegistrada$.subscribe(() => this.cargarHistorial()));

    // Favoritos cambiados desde cualquier lugar (filas o barra del reproductor)
    this.suscripciones.add(this.cancionService.favoritoActualizado$.subscribe(c => this.aplicarFavorito(c)));

    // Cargar canciones desde el backend
    this.cancionService.obtenerCanciones().subscribe({
      next: (data) => {
        this.canciones = data;
        this.cdr.detectChanges();
      }
    });

    // Cargar playlists del backend
    this.playlistService.cargarPlaylists().subscribe();

    // Cargar artistas
    this.cargarArtistas();

    // Cargar historial de reproducción
    this.cargarHistorial();
  }

  ngOnDestroy(): void {
    this.suscripciones.unsubscribe();
  }

  // Resuelve cada opción del menú lateral con los métodos existentes de la pantalla
  ejecutarAccion(accion: AccionHome): void {
    switch (accion) {
      case 'historial':
        this.mostrarHistorial();
        return;
      case 'favoritos':
        this.verTodasLasCanciones();
        this.toggleFiltroFavoritas();
        this.irASeccion('seccion-canciones');
        return;
      case 'canciones':
      case 'artistas':
      case 'playlists':
        this.verTodasLasCanciones();
        this.irASeccion(`seccion-${accion}`);
        return;
      default:
        this.verTodasLasCanciones();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private irASeccion(id: string): void {
    // verTodasLasCanciones() ya renderizó la vista principal, así que la sección está en el DOM
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  get cancionesFiltradas() {
    let lista = this.canciones;

    if (this.artistaSeleccionado) {
      lista = this.canciones.filter(c =>
        c.artista?.id === this.artistaSeleccionado?.id ||
        c.artista?.nombre === this.artistaSeleccionado?.nombre
      );
    } else if (this.playlistSeleccionada) {
      lista = this.playlistSeleccionada.canciones || [];
    }

    return lista.filter(cancion => {
      const coincideTexto = cancion.titulo.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        cancion.artista?.nombre?.toLowerCase().includes(this.filtroTexto.toLowerCase());

      const coincideFavorita = this.soloFavoritas ? cancion.favorito === true : true;

      return coincideTexto && coincideFavorita;
    });
  }

  // Cargar historial desde el backend ordenado cronológicamente
  cargarHistorial(): void {
    this.historialService.obtenerHistorial().subscribe({
      next: (data) => {
        this.historial = (data || []).sort((a, b) => {
          const tiempoA = new Date(a.fechaReproduccion).getTime();
          const tiempoB = new Date(b.fechaReproduccion).getTime();
          return tiempoB - tiempoA;
        });
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar historial desde el backend:', err);
      }
    });
  }

  mostrarHistorial(): void {
    this.viendoHistorial = true;
    this.artistaSeleccionado = null;
    this.playlistSeleccionada = null;
    this.soloFavoritas = false;
    this.cargarHistorial();
    this.cdr.detectChanges();
  }

  toggleFiltroFavoritas(): void {
    this.soloFavoritas = !this.soloFavoritas;
    this.playlistSeleccionada = null;
    this.viendoHistorial = false;
    this.cdr.detectChanges();
  }

  abrirModalPlaylist(): void {
    this.mostrarModalCrearPlaylist = true;
    this.nombreNuevaPlaylist = '';
    this.cdr.detectChanges();
  }

  cerrarModalPlaylist(): void {
    this.mostrarModalCrearPlaylist = false;
    this.cdr.detectChanges();
  }

  crearPlaylist(): void {
    if (!this.nombreNuevaPlaylist.trim()) return;

    this.playlistService.crearPlaylist(this.nombreNuevaPlaylist.trim()).subscribe({
      next: () => {
        this.cerrarModalPlaylist();
      },
      error: (err) => {
        console.error('Error al crear la playlist:', err);
      }
    });
  }

  seleccionarPlaylist(playlist: any): void {
    this.playlistSeleccionada = playlist;
    this.soloFavoritas = false;
    this.viendoHistorial = false;
    this.playlistService.obtenerPlaylist(playlist.id).subscribe({
      next: (plActualizada) => {
        this.playlistSeleccionada = plActualizada;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      }
    });
    this.cdr.detectChanges();
  }

  // Eliminar playlist (US 12)
  eliminarPlaylist(playlist: any): void {
    if (!playlist || !playlist.id) return;

    this.playlistService.eliminarPlaylist(playlist.id).subscribe({
      next: () => {
        // Si la playlist eliminada era la que estaba seleccionada, limpiar la vista personalizada
        if (this.playlistSeleccionada?.id === playlist.id) {
          this.playlistSeleccionada = null;
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al eliminar la playlist:', err);
      }
    });
  }

  // Eliminar canción de la playlist (US 13)
  eliminarCancionDePlaylist(cancion: any, playlist: any, event: Event): void {
    event.stopPropagation();
    if (!cancion || !cancion.id || !playlist || !playlist.id) return;

    this.playlistService.quitarCancion(playlist.id, cancion.id).subscribe({
      next: (playlistActualizada) => {
        if (playlistActualizada && this.playlistSeleccionada?.id === playlist.id) {
          this.playlistSeleccionada = playlistActualizada;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al eliminar la canción de la playlist:', err);
      }
    });
  }

  seleccionarArtista(artista: Artista): void {
    this.artistaSeleccionado = artista;
    this.playlistSeleccionada = null;
    this.soloFavoritas = false;
    this.viendoHistorial = false;
    this.cdr.detectChanges();
  }

  verTodasLasCanciones(): void {
    this.playlistSeleccionada = null;
    this.soloFavoritas = false;
    this.artistaSeleccionado = null;
    this.viendoHistorial = false;
    this.cdr.detectChanges();
  }

  @HostListener('document:click')
  cerrarMenus(): void {
    if (this.cancionParaPlaylist) {
      this.cancionParaPlaylist = null;
      this.cdr.detectChanges();
    }
  }

  toggleMenuAgregarPlaylist(cancion: any, event: Event): void {
    event.stopPropagation();
    if (this.cancionParaPlaylist?.id === cancion.id) {
      this.cancionParaPlaylist = null;
    } else {
      this.cancionParaPlaylist = cancion;
    }
    this.cdr.detectChanges();
  }

  agregarAPlaylist(cancion: any, playlist: any, event: Event): void {
    event.stopPropagation();

    this.playlistService.agregarCancion(playlist.id, cancion.id).subscribe({
      next: (playlistActualizada) => {
        if (this.playlistSeleccionada?.id === playlist.id) {
          this.playlistSeleccionada = playlistActualizada;
        }
        this.cancionParaPlaylist = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al agregar la canción a la playlist:', err);
      }
    });
  }

  formatearDuracion(segundos: number): string {
    return formatearDuracion(segundos);
  }

  // El estado de reproducción vive en ReproductorService para persistir entre rutas
  reproducirCancion(cancion: any): void {
    this.reproductor.reproducir(cancion);
  }

  // Alternar favorito y eliminar de favoritos (US 10)
  toggleFavorito(cancion: any, event: Event): void {
    event.stopPropagation();
    if (!cancion || !cancion.id) return;

    // Las listas se sincronizan en aplicarFavorito cuando el backend confirma el cambio
    this.cancionService.toggleFavorito(cancion.id).subscribe({
      error: (err) => {
        console.error('Error al actualizar favorito:', err);
      }
    });
  }

  // Actualizar estado del favorito (le quita o pone color al corazón) en las listas de la pantalla.
  // Si soloFavoritas está activo, la canción desaparece de inmediato de la lista.
  private aplicarFavorito(cancionActualizada: Cancion): void {
    const sincronizar = (cancion: any) => {
      if (cancion && cancion.id === cancionActualizada.id) {
        cancion.favorito = cancionActualizada.favorito;
      }
    };

    this.canciones.forEach(sincronizar);
    this.historial.forEach(h => sincronizar(h.cancion));
    this.playlistSeleccionada?.canciones?.forEach(sincronizar);

    this.cdr.detectChanges();
  }

  // Métodos para Artistas (US6)
  cargarArtistas(): void {
    if (this.soloArtistasFavoritos) {
      this.artistaService.obtenerArtistasFavoritos().subscribe(data => {
        this.artistas = data;
        this.cdr.detectChanges();
      });
    } else {
      this.artistaService.obtenerArtistas().subscribe(data => {
        this.artistas = data;
        this.cdr.detectChanges();
      });
    }
  }

  irArtistaDesdeReproductor(cancion: any): void {
    if (!cancion || !cancion.artista) return;

    const artistaEncontrado = this.artistas.find(
      a => a.id === cancion.artista.id || a.nombre === cancion.artista.nombre
    );

    if (artistaEncontrado) {
      this.seleccionarArtista(artistaEncontrado);
    } else {
      this.seleccionarArtista({
        id: cancion.artista.id || 0,
        nombre: cancion.artista.nombre,
        portada: cancion.portada || ''
      });
    }
  }

  toggleFiltroArtistasFavoritos(): void {
    this.soloArtistasFavoritos = !this.soloArtistasFavoritos;
    this.cargarArtistas();
  }

  // Alternar favorito y eliminar artista de favoritos (US 11)
  toggleFavoritoArtista(artista: Artista, event: Event): void {
    event.stopPropagation();
    if (!artista || !artista.id) return;

    this.artistaService.toggleFavorito(artista.id).subscribe({
      next: (artistaActualizado) => {
        // Le quita o pone el color al corazón
        artista.favorito = artistaActualizado.favorito;

        // Sincronizar en la lista de artistas
        const artistaEnLista = this.artistas.find(a => a.id === artista.id);
        if (artistaEnLista) {
          artistaEnLista.favorito = artistaActualizado.favorito;
        }

        // Sincronizar en artistaSeleccionado si está abierto su perfil
        if (this.artistaSeleccionado && this.artistaSeleccionado.id === artista.id) {
          this.artistaSeleccionado.favorito = artistaActualizado.favorito;
        }

        // Si estamos viendo la lista de artistas favoritos, el artista desaparece de la lista
        if (this.soloArtistasFavoritos) {
          this.artistas = this.artistas.filter(a => a.id !== artista.id);
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al actualizar favorito de artista:', err);
      }
    });
  }
}