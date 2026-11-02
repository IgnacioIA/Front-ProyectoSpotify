import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReproductorService } from '../../features/songs/data-access/reproductor.service';
import { CancionService } from '../../features/songs/data-access/cancion.service';
import { HomeNavegacionService } from '../../features/home/data-access/home-navegacion.service';
import { formatearDuracion } from '../../shared/utils/formatear-duracion';

// Barra reproductora inferior. Está en el componente raíz, fuera del router-outlet, para persistir entre rutas.
@Component({
  selector: 'app-player-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-bar.component.html',
  styleUrls: ['./player-bar.component.css']
})
export class PlayerBarComponent {
  readonly formatearDuracion = formatearDuracion;

  estaArrastrando = false;
  tiempoArrastre = 0;

  constructor(
    readonly reproductor: ReproductorService,
    private cancionService: CancionService,
    private homeNavegacion: HomeNavegacionService,
    private router: Router
  ) { }

  // El servicio de canciones avisa el cambio confirmado; el reproductor y las vistas abiertas se actualizan solos
  toggleFavorito(): void {
    const cancion = this.reproductor.cancionActual();
    if (!cancion || !cancion.id) return;

    this.cancionService.toggleFavorito(cancion.id).subscribe({
      error: (err) => console.error('Error al actualizar favorito:', err)
    });
  }

  // El detalle de artista está en Home: se deja pedido el artista y se navega a Inicio
  irAlArtista(): void {
    const cancion = this.reproductor.cancionActual();
    if (!cancion || !cancion.artista) return;

    this.homeNavegacion.artistaSolicitado.set(cancion);
    this.router.navigate(['/']);
  }

  // Control del progreso de la canción (US)
  get duracionTotal(): number {
    return this.reproductor.cancionActual()?.duracion || 0;
  }

  get barraDeshabilitada(): boolean {
    return !this.duracionTotal || this.duracionTotal <= 0;
  }

  // Mientras se arrastra muestra el tiempo temporal para evitar parpadeos (jitter)
  get tiempoVisual(): number {
    return this.estaArrastrando ? this.tiempoArrastre : this.reproductor.tiempoActual();
  }

  get porcentajeProgreso(): number {
    const duracion = this.duracionTotal;
    if (!duracion || duracion <= 0) return 0;
    return Math.max(0, Math.min(100, (this.tiempoVisual / duracion) * 100));
  }

  iniciarArrastre(): void {
    if (this.barraDeshabilitada) return;
    this.estaArrastrando = true;
    this.tiempoArrastre = this.reproductor.tiempoActual();
  }

  onProgresoInput(event: Event): void {
    if (this.barraDeshabilitada) return;
    const input = event.target as HTMLInputElement;
    const valor = Number(input.value);
    this.estaArrastrando = true;
    this.tiempoArrastre = isNaN(valor) ? 0 : Math.max(0, Math.min(valor, this.duracionTotal));
  }

  onProgresoChange(event: Event): void {
    if (this.barraDeshabilitada) return;
    const input = event.target as HTMLInputElement;
    const valor = Number(input.value);
    const nuevoSegundo = isNaN(valor) ? 0 : Math.max(0, Math.min(valor, this.duracionTotal));
    this.estaArrastrando = false;
    this.reproductor.establecerTiempo(nuevoSegundo);
  }

  finalizarArrastre(event?: Event): void {
    if (!this.estaArrastrando) return;
    if (event) {
      const input = event.target as HTMLInputElement;
      if (input && input.value !== undefined) {
        const valor = Number(input.value);
        if (!isNaN(valor)) {
          this.tiempoArrastre = Math.max(0, Math.min(valor, this.duracionTotal));
        }
      }
    }
    this.estaArrastrando = false;
    this.reproductor.establecerTiempo(this.tiempoArrastre);
  }

  onBarraClick(event: MouseEvent): void {
    if (this.barraDeshabilitada) return;
    if ((event.target as HTMLElement)?.tagName === 'INPUT') return;
    const contenedor = event.currentTarget as HTMLElement;
    const rect = contenedor.getBoundingClientRect();
    if (rect.width <= 0) return;
    const clickX = event.clientX - rect.left;
    const porcentaje = Math.max(0, Math.min(1, clickX / rect.width));
    const nuevoSegundo = Math.round(porcentaje * this.duracionTotal);
    this.reproductor.establecerTiempo(nuevoSegundo);
  }

  saltarA(segundo: number): void {
    if (this.barraDeshabilitada) return;
    this.estaArrastrando = false;
    this.reproductor.establecerTiempo(segundo);
  }

  onVolumeChange(event: any) {
    const volumeValue = event.target.value;
    console.log('Nivel de volumen actual:', volumeValue);

    // Ajusta el volumen del reproductor de audio cuando esté presente en el DOM
    const audioElement = document.querySelector('audio');
    if (audioElement) {
      audioElement.volume = volumeValue;
    }
  }

}
