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
