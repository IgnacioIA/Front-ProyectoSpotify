import { Cancion } from './cancion.model';

export interface Historial {
  id: number;
  cancion: Cancion;
  fechaReproduccion: string;
}
