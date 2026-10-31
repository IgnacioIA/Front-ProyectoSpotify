import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AppComponent } from './app';
import { routes } from './app.routes';
import { ReproductorService } from './features/songs/data-access/reproductor.service';
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
