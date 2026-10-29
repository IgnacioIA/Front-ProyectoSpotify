import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  // El filtrado de canciones sigue en AppComponent; el header solo expone el texto ingresado.
  @Input() filtroTexto: string = '';
  @Output() filtroTextoChange = new EventEmitter<string>();
  @Output() tituloClick = new EventEmitter<void>();

  @Input() menuAbierto: boolean = false;
  @Output() menuToggle = new EventEmitter<void>();
}
