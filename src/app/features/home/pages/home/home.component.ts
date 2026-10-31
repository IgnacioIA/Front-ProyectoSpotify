import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ArtistaService } from '../../../artists/data-access/artista.service';
import { Artista } from '../../../artists/models/artista.model';
import { HistorialService } from '../../../songs/data-access/historial.service';
import { Historial } from '../../../songs/models/historial.model';
import { CancionService } from '../../../songs/data-access/cancion.service';
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

  playlists: any[] = [];
  nombreNuevaPlaylist: string = '';
  mostrarModalCrearPlaylist: boolean = false;
  playlistSeleccionada: any = null;
  cancionParaPlaylist: any = null;

  cancionActual: any = null;
  reproduciendo: boolean = false;
  tiempoActual: number = 0;
  colaReproduccion: any[] = [];
  private intervalo: any = null;

  // Propiedades para artistas
  artistas: Artista[] = [];
  soloArtistasFavoritos: boolean = false;
  artistaSeleccionado: Artista | null = null;

  // Propiedades para historial de reproducción (US 9)
  historial: Historial[] = [];
  viendoHistorial: boolean = false;

  private apiUrl = 'http://localhost:8080/api/canciones';

  constructor(
    private http: HttpClient,
    private cancionService: CancionService,
    private artistaService: ArtistaService,
    private historialService: HistorialService,
    public cdr: ChangeDetectorRef,
    private homeNavegacion: HomeNavegacionService
  ) { }

  private accionesSub?: Subscription;

  ngOnInit(): void {
    // Opciones del menú lateral
    this.accionesSub = this.homeNavegacion.acciones$.subscribe(accion => this.ejecutarAccion(accion));

    // Cargar canciones desde el backend
    this.cancionService.obtenerCanciones().subscribe({
      next: (data) => {
        this.canciones = data;
        this.cdr.detectChanges();
      }
    });

    // Cargar playlists del backend
    this.http.get<any[]>('http://localhost:8080/api/playlists').subscribe({
      next: (data) => {
        this.playlists = data;
        this.cdr.detectChanges();
      }
    });

    // Cargar artistas
    this.cargarArtistas();

    // Cargar historial de reproducción
    this.cargarHistorial();
  }

  ngOnDestroy(): void {
    this.detenerIntervalo();
    this.accionesSub?.unsubscribe();
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

  // Lista de canciones extraída del historial
  get cancionesHistorial(): any[] {
    return (this.historial || []).map(h => h.cancion).filter(c => !!c);
  }

  // Cola o lista activa de pistas que se está reproduciendo
  get colaActiva(): any[] {
    if (this.colaReproduccion && this.colaReproduccion.length > 0) {
      if (this.cancionActual && this.colaReproduccion.some(c => (c.id !== undefined && c.id === this.cancionActual.id) || c === this.cancionActual)) {
        return this.colaReproduccion;
      }
    }
    if (this.viendoHistorial) {
      return this.cancionesHistorial;
    }
    if (this.cancionesFiltradas && this.cancionesFiltradas.length > 0) {
      return this.cancionesFiltradas;
    }
    return this.canciones;
  }

  // Índice de la canción actual dentro de la cola activa (-1 si no está)
  get indiceActual(): number {
    if (!this.cancionActual) return -1;
    const lista = this.colaActiva;
    return lista.findIndex(c => (c.id !== undefined && c.id === this.cancionActual.id) || c === this.cancionActual);
  }

  // Estado del botón Anterior (US 17):
  // Deshabilitado si es la primera canción (índice 0) y el tiempo está en 0:00 (o índice no válido)
  get tieneAnterior(): boolean {
    if (!this.cancionActual) return false;
    const idx = this.indiceActual;
    return idx > 0 || (idx === 0 && this.tiempoActual > 0);
  }

  // Estado del botón Siguiente (US 17):
  // Deshabilitado si es la última canción de la lista activa
  get tieneSiguiente(): boolean {
    if (!this.cancionActual) return false;
    const lista = this.colaActiva;
    const idx = this.indiceActual;
    return idx >= 0 && idx < lista.length - 1;
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

    const nuevaPlaylist = { nombre: this.nombreNuevaPlaylist.trim() };

    this.http.post<any>('http://localhost:8080/api/playlists', nuevaPlaylist).subscribe({
      next: (playlistCreada) => {
        this.playlists.push(playlistCreada);
        this.cerrarModalPlaylist();
        this.cdr.detectChanges();
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
    this.http.get<any>(`http://localhost:8080/api/playlists/${playlist.id}`).subscribe({
      next: (plActualizada) => {
        this.playlistSeleccionada = plActualizada;
        const index = this.playlists.findIndex(p => p.id === playlist.id);
        if (index !== -1) {
          this.playlists[index] = plActualizada;
        }
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

    this.http.delete(`http://localhost:8080/api/playlists/${playlist.id}`).subscribe({
      next: () => {
        // Eliminar la playlist de la lista de playlists
        this.playlists = this.playlists.filter(p => p.id !== playlist.id);

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

    this.http.delete<any>(`http://localhost:8080/api/playlists/${playlist.id}/canciones/${cancion.id}`).subscribe({
      next: (playlistActualizada) => {
        if (playlistActualizada && playlistActualizada.canciones) {
          if (this.playlistSeleccionada?.id === playlist.id) {
            this.playlistSeleccionada = playlistActualizada;
          }
          const index = this.playlists.findIndex(p => p.id === playlist.id);
          if (index !== -1) {
            this.playlists[index] = playlistActualizada;
          }
        } else {
          if (this.playlistSeleccionada?.id === playlist.id && this.playlistSeleccionada.canciones) {
            this.playlistSeleccionada.canciones = this.playlistSeleccionada.canciones.filter((c: any) => c.id !== cancion.id);
          }
          const pl = this.playlists.find(p => p.id === playlist.id);
          if (pl && pl.canciones) {
            pl.canciones = pl.canciones.filter((c: any) => c.id !== cancion.id);
          }
        }
        if (this.colaReproduccion && this.colaReproduccion.length > 0) {
          this.colaReproduccion = this.colaReproduccion.filter((c: any) => c.id !== cancion.id);
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

  onVolumeChange(event: any): void {
    const volumeValue = event.target.value;
    console.log('Nivel de volumen actual:', volumeValue);

    const audioElement = document.querySelector('audio');
    if (audioElement) {
      audioElement.volume = volumeValue;
    }
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

    this.http.post<any>(`http://localhost:8080/api/playlists/${playlist.id}/canciones/${cancion.id}`, {}).subscribe({
      next: (playlistActualizada) => {
        const index = this.playlists.findIndex(p => p.id === playlist.id);
        if (index !== -1) {
          this.playlists[index] = playlistActualizada;
          if (this.playlistSeleccionada?.id === playlist.id) {
            this.playlistSeleccionada = playlistActualizada;
          }
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
    if (!segundos) return '0:00';
    const minutos = Math.floor(segundos / 60);
    const segundosRestantes = Math.floor(segundos % 60);
    const segundosFormateados = segundosRestantes < 10 ? '0' + segundosRestantes : segundosRestantes;
    return `${minutos}:${segundosFormateados}`;
  }

  // Inicia la reproducción de una pista cambiando metadatos y reiniciando el tiempo
  reproducirPista(cancion: any, iniciarReproduccion: boolean): void {
    if (!cancion) return;

    this.cancionActual = cancion;
    this.tiempoActual = 0;
    this.reproduciendo = iniciarReproduccion;

    if (iniciarReproduccion && cancion.id) {
      this.historialService.registrarReproduccion(cancion.id).subscribe({
        next: () => this.cargarHistorial(),
        error: (err) => console.error('Error al registrar reproducción en historial:', err)
      });
    }

    this.gestionarReproduccion();
    this.cdr.detectChanges();
  }

  // Botón Siguiente (US 17): avanza al siguiente elemento de la lista activa
  siguienteCancion(): void {
    if (!this.tieneSiguiente) return;
    const lista = this.colaActiva;
    const idx = this.indiceActual;

    if (idx >= 0 && idx < lista.length - 1) {
      const siguiente = lista[idx + 1];
      const estabaActivo = this.reproduciendo;
      this.reproducirPista(siguiente, estabaActivo);
    }
  }

  // Botón Anterior (US 17): retrocede a la pista previa o reinicia tiempo a 0:00 si es la primera
  anteriorCancion(): void {
    const lista = this.colaActiva;
    const idx = this.indiceActual;

    if (idx > 0) {
      const anterior = lista[idx - 1];
      const estabaActivo = this.reproduciendo;
      this.reproducirPista(anterior, estabaActivo);
    } else if (idx === 0) {
      this.tiempoActual = 0;
      this.cdr.detectChanges();
    }
  }

  reproducirCancion(cancion: any, lista?: any[]): void {
    if (!cancion) return;

    if (lista && lista.length > 0) {
      this.colaReproduccion = [...lista];
    } else if (!this.colaReproduccion.some(c => (c.id !== undefined && c.id === cancion.id) || c === cancion)) {
      if (this.viendoHistorial) {
        this.colaReproduccion = this.cancionesHistorial;
      } else if (this.cancionesFiltradas.some(c => (c.id !== undefined && c.id === cancion.id) || c === cancion)) {
        this.colaReproduccion = [...this.cancionesFiltradas];
      } else {
        this.colaReproduccion = [...this.canciones];
      }
    }

    if (this.cancionActual?.id === cancion.id) {
      this.reproduciendo = !this.reproduciendo;
    } else {
      this.cancionActual = cancion;
      this.reproduciendo = true;
      this.tiempoActual = 0;

      // Registrar reproducción en el backend (US 9)
      if (cancion.id) {
        this.historialService.registrarReproduccion(cancion.id).subscribe({
          next: () => this.cargarHistorial(),
          error: (err) => console.error('Error al registrar reproducción en historial:', err)
        });
      }
    }
    this.gestionarReproduccion();
    this.cdr.detectChanges();
  }

  alternarReproduccion(): void {
    if (this.cancionActual) {
      this.reproduciendo = !this.reproduciendo;
      this.gestionarReproduccion();
      this.cdr.detectChanges();
    }
  }

  // Alternar favorito y eliminar de favoritos (US 10)
  toggleFavorito(cancion: any, event: Event): void {
    event.stopPropagation();
    if (!cancion || !cancion.id) return;

    this.cancionService.toggleFavorito(cancion.id).subscribe({
      next: (cancionActualizada) => {
        // Actualizar estado del favorito (le quita o pone color al corazón)
        cancion.favorito = cancionActualizada.favorito;

        // Sincronizar en la lista general de canciones (si soloFavoritas está activo, la canción desaparece de inmediato de la lista)
        const cancionEnLista = this.canciones.find(c => c.id === cancion.id);
        if (cancionEnLista) {
          cancionEnLista.favorito = cancionActualizada.favorito;
        }

        // Sincronizar en cancionActual si está en la barra reproductora inferior
        if (this.cancionActual && this.cancionActual.id === cancion.id) {
          this.cancionActual.favorito = cancionActualizada.favorito;
        }

        // Sincronizar en historial si existe
        if (this.historial) {
          this.historial.forEach(h => {
            if (h.cancion && h.cancion.id === cancion.id) {
              h.cancion.favorito = cancionActualizada.favorito;
            }
          });
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al actualizar favorito:', err);
      }
    });
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

  private gestionarReproduccion(): void {
    if (this.reproduciendo) {
      this.iniciarIntervalo();
    } else {
      this.detenerIntervalo();
    }
  }

  private iniciarIntervalo(): void {
    this.detenerIntervalo();
    this.intervalo = setInterval(() => {
      if (this.cancionActual && this.reproduciendo) {
        if (this.tiempoActual < this.cancionActual.duracion) {
          this.tiempoActual++;
        } else {
          this.reproduciendo = false;
          this.detenerIntervalo();
        }
        this.cdr.detectChanges();
      }
    }, 1000);
  }

  private detenerIntervalo(): void {
    if (this.intervalo) {
      clearInterval(this.intervalo);
      this.intervalo = null;
    }
  }
}