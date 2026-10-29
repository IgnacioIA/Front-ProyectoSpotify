import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RegistroComponent } from './registro.component';

describe('RegistroComponent', () => {
  let fixture: ComponentFixture<RegistroComponent>;
  let element: HTMLElement;
  let http: HttpTestingController;

  const url = 'http://localhost:8080/api/auth/registro';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroComponent],
      providers: [provideRouter([{ path: 'login', children: [] }]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(RegistroComponent);
    element = fixture.nativeElement as HTMLElement;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  async function completar(usuario: string, email: string, contrasenia: string): Promise<void> {
    const campos = Array.from(element.querySelectorAll('input'));
    [usuario, email, contrasenia].forEach((valor, i) => {
      campos[i].value = valor;
      campos[i].dispatchEvent(new Event('input'));
    });
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function enviar(): void {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('should validate the email format before calling the backend', async () => {
    await completar('ana', 'no-es-un-correo', 'secreta');
    enviar();
    http.expectNone(url);
    expect(element.textContent).toContain('Ingresá un correo electrónico válido.');
  });

  it('should register and continue to the login screen', async () => {
    await completar(' ana ', 'ana@test.local', 'secreta');
    enviar();
    const req = http.expectOne(url);
    expect(req.request.body).toEqual({ nombreUsuario: 'ana', email: 'ana@test.local', contrasenia: 'secreta' });
    req.flush({ id: 1, nombreUsuario: 'ana', email: 'ana@test.local', contrasenia: 'secreta' }, { status: 201, statusText: 'Created' });
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/login?registrado=1&usuario=ana');
  });

  it('should show the backend message when the user already exists', async () => {
    await completar('ana', 'ana@test.local', 'secreta');
    enviar();
    http
      .expectOne(url)
      .flush({ mensaje: 'El nombre de usuario ya está registrado.' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(element.querySelector('[role=alert]')?.textContent).toContain('El nombre de usuario ya está registrado.');
  });
});
