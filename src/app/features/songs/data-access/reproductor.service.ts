import { Injectable, computed, signal } from '@angular/core';
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

  // Cola (US 17): la lista desde la que se inició la reproducción y la posición de la canción actual en ella.
  // Es una copia, así que sobrevive aunque la página de origen cambie o se destruya.
  private readonly cola = signal<Cancion[]>([]);
  private readonly indice = signal(-1);

  readonly colaReproduccion = this.cola.asReadonly();
  readonly indiceActual = this.indice.asReadonly();

  // Anterior: hay una pista previa, o es la primera y el tiempo ya avanzó (se reinicia a 0:00)
  readonly tieneAnterior = computed(() => {
    const indice = this.indice();
    return indice > 0 || (indice === 0 && this.tiempo() > 0);
  });

  // Siguiente: la canción actual no es la última de la cola
  readonly tieneSiguiente = computed(() => {
    const indice = this.indice();
    return indice >= 0 && indice < this.cola().length - 1;
  });

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
  // `lista` es la lista visible desde la que se eligió la canción y pasa a ser la cola (US 17).
  reproducir(cancion: Cancion, lista?: Cancion[]): void {
    if (!cancion) return;

    if (lista && lista.length > 0) {
      this.cola.set([...lista]);
    } else if (!this.cola().some(c => c.id === cancion.id)) {
      this.cola.set([cancion]);
    }
    this.indice.set(this.cola().findIndex(c => c.id === cancion.id));

    if (this.cancion()?.id === cancion.id) {
      this.enReproduccion.update(valor => !valor);
    } else {
      this.cancion.set(cancion);
      this.enReproduccion.set(true);
      this.tiempo.set(0);
      this.registrarReproduccion(cancion);
    }
    this.gestionarReproduccion();
  }

  alternarReproduccion(): void {
    if (this.cancion()) {
      this.enReproduccion.update(valor => !valor);
      this.gestionarReproduccion();
    }
  }

  // Botón Siguiente (US 17): pasa a la próxima pista de la cola manteniendo el estado de play/pausa
  siguiente(): void {
    if (!this.tieneSiguiente()) return;
    const indice = this.indice() + 1;
    this.cambiarPista(this.cola()[indice], indice);
  }

  // Botón Anterior (US 17): vuelve a la pista previa; en la primera, reinicia el tiempo a 0:00
  anterior(): void {
    const indice = this.indice();
    if (indice > 0) {
      this.cambiarPista(this.cola()[indice - 1], indice - 1);
    } else if (indice === 0) {
      this.tiempo.set(0);
    }
  }

  // Una canción quitada de una playlist deja de estar en la cola (comportamiento de US 17)
  quitarDeCola(cancionId: number): void {
    if (!this.cola().some(c => c.id === cancionId)) return;
    this.cola.update(cola => cola.filter(c => c.id !== cancionId));
    const actual = this.cancion();
    this.indice.set(actual ? this.cola().findIndex(c => c.id === actual.id) : -1);
  }

  // Cambia de pista sin alterar play/pausa; solo registra en el historial si la nueva pista empieza a sonar
  private cambiarPista(cancion: Cancion, indice: number): void {
    this.cancion.set(cancion);
    this.indice.set(indice);
    this.tiempo.set(0);
    if (this.enReproduccion()) {
      this.registrarReproduccion(cancion);
    }
    this.gestionarReproduccion();
  }

  private registrarReproduccion(cancion: Cancion): void {
    if (!cancion.id) return;
    this.historialService.registrarReproduccion(cancion.id).subscribe({
      next: (historial) => this.reproduccionRegistrada.next(historial),
      error: (err) => console.error('Error al registrar reproducción en historial:', err)
    });
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
