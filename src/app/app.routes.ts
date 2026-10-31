import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/pages/home/home.component';
import { LoginComponent } from './features/users/pages/login/login.component';
import { RegistroComponent } from './features/users/pages/registro/registro.component';
import { PerfilComponent } from './features/users/pages/perfil/perfil.component';
import { PlaylistsComponent } from './features/playlists/pages/playlists/playlists.component';
import { FavoritosComponent } from './features/songs/pages/favoritos/favoritos.component';
import { HistorialComponent } from './features/songs/pages/historial/historial.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'playlists', component: PlaylistsComponent },
  { path: 'favoritos', component: FavoritosComponent },
  { path: 'historial', component: HistorialComponent },
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegistroComponent },
  { path: 'perfil', component: PerfilComponent }
];
