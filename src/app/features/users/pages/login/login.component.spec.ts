import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../data-access/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let element: HTMLElement;
  let http: HttpTestingController;

  const url = 'http://localhost:8080/api/auth/login';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginComponent);
    element = fixture.nativeElement as HTMLElement;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  async function completar(identificador: string, contrasenia: string): Promise<void> {
    const [usuario, clave] = Array.from(element.querySelectorAll('input'));
    usuario.value = identificador;
    usuario.dispatchEvent(new Event('input'));
    clave.value = contrasenia;
    clave.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function enviar(): void {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('should not call the backend and should show field errors when empty', () => {
    enviar();
    http.expectNone(url);
    expect(element.textContent).toContain('Ingresá tu usuario o correo electrónico.');
    expect(element.textContent).toContain('Ingresá tu contraseña.');
  });

  it('should send a single request while it is pending', async () => {
    await completar('ana', 'secreta');
    enviar();
    enviar();
    http.expectOne(url);
    expect((element.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('should log in and go to Home with valid credentials', async () => {
    await completar('ana', 'secreta');
    enviar();
    http.expectOne(url).flush({ id: 1, nombreUsuario: 'ana', email: 'ana@test.local', contrasenia: 'secreta' });
    await fixture.whenStable();

    expect(TestBed.inject(AuthService).estaAutenticado()).toBe(true);
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('should show the backend message on wrong credentials and allow retrying', async () => {
    await completar('ana', 'mala');
    enviar();
    http
      .expectOne(url)
      .flush({ mensaje: 'Usuario, correo o contraseña incorrectos.' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(element.querySelector('[role=alert]')?.textContent).toContain('Usuario, correo o contraseña incorrectos.');
    expect((element.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(false);
    expect(TestBed.inject(AuthService).estaAutenticado()).toBe(false);
  });

  it('should explain when the server cannot be reached', async () => {
    await completar('ana', 'secreta');
    enviar();
    http.expectOne(url).error(new ProgressEvent('error'), { status: 0 });
    fixture.detectChanges();
    expect(element.querySelector('[role=alert]')?.textContent).toContain('No se pudo conectar con el servidor');
  });
});
