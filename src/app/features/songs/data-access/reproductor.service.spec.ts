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

  describe('US 17 - cola y navegación entre pistas', () => {
    const lista: Cancion[] = [
      { id: 101, titulo: 'Track 1', genero: 'Rock', duracion: 180 },
      { id: 102, titulo: 'Track 2', genero: 'Rock', duracion: 210 },
      { id: 103, titulo: 'Track 3', genero: 'Rock', duracion: 240 },
    ];

    // Reproduce una canción de la lista y confirma su registro en el historial
    function reproducirDeLista(indice: number): void {
      reproductor.reproducir(lista[indice], lista);
      http.expectOne(urlRegistro(lista[indice].id)).flush({});
    }

    it('should use the list the song was played from as the queue', () => {
      reproducirDeLista(1);
      expect(reproductor.cancionActual()?.id).toBe(102);
      expect(reproductor.colaReproduccion().map((c) => c.id)).toEqual([101, 102, 103]);
      expect(reproductor.indiceActual()).toBe(1);
    });

    it('should keep its own copy of the queue', () => {
      const origen = [...lista];
      reproductor.reproducir(origen[0], origen);
      http.expectOne(urlRegistro(101)).flush({});
      origen.splice(1, 2);
      expect(reproductor.colaReproduccion().length).toBe(3);
    });

    it('should play the next song from zero, keep playing and register it', () => {
      reproducirDeLista(0);
      vi.advanceTimersByTime(5000);

      reproductor.siguiente();
      http.expectOne(urlRegistro(102)).flush({});
      expect(reproductor.cancionActual()?.id).toBe(102);
      expect(reproductor.indiceActual()).toBe(1);
      expect(reproductor.reproduciendo()).toBe(true);
      expect(reproductor.tiempoActual()).toBe(0);
      expect(vi.getTimerCount()).toBe(1);
    });

    it('should move to the next song but stay paused (without registering) when it was paused', () => {
      reproducirDeLista(0);
      reproductor.alternarReproduccion();

      reproductor.siguiente();
      http.expectNone(urlRegistro(102));
      expect(reproductor.cancionActual()?.id).toBe(102);
      expect(reproductor.reproduciendo()).toBe(false);
      expect(reproductor.tiempoActual()).toBe(0);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('should not go past the last song', () => {
      reproducirDeLista(2);
      expect(reproductor.tieneSiguiente()).toBe(false);
      reproductor.siguiente();
      expect(reproductor.cancionActual()?.id).toBe(103);
    });

    it('should go back to the previous song', () => {
      reproducirDeLista(1);
      expect(reproductor.tieneAnterior()).toBe(true);

      reproductor.anterior();
      http.expectOne(urlRegistro(101)).flush({});
      expect(reproductor.cancionActual()?.id).toBe(101);
      expect(reproductor.indiceActual()).toBe(0);
      expect(reproductor.reproduciendo()).toBe(true);
      expect(reproductor.tiempoActual()).toBe(0);
    });

    it('should disable "previous" on the first song at 0:00 and restart it once time has advanced', () => {
      reproducirDeLista(0);
      expect(reproductor.tieneAnterior()).toBe(false);

      vi.advanceTimersByTime(25000);
      expect(reproductor.tieneAnterior()).toBe(true);

      reproductor.anterior();
      http.expectNone(urlRegistro(101));
      expect(reproductor.cancionActual()?.id).toBe(101);
      expect(reproductor.tiempoActual()).toBe(0);
      expect(reproductor.tieneAnterior()).toBe(false);
    });

    it('should replace the queue when playing from another list', () => {
      reproducirDeLista(0);
      const otraLista: Cancion[] = [lista[2], { id: 200, titulo: 'Otra', genero: 'Pop', duracion: 100 }];
      reproductor.reproducir(otraLista[1], otraLista);
      http.expectOne(urlRegistro(200)).flush({});

      expect(reproductor.colaReproduccion().map((c) => c.id)).toEqual([103, 200]);
      expect(reproductor.indiceActual()).toBe(1);
      expect(reproductor.tieneSiguiente()).toBe(false);
    });

    it('should keep the queue when toggling the current song without a list', () => {
      reproducirDeLista(1);
      reproductor.reproducir(lista[1]);
      expect(reproductor.reproduciendo()).toBe(false);
      expect(reproductor.colaReproduccion().length).toBe(3);
      expect(reproductor.indiceActual()).toBe(1);
    });

    it('should use the song alone as the queue when no list is given', () => {
      reproductor.reproducir(lista[0]);
      http.expectOne(urlRegistro(101)).flush({});
      expect(reproductor.colaReproduccion().map((c) => c.id)).toEqual([101]);
      expect(reproductor.tieneSiguiente()).toBe(false);
    });

    it('should remove a song from the queue and keep the position of the current one', () => {
      reproducirDeLista(2);
      reproductor.quitarDeCola(101);
      expect(reproductor.colaReproduccion().map((c) => c.id)).toEqual([102, 103]);
      expect(reproductor.indiceActual()).toBe(1);

      reproductor.quitarDeCola(103);
      expect(reproductor.indiceActual()).toBe(-1);
      expect(reproductor.tieneSiguiente()).toBe(false);
      expect(reproductor.tieneAnterior()).toBe(false);
    });
  });
});
