import { Injectable, signal } from '@angular/core';

// Texto del buscador del header. Es global: se mantiene al navegar entre Inicio, Favoritos y Playlists.
@Injectable({
  providedIn: 'root'
})
export class BusquedaService {
  readonly texto = signal('');
}

interface CancionBuscable {
  titulo?: string;
  artista?: { nombre?: string };
}

// Coincide por título o por nombre del artista, sin distinguir mayúsculas
export function filtrarCanciones<T extends CancionBuscable>(canciones: T[], texto: string): T[] {
  const buscado = texto.toLowerCase();
  return canciones.filter(cancion =>
    !!cancion.titulo?.toLowerCase().includes(buscado) ||
    !!cancion.artista?.nombre?.toLowerCase().includes(buscado)
  );
}
