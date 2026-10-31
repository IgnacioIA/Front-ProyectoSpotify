import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CancionService } from '../../songs/data-access/cancion.service';
import { Playlist } from '../models/playlist.model';
import { PlaylistService } from './playlist.service';

describe('PlaylistService', () => {
  let service: PlaylistService;
  let http: HttpTestingController;

  const url = 'http://localhost:8080/api/playlists';
  const cancion = { id: 5, titulo: 'Bohemian Rhapsody', genero: 'Rock', duracion: 354, favorito: false };
  const mix: Playlist = { id: 1, nombre: 'Mix', canciones: [] };
  const rock: Playlist = { id: 2, nombre: 'Rock', canciones: [cancion] };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlaylistService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function cargar(): void {
    service.cargarPlaylists().subscribe();
    http.expectOne(url).flush([mix, rock]);
  }

  it('should load the playlists with GET', () => {
    service.cargarPlaylists().subscribe();
    const req = http.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush([mix, rock]);
    expect(service.playlists()).toEqual([mix, rock]);
  });

  it('should create a playlist sending only its name', () => {
    cargar();
    service.crearPlaylist('Nueva').subscribe();
    const req = http.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombre: 'Nueva' });
    req.flush({ id: 3, nombre: 'Nueva', canciones: [] });
    expect(service.playlists().map((p) => p.nombre)).toEqual(['Mix', 'Rock', 'Nueva']);
  });

  it('should refresh a playlist with GET by id', () => {
    cargar();
    service.obtenerPlaylist(1).subscribe();
    const req = http.expectOne(`${url}/1`);
    expect(req.request.method).toBe('GET');
    req.flush({ ...mix, canciones: [cancion] });
    expect(service.playlists()[0].canciones.length).toBe(1);
  });

  it('should delete a playlist with DELETE', () => {
    cargar();
    service.eliminarPlaylist(1).subscribe();
    const req = http.expectOne(`${url}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(service.playlists().map((p) => p.id)).toEqual([2]);
  });

  it('should add a song with POST and use the playlist returned by the backend', () => {
    cargar();
    service.agregarCancion(1, 5).subscribe();
    const req = http.expectOne(`${url}/1/canciones/5`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ ...mix, canciones: [cancion] });
    expect(service.playlists()[0].canciones).toEqual([cancion]);
  });

  it('should remove a song with DELETE and use the playlist returned by the backend', () => {
    cargar();
    let resultado: Playlist | undefined;
    service.quitarCancion(2, 5).subscribe((p) => (resultado = p));
    const req = http.expectOne(`${url}/2/canciones/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ ...rock, canciones: [] });
    expect(resultado?.canciones).toEqual([]);
    expect(service.playlists()[1].canciones).toEqual([]);
  });

  it('should keep the list unchanged when an operation fails', () => {
    cargar();
    service.eliminarPlaylist(1).subscribe({ error: () => {} });
    http.expectOne(`${url}/1`).flush(null, { status: 500, statusText: 'Server Error' });
    expect(service.playlists()).toEqual([mix, rock]);
  });

  it('should update the favorite of the songs inside the playlists when it is confirmed', () => {
    cargar();
    TestBed.inject(CancionService).toggleFavorito(5).subscribe();
    http.expectOne('http://localhost:8080/api/canciones/5/favorito').flush({ ...cancion, favorito: true });
    expect(service.playlists()[1].canciones[0].favorito).toBe(true);
  });
});
