import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { CancionService } from '../../data-access/cancion.service';
import { HistorialService, ordenarHistorial } from '../../data-access/historial.service';
import { ReproductorService } from '../../data-access/reproductor.service';
import { Cancion } from '../../models/cancion.model';
import { Historial } from '../../models/historial.model';
import { formatearDuracion } from '../../../../shared/utils/formatear-duracion';
import { mensajeError } from '../../../../shared/utils/mensaje-error';

// Página de Historial (US 9): todas las reproducciones, de la más reciente a la más antigua.
@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './historial.component.html',
  styleUrls: ['./historial.component.css']
})
export class HistorialComponent implements OnInit, OnDestroy {
  readonly formatearDuracion = formatearDuracion;

  // Signal porque el componente es OnPush. null = todavía no llegó la respuesta.
  readonly historial = signal<Historial[] | null>(null);
  readonly errorCarga = signal(false);
  // Aviso cuando falla una operación o una recarga con la lista ya visible
  readonly error = signal<string | null>(null);

  // Canciones del historial en el orden mostrado: es la cola al reproducir desde esta página (US 17)
  readonly cancionesHistorial = computed(() =>
    (this.historial() || []).map(item => item.cancion).filter(cancion => !!cancion)
  );

  private suscripciones = new Subscription();

  constructor(
    private historialService: HistorialService,
    private cancionService: CancionService,
    readonly reproductor: ReproductorService
  ) { }

  ngOnInit(): void {
    // Se recarga cuando el backend confirma una reproducción nueva, aunque se inicie desde otra vista
    this.suscripciones.add(this.reproductor.reproduccionRegistrada$.subscribe(() => this.cargarHistorial()));
    this.suscripciones.add(this.cancionService.favoritoActualizado$.subscribe(c => this.aplicarFavorito(c)));

    this.cargarHistorial();
  }

  ngOnDestroy(): void {
    this.suscripciones.unsubscribe();
  }

  cargarHistorial(): void {
    this.errorCarga.set(false);
    this.historialService.obtenerHistorial().subscribe({
      next: (data) => this.historial.set(ordenarHistorial(data)),
      error: (err) => {
        // Sin datos previos se muestra el error en lugar de la lista; con datos, se conservan y se avisa
        if (this.historial() === null) {
          this.errorCarga.set(true);
        } else {
          this.error.set(mensajeError(err, 'actualizar el historial'));
        }
      }
    });
  }

  // El corazón se actualiza cuando el backend confirma el cambio (aplicarFavorito)
  toggleFavorito(cancion: Cancion): void {
    if (!cancion || !cancion.id) return;

    this.error.set(null);
    this.cancionService.toggleFavorito(cancion.id).subscribe({
      error: (err) => this.error.set(mensajeError(err, 'actualizar el favorito'))
    });
  }

  cerrarAviso(): void {
    this.error.set(null);
  }

  estaSonando(cancion: Cancion): boolean {
    return this.reproductor.cancionActual()?.id === cancion?.id && this.reproductor.reproduciendo();
  }

  private aplicarFavorito(cancionActualizada: Cancion): void {
    this.historial.update(lista => lista && lista.map(item =>
      item.cancion?.id === cancionActualizada.id
        ? { ...item, cancion: { ...item.cancion, favorito: cancionActualizada.favorito } }
        : item
    ));
  }
}
