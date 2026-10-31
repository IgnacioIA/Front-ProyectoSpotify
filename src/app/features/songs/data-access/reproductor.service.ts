import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { Cancion } from '../models/cancion.model';
import { Historial } from '../models/historial.model';
import { CancionService } from './cancion.service';
import { HistorialService } from './historial.service';

// Estado del reproductor compartido por toda la app: vive fuera de las páginas para sobrevivir a la navegación.
// La reproducción es simulada: un intervalo avanza el tiempo de a un segundo hasta la duración de la canción.
@Injectable({
  providedIn: 'root'
})
export class ReproductorService {
  private readonly cancion = signal<Cancion | null>(null);
  private readonly enReproduccion = signal(false);
  private readonly tiempo = signal(0);

  readonly cancionActual = this.cancion.asReadonly();
  readonly reproduciendo = this.enReproduccion.asReadonly();
  readonly tiempoActual = this.tiempo.asReadonly();

  // Se emite cuando el backend confirma una nueva reproducción, para que las vistas recarguen el historial.
  private readonly reproduccionRegistrada = new Subject<Historial>();
  readonly reproduccionRegistrada$ = this.reproduccionRegistrada.asObservable();

  private intervalo: ReturnType<typeof setInterval> | null = null;

  constructor(
    private historialService: HistorialService,
    cancionService: CancionService
  ) {
    // Mantiene el corazón de la barra al día cuando el favorito se cambia desde cualquier vista
    cancionService.favoritoActualizado$.subscribe(cancionActualizada => {
      const actual = this.cancion();
      if (actual && actual.id === cancionActualizada.id) {
        this.cancion.set({ ...actual, favorito: cancionActualizada.favorito });
      }
    });
  }

  // Misma canción: alterna play/pausa. Canción nueva: empieza desde cero y registra la reproducción (US 9).
  reproducir(cancion: Cancion): void {
    if (!cancion) return;

    if (this.cancion()?.id === cancion.id) {
      this.enReproduccion.update(valor => !valor);
    } else {
      this.cancion.set(cancion);
      this.enReproduccion.set(true);
      this.tiempo.set(0);

      if (cancion.id) {
        this.historialService.registrarReproduccion(cancion.id).subscribe({
          next: (historial) => this.reproduccionRegistrada.next(historial),
          error: (err) => console.error('Error al registrar reproducción en historial:', err)
        });
      }
    }
    this.gestionarReproduccion();
  }

  alternarReproduccion(): void {
    if (this.cancion()) {
      this.enReproduccion.update(valor => !valor);
      this.gestionarReproduccion();
    }
  }

  private gestionarReproduccion(): void {
    if (this.enReproduccion()) {
      this.iniciarIntervalo();
    } else {
      this.detenerIntervalo();
    }
  }

  // Siempre limpia el intervalo anterior antes de crear uno nuevo, así nunca hay dos activos
  private iniciarIntervalo(): void {
    this.detenerIntervalo();
    this.intervalo = setInterval(() => {
      const cancion = this.cancion();
      if (cancion && this.enReproduccion()) {
        if (this.tiempo() < cancion.duracion) {
          this.tiempo.update(t => t + 1);
        } else {
          this.enReproduccion.set(false);
          this.detenerIntervalo();
        }
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
