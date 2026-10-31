import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter(['playlists', 'favoritos', 'historial'].map((path) => ({ path, children: [] }))),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SidebarComponent);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  function abrir(): void {
    fixture.componentRef.setInput('abierto', true);
    fixture.detectChanges();
  }

  function opciones(): HTMLAnchorElement[] {
    return Array.from(element.querySelectorAll('.sidebar__opcion'));
  }

  it('should not render the menu while closed', () => {
    expect(element.querySelector('nav')).toBeNull();
  });

  it('should list only Inicio, Playlists, Favoritos and Historial as real links', () => {
    abrir();
    expect(opciones().map((el) => el.textContent!.replace(/\s+/g, ' ').trim())).toEqual([
      '🏠 Inicio',
      '📁 Playlists',
      '💚 Favoritos',
      '🕘 Historial',
    ]);
    expect(opciones().map((el) => el.getAttribute('href'))).toEqual(['/', '/playlists', '/favoritos', '/historial']);
  });

  it('should emit the chosen route', async () => {
    abrir();
    const emitidas: string[] = [];
    fixture.componentInstance.seleccion.subscribe((ruta) => emitidas.push(ruta));
    opciones().forEach((opcion) => opcion.click());
    await fixture.whenStable();
    expect(emitidas).toEqual(['/', '/playlists', '/favoritos', '/historial']);
  });

  it('should ask to close when the backdrop is clicked', () => {
    abrir();
    let cierres = 0;
    fixture.componentInstance.cerrar.subscribe(() => cierres++);
    (element.querySelector('.sidebar__fondo') as HTMLElement).click();
    expect(cierres).toBe(1);
  });
});
