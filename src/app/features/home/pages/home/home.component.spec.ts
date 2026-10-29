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
});
