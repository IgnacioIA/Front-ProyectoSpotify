import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { PlayerBarComponent } from './layout/player-bar/player-bar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, FormsModule, PlayerBarComponent],
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

  private apiUrl = 'http://localhost:8080/api/canciones';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Cargar canciones
    this.http.get<any[]>(this.apiUrl).subscribe({
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
  }

  ngOnDestroy(): void {
    this.detenerIntervalo();
  }

  get cancionesFiltradas() {
    let lista = this.canciones;

    if (this.playlistSeleccionada) {
      lista = this.playlistSeleccionada.canciones || [];
    }

    return lista.filter(cancion => {
      const coincideTexto = cancion.titulo.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
                            cancion.artista?.nombre.toLowerCase().includes(this.filtroTexto.toLowerCase());
      
      const coincideFavorita = this.soloFavoritas ? cancion.favorito === true : true;

      return coincideTexto && coincideFavorita;
    });
  }

  toggleFiltroFavoritas(): void {
    this.soloFavoritas = !this.soloFavoritas;
    this.playlistSeleccionada = null;
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
    if (this.cancionActual?.id === cancion.id) {
      this.reproduciendo = !this.reproduciendo;
    } else {
      this.cancionActual = cancion;
      this.reproduciendo = true;
      this.tiempoActual = 0;
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

  toggleFavorito(cancion: any, event: Event): void {
    event.stopPropagation();
    this.http.patch<any>(`http://localhost:8080/api/canciones/${cancion.id}/favorito`, {}).subscribe({
      next: (cancionActualizada) => {
        cancion.favorito = cancionActualizada.favorito;
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