import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CancionService } from '../../data-access/cancion.service';
import { ReproductorService } from '../../data-access/reproductor.service';
import { BusquedaService } from '../../../search/data-access/busqueda.service';
import { FavoritosComponent } from './favoritos.component';

describe('FavoritosComponent', () => {
  let fixture: ComponentFixture<FavoritosComponent>;
  let element: HTMLElement;
  let http: HttpTestingController;

  const urlCanciones = 'http://localhost:8080/api/canciones/favoritas';
  const urlArtistas = 'http://localhost:8080/api/artistas/favoritos';
  const queen = { id: 1, titulo: 'Bohemian Rhapsody', genero: 'Rock', duracion: 354, favorito: true, artista: { id: 7, nombre: 'Queen' } };
  const soda = { id: 2, titulo: 'De música ligera', genero: 'Rock', duracion: 210, favorito: true };
  const artista = { id: 7, nombre: 'Queen', favorito: true };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FavoritosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(FavoritosComponent);
    element = fixture.nativeElement as HTMLElement;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function cargar(canciones: unknown[], artistas: unknown[]): void {
    http.expectOne(urlCanciones).flush(canciones);
    http.expectOne(urlArtistas).flush(artistas);
    fixture.detectChanges();
  }

  function titulos(): string[] {
    return Array.from(element.querySelectorAll('.favoritos__cancion-titulo')).map((el) => el.textContent!.trim());
  }

  function nombresArtistas(): string[] {
    return Array.from(element.querySelectorAll('.favoritos__artista-nombre')).map((el) => el.textContent!.trim());
  }

  it('should load favorite songs and artists from their endpoints', () => {
    cargar([queen, soda], [artista]);
    expect(titulos()).toEqual(['Bohemian Rhapsody', 'De música ligera']);
    expect(nombresArtistas()).toEqual(['Queen']);
  });

  it('should not show the empty states before the backend answers', () => {
    expect(element.textContent).not.toContain('Todavía no marcaste');
    cargar([], []);
    expect(element.textContent).toContain('Todavía no marcaste canciones como favoritas.');
    expect(element.textContent).toContain('Todavía no marcaste artistas como favoritos.');
  });

  it('should remove a song once the backend confirms it is no longer a favorite', () => {
    cargar([queen, soda], []);
    const corazon = () => element.querySelector('.favoritos__cancion .favoritos__corazon') as HTMLButtonElement;

    corazon().click();
    fixture.detectChanges();
    expect(corazon().disabled).toBe(true);
    corazon().click();
    expect(titulos().length).toBe(2);

    http.expectOne('http://localhost:8080/api/canciones/1/favorito').flush({ ...queen, favorito: false });
    fixture.detectChanges();
    expect(titulos()).toEqual(['De música ligera']);
  });

  it('should keep the song when the request fails', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    cargar([queen], []);
    (element.querySelector('.favoritos__cancion .favoritos__corazon') as HTMLButtonElement).click();
    http.expectOne('http://localhost:8080/api/canciones/1/favorito').flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(titulos()).toEqual(['Bohemian Rhapsody']);
    expect((element.querySelector('.favoritos__cancion .favoritos__corazon') as HTMLButtonElement).disabled).toBe(false);
  });

  it('should follow favorite changes made from the player bar', () => {
    cargar([soda], []);
    const canciones = TestBed.inject(CancionService);

    canciones.toggleFavorito(1).subscribe();
    http.expectOne('http://localhost:8080/api/canciones/1/favorito').flush(queen);
    fixture.detectChanges();
    expect(titulos()).toEqual(['De música ligera', 'Bohemian Rhapsody']);

    canciones.toggleFavorito(2).subscribe();
    http.expectOne('http://localhost:8080/api/canciones/2/favorito').flush({ ...soda, favorito: false });
    fixture.detectChanges();
    expect(titulos()).toEqual(['Bohemian Rhapsody']);
  });

  it('should filter the favorite songs, but not the artists, with the header search', () => {
    cargar([queen, soda], [artista]);
    const busqueda = TestBed.inject(BusquedaService);

    busqueda.texto.set('ligera');
    fixture.detectChanges();
    expect(titulos()).toEqual(['De música ligera']);
    expect(nombresArtistas()).toEqual(['Queen']);

    busqueda.texto.set('zzz');
    fixture.detectChanges();
    expect(titulos()).toEqual([]);
    expect(element.textContent).toContain('No hay canciones favoritas que coincidan con «zzz».');
    expect(element.textContent).not.toContain('Todavía no marcaste canciones');
  });

  it('should play a favorite song with the shared player', () => {
    cargar([queen], []);
    (element.querySelector('.favoritos__play') as HTMLButtonElement).click();
    http.expectOne('http://localhost:8080/api/historial/reproducir/1').flush({});
    fixture.detectChanges();
    expect(TestBed.inject(ReproductorService).cancionActual()?.id).toBe(1);
    expect(element.querySelector('.favoritos__play')?.textContent?.trim()).toBe('❚❚');
  });

  it('should remove an artist once the backend confirms it is no longer a favorite', () => {
    cargar([], [artista, { id: 8, nombre: 'Soda Stereo', favorito: true }]);
    (element.querySelector('.favoritos__artista .favoritos__corazon') as HTMLButtonElement).click();
    const req = http.expectOne('http://localhost:8080/api/artistas/7/favorito');
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...artista, favorito: false });
    fixture.detectChanges();
    expect(nombresArtistas()).toEqual(['Soda Stereo']);
  });

  it('should keep the artist when the request fails', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    cargar([], [artista]);
    (element.querySelector('.favoritos__artista .favoritos__corazon') as HTMLButtonElement).click();
    http.expectOne('http://localhost:8080/api/artistas/7/favorito').flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(nombresArtistas()).toEqual(['Queen']);
  });
});
