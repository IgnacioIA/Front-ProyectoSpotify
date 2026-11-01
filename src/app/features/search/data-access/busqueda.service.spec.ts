import { buscarArtistas, buscarCanciones, filtrarCanciones } from './busqueda.service';

describe('filtrarCanciones', () => {
  const canciones = [
    { id: 1, titulo: 'Bohemian Rhapsody', artista: { nombre: 'Queen' } },
    { id: 2, titulo: 'De música ligera', artista: { nombre: 'Soda Stereo' } },
    { id: 3, titulo: 'Sin artista' },
  ];

  const ids = (texto: string) => filtrarCanciones(canciones, texto).map((c) => c.id);

  it('should return every song when the search is empty', () => {
    expect(ids('')).toEqual([1, 2, 3]);
  });

  it('should match the title or the artist name ignoring case', () => {
    expect(ids('RHAPSODY')).toEqual([1]);
    expect(ids('soda')).toEqual([2]);
    expect(ids('a')).toEqual([1, 2, 3]);
  });

  it('should return no songs when nothing matches', () => {
    expect(ids('zzz')).toEqual([]);
  });

  it('should not fail with incomplete songs', () => {
    expect(filtrarCanciones([{}, { artista: {} }], 'x')).toEqual([]);
  });
});

describe('buscarCanciones', () => {
  const canciones = [
    { id: 1, titulo: 'Canción de agosto', genero: 'Pop', artista: { nombre: 'Luna Quiroga' } },
    { id: 2, titulo: 'Marea baja', genero: 'Rock', artista: { nombre: 'Los Faros del Sur' } },
    { id: 3, titulo: 'Sin datos' },
  ];

  const ids = (texto: string) => buscarCanciones(canciones, texto).map((c) => c.id);

  it('should match the title, the artist or the genre', () => {
    expect(ids('marea')).toEqual([2]);
    expect(ids('LUNA')).toEqual([1]);
    expect(ids('rock')).toEqual([2]);
  });

  it('should ignore accents in both directions', () => {
    expect(ids('cancion')).toEqual([1]);
    expect(ids('márea')).toEqual([2]);
  });

  it('should not fail with null values from the backend', () => {
    const incompletas = [{ id: 4, titulo: null, genero: null, artista: null }] as never[];
    expect(buscarCanciones(incompletas, 'x')).toEqual([]);
  });
});

describe('buscarArtistas', () => {
  it('should match the name ignoring case and accents', () => {
    const artistas = [{ nombre: 'Neón Pampa' }, { nombre: 'Luna Quiroga' }];
    expect(buscarArtistas(artistas, 'neon')).toEqual([artistas[0]]);
    expect(buscarArtistas(artistas, 'zzz')).toEqual([]);
  });
});
