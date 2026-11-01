import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AppComponent } from './app';
import { routes } from './app.routes';
import { ReproductorService } from './features/songs/data-access/reproductor.service';
import { HomeNavegacionService } from './features/home/data-access/home-navegacion.service';
import { Cancion } from './features/songs/models/cancion.model';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should compose the header, the side menu and the router outlet', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-header h1')?.textContent).toContain('Mi Spotify MVP');
    expect(compiled.querySelector('app-header input')).toBeTruthy();
    expect(compiled.querySelector('app-sidebar')).toBeTruthy();
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('should open and close the side menu with the header toggle', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const toggle = compiled.querySelector('.header__menu') as HTMLButtonElement;

    expect(compiled.querySelector('#menu-lateral')).toBeNull();
    toggle.click();
    fixture.detectChanges();
    expect(compiled.querySelector('#menu-lateral')).toBeTruthy();
    toggle.click();
    fixture.detectChanges();
    expect(compiled.querySelector('#menu-lateral')).toBeNull();
  });

  it('should close the side menu with Escape', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    fixture.componentInstance.menuAbierto = true;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(fixture.componentInstance.menuAbierto).toBe(false);
  });

  it('should render Home at the root route', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-home')).toBeTruthy();
  });

  describe('navigation', () => {
    const matchMediaOriginal = window.matchMedia;

    afterEach(() => {
      window.matchMedia = matchMediaOriginal;
    });

    // jsdom no implementa matchMedia; se simula el ancho de pantalla
    function simularPantalla(movil: boolean): void {
      window.matchMedia = ((consulta: string) => ({ matches: movil, media: consulta })) as unknown as typeof window.matchMedia;
    }

    async function crear(url: string): Promise<ComponentFixture<AppComponent>> {
      window.scrollTo = () => {};
      const fixture = TestBed.createComponent(AppComponent);
      await TestBed.inject(Router).navigateByUrl(url);
      fixture.componentInstance.menuAbierto = true;
      fixture.detectChanges();
      return fixture;
    }

    function opcion(fixture: ComponentFixture<AppComponent>, texto: string): HTMLAnchorElement {
      return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('.sidebar__opcion'))
        .find((a) => a.textContent!.includes(texto))!;
    }

    async function elegir(fixture: ComponentFixture<AppComponent>, texto: string): Promise<void> {
      opcion(fixture, texto).click();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    it('should navigate to each page from the side menu and mark the active option', async () => {
      simularPantalla(false);
      const fixture = await crear('/');
      const router = TestBed.inject(Router);
      const paginas: [string, string, string][] = [
        ['Playlists', '/playlists', 'app-playlists'],
        ['Favoritos', '/favoritos', 'app-favoritos'],
        ['Historial', '/historial', 'app-historial'],
        ['Inicio', '/', 'app-home'],
      ];

      for (const [texto, url, selector] of paginas) {
        await elegir(fixture, texto);
        expect(router.url).toBe(url);
        expect((fixture.nativeElement as HTMLElement).querySelector(selector)).toBeTruthy();
        expect(opcion(fixture, texto).getAttribute('aria-current')).toBe('page');
        expect((fixture.nativeElement as HTMLElement).querySelectorAll('[aria-current=page]').length).toBe(1);
      }
      expect(fixture.componentInstance.menuAbierto).toBe(true);
    });

    it('should close the menu after choosing an option on small screens', async () => {
      simularPantalla(true);
      const fixture = await crear('/');
      await elegir(fixture, 'Favoritos');
      expect(TestBed.inject(Router).url).toBe('/favoritos');
      expect(fixture.componentInstance.menuAbierto).toBe(false);
    });

    it('should go back to Inicio from the title', async () => {
      simularPantalla(false);
      const fixture = await crear('/historial');
      ((fixture.nativeElement as HTMLElement).querySelector('.header__titulo-boton') as HTMLButtonElement).click();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(TestBed.inject(Router).url).toBe('/');
      expect((fixture.nativeElement as HTMLElement).querySelector('app-home')).toBeTruthy();
    });

    it('should keep the header search when navigating and apply it to Favoritos', async () => {
      simularPantalla(false);
      const fixture = await crear('/');
      const input = (fixture.nativeElement as HTMLElement).querySelector('.header__input') as HTMLInputElement;
      input.value = 'soda';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      await elegir(fixture, 'Favoritos');
      TestBed.inject(HttpTestingController).expectOne('http://localhost:8080/api/canciones/favoritas').flush([
        { id: 1, titulo: 'Bohemian Rhapsody', genero: 'Rock', duracion: 354, favorito: true },
        { id: 2, titulo: 'De música ligera', genero: 'Rock', duracion: 210, favorito: true, artista: { id: 2, nombre: 'Soda Stereo' } },
      ]);
      fixture.detectChanges();
      await fixture.whenStable();

      const titulos = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.favoritos__cancion-titulo'))
        .map((el) => el.textContent!.trim());
      expect(titulos).toEqual(['De música ligera']);
      expect(((fixture.nativeElement as HTMLElement).querySelector('.header__input') as HTMLInputElement).value).toBe('soda');
    });

    it('should leave the artist detail when choosing Inicio while already in Home', async () => {
      simularPantalla(false);
      const fixture = await crear('/');
      TestBed.inject(HomeNavegacionService).artistaSolicitado.set({ id: 1, titulo: 'X', genero: '', duracion: 1, artista: { id: 7, nombre: 'Queen' } });
      fixture.detectChanges();
      const home = () => (fixture.nativeElement as HTMLElement).querySelector('app-home')!;
      expect(home().textContent).toContain('Canciones populares');

      await elegir(fixture, 'Inicio');
      expect(home().textContent).not.toContain('Canciones populares');
    });
  });

  describe('persistent player', () => {
    const cancion: Cancion = {
      id: 1, titulo: 'Bohemian Rhapsody', genero: 'Rock', duracion: 354, artista: { id: 7, nombre: 'Queen' },
    };

    function barra(fixture: ComponentFixture<AppComponent>): HTMLElement {
      return (fixture.nativeElement as HTMLElement).querySelector('app-player-bar')!;
    }

    it('should keep the same song, state and time when navigating between pages', async () => {
      vi.useFakeTimers();
      try {
        const fixture = TestBed.createComponent(AppComponent);
        const router = TestBed.inject(Router);
        const reproductor = TestBed.inject(ReproductorService);
        await router.navigateByUrl('/');
        fixture.detectChanges();

        reproductor.reproducir(cancion);
        vi.advanceTimersByTime(2000);
        fixture.detectChanges();
        expect(barra(fixture).textContent).toContain('Bohemian Rhapsody');

        for (const url of ['/perfil', '/login', '/registro', '/']) {
          await router.navigateByUrl(url);
          vi.advanceTimersByTime(1000);
          fixture.detectChanges();
          expect(barra(fixture).textContent).toContain('Bohemian Rhapsody');
        }

        expect(reproductor.reproduciendo()).toBe(true);
        expect(reproductor.tiempoActual()).toBe(6);
        expect(barra(fixture).textContent).toContain('0:06');
        expect(vi.getTimerCount()).toBe(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('should keep the queue and the next/previous buttons working after changing page (US 17)', async () => {
      const fixture = TestBed.createComponent(AppComponent);
      const router = TestBed.inject(Router);
      const reproductor = TestBed.inject(ReproductorService);
      const otra: Cancion = { id: 2, titulo: 'De música ligera', genero: 'Rock', duracion: 210, artista: { id: 9, nombre: 'Soda Stereo' } };
      await router.navigateByUrl('/favoritos');
      reproductor.reproducir(cancion, [cancion, otra]);
      fixture.detectChanges();

      await router.navigateByUrl('/historial');
      fixture.detectChanges();
      (barra(fixture).querySelector('#btn-siguiente') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(reproductor.cancionActual()?.id).toBe(2);
      expect(barra(fixture).querySelector('#player-cancion-titulo')?.textContent).toContain('De música ligera');
      expect((barra(fixture).querySelector('#btn-siguiente') as HTMLButtonElement).disabled).toBe(true);
      expect((barra(fixture).querySelector('#btn-anterior') as HTMLButtonElement).disabled).toBe(false);
    });

    it('should open the artist detail in Home from the bar without stopping the song', async () => {
      const fixture = TestBed.createComponent(AppComponent);
      const router = TestBed.inject(Router);
      const reproductor = TestBed.inject(ReproductorService);
      await router.navigateByUrl('/perfil');
      reproductor.reproducir(cancion);
      fixture.detectChanges();

      const artista = Array.from(barra(fixture).querySelectorAll('div')).find((d) => d.textContent?.trim() === 'Queen')!;
      artista.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(router.url).toBe('/');
      expect((fixture.nativeElement as HTMLElement).querySelector('app-home')?.textContent).toContain('Canciones populares');
      expect(reproductor.cancionActual()).toEqual(cancion);
      expect(reproductor.reproduciendo()).toBe(true);
    });
  });
});
