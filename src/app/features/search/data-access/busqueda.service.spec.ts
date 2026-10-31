import { filtrarCanciones } from './busqueda.service';

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
