import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService, mensajeErrorAuth } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  const respuestaBackend = { id: 3, nombreUsuario: 'ana', email: 'ana@test.local', contrasenia: 'secreta' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should start without an authenticated user', () => {
    expect(service.usuario()).toBeNull();
    expect(service.estaAutenticado()).toBe(false);
  });

  it('should send the login contract and keep the user without the password', () => {
    let recibido: unknown;
    service.iniciarSesion({ identificador: 'ana', contrasenia: 'secreta' }).subscribe((u) => (recibido = u));

    const req = http.expectOne('http://localhost:8080/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ identificador: 'ana', contrasenia: 'secreta' });
    req.flush(respuestaBackend);

    const esperado = { id: 3, nombreUsuario: 'ana', email: 'ana@test.local' };
    expect(recibido).toEqual(esperado);
    expect(service.usuario()).toEqual(esperado);
    expect(service.estaAutenticado()).toBe(true);
  });

  it('should stay anonymous when the credentials are rejected', () => {
    let error: unknown;
    service.iniciarSesion({ identificador: 'ana', contrasenia: 'mala' }).subscribe({ error: (e) => (error = e) });
    http
      .expectOne('http://localhost:8080/api/auth/login')
      .flush({ mensaje: 'Usuario, correo o contraseña incorrectos.' }, { status: 401, statusText: 'Unauthorized' });

    expect(service.estaAutenticado()).toBe(false);
    expect(mensajeErrorAuth(error)).toBe('Usuario, correo o contraseña incorrectos.');
  });

  it('should register without logging in and without exposing the password', () => {
    let recibido: unknown;
    service
      .registrar({ nombreUsuario: 'ana', email: 'ana@test.local', contrasenia: 'secreta' })
      .subscribe((u) => (recibido = u));

    const req = http.expectOne('http://localhost:8080/api/auth/registro');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombreUsuario: 'ana', email: 'ana@test.local', contrasenia: 'secreta' });
    req.flush(respuestaBackend, { status: 201, statusText: 'Created' });

    expect(recibido).toEqual({ id: 3, nombreUsuario: 'ana', email: 'ana@test.local' });
    expect(service.estaAutenticado()).toBe(false);
  });

  it('should clear the user on logout', () => {
    service.iniciarSesion({ identificador: 'ana', contrasenia: 'secreta' }).subscribe();
    http.expectOne('http://localhost:8080/api/auth/login').flush(respuestaBackend);

    service.cerrarSesion();
    expect(service.usuario()).toBeNull();
    expect(service.estaAutenticado()).toBe(false);
  });
});

describe('mensajeErrorAuth', () => {
  const error = (status: number, body: unknown = null) => new HttpErrorResponse({ status, error: body });

  it('should show the backend message for validation and credential errors', () => {
    expect(mensajeErrorAuth(error(400, { mensaje: 'El nombre de usuario ya está registrado.' }))).toBe(
      'El nombre de usuario ya está registrado.',
    );
  });

  it('should explain connection errors', () => {
    expect(mensajeErrorAuth(error(0))).toContain('No se pudo conectar con el servidor');
  });

  it('should hide server internals on server errors', () => {
    const mensaje = mensajeErrorAuth(error(500, { mensaje: 'NullPointerException at AuthController' }));
    expect(mensaje).toBe('Ocurrió un error en el servidor. Intentá nuevamente más tarde.');
  });
});
