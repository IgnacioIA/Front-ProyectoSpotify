import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { CancionService } from '../../data-access/cancion.service';
import { ReproductorService } from '../../data-access/reproductor.service';
import { Cancion } from '../../models/cancion.model';
import { ArtistaService } from '../../../artists/data-access/artista.service';
import { Artista } from '../../../artists/models/artista.model';
import { formatearDuracion } from '../../../../shared/utils/formatear-duracion';
import { BusquedaService, filtrarCanciones } from '../../../search/data-access/busqueda.service';

// Página de Favoritos: canciones y artistas marcados con el corazón.
// Las listas cambian solo cuando el backend confirma cada operación.
@Component({
  selector: 'app-favoritos',
  standalone: true,
  templateUrl: './favoritos.component.html',
  styleUrls: ['./favoritos.component.css']
})
export class FavoritosComponent implements OnInit, OnDestroy {
  readonly formatearDuracion = formatearDuracion;

  // Signals porque el componente es OnPush y cambian dentro de respuestas HTTP.
  // null = todavía no llegó la respuesta, para no mostrar el estado vacío antes de tiempo.
  readonly canciones = signal<Cancion[] | null>(null);
  readonly artistas = signal<Artista[] | null>(null);

  // El buscador del header filtra las canciones (no los artistas, igual que en Inicio)
  readonly cancionesFiltradas = computed(() => filtrarCanciones(this.canciones() || [], this.busqueda.texto()));

  // Ids con una petición en curso, para no enviar dos veces el mismo cambio
  readonly cancionesEnCurso = signal<ReadonlySet<number>>(new Set());
  readonly artistasEnCurso = signal<ReadonlySet<number>>(new Set());

  private suscripciones = new Subscription();

  constructor(
    private cancionService: CancionService,
    private artistaService: ArtistaService,
    readonly reproductor: ReproductorService,
    readonly busqueda: BusquedaService
  ) { }

  ngOnInit(): void {
    // El corazón también puede cambiarse desde la barra del reproductor mientras la página está abierta
    this.suscripciones.add(this.cancionService.favoritoActualizado$.subscribe(c => this.aplicarFavorito(c)));

    this.cancionService.obtenerFavoritas().subscribe({
      next: (data) => this.canciones.set(data),
      error: (err) => console.error('Error al cargar las canciones favoritas:', err)
    });

    this.artistaService.obtenerArtistasFavoritos().subscribe({
      next: (data) => this.artistas.set(data),
      error: (err) => console.error('Error al cargar los artistas favoritos:', err)
    });
  }

  ngOnDestroy(): void {
    this.suscripciones.unsubscribe();
  }

  toggleFavoritoCancion(cancion: Cancion): void {
    if (this.cancionesEnCurso().has(cancion.id)) return;

    this.cancionesEnCurso.update(ids => conId(ids, cancion.id));
    this.cancionService.toggleFavorito(cancion.id).subscribe({
      next: () => this.cancionesEnCurso.update(ids => sinId(ids, cancion.id)),
      error: (err) => {
        this.cancionesEnCurso.update(ids => sinId(ids, cancion.id));
        console.error('Error al actualizar favorito:', err);
      }
    });
  }

  // Alternar favorito y eliminar artista de favoritos (US 11)
  toggleFavoritoArtista(artista: Artista): void {
    if (this.artistasEnCurso().has(artista.id)) return;

    this.artistasEnCurso.update(ids => conId(ids, artista.id));
    this.artistaService.toggleFavorito(artista.id).subscribe({
      next: (actualizado) => {
        this.artistasEnCurso.update(ids => sinId(ids, artista.id));
        if (!actualizado.favorito) {
          this.artistas.update(lista => (lista || []).filter(a => a.id !== artista.id));
        }
      },
      error: (err) => {
        this.artistasEnCurso.update(ids => sinId(ids, artista.id));
        console.error('Error al actualizar favorito de artista:', err);
      }
    });
  }

  estaSonando(cancion: Cancion): boolean {
    return this.reproductor.cancionActual()?.id === cancion.id && this.reproductor.reproduciendo();
  }

  // Desmarcada: sale de la lista. Marcada desde la barra y no listada: se suma al final.
  private aplicarFavorito(cancionActualizada: Cancion): void {
    this.canciones.update(lista => {
      if (lista === null) return lista;
      if (!cancionActualizada.favorito) {
        return lista.filter(c => c.id !== cancionActualizada.id);
      }
      return lista.some(c => c.id === cancionActualizada.id) ? lista : [...lista, cancionActualizada];
    });
  }
}

function conId(ids: ReadonlySet<number>, id: number): ReadonlySet<number> {
  return new Set(ids).add(id);
}

function sinId(ids: ReadonlySet<number>, id: number): ReadonlySet<number> {
  const copia = new Set(ids);
  copia.delete(id);
  return copia;
}
