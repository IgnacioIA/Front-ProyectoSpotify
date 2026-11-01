import { Injectable, signal } from '@angular/core';

// Texto del buscador del header. Es global: se mantiene al navegar entre Inicio, Favoritos y Playlists.
// Al escribir, con Enter o con la lupa, el header abre la pantalla de resultados (/buscar?q=...).
@Injectable({
  providedIn: 'root'
})
export class BusquedaService {
  readonly texto = signal('');

  // Ruta desde la que empezó la búsqueda, para volver al borrar el texto.
  // Es null si se entró directamente a /buscar.
  origen: string | null = null;
}

interface CancionBuscable {
  titulo?: string;
  artista?: { nombre?: string };
  genero?: string;
}

// Coincide por título o por nombre del artista, sin distinguir mayúsculas
export function filtrarCanciones<T extends CancionBuscable>(canciones: T[], texto: string): T[] {
  const buscado = texto.toLowerCase();
  return canciones.filter(cancion =>
    !!cancion.titulo?.toLowerCase().includes(buscado) ||
    !!cancion.artista?.nombre?.toLowerCase().includes(buscado)
  );
}

// Búsqueda global: tampoco distingue acentos, para encontrar "Canción" escribiendo "cancion"
function normalizar(texto?: string | null): string {
  return (texto ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

// Coincide por título, nombre del artista o género
export function buscarCanciones<T extends CancionBuscable>(canciones: T[], texto: string): T[] {
  const buscado = normalizar(texto);
  return canciones.filter(cancion =>
    normalizar(cancion.titulo).includes(buscado) ||
    normalizar(cancion.artista?.nombre).includes(buscado) ||
    normalizar(cancion.genero).includes(buscado)
  );
}

export function buscarArtistas<T extends { nombre?: string }>(artistas: T[], texto: string): T[] {
  const buscado = normalizar(texto);
  return artistas.filter(artista => normalizar(artista.nombre).includes(buscado));
}
