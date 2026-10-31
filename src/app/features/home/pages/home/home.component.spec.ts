import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReproductorService } from '../../../songs/data-access/reproductor.service';
import { HomeNavegacionService } from '../../data-access/home-navegacion.service';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let home: HomeComponent;
  let navegacion: HomeNavegacionService;
  let seccionesDesplazadas: string[];

  beforeEach(async () => {
    // jsdom no implementa el desplazamiento; se registra a qué elemento se desplaza
    seccionesDesplazadas = [];
    Element.prototype.scrollIntoView = function (this: Element) {
      seccionesDesplazadas.push(this.id);
    };
    window.scrollTo = () => {};

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(HomeComponent);
    home = fixture.componentInstance;
    navegacion = TestBed.inject(HomeNavegacionService);
    fixture.detectChanges();
  });

  it('should filter songs with the text typed in the header search', () => {
    home.canciones = [
      { id: 1, titulo: 'Bohemian Rhapsody', artista: { id: 1, nombre: 'Queen' } },
      { id: 2, titulo: 'De música ligera', artista: { id: 2, nombre: 'Soda Stereo' } },
    ];
    navegacion.filtroTexto.set('queen');
    expect(home.cancionesFiltradas.map((c) => c.id)).toEqual([1]);
  });

  it('should open the existing history view from the menu', () => {
    navegacion.emitirAccion('historial');
    expect(home.viendoHistorial).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Historial de reproducción');
  });

  it('should activate the existing favorites filter from the menu, even if pressed twice', () => {
    navegacion.emitirAccion('favoritos');
    expect(home.soloFavoritas).toBe(true);
    navegacion.emitirAccion('favoritos');
    expect(home.soloFavoritas).toBe(true);
  });

  it('should return to the main view from the menu', () => {
    navegacion.emitirAccion('historial');
    navegacion.emitirAccion('inicio');
    expect(home.viendoHistorial).toBe(false);
    expect(home.soloFavoritas).toBe(false);
    expect(home.artistaSeleccionado).toBeNull();
  });

  it('should scroll to the existing sections from the menu', () => {
    navegacion.emitirAccion('historial');
    navegacion.emitirAccion('canciones');
    navegacion.emitirAccion('artistas');
    navegacion.emitirAccion('favoritos');
    expect(seccionesDesplazadas).toEqual(['seccion-canciones', 'seccion-artistas', 'seccion-canciones']);
  });

  it('should play through the shared player and reload the history once the backend registers it', () => {
    const http = TestBed.inject(HttpTestingController);
    const urlHistorial = 'http://localhost:8080/api/historial';
    http.expectOne(urlHistorial).flush([]);

    home.reproducirCancion({ id: 1, titulo: 'Bohemian Rhapsody', duracion: 354 });
    expect(TestBed.inject(ReproductorService).cancionActual()?.id).toBe(1);
    http.expectNone(urlHistorial);

    http.expectOne(`${urlHistorial}/reproducir/1`).flush({});
    http.expectOne(urlHistorial);
  });

  it('should sync the favorite in its lists when the backend confirms it', () => {
    const http = TestBed.inject(HttpTestingController);
    home.canciones = [{ id: 1, titulo: 'Bohemian Rhapsody', favorito: false }];
    home.historial = [{ id: 5, fechaReproduccion: '', cancion: { id: 1, titulo: 'Bohemian Rhapsody', genero: '', duracion: 1, favorito: false } }];

    home.toggleFavorito(home.canciones[0], new Event('click'));
    expect(home.canciones[0].favorito).toBe(false);
    http.expectOne('http://localhost:8080/api/canciones/1/favorito').flush({ id: 1, favorito: true });

    expect(home.canciones[0].favorito).toBe(true);
    expect(home.historial[0].cancion.favorito).toBe(true);
  });

  it('should show the playlists section only when playlists exist', () => {
    navegacion.emitirAccion('playlists');
    expect(seccionesDesplazadas).toEqual([]);

    home.playlists = [{ id: 1, nombre: 'Mix', canciones: [] }];
    fixture.detectChanges();
    navegacion.emitirAccion('playlists');
    expect(seccionesDesplazadas).toEqual(['seccion-playlists']);
  });
});
