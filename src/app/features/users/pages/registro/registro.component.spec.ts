import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../data-access/auth.service';
import { RegistroComponent } from './registro.component';

describe('RegistroComponent', () => {
  let fixture: ComponentFixture<RegistroComponent>;
  let element: HTMLElement;
  let http: HttpTestingController;

  const url = 'http://localhost:8080/api/auth/registro';
  const urlVerificar = 'http://localhost:8080/api/auth/verificar';
  const respuestaRegistro = { id: 1, nombreUsuario: 'ana', email: 'ana@test.local', contrasenia: 'secreta', verificado: false };

  beforeEach(async () => {
    localStorage.removeItem('usuario_spotify');
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

  it('should register and show the verification form without logging in', async () => {
    await completar(' ana ', 'ana@test.local', 'secreta');
    enviar();
    const req = http.expectOne(url);
    expect(req.request.body).toEqual({ nombreUsuario: 'ana', email: 'ana@test.local', contrasenia: 'secreta' });
    req.flush(respuestaRegistro, { status: 201, statusText: 'Created' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(element.querySelector('h2')?.textContent).toContain('Verificá tu cuenta');
    expect(element.textContent).toContain('Enviamos un código de seis dígitos a ana@test.local.');
    expect(element.querySelector('#verificacion-codigo')).toBeTruthy();
    expect(TestBed.inject(AuthService).estaAutenticado()).toBe(false);
    expect(localStorage.getItem('usuario_spotify')).toBeNull();
  });

  it('should keep the form usable when the server cannot be reached while registering', async () => {
    await completar('ana', 'ana@test.local', 'secreta');
    enviar();
    http.expectOne(url).error(new ProgressEvent('error'), { status: 0 });
    fixture.detectChanges();

    expect(element.querySelector('[role=alert]')?.textContent).toContain('No se pudo conectar con el servidor');
    expect(element.querySelector('#registro-email')).toBeTruthy();
    expect((element.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(false);
  });

  it('should show the message when the verification email cannot be sent', async () => {
    await completar('ana', 'ana@test.local', 'secreta');
    enviar();
    http.expectOne(url).flush(
      { mensaje: 'No se pudo enviar el código de verificación. Intentá registrarte nuevamente.' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    fixture.detectChanges();

    expect(element.querySelector('[role=alert]')?.textContent).toContain('Intentá registrarte nuevamente.');
    expect(element.querySelector('#registro-email')).toBeTruthy();
  });

  describe('verification', () => {
    beforeEach(async () => {
      await completar('ana', 'ana@test.local', 'secreta');
      enviar();
      http.expectOne(url).flush(respuestaRegistro, { status: 201, statusText: 'Created' });
      fixture.detectChanges();
      await fixture.whenStable();
    });

    const botonEnviar = () => element.querySelector('button[type=submit]') as HTMLButtonElement;

    async function ingresarCodigo(codigo: string): Promise<void> {
      const input = element.querySelector('#verificacion-codigo') as HTMLInputElement;
      input.value = codigo;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
    }

    it('should require exactly six digits before calling the backend', async () => {
      for (const codigo of ['', '12345', '12a456']) {
        await ingresarCodigo(codigo);
        enviar();
        http.expectNone(urlVerificar);
        expect(element.textContent).toContain('Ingresá los seis dígitos del código.');
      }
    });

    it('should send the kept email with the code only once while it is pending', async () => {
      await ingresarCodigo('482193');
      enviar();
      enviar();
      const req = http.expectOne(urlVerificar);
      expect(req.request.body).toEqual({ email: 'ana@test.local', codigo: '482193' });
      expect(botonEnviar().disabled).toBe(true);
      req.flush({ mensaje: 'Verificado con éxito' });
    });

    it('should show the error of a wrong code and allow retrying without registering again', async () => {
      await ingresarCodigo('000000');
      enviar();
      http.expectOne(urlVerificar).flush({ mensaje: 'Código incorrecto' }, { status: 400, statusText: 'Bad Request' });
      fixture.detectChanges();

      expect(element.querySelector('[role=alert]')?.textContent).toContain('Código incorrecto');
      expect(botonEnviar().disabled).toBe(false);

      await ingresarCodigo('482193');
      enviar();
      http.expectOne(urlVerificar).flush({ mensaje: 'Verificado con éxito' });
      http.expectNone(url);
      fixture.detectChanges();
      expect(element.querySelector('[role=alert]')).toBeNull();
      expect(element.querySelector('h2')?.textContent).toContain('Cuenta verificada');
    });

    it('should confirm the verification and link to the login without logging in', async () => {
      await ingresarCodigo('482193');
      enviar();
      http.expectOne(urlVerificar).flush({ mensaje: 'Verificado con éxito' });
      fixture.detectChanges();

      expect(element.querySelector('[role=status]')?.textContent).toContain('Tu cuenta fue verificada con éxito.');
      expect(element.querySelector('form')).toBeNull();
      expect(element.querySelector('a.auth__boton')?.getAttribute('href')).toBe('/login?registrado=1&usuario=ana');
      expect(TestBed.inject(AuthService).estaAutenticado()).toBe(false);
      expect(localStorage.getItem('usuario_spotify')).toBeNull();
    });

    it('should show the backend message when the account does not exist or is already verified', async () => {
      const casos: [string, number][] = [
        ['No existe una cuenta con ese correo electrónico.', 404],
        ['La cuenta ya está verificada.', 409],
      ];

      for (const [mensaje, status] of casos) {
        await ingresarCodigo('482193');
        enviar();
        http.expectOne(urlVerificar).flush({ mensaje }, { status, statusText: 'Error' });
        fixture.detectChanges();
        expect(element.querySelector('[role=alert]')?.textContent).toContain(mensaje);
      }
    });

    it('should allow retrying when the server cannot be reached', async () => {
      await ingresarCodigo('482193');
      enviar();
      http.expectOne(urlVerificar).error(new ProgressEvent('error'), { status: 0 });
      fixture.detectChanges();

      expect(element.querySelector('[role=alert]')?.textContent).toContain('No se pudo conectar con el servidor');
      expect(botonEnviar().disabled).toBe(false);
      expect(element.querySelector('#verificacion-codigo')).toBeTruthy();
    });
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
