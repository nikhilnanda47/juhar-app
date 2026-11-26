import { MEDIA } from '@juhar/shared';
import { checkPickedFiles, movePhoto, photoCountText } from './photos';

const file = (name: string, type = 'image/jpeg', size = 2_000_000) => ({ name, type, size });

describe('checkPickedFiles', () => {
  it('takes JPG, PNG and WebP pictures in the order picked', () => {
    const { accepted, problems } = checkPickedFiles([file('a.jpg'), file('b.png', 'image/png'), file('c.webp', 'image/webp')], 0);
    expect(accepted.map((f) => f.name)).toEqual(['a.jpg', 'b.png', 'c.webp']);
    expect(problems).toEqual([]);
  });

  it('explains each file it cannot use, by name, and still takes the good ones', () => {
    const { accepted, problems } = checkPickedFiles(
      [file('saree.heic', 'image/heic'), file('notes.pdf', 'application/pdf'), file('ok.jpg'), file('huge.jpg', 'image/jpeg', MEDIA.MAX_FILE_BYTES + 1), file('empty.jpg', 'image/jpeg', 0)],
      0,
    );
    expect(accepted.map((f) => f.name)).toEqual(['ok.jpg']);
    expect(problems).toHaveLength(4);
    expect(problems[0]).toBe('saree.heic: only JPG, PNG and WebP pictures can be used.');
    expect(problems[2]).toContain('huge.jpg');
    expect(problems[2]).toContain('10.0 MB');
    expect(problems[2]).toContain('under 10 MB');
    expect(problems[3]).toContain('empty');
  });

  it('allows a photo of exactly the size limit', () => {
    expect(checkPickedFiles([file('edge.jpg', 'image/jpeg', MEDIA.MAX_FILE_BYTES)], 0).accepted).toHaveLength(1);
  });

  it('only takes as many as there is room for, and says which were left out', () => {
    const picked = Array.from({ length: 4 }, (_, i) => file(`p${i}.jpg`));
    const { accepted, problems } = checkPickedFiles(picked, MEDIA.MAX_PER_PRODUCT - 2);
    expect(accepted.map((f) => f.name)).toEqual(['p0.jpg', 'p1.jpg']);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain('p2.jpg');
    expect(problems[0]).toContain(`at most ${MEDIA.MAX_PER_PRODUCT}`);
  });

  it('takes nothing when the saree already has the most', () => {
    const { accepted, problems } = checkPickedFiles([file('one.jpg')], MEDIA.MAX_PER_PRODUCT);
    expect(accepted).toEqual([]);
    expect(problems).toHaveLength(1);
  });

  it('a file that cannot be used does not use up a place', () => {
    const { accepted } = checkPickedFiles([file('bad.gif', 'image/gif'), file('good.jpg')], MEDIA.MAX_PER_PRODUCT - 1);
    expect(accepted.map((f) => f.name)).toEqual(['good.jpg']);
  });
});

describe('movePhoto', () => {
  const ids = ['a', 'b', 'c'];
  it('moves a photo one place earlier or later', () => {
    expect(movePhoto(ids, 1, -1)).toEqual(['b', 'a', 'c']);
    expect(movePhoto(ids, 1, 1)).toEqual(['a', 'c', 'b']);
  });
  it('cannot move the first earlier or the last later, or something that is not there', () => {
    expect(movePhoto(ids, 0, -1)).toBeNull();
    expect(movePhoto(ids, 2, 1)).toBeNull();
    expect(movePhoto(ids, 5, -1)).toBeNull();
    expect(movePhoto(ids, -1, 1)).toBeNull();
  });
  it('does not change the list it was given', () => {
    movePhoto(ids, 0, 1);
    expect(ids).toEqual(['a', 'b', 'c']);
  });
});

describe('photoCountText', () => {
  it('says how many there are and how many fit', () => {
    expect(photoCountText(0)).toBe('No photos yet (up to 10)');
    expect(photoCountText(3)).toBe('3 of 10 photos');
    expect(photoCountText(10)).toBe('10 of 10 photos (full)');
  });
});
