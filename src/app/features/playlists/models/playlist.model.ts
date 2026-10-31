import { Cancion } from '../../songs/models/cancion.model';

// El backend también serializa `usuario` (con su contraseña) cuando la playlist tiene uno asignado;
// el front no lo usa y no lo tipa a propósito.
export interface Playlist {
  id: number;
  nombre: string;
  canciones: Cancion[];
}
