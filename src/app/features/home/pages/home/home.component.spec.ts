import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReproductorService } from '../../../songs/data-access/reproductor.service';
import { PlaylistService } from '../../../playlists/data-access/playlist.service';
import { HomeNavegacionService } from '../../data-access/home-navegacion.service';
import { BusquedaService } from '../../../search/data-access/busqueda.service';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let home: HomeComponent;
  let navegacion: HomeNavegacionService;

  beforeEach(async () => {
    // jsdom no implementa el desplazamiento de la ventana
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
    TestBed.inject(BusquedaService).texto.set('queen');
    expect(home.cancionesFiltradas.map((c) => c.id)).toEqual([1]);
  });

  it('should explain when no song matches the search', () => {
    home.canciones = [{ id: 1, titulo: 'Bohemian Rhapsody', artista: { id: 1, nombre: 'Queen' } }];
    TestBed.inject(BusquedaService).texto.set('zzz');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay canciones que coincidan con «zzz».');
    expect(fixture.nativeElement.textContent).not.toContain('No hay canciones en esta vista.');
  });

  it('should return to the main view when "Inicio" is chosen while already in Home', () => {
    home.seleccionarArtista({ id: 7, nombre: 'Queen' });
    expect(fixture.nativeElement.textContent).toContain('Canciones populares');

    navegacion.emitirAccion('inicio');
    expect(home.artistaSeleccionado).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Canciones populares');

    home.mostrarHistorial();
    navegacion.emitirAccion('inicio');
    expect(home.viendoHistorial).toBe(false);
    expect(home.soloFavoritas).toBe(false);
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

  it('should add a song from the "+ Playlist" menu to the shared playlists', () => {
    const http = TestBed.inject(HttpTestingController);
    const cancion = { id: 5, titulo: 'Bohemian Rhapsody', genero: 'Rock', duracion: 354 };
    http.expectOne('http://localhost:8080/api/playlists').flush([{ id: 1, nombre: 'Mix', canciones: [] }]);

    home.agregarAPlaylist(cancion, home.playlists[0], new Event('click'));
    http.expectOne('http://localhost:8080/api/playlists/1/canciones/5').flush({ id: 1, nombre: 'Mix', canciones: [cancion] });

    expect(TestBed.inject(PlaylistService).playlists()[0].canciones).toEqual([cancion]);
    expect(home.cancionParaPlaylist).toBeNull();
  });

  it('should show the playlists section only when playlists exist', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('#seccion-playlists')).toBeNull();

    TestBed.inject(HttpTestingController).expectOne('http://localhost:8080/api/playlists').flush([{ id: 1, nombre: 'Mix', canciones: [] }]);
    fixture.detectChanges();
    expect(element.querySelector('#seccion-playlists')?.textContent).toContain('Mix');
  });
});
