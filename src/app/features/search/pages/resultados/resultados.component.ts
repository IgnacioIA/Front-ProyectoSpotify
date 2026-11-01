import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { ArtistaService } from '../../../artists/data-access/artista.service';
import { Artista } from '../../../artists/models/artista.model';
import { HomeNavegacionService } from '../../../home/data-access/home-navegacion.service';
import { CancionService } from '../../../songs/data-access/cancion.service';
import { ReproductorService } from '../../../songs/data-access/reproductor.service';
import { Cancion } from '../../../songs/models/cancion.model';
import { formatearDuracion } from '../../../../shared/utils/formatear-duracion';
import { EstadoCarga, mensajeError } from '../../../../shared/utils/mensaje-error';
import { BusquedaService, buscarArtistas, buscarCanciones } from '../../data-access/busqueda.service';

// Resultados de la búsqueda global (/buscar?q=...).
// El backend no tiene un endpoint que combine los criterios: se trae el catálogo completo y se filtra acá.
@Component({
  selector: 'app-resultados',
  standalone: true,
  templateUrl: './resultados.component.html',
  styleUrls: ['../../../songs/pages/favoritos/favoritos.component.css', './resultados.component.css']
})
export class ResultadosComponent implements OnInit, OnDestroy {
  readonly formatearDuracion = formatearDuracion;

  readonly termino = signal('');
  readonly estado = signal<EstadoCarga>('listo');
  readonly error = signal('');
  readonly canciones = signal<Cancion[]>([]);
  readonly artistas = signal<Artista[]>([]);
  readonly sinResultados = computed(() => this.canciones().length === 0 && this.artistas().length === 0);

  private parametros?: Subscription;
  private consulta?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cancionService: CancionService,
    private artistaService: ArtistaService,
    private homeNavegacion: HomeNavegacionService,
    private busqueda: BusquedaService,
    readonly reproductor: ReproductorService
  ) { }

  ngOnInit(): void {
    // Una búsqueda nueva reutiliza este componente: solo cambia el parámetro de la URL
    this.parametros = this.route.queryParamMap.subscribe(parametros => {
      this.termino.set((parametros.get('q') ?? '').trim());
      // También cubre abrir la URL directamente o volver con el botón Atrás del navegador.
      // Si solo difiere en espacios no se toca: se perdería el espacio de "los " al seguir escribiendo.
      if (this.busqueda.texto().trim() !== this.termino()) {
        this.busqueda.texto.set(this.termino());
      }
      this.cargar();
    });
  }

  ngOnDestroy(): void {
    this.parametros?.unsubscribe();
    this.consulta?.unsubscribe();
    // El texto buscado no debe quedar filtrando las listas de las demás páginas
    this.busqueda.texto.set('');
  }

  cargar(): void {
    this.consulta?.unsubscribe();
    this.canciones.set([]);
    this.artistas.set([]);

    const termino = this.termino();
    if (!termino) {
      this.estado.set('listo');
      return;
    }

    this.estado.set('cargando');
    this.consulta = forkJoin({
      canciones: this.cancionService.obtenerCanciones(),
      artistas: this.artistaService.obtenerArtistas()
    }).subscribe({
      next: ({ canciones, artistas }) => {
        this.canciones.set(buscarCanciones(canciones, termino));
        this.artistas.set(buscarArtistas(artistas, termino));
        this.estado.set('listo');
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'realizar la búsqueda'));
        this.estado.set('error');
      }
    });
  }

  estaSonando(cancion: Cancion): boolean {
    return this.reproductor.cancionActual()?.id === cancion.id && this.reproductor.reproduciendo();
  }

  // El detalle de artista está en Home: se usa el mismo pedido que la barra del reproductor,
  // que solo necesita los datos del artista y la portada
  abrirArtista(artista: Artista): void {
    this.homeNavegacion.artistaSolicitado.set({
      id: 0,
      titulo: '',
      genero: '',
      duracion: 0,
      portada: artista.portada,
      artista: { id: artista.id, nombre: artista.nombre }
    });
    this.router.navigate(['/']);
  }
}
