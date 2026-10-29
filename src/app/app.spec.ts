import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AppComponent } from './app';
import { routes } from './app.routes';

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
});
