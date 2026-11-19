const AVATAR_SIZE = 256;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const POKEMON_IDS = {
  u_kabir: 25,
  u_ananya: 1,
  u_ravi: 7,
  u_priya: 39,
  u_arjun: 133
};

export function createUserAvatar(user, { className = '', showPokemon = false } = {}) {
  const avatar = document.createElement('span');
  avatar.className = `user-avatar${className ? ` ${className}` : ''}`;
  avatar.setAttribute('aria-hidden', 'true');

  const fallback = document.createElement('span');
  const isAsh = user?.id === 'u_joseph';
  fallback.className = isAsh ? 'user-avatar-emoji' : 'user-avatar-initials';
  fallback.textContent = isAsh
    ? '🧢'
    : (user?.name || '?')
      .split(/\s+/)
      .map(name => name[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  avatar.append(fallback);

  const customPicture = typeof user?.profilePicture === 'string'
    && /^data:image\/(?:jpeg|png|webp);base64,/.test(user.profilePicture);
  const pokemonId = showPokemon && !customPicture ? POKEMON_IDS[user?.id] : null;
  const imageSource = customPicture
    ? user.profilePicture
    : pokemonId
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`
      : null;

  if (imageSource) {
    const image = document.createElement('img');
    image.alt = '';
    image.src = imageSource;
    image.addEventListener('load', () => {
      fallback.hidden = true;
    });
    image.addEventListener('error', () => image.remove(), { once: true });
    avatar.append(image);
  }

  return avatar;
}

export async function encodeProfilePicture(file) {
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (!file || !allowedTypes.has(file.type)) {
    throw new Error('Choose a JPEG, PNG, or WebP image.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Choose an image smaller than 5 MB.');
  }

  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  if (!side) {
    bitmap.close();
    throw new Error('The selected image could not be read.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Image processing is unavailable in this browser.');
  }

  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE
  );
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.82);
}
