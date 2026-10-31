import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HomeNavegacionService } from '../../data-access/home-navegacion.service';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let home: HomeComponent;
  let navegacion: HomeNavegacionService;
  let seccionesDesplazadas: string[];

  beforeEach(async () => {
    // jsdom no implementa el desplazamiento; se registra a qué elemento se desplaza
    seccionesDesplazadas = [];
    Element.prototype.scrollIntoView = function (this: Element) {
      seccionesDesplazadas.push(this.id);
    };
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
    navegacion.filtroTexto.set('queen');
    expect(home.cancionesFiltradas.map((c) => c.id)).toEqual([1]);
  });

  it('should open the existing history view from the menu', () => {
    navegacion.emitirAccion('historial');
    expect(home.viendoHistorial).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Historial de reproducción');
  });

  it('should activate the existing favorites filter from the menu, even if pressed twice', () => {
    navegacion.emitirAccion('favoritos');
    expect(home.soloFavoritas).toBe(true);
    navegacion.emitirAccion('favoritos');
    expect(home.soloFavoritas).toBe(true);
  });

  it('should return to the main view from the menu', () => {
    navegacion.emitirAccion('historial');
    navegacion.emitirAccion('inicio');
    expect(home.viendoHistorial).toBe(false);
    expect(home.soloFavoritas).toBe(false);
    expect(home.artistaSeleccionado).toBeNull();
  });

  it('should scroll to the existing sections from the menu', () => {
    navegacion.emitirAccion('historial');
    navegacion.emitirAccion('canciones');
    navegacion.emitirAccion('artistas');
    navegacion.emitirAccion('favoritos');
    expect(seccionesDesplazadas).toEqual(['seccion-canciones', 'seccion-artistas', 'seccion-canciones']);
  });

  it('should show the playlists section only when playlists exist', () => {
    navegacion.emitirAccion('playlists');
    expect(seccionesDesplazadas).toEqual([]);

    home.playlists = [{ id: 1, nombre: 'Mix', canciones: [] }];
    fixture.detectChanges();
    navegacion.emitirAccion('playlists');
    expect(seccionesDesplazadas).toEqual(['seccion-playlists']);
  });

  describe('US 17 - Navegación entre pistas (Botones Anterior y Siguiente)', () => {
    const listaMock = [
      { id: 101, titulo: 'Track 1', duracion: 180, portada: 'cover1.jpg', artista: { id: 1, nombre: 'Artista A' } },
      { id: 102, titulo: 'Track 2', duracion: 210, portada: 'cover2.jpg', artista: { id: 2, nombre: 'Artista B' } },
      { id: 103, titulo: 'Track 3', duracion: 240, portada: '', artista: { id: 3, nombre: 'Artista C' } },
    ];

    beforeEach(() => {
      navegacion.filtroTexto.set('');
      home.canciones = [...listaMock];
      home.colaReproduccion = [...listaMock];
      home.cdr.detectChanges();
      fixture.detectChanges();
    });

    it('debe avanzar a la canción siguiente (currentIndex + 1) e iniciar reproducción si ya estaba activo', () => {
      home.cancionActual = listaMock[0];
      home.reproduciendo = true;
      home.cdr.detectChanges();
      fixture.detectChanges();

      expect(home.indiceActual).toBe(0);
      expect(home.tieneSiguiente).toBe(true);

      const btnSiguiente = fixture.nativeElement.querySelector('#btn-siguiente') as HTMLButtonElement;
      btnSiguiente.click();
      home.cdr.detectChanges();
      fixture.detectChanges();

      expect(home.cancionActual.id).toBe(102);
      expect(home.indiceActual).toBe(1);
      expect(home.reproduciendo).toBe(true);
      expect(home.tiempoActual).toBe(0);
    });

    it('debe avanzar a la canción siguiente pero mantenerse en pausa si el reproductor estaba en pausa', () => {
      home.cancionActual = listaMock[0];
      home.reproduciendo = false;
      home.cdr.detectChanges();
      fixture.detectChanges();

      home.siguienteCancion();
      home.cdr.detectChanges();
      fixture.detectChanges();

      expect(home.cancionActual.id).toBe(102);
      expect(home.reproduciendo).toBe(false);
      expect(home.tiempoActual).toBe(0);
    });

    it('debe deshabilitar el botón siguiente visualmente al llegar a la última canción de la lista activa', () => {
      home.cancionActual = listaMock[2];
      home.reproduciendo = true;
      home.cdr.detectChanges();
      fixture.detectChanges();

      expect(home.tieneSiguiente).toBe(false);

      const btnSiguiente = fixture.nativeElement.querySelector('#btn-siguiente') as HTMLButtonElement;
      expect(btnSiguiente.disabled).toBe(true);

      // Intentar avanzar no debe alterar la canción actual
      home.siguienteCancion();
      expect(home.cancionActual.id).toBe(103);
    });

    it('debe retroceder a la pista previa (currentIndex - 1) al hacer clic en Anterior', () => {
      home.cancionActual = listaMock[1];
      home.reproduciendo = true;
      home.cdr.detectChanges();
      fixture.detectChanges();

      expect(home.tieneAnterior).toBe(true);

      const btnAnterior = fixture.nativeElement.querySelector('#btn-anterior') as HTMLButtonElement;
      btnAnterior.click();
      home.cdr.detectChanges();
      fixture.detectChanges();

      expect(home.cancionActual.id).toBe(101);
      expect(home.indiceActual).toBe(0);
      expect(home.reproduciendo).toBe(true);
      expect(home.tiempoActual).toBe(0);
    });

    it('debe deshabilitar el botón anterior si es la primera canción y se encuentra en el segundo 0', () => {
      home.cancionActual = listaMock[0];
      home.tiempoActual = 0;
      home.cdr.detectChanges();
      fixture.detectChanges();

      expect(home.tieneAnterior).toBe(false);
      const btnAnterior = fixture.nativeElement.querySelector('#btn-anterior') as HTMLButtonElement;
      expect(btnAnterior.disabled).toBe(true);
    });

    it('debe reiniciar el tiempo a 0:00 si es la primera canción y el tiempo ya había avanzado', () => {
      home.cancionActual = listaMock[0];
      home.tiempoActual = 25;
      home.cdr.detectChanges();
      fixture.detectChanges();

      expect(home.tieneAnterior).toBe(true);
      home.anteriorCancion();
      home.cdr.detectChanges();
      fixture.detectChanges();

      expect(home.cancionActual.id).toBe(101);
      expect(home.tiempoActual).toBe(0);
      expect(home.tieneAnterior).toBe(false);
    });

    it('debe actualizar inmediatamente título, artista, duración y carátula en la barra reproductora', () => {
      home.cancionActual = listaMock[0];
      home.cdr.detectChanges();
      fixture.detectChanges();

      let tituloEl = fixture.nativeElement.querySelector('#player-cancion-titulo');
      let artistaEl = fixture.nativeElement.querySelector('#player-cancion-artista');
      let duracionEl = fixture.nativeElement.querySelector('#player-duracion-total');
      let imgEl = fixture.nativeElement.querySelector('img[alt="Track 1"]');

      expect(tituloEl.textContent.trim()).toBe('Track 1');
      expect(artistaEl.textContent.trim()).toBe('Artista A');
      expect(duracionEl.textContent.trim()).toBe('3:00');
      expect(imgEl).toBeTruthy();

      home.siguienteCancion();
      home.cdr.detectChanges();
      fixture.detectChanges();

      tituloEl = fixture.nativeElement.querySelector('#player-cancion-titulo');
      artistaEl = fixture.nativeElement.querySelector('#player-cancion-artista');
      duracionEl = fixture.nativeElement.querySelector('#player-duracion-total');

      expect(tituloEl.textContent.trim()).toBe('Track 2');
      expect(artistaEl.textContent.trim()).toBe('Artista B');
      expect(duracionEl.textContent.trim()).toBe('3:30');
    });
  });
});
