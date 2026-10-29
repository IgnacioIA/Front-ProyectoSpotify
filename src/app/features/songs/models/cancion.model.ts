export interface Cancion {
  id: number;
  titulo: string;
  genero: string;
  duracion: number;
  portada?: string;
  favorito?: boolean;
  artista?: {
    id: number;
    nombre: string;
  };
}