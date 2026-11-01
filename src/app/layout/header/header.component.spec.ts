import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../features/users/data-access/auth.service';
import { BusquedaService } from '../../features/search/data-access/busqueda.service';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(HeaderComponent);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  function accionesUsuario(): string[] {
    return Array.from(element.querySelectorAll('.header__usuario a, .header__usuario button')).map(
      (el) => el.textContent!.replace(/\s+/g, ' ').trim(),
    );
  }

  function iniciarSesion(): void {
    TestBed.inject(AuthService)
      .iniciarSesion({ identificador: 'ana', contrasenia: 'secreta' })
      .subscribe();
    TestBed.inject(HttpTestingController)
      .expectOne('http://localhost:8080/api/auth/login')
      .flush({ id: 7, nombreUsuario: 'ana', email: 'ana@test.local', contrasenia: 'secreta' });
    fixture.detectChanges();
  }

  it('should show the login and register links when there is no session', () => {
    expect(accionesUsuario()).toEqual(['Registrarse', 'Iniciar sesión']);
    const enlaces = element.querySelectorAll('.header__usuario a');
    expect(enlaces[0].getAttribute('href')).toBe('/registro');
    expect(enlaces[1].getAttribute('href')).toBe('/login');
  });

  it('should replace the links with the profile access and logout after logging in', () => {
    iniciarSesion();
    expect(accionesUsuario()).toEqual(['👤ana', 'Cerrar sesión']);
    expect(element.querySelector('.header__nombre')?.textContent).toBe('ana');
    const perfil = element.querySelector('.header__perfil')!;
    expect(perfil.getAttribute('href')).toBe('/perfil');
    expect(perfil.getAttribute('aria-label')).toBe('Perfil de ana');
  });

  it('should go back to the anonymous actions after logging out', async () => {
    iniciarSesion();
    (element.querySelector('.header__usuario button') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(TestBed.inject(AuthService).estaAutenticado()).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/');
    expect(accionesUsuario()).toEqual(['Registrarse', 'Iniciar sesión']);
  });

  it('should render the title, the search field and the user area in that order', () => {
    const sectores = Array.from(element.querySelector('header')!.children).map((el) => el.className);
    expect(sectores).toEqual(['header__izquierda', 'header__buscador', 'header__usuario']);
    expect(element.querySelector('h1')?.textContent).toContain('Mi Spotify MVP');
  });

  it('should place the menu toggle before the title and notify when it is pressed', () => {
    const izquierda = Array.from(element.querySelector('.header__izquierda')!.children);
    expect(izquierda.map((el) => el.className)).toEqual(['header__menu', 'header__titulo']);

    let toggles = 0;
    fixture.componentInstance.menuToggle.subscribe(() => toggles++);
    const boton = element.querySelector('.header__menu') as HTMLButtonElement;
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    boton.click();
    expect(toggles).toBe(1);

    fixture.componentRef.setInput('menuAbierto', true);
    fixture.detectChanges();
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(boton.getAttribute('aria-label')).toBe('Cerrar menú de navegación');
  });

  it('should emit the typed text so the existing filter keeps working', () => {
    const emitidos: string[] = [];
    fixture.componentInstance.filtroTextoChange.subscribe((texto) => emitidos.push(texto));

    const input = element.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-label')).toBe('Buscar canción, artista o género');
    input.value = 'queen';
    input.dispatchEvent(new Event('input'));

    expect(emitidos).toEqual(['queen']);
  });

  it('should show the current filter value', async () => {
    fixture.componentRef.setInput('filtroTexto', 'rock');
    fixture.detectChanges();
    await fixture.whenStable();
    expect((element.querySelector('input') as HTMLInputElement).value).toBe('rock');
  });

  function escribir(texto: string): HTMLInputElement {
    const input = element.querySelector('input') as HTMLInputElement;
    input.value = texto;
    return input;
  }

  it('should open the results page with Enter', () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate');
    escribir('  soda stereo ').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(navegar).toHaveBeenCalledWith(['/buscar'], { queryParams: { q: 'soda stereo' } });
  });

  it('should open the results page with the search icon', () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate');
    escribir('rock');
    (element.querySelector('.header__buscar') as HTMLButtonElement).click();
    expect(navegar).toHaveBeenCalledWith(['/buscar'], { queryParams: { q: 'rock' } });
  });

  it('should not search with an empty text', () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate');
    escribir('   ').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(navegar).not.toHaveBeenCalled();
  });

  describe('automatic search', () => {
    function teclear(texto: string): void {
      const input = escribir(texto);
      input.dispatchEvent(new Event('input'));
    }

    function enLaRuta(url: string) {
      const router = TestBed.inject(Router);
      vi.spyOn(router, 'url', 'get').mockReturnValue(url);
      return {
        navigate: vi.spyOn(router, 'navigate').mockResolvedValue(true),
        navigateByUrl: vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true),
      };
    }

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('should search only after a 350 ms pause', () => {
      const { navigate } = enLaRuta('/favoritos');
      teclear('ma');
      vi.advanceTimersByTime(349);
      expect(navigate).not.toHaveBeenCalled();

      teclear('marea');
      vi.advanceTimersByTime(349);
      expect(navigate).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(['/buscar'], { queryParams: { q: 'marea' } });
    });

    it('should cancel the pending search when Enter is pressed', () => {
      const { navigate } = enLaRuta('/favoritos');
      teclear('marea');
      escribir('marea').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      vi.advanceTimersByTime(350);
      expect(navigate).toHaveBeenCalledTimes(1);
    });

    it('should remember the route where the search started', () => {
      enLaRuta('/playlists');
      teclear('marea');
      vi.advanceTimersByTime(350);
      expect(TestBed.inject(BusquedaService).origen).toBe('/playlists');
    });

    it('should replace the URL and keep the origin when the term changes in the results', () => {
      TestBed.inject(BusquedaService).origen = '/historial';
      const { navigate } = enLaRuta('/buscar?q=marea');
      teclear('marea baja');
      vi.advanceTimersByTime(350);
      expect(navigate).toHaveBeenCalledWith(['/buscar'], {
        queryParams: { q: 'marea baja' },
        replaceUrl: true,
      });
      expect(TestBed.inject(BusquedaService).origen).toBe('/historial');
    });

    it('should not navigate again when the term did not change', () => {
      const { navigate } = enLaRuta('/buscar?q=marea');
      teclear('marea ');
      vi.advanceTimersByTime(350);
      escribir('marea').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(navigate).not.toHaveBeenCalled();
    });

    it('should go back to the origin when the text is cleared', () => {
      TestBed.inject(BusquedaService).origen = '/favoritos';
      const { navigateByUrl } = enLaRuta('/buscar?q=marea');
      teclear('');
      vi.advanceTimersByTime(350);
      expect(navigateByUrl).toHaveBeenCalledWith('/favoritos', { replaceUrl: true });
    });

    it('should go to Home when there is no origin', () => {
      const { navigateByUrl } = enLaRuta('/buscar?q=marea');
      teclear('');
      vi.advanceTimersByTime(350);
      expect(navigateByUrl).toHaveBeenCalledWith('/', { replaceUrl: true });
    });

    it('should stay on the page when the text is cleared outside the results', () => {
      const { navigate, navigateByUrl } = enLaRuta('/favoritos');
      teclear('m');
      teclear('');
      vi.advanceTimersByTime(350);
      expect(navigate).not.toHaveBeenCalled();
      expect(navigateByUrl).not.toHaveBeenCalled();
    });
  });

  it('should notify when the title is activated', () => {
    let clicks = 0;
    fixture.componentInstance.tituloClick.subscribe(() => clicks++);
    (element.querySelector('h1 button') as HTMLButtonElement).click();
    expect(clicks).toBe(1);
  });
});
