import { Component } from '@angular/core';

@Component({
  selector: 'app-player-bar',
  standalone: true,
  imports: [],
  templateUrl: './player-bar.html',
  styleUrl: './player-bar.css'
})
export class PlayerBarComponent {

  onVolumeChange(event: any) {
    const volumeValue = event.target.value;
    console.log('Nivel de volumen actual:', volumeValue);

    // Ajusta el volumen del reproductor de audio cuando esté presente en el DOM:
    const audioElement = document.querySelector('audio');
    if (audioElement) {
      audioElement.volume = volumeValue;
    }
  }

}



