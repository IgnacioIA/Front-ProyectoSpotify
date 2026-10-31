import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CancionService } from '../../data-access/cancion.service';
import { ReproductorService } from '../../data-access/reproductor.service';
import { HistorialComponent } from './historial.component';

describe('HistorialComponent', () => {
  let fixture: ComponentFixture<HistorialComponent>;
  let element: HTMLElement;
  let http: HttpTestingController;

  const url = 'http://localhost:8080/api/historial';
  const queen = { id: 1, titulo: 'Bohemian Rhapsody', genero: 'Rock', duracion: 354, favorito: false, artista: { id: 7, nombre: 'Queen' } };
  const soda = { id: 2, titulo: 'De música ligera', genero: 'Rock', duracion: 210, favorito: false };
  const antigua = { id: 10, cancion: queen, fechaReproduccion: '2026-10-29T09:15:00' };
  const reciente = { id: 11, cancion: soda, fechaReproduccion: '2026-10-30T18:40:00' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistorialComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(HistorialComponent);
    element = fixture.nativeElement as HTMLElement;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function cargar(historial: unknown[]): void {
    http.expectOne(url).flush(historial);
    fixture.detectChanges();
  }

  function titulos(): string[] {
    return Array.from(element.querySelectorAll('.historial__cancion')).map((el) => el.textContent!.trim());
  }

  it('should list the playbacks from the most recent to the oldest with their date', () => {
    cargar([antigua, reciente]);
    expect(titulos()).toEqual(['De música ligera', 'Bohemian Rhapsody']);
    const fechas = Array.from(element.querySelectorAll('time')).map((t) => t.textContent!.trim());
    expect(fechas).toEqual(['30/10/2026 18:40', '29/10/2026 09:15']);
  });

  it('should show the empty state only after the backend answers with no playbacks', () => {
    expect(element.textContent).not.toContain('Todavía no reproduciste');
    cargar([]);
    expect(element.textContent).toContain('Todavía no reproduciste ninguna canción.');
  });

  it('should show a loading message, then a loading error with retry instead of an empty list', () => {
    expect(element.textContent).toContain('Cargando historial...');
    http.expectOne(url).flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(element.textContent).toContain('No se pudo cargar el historial.');
    expect(element.textContent).not.toContain('Todavía no reproduciste');

    (element.querySelector('.historial__reintentar') as HTMLButtonElement).click();
    cargar([antigua]);
    expect(titulos()).toEqual(['Bohemian Rhapsody']);
  });

  it('should keep the visible list and warn when a later reload fails', () => {
    cargar([antigua]);
    TestBed.inject(ReproductorService).reproducir(soda);
    http.expectOne(`${url}/reproducir/2`).flush({});
    http.expectOne(url).error(new ProgressEvent('error'), { status: 0 });
    fixture.detectChanges();

    expect(titulos()).toEqual(['Bohemian Rhapsody']);
    expect(element.querySelector('.historial__aviso')?.textContent).toContain('No se pudo actualizar el historial: no hay conexión');
  });

  it('should reload the list once the backend confirms a new playback', () => {
    cargar([antigua]);

    (element.querySelector('.historial__play') as HTMLButtonElement).click();
    expect(TestBed.inject(ReproductorService).cancionActual()?.id).toBe(1);
    http.expectNone(url);

    http.expectOne(`${url}/reproducir/1`).flush({ id: 12, cancion: queen, fechaReproduccion: '2026-10-31T10:00:00' });
    cargar([antigua, { id: 12, cancion: queen, fechaReproduccion: '2026-10-31T10:00:00' }]);
    expect(titulos()).toEqual(['Bohemian Rhapsody', 'Bohemian Rhapsody']);
    expect(element.querySelector('.historial__play')?.textContent?.trim()).toBe('❚❚');
  });

  it('should not reload the list when the backend rejects the playback', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    cargar([antigua]);
    TestBed.inject(ReproductorService).reproducir(soda);
    http.expectOne(`${url}/reproducir/2`).flush(null, { status: 404, statusText: 'Not Found' });
    http.expectNone(url);
  });

  it('should update the heart of every playback of the song once the favorite is confirmed', () => {
    cargar([{ ...antigua, id: 13 }, antigua]);
    (element.querySelector('.historial__favorito') as HTMLButtonElement).click();
    http.expectOne('http://localhost:8080/api/canciones/1/favorito').flush({ ...queen, favorito: true });
    fixture.detectChanges();

    const corazones = Array.from(element.querySelectorAll('.historial__favorito')).map((b) => b.textContent!.trim());
    expect(corazones).toEqual(['💚', '💚']);
  });

  it('should keep the heart when the favorite request fails', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    cargar([antigua]);
    TestBed.inject(CancionService).toggleFavorito(1).subscribe({ error: () => {} });
    http.expectOne('http://localhost:8080/api/canciones/1/favorito').flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(element.querySelector('.historial__favorito')?.textContent?.trim()).toBe('🤍');
  });
});
