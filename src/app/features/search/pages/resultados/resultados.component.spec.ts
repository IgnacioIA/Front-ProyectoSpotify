import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { HomeNavegacionService } from '../../../home/data-access/home-navegacion.service';
import { ReproductorService } from '../../../songs/data-access/reproductor.service';
import { BusquedaService } from '../../data-access/busqueda.service';
import { ResultadosComponent } from './resultados.component';

describe('ResultadosComponent', () => {
  const CANCIONES = 'http://localhost:8080/api/canciones';
  const ARTISTAS = 'http://localhost:8080/api/artistas';

  const catalogo = [
    { id: 1, titulo: 'Marea baja', genero: 'Rock', duracion: 198, artista: { id: 1, nombre: 'Los Faros del Sur' } },
    { id: 2, titulo: 'Canción de agosto', genero: 'Pop', duracion: 187, artista: { id: 2, nombre: 'Luna Quiroga' } },
    { id: 3, titulo: 'Ruta sin mapa', genero: 'Rock', duracion: 263, artista: { id: 1, nombre: 'Los Faros del Sur' } },
  ];
  const artistas = [
    { id: 1, nombre: 'Los Faros del Sur' },
    { id: 2, nombre: 'Luna Quiroga' },
    { id: 3, nombre: 'Rock Sin Canciones' },
  ];

  let fixture: ComponentFixture<ResultadosComponent>;
  let element: HTMLElement;
  let http: HttpTestingController;
  let parametros: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  function crear(q: string | null): void {
    parametros = new BehaviorSubject(convertToParamMap(q === null ? {} : { q }));
    TestBed.configureTestingModule({
      imports: [ResultadosComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { queryParamMap: parametros } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ResultadosComponent);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  }

  function responder(): void {
    http.expectOne(CANCIONES).flush(catalogo);
    http.expectOne(ARTISTAS).flush(artistas);
    fixture.detectChanges();
  }

  function textos(selector: string): string[] {
    return Array.from(element.querySelectorAll(selector)).map((el) => el.textContent!.trim());
  }

  const canciones = () => textos('.favoritos__cancion-titulo');
  const nombresArtistas = () => textos('.favoritos__artista-nombre');

  it('should show a loading indicator while the catalog is requested', () => {
    crear('marea');
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Buscando');
    responder();
    expect(element.querySelector('[role="status"]')).toBeNull();
  });

  it('should show the searched text and keep it in the header', () => {
    crear('marea');
    responder();
    expect(element.querySelector('h2')?.textContent).toContain('Resultados para «marea»');
    expect(TestBed.inject(BusquedaService).texto()).toBe('marea');
  });

  it('should keep the trailing space while the user is still typing', () => {
    crear('los');
    TestBed.inject(BusquedaService).texto.set('los ');
    parametros.next(convertToParamMap({ q: 'los' }));
    expect(TestBed.inject(BusquedaService).texto()).toBe('los ');
  });

  it('should find a song by its title and hide the empty artists section', () => {
    crear('marea');
    responder();
    expect(canciones()).toEqual(['Marea baja']);
    expect(textos('h3')).toEqual(['Canciones']);
  });

  it('should find songs and artists by the artist name', () => {
    crear('faros');
    responder();
    expect(canciones()).toEqual(['Marea baja', 'Ruta sin mapa']);
    expect(nombresArtistas()).toEqual(['Los Faros del Sur']);
    expect(textos('h3')).toEqual(['Canciones', 'Artistas']);
  });

  it('should find songs by genre', () => {
    crear('pop');
    responder();
    expect(canciones()).toEqual(['Canción de agosto']);
  });

  it('should show only artists when no song matches', () => {
    crear('sin canciones');
    responder();
    expect(canciones()).toEqual([]);
    expect(nombresArtistas()).toEqual(['Rock Sin Canciones']);
    expect(textos('h3')).toEqual(['Artistas']);
  });

  it('should show the empty state when nothing matches', () => {
    crear('zzzz');
    responder();
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'No encontramos resultados para tu búsqueda',
    );
    expect(element.querySelectorAll('h3').length).toBe(0);
  });

  it('should update the results with a second search', () => {
    crear('marea');
    responder();

    parametros.next(convertToParamMap({ q: 'luna' }));
    fixture.detectChanges();
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Buscando');
    responder();

    expect(canciones()).toEqual(['Canción de agosto']);
    expect(element.querySelector('h2')?.textContent).toContain('«luna»');
  });

  it('should ignore the response of a previous search', () => {
    crear('marea');
    const primera = http.expectOne(CANCIONES);
    http.expectOne(ARTISTAS);

    parametros.next(convertToParamMap({ q: 'luna' }));
    expect(primera.cancelled).toBe(true);
    responder();
    expect(canciones()).toEqual(['Canción de agosto']);
  });

  it('should show a clear error and allow retrying', () => {
    crear('marea');
    http.expectOne(CANCIONES).flush('error', { status: 500, statusText: 'Server Error' });
    http.expectOne(ARTISTAS);
    fixture.detectChanges();

    const alerta = element.querySelector('[role="alert"]')!;
    expect(alerta.textContent).toContain('No se pudo realizar la búsqueda');

    (alerta.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    responder();
    expect(canciones()).toEqual(['Marea baja']);
  });

  it('should not request the catalog without a search text', () => {
    crear(null);
    http.expectNone(CANCIONES);
    expect(element.textContent).toContain('Escribí una canción');
  });

  it('should play a song with the results as the queue', () => {
    crear('faros');
    responder();
    const reproductor = TestBed.inject(ReproductorService);

    (element.querySelector('.favoritos__play') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(reproductor.cancionActual()?.titulo).toBe('Marea baja');
    expect(reproductor.colaReproduccion().map((c) => c.id)).toEqual([1, 3]);
    expect(element.querySelector('.favoritos__play')?.textContent).toContain('❚❚');
    reproductor.alternarReproduccion();
  });

  it('should open the artist in Home like the player bar does', () => {
    crear('luna');
    responder();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate');

    (element.querySelector('.resultados__artista') as HTMLButtonElement).click();

    expect(TestBed.inject(HomeNavegacionService).artistaSolicitado()?.artista).toEqual({ id: 2, nombre: 'Luna Quiroga' });
    expect(navegar).toHaveBeenCalledWith(['/']);
  });

  it('should clear the text when leaving the page', () => {
    crear('marea');
    responder();
    fixture.destroy();
    expect(TestBed.inject(BusquedaService).texto()).toBe('');
  });
});
