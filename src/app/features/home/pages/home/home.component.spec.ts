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
  const urlCanciones = 'http://localhost:8080/api/canciones';

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
    TestBed.inject(HttpTestingController).expectOne(urlCanciones)
      .flush([{ id: 1, titulo: 'Bohemian Rhapsody', artista: { id: 1, nombre: 'Queen' } }]);
    TestBed.inject(BusquedaService).texto.set('zzz');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay canciones que coincidan con «zzz».');
    expect(fixture.nativeElement.textContent).not.toContain('No hay canciones en esta vista.');
  });

  describe('loading and error states', () => {
    const texto = () => (fixture.nativeElement as HTMLElement).textContent!;
    const fallar = (url: string) =>
      TestBed.inject(HttpTestingController).expectOne(url).flush(null, { status: 500, statusText: 'Server Error' });

    it('should show loading messages until the songs and artists arrive', () => {
      expect(texto()).toContain('Cargando canciones...');
      expect(texto()).toContain('Cargando artistas...');
      expect(texto()).not.toContain('No hay canciones en esta vista.');
      expect(texto()).not.toContain('Conectado exitosamente');

      const http = TestBed.inject(HttpTestingController);
      http.expectOne(urlCanciones).flush([]);
      http.expectOne('http://localhost:8080/api/artistas').flush([]);
      fixture.detectChanges();
      expect(texto()).toContain('No hay canciones en esta vista.');
      expect(texto()).toContain('No hay artistas disponibles.');
      expect(texto()).toContain('Conectado exitosamente');
    });

    it('should show a loading error instead of an empty list and allow retrying', () => {
      fallar(urlCanciones);
      fallar('http://localhost:8080/api/artistas');
      fixture.detectChanges();
      expect(texto()).toContain('No se pudieron cargar las canciones.');
      expect(texto()).toContain('No se pudieron cargar los artistas.');
      expect(texto()).not.toContain('No hay canciones en esta vista.');
      expect(texto()).not.toContain('No hay artistas disponibles.');
      expect(texto()).not.toContain('Conectado exitosamente');

      const reintentar = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
        .find((b) => b.closest('#seccion-canciones') && b.textContent?.trim() === 'Reintentar') as HTMLButtonElement;
      reintentar.click();
      TestBed.inject(HttpTestingController).expectOne(urlCanciones).flush([{ id: 1, titulo: 'Bohemian Rhapsody' }]);
      fixture.detectChanges();
      expect(texto()).toContain('Bohemian Rhapsody');
      expect(texto()).not.toContain('No se pudieron cargar las canciones.');
    });

    it('should warn when the history or the playlists cannot be loaded instead of hiding them silently', () => {
      fallar('http://localhost:8080/api/historial');
      fallar('http://localhost:8080/api/playlists');
      fixture.detectChanges();
      expect(texto()).toContain('No se pudo cargar tu historial de reproducción.');
      expect(texto()).toContain('No se pudieron cargar tus playlists.');
    });

    it('should show an understandable message when an operation fails', () => {
      home.nombreNuevaPlaylist = 'Mix';
      home.crearPlaylist();
      TestBed.inject(HttpTestingController).expectOne((r) => r.method === 'POST' && r.url === 'http://localhost:8080/api/playlists')
        .error(new ProgressEvent('error'), { status: 0 });
      fixture.detectChanges();

      const aviso = (fixture.nativeElement as HTMLElement).querySelector('[role=alert]');
      expect(aviso?.textContent).toContain('No se pudo crear la playlist: no hay conexión con el servidor.');
      (aviso!.querySelector('button') as HTMLButtonElement).click();
      expect(home.errorOperacion).toBeNull();
    });
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

  // US 17: la navegación vive en ReproductorService y la barra persistente (ver sus specs).
  // Home solo inicia la reproducción pasando la lista que está mostrando.
  describe('US 17 - Home inicia la reproducción con la lista visible', () => {
    const listaMock = [
      { id: 101, titulo: 'Track 1', duracion: 180, artista: { id: 1, nombre: 'Artista A' } },
      { id: 102, titulo: 'Track 2', duracion: 210, artista: { id: 2, nombre: 'Artista B' } },
      { id: 103, titulo: 'Otra', duracion: 240, artista: { id: 3, nombre: 'Artista C' } },
    ];

    let reproductor: ReproductorService;
    const idsCola = () => reproductor.colaReproduccion().map((c) => c.id);

    beforeEach(() => {
      reproductor = TestBed.inject(ReproductorService);
      TestBed.inject(HttpTestingController).expectOne(urlCanciones).flush(listaMock);
      fixture.detectChanges();
    });

    function playDe(selector: string, indice: number): HTMLButtonElement {
      const filas = (fixture.nativeElement as HTMLElement).querySelectorAll(`${selector} > div > div[style*="position: relative"]`);
      return filas[indice].querySelector('button') as HTMLButtonElement;
    }

    it('should use the displayed songs as the queue when playing from the main list', () => {
      playDe('#seccion-canciones', 1).click();
      expect(reproductor.cancionActual()?.id).toBe(102);
      expect(idsCola()).toEqual([101, 102, 103]);
      expect(reproductor.indiceActual()).toBe(1);
    });

    it('should not include songs hidden by the search in the queue', () => {
      TestBed.inject(BusquedaService).texto.set('track');
      fixture.detectChanges();

      playDe('#seccion-canciones', 0).click();
      expect(idsCola()).toEqual([101, 102]);
      expect(reproductor.tieneSiguiente()).toBe(true);
    });

    it('should use the history songs as the queue when playing from the history section', () => {
      TestBed.inject(HttpTestingController).expectOne('http://localhost:8080/api/historial').flush([
        { id: 2, cancion: listaMock[2], fechaReproduccion: '2026-10-31T10:00:00' },
        { id: 1, cancion: listaMock[0], fechaReproduccion: '2026-10-30T10:00:00' },
      ]);
      fixture.detectChanges();

      home.reproducirCancion(listaMock[0], home.cancionesHistorial);
      expect(idsCola()).toEqual([103, 101]);
      expect(reproductor.tieneSiguiente()).toBe(false);
      expect(reproductor.tieneAnterior()).toBe(true);
    });

    it('should remove a song taken out of the selected playlist from the queue', () => {
      home.reproducirCancion(listaMock[0], listaMock);
      home.playlistSeleccionada = { id: 9, nombre: 'Mix', canciones: listaMock };

      home.eliminarCancionDePlaylist(listaMock[1], home.playlistSeleccionada, new Event('click'));
      TestBed.inject(HttpTestingController).expectOne('http://localhost:8080/api/playlists/9/canciones/102')
        .flush({ id: 9, nombre: 'Mix', canciones: [listaMock[0], listaMock[2]] });

      expect(idsCola()).toEqual([101, 103]);
    });

    it('should not render its own player: the controls live in the persistent bar', () => {
      home.reproducirCancion(listaMock[0], listaMock);
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelector('#btn-siguiente')).toBeNull();
    });
  });
});
