import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HeaderComponent);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
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
    expect(input.getAttribute('aria-label')).toBe('Buscar canción o artista');
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

  it('should notify when the title is activated', () => {
    let clicks = 0;
    fixture.componentInstance.tituloClick.subscribe(() => clicks++);
    (element.querySelector('h1 button') as HTMLButtonElement).click();
    expect(clicks).toBe(1);
  });
});
