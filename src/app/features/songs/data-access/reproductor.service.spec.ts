import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Cancion } from '../models/cancion.model';
import { CancionService } from './cancion.service';
import { ReproductorService } from './reproductor.service';

describe('ReproductorService', () => {
  let reproductor: ReproductorService;
  let http: HttpTestingController;

  const cancion: Cancion = { id: 1, titulo: 'Bohemian Rhapsody', genero: 'Rock', duracion: 3, favorito: false };
  const otra: Cancion = { id: 2, titulo: 'De música ligera', genero: 'Rock', duracion: 200 };
  const urlRegistro = (id: number) => `http://localhost:8080/api/historial/reproducir/${id}`;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    reproductor = TestBed.inject(ReproductorService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('should start a new song from zero and register the playback once', () => {
    const registradas: unknown[] = [];
    reproductor.reproduccionRegistrada$.subscribe((h) => registradas.push(h));

    reproductor.reproducir(cancion);
    const req = http.expectOne(urlRegistro(1));
    expect(req.request.method).toBe('POST');
    req.flush({ id: 10, cancion, fechaReproduccion: '2026-10-30T10:00:00' });

    expect(reproductor.cancionActual()).toEqual(cancion);
    expect(reproductor.reproduciendo()).toBe(true);
    expect(reproductor.tiempoActual()).toBe(0);
    expect(registradas.length).toBe(1);
  });

  it('should toggle play and pause on the same song without registering it again', () => {
    reproductor.reproducir(cancion);
    http.expectOne(urlRegistro(1)).flush({});

    reproductor.reproducir(cancion);
    expect(reproductor.reproduciendo()).toBe(false);
    reproductor.alternarReproduccion();
    expect(reproductor.reproduciendo()).toBe(true);
    http.expectNone(urlRegistro(1));
  });

  it('should advance one second per tick with a single interval, even after several toggles', () => {
    reproductor.reproducir(otra);
    http.expectOne(urlRegistro(2)).flush({});
    reproductor.alternarReproduccion();
    reproductor.alternarReproduccion();

    vi.advanceTimersByTime(2000);
    expect(reproductor.tiempoActual()).toBe(2);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('should stop the interval when paused', () => {
    reproductor.reproducir(otra);
    http.expectOne(urlRegistro(2)).flush({});
    vi.advanceTimersByTime(1000);

    reproductor.alternarReproduccion();
    vi.advanceTimersByTime(3000);
    expect(reproductor.tiempoActual()).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('should stop at the end of the song', () => {
    reproductor.reproducir(cancion);
    http.expectOne(urlRegistro(1)).flush({});

    vi.advanceTimersByTime(5000);
    expect(reproductor.tiempoActual()).toBe(3);
    expect(reproductor.reproduciendo()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('should restart the time and keep one interval when switching songs', () => {
    reproductor.reproducir(otra);
    http.expectOne(urlRegistro(2)).flush({});
    vi.advanceTimersByTime(2000);

    reproductor.reproducir(cancion);
    http.expectOne(urlRegistro(1)).flush({});
    expect(reproductor.tiempoActual()).toBe(0);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('should not notify the history when the backend rejects the playback', () => {
    const registradas: unknown[] = [];
    reproductor.reproduccionRegistrada$.subscribe((h) => registradas.push(h));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    reproductor.reproducir(cancion);
    http.expectOne(urlRegistro(1)).flush(null, { status: 500, statusText: 'Server Error' });

    expect(registradas).toEqual([]);
    expect(reproductor.cancionActual()).toEqual(cancion);
  });

  it('should update the current song favorite only after the backend confirms it', () => {
    reproductor.reproducir(cancion);
    http.expectOne(urlRegistro(1)).flush({});
    const canciones = TestBed.inject(CancionService);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    canciones.toggleFavorito(1).subscribe({ error: () => {} });
    http.expectOne('http://localhost:8080/api/canciones/1/favorito').flush(null, { status: 500, statusText: 'Server Error' });
    expect(reproductor.cancionActual()?.favorito).toBe(false);

    canciones.toggleFavorito(1).subscribe();
    http.expectOne('http://localhost:8080/api/canciones/1/favorito').flush({ ...cancion, favorito: true });
    expect(reproductor.cancionActual()?.favorito).toBe(true);
  });
});
