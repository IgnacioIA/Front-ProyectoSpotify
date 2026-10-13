import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PlayerBarComponent } from './layout/player-bar/player-bar.component';

@Component({
  imports: [RouterOutlet, PlayerBarComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('Front-ProyectoSpotify');
}
