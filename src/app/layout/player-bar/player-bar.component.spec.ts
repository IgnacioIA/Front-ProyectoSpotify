import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { ReproductorService } from '../../features/songs/data-access/reproductor.service';
import { HomeNavegacionService } from '../../features/home/data-access/home-navegacion.service';
import { Cancion } from '../../features/songs/models/cancion.model';
import { PlayerBarComponent } from './player-bar.component';

describe('PlayerBarComponent', () => {
  let fixture: ComponentFixture<PlayerBarComponent>;
  let element: HTMLElement;
  let http: HttpTestingController;
  let reproductor: ReproductorService;

  const cancion: Cancion = {
    id: 1, titulo: 'Bohemian Rhapsody', genero: 'Rock', duracion: 354, favorito: false,
    artista: { id: 7, nombre: 'Queen' },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerBarComponent],
      providers: [provideRouter([{ path: 'perfil', children: [] }]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(PlayerBarComponent);
    element = fixture.nativeElement as HTMLElement;
    http = TestBed.inject(HttpTestingController);
    reproductor = TestBed.inject(ReproductorService);
    fixture.detectChanges();
  });

  function reproducir(): void {
    reproductor.reproducir(cancion);
    http.expectOne('http://localhost:8080/api/historial/reproducir/1').flush({});
    fixture.detectChanges();
  }

  function botones(): HTMLButtonElement[] {
    return Array.from(element.querySelectorAll('button'));
  }

  it('should stay hidden until a song is played', () => {
    expect(element.textContent?.trim()).toBe('');
  });

  it('should show the current song and toggle play and pause', () => {
    reproducir();
    expect(element.textContent).toContain('Bohemian Rhapsody');
    expect(element.textContent).toContain('Queen');
    expect(element.textContent).toContain('5:54');

    const playPausa = element.querySelector('#btn-play-pause') as HTMLButtonElement;
    expect(playPausa.textContent?.trim()).toBe('❚❚');
    playPausa.click();
    fixture.detectChanges();
    expect(reproductor.reproduciendo()).toBe(false);
    expect(playPausa.textContent?.trim()).toBe('▶');
  });

  it('should mark the favorite when the backend confirms it', () => {
    reproducir();
    const [corazon] = botones();
    corazon.click();
    http.expectOne('http://localhost:8080/api/canciones/1/favorito').flush({ ...cancion, favorito: true });
    fixture.detectChanges();
    expect(corazon.textContent?.trim()).toBe('💚');
  });

  it('should ask Home to open the artist and navigate to it', async () => {
    reproducir();
    await TestBed.inject(Router).navigateByUrl('/perfil');

    const artista = Array.from(element.querySelectorAll('div')).find((d) => d.textContent?.trim() === 'Queen')!;
    artista.click();
    await fixture.whenStable();

    expect(TestBed.inject(HomeNavegacionService).artistaSolicitado()).toEqual(cancion);
    expect(TestBed.inject(Router).url).toBe('/');
  });

  describe('US 17 - botones Anterior y Siguiente', () => {
    const lista: Cancion[] = [
      { id: 101, titulo: 'Track 1', genero: 'Rock', duracion: 180, portada: 'cover1.jpg', artista: { id: 1, nombre: 'Artista A' } },
      { id: 102, titulo: 'Track 2', genero: 'Rock', duracion: 210, artista: { id: 2, nombre: 'Artista B' } },
    ];
    const anterior = () => element.querySelector('#btn-anterior') as HTMLButtonElement;
    const siguiente = () => element.querySelector('#btn-siguiente') as HTMLButtonElement;
    const texto = (id: string) => element.querySelector(id)?.textContent?.trim();

    function reproducirDeLista(indice: number): void {
      reproductor.reproducir(lista[indice], lista);
      http.expectOne(`http://localhost:8080/api/historial/reproducir/${lista[indice].id}`).flush({});
      fixture.detectChanges();
    }

    it('should enable only the buttons that can be used at each end of the queue', () => {
      reproducirDeLista(0);
      expect(anterior().disabled).toBe(true);
      expect(siguiente().disabled).toBe(false);

      siguiente().click();
      http.expectOne('http://localhost:8080/api/historial/reproducir/102').flush({});
      fixture.detectChanges();
      expect(anterior().disabled).toBe(false);
      expect(siguiente().disabled).toBe(true);
    });

    it('should immediately show the title, artist, duration and cover of the new song', () => {
      reproducirDeLista(0);
      expect(texto('#player-cancion-titulo')).toBe('Track 1');
      expect(texto('#player-cancion-artista')).toBe('Artista A');
      expect(texto('#player-duracion-total')).toBe('3:00');
      expect(element.querySelector('img[alt="Track 1"]')).toBeTruthy();

      siguiente().click();
      http.expectOne('http://localhost:8080/api/historial/reproducir/102').flush({});
      fixture.detectChanges();
      expect(texto('#player-cancion-titulo')).toBe('Track 2');
      expect(texto('#player-cancion-artista')).toBe('Artista B');
      expect(texto('#player-duracion-total')).toBe('3:30');
      expect(texto('#player-tiempo-actual')).toBe('0:00');
      expect(element.querySelector('img')).toBeNull();
    });

    it('should go back with the previous button', () => {
      reproducirDeLista(1);
      anterior().click();
      http.expectOne('http://localhost:8080/api/historial/reproducir/101').flush({});
      fixture.detectChanges();
      expect(texto('#player-cancion-titulo')).toBe('Track 1');
    });
  });
});
