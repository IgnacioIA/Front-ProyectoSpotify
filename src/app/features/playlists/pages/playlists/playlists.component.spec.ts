import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReproductorService } from '../../../songs/data-access/reproductor.service';
import { Playlist } from '../../models/playlist.model';
import { BusquedaService } from '../../../search/data-access/busqueda.service';
import { PlaylistsComponent } from './playlists.component';

describe('PlaylistsComponent', () => {
  let fixture: ComponentFixture<PlaylistsComponent>;
  let element: HTMLElement;
  let http: HttpTestingController;

  const url = 'http://localhost:8080/api/playlists';
  const cancion = { id: 5, titulo: 'Bohemian Rhapsody', genero: 'Rock', duracion: 354, favorito: false, artista: { id: 1, nombre: 'Queen' } };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlaylistsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(PlaylistsComponent);
    element = fixture.nativeElement as HTMLElement;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function cargar(playlists: unknown[]): void {
    http.expectOne(url).flush(playlists);
    fixture.detectChanges();
  }

  function items(): HTMLButtonElement[] {
    return Array.from(element.querySelectorAll('.playlists__item'));
  }

  function boton(texto: string): HTMLButtonElement {
    return Array.from(element.querySelectorAll('button')).find((b) => b.textContent?.trim() === texto)!;
  }

  async function escribirNombre(nombre: string): Promise<void> {
    const input = element.querySelector('input') as HTMLInputElement;
    input.value = nombre;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function enviar(): void {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function seleccionar(indice: number, respuesta: Playlist): void {
    items()[indice].click();
    http.expectOne(`${url}/${respuesta.id}`).flush(respuesta);
    fixture.detectChanges();
  }

  it('should list the playlists with their song count', () => {
    cargar([{ id: 1, nombre: 'Mix', canciones: [cancion] }, { id: 2, nombre: 'Rock', canciones: [] }]);
    const texto = (selector: string) =>
      Array.from(element.querySelectorAll(selector)).map((el) => el.textContent!.trim());
    expect(texto('.playlists__item-nombre')).toEqual(['📁 Mix', '📁 Rock']);
    expect(texto('.playlists__item-cantidad')).toEqual(['1', '0']);
    expect(element.textContent).toContain('Elegí una playlist para ver sus canciones.');
  });

  it('should show an empty state when there are no playlists', () => {
    cargar([]);
    expect(element.textContent).toContain('Todavía no creaste ninguna playlist.');
  });

  it('should create a playlist once, select it and clear the field', async () => {
    cargar([]);
    await escribirNombre('  Nueva  ');
    enviar();
    enviar();

    const req = http.expectOne(url);
    expect(req.request.body).toEqual({ nombre: 'Nueva' });
    req.flush({ id: 3, nombre: 'Nueva', canciones: [] });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(items().length).toBe(1);
    expect(items()[0].getAttribute('aria-pressed')).toBe('true');
    expect((element.querySelector('input') as HTMLInputElement).value).toBe('');
  });

  it('should not create a playlist without a name', async () => {
    cargar([]);
    await escribirNombre('   ');
    enviar();
    http.expectNone(url);
    expect(element.querySelector('[role=alert]')?.textContent).toContain('Ingresá un nombre para la playlist.');
  });

  it('should show the songs of the selected playlist and play them with the shared player', () => {
    cargar([{ id: 1, nombre: 'Mix', canciones: [] }]);
    seleccionar(0, { id: 1, nombre: 'Mix', canciones: [cancion] });

    expect(element.querySelector('.playlists__detalle-titulo')?.textContent).toContain('Mix');
    expect(element.querySelector('.playlists__cancion')?.textContent).toContain('Bohemian Rhapsody');

    (element.querySelector('.playlists__play') as HTMLButtonElement).click();
    http.expectOne('http://localhost:8080/api/historial/reproducir/5').flush({});
    fixture.detectChanges();
    expect(TestBed.inject(ReproductorService).cancionActual()?.id).toBe(5);
    expect(element.querySelector('.playlists__play')?.textContent?.trim()).toBe('❚❚');
  });

  it('should filter the songs of the selected playlist with the header search', () => {
    const soda = { id: 6, titulo: 'De música ligera', genero: 'Rock', duracion: 210, artista: { id: 2, nombre: 'Soda Stereo' } };
    cargar([{ id: 1, nombre: 'Mix', canciones: [cancion, soda] }]);
    seleccionar(0, { id: 1, nombre: 'Mix', canciones: [cancion, soda] });
    const busqueda = TestBed.inject(BusquedaService);
    const titulos = () => Array.from(element.querySelectorAll('.playlists__cancion-titulo')).map((el) => el.textContent!.trim());

    busqueda.texto.set('queen');
    fixture.detectChanges();
    expect(titulos()).toEqual(['Bohemian Rhapsody']);
    expect(element.querySelector('.playlists__detalle-info')?.textContent).toContain('2 canciones');

    busqueda.texto.set('zzz');
    fixture.detectChanges();
    expect(element.textContent).toContain('No hay canciones en esta playlist que coincidan con «zzz».');
    expect(element.textContent).not.toContain('todavía no tiene canciones');
  });

  it('should remove a song from the selected playlist', () => {
    cargar([{ id: 1, nombre: 'Mix', canciones: [cancion] }]);
    seleccionar(0, { id: 1, nombre: 'Mix', canciones: [cancion] });

    boton('Eliminar de la Playlist').click();
    http.expectOne(`${url}/1/canciones/5`).flush({ id: 1, nombre: 'Mix', canciones: [] });
    fixture.detectChanges();

    expect(element.querySelector('.playlists__cancion')).toBeNull();
    expect(element.textContent).toContain('Esta playlist todavía no tiene canciones.');
    expect(items()[0].textContent).toContain('0');
  });

  it('should delete the selected playlist and clear the detail', () => {
    cargar([{ id: 1, nombre: 'Mix', canciones: [] }, { id: 2, nombre: 'Rock', canciones: [] }]);
    seleccionar(0, { id: 1, nombre: 'Mix', canciones: [] });

    boton('Eliminar playlist').click();
    fixture.detectChanges();
    expect(boton('Eliminar playlist').disabled).toBe(true);
    boton('Eliminar playlist').click();
    http.expectOne(`${url}/1`).flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(items().length).toBe(1);
    expect(items()[0].textContent).toContain('Rock');
    expect(element.querySelector('.playlists__detalle-titulo')).toBeNull();
  });

  it('should update the heart only after the backend confirms the favorite', () => {
    cargar([{ id: 1, nombre: 'Mix', canciones: [cancion] }]);
    seleccionar(0, { id: 1, nombre: 'Mix', canciones: [cancion] });
    const corazon = () => element.querySelector('.playlists__favorito') as HTMLButtonElement;

    corazon().click();
    fixture.detectChanges();
    expect(corazon().textContent?.trim()).toBe('🤍');
    http.expectOne('http://localhost:8080/api/canciones/5/favorito').flush({ ...cancion, favorito: true });
    fixture.detectChanges();
    expect(corazon().textContent?.trim()).toBe('💚');
  });
});
