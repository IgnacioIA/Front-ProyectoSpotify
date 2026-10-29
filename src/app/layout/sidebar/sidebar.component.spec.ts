import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(SidebarComponent);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  function abrir(): void {
    fixture.componentRef.setInput('abierto', true);
    fixture.detectChanges();
  }

  it('should not render the menu while closed', () => {
    expect(element.querySelector('nav')).toBeNull();
  });

  it('should list the menu options in order', () => {
    abrir();
    const textos = Array.from(element.querySelectorAll('.sidebar__opcion')).map((el) =>
      el.textContent!.replace(/\s+/g, ' ').trim(),
    );
    expect(textos).toEqual([
      '🏠 Inicio',
      '🎵 Canciones',
      '🎤 Artistas',
      '📁 Playlists',
      '💚 Favoritos',
      '🕘 Historial',
    ]);
  });

  it('should emit the selected option', () => {
    abrir();
    const emitidas: string[] = [];
    fixture.componentInstance.seleccion.subscribe((accion) => emitidas.push(accion));
    element.querySelectorAll<HTMLElement>('.sidebar__opcion').forEach((opcion) => opcion.click());
    expect(emitidas).toEqual(['inicio', 'canciones', 'artistas', 'playlists', 'favoritos', 'historial']);
  });

  it('should ask to close when the backdrop is clicked', () => {
    abrir();
    let cierres = 0;
    fixture.componentInstance.cerrar.subscribe(() => cierres++);
    (element.querySelector('.sidebar__fondo') as HTMLElement).click();
    expect(cierres).toBe(1);
  });
});
