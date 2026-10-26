import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ArtistaService } from './artista.service';
import { Artista } from './artista.model';
import { HistorialService } from './historial.service';
import { Historial } from './historial.model';
import { CancionService } from './cancion.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Front-ProyectoSpotify';
  canciones: any[] = [];
  filtroTexto: string = '';
  soloFavoritas: boolean = false;

  playlists: any[] = [];
  nombreNuevaPlaylist: string = '';
  mostrarModalCrearPlaylist: boolean = false;
  playlistSeleccionada: any = null;
  cancionParaPlaylist: any = null;

  cancionActual: any = null;
  reproduciendo: boolean = false;
  tiempoActual: number = 0;
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
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
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
    this.cdr.detectChanges();
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

  reproducirCancion(cancion: any): void {
    if (!cancion) return;

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

  toggleFavoritoArtista(artista: Artista, event: Event): void {
    event.stopPropagation();
    this.artistaService.toggleFavorito(artista.id).subscribe(artistaActualizado => {
      artista.favorito = artistaActualizado.favorito;
      if (this.soloArtistasFavoritos) {
        this.cargarArtistas();
      } else {
        this.cdr.detectChanges();
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