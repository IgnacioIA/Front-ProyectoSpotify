import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { CancionService } from '../../data-access/cancion.service';
import { HistorialService, ordenarHistorial } from '../../data-access/historial.service';
import { ReproductorService } from '../../data-access/reproductor.service';
import { Cancion } from '../../models/cancion.model';
import { Historial } from '../../models/historial.model';
import { formatearDuracion } from '../../../../shared/utils/formatear-duracion';

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
    this.historialService.obtenerHistorial().subscribe({
      next: (data) => this.historial.set(ordenarHistorial(data)),
      error: (err) => console.error('Error al cargar historial desde el backend:', err)
    });
  }

  // El corazón se actualiza cuando el backend confirma el cambio (aplicarFavorito)
  toggleFavorito(cancion: Cancion): void {
    if (!cancion || !cancion.id) return;

    this.cancionService.toggleFavorito(cancion.id).subscribe({
      error: (err) => console.error('Error al actualizar favorito:', err)
    });
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
