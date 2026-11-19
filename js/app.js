import { seedFromFiles, get, KEYS, resetDemo } from "./storage.js";
import { setSession } from "./session.js";

await seedFromFiles()

const users=get(KEYS.USERS)
const list=document.getElementById('user-list')
const pokemonByUserId = {
  u_kabir: 25,
  u_ananya: 1,
  u_ravi: 7,
  u_priya: 39,
  u_arjun: 133
}

users.forEach(user => {
  const button = document.createElement('button');
  button.className = 'user-card';
  button.setAttribute('aria-label', `Continue as ${user.name}, ${user.role}`);

  const avatar = document.createElement('span');
  avatar.className = 'user-avatar';
  avatar.setAttribute('aria-hidden', 'true');

  const initials = document.createElement('span');
  initials.className = 'user-avatar-initials';
  initials.textContent = user.name
    .split(/\s+/)
    .map(name => name[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const image = document.createElement('img');
  image.alt = '';
  image.addEventListener('load', () => {
    initials.hidden = true;
  });
  image.addEventListener('error', () => image.remove());
  const pokemonId = pokemonByUserId[user.id];
  if (pokemonId) {
    image.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
  }

  if (user.id === 'u_joseph') {
    const trainerAvatar = document.createElement('span');
    trainerAvatar.className = 'user-avatar-emoji';
    trainerAvatar.textContent = '🧢';
    avatar.append(trainerAvatar);
  } else {
    avatar.append(initials);
    if (pokemonId) avatar.append(image);
  }

  const name = document.createElement('span');
  name.className = 'user-card-name';
  name.textContent = user.name;

  const role = document.createElement('span');
  role.className = 'user-card-role';
  role.textContent = user.role;

  button.append(avatar, name, role);
  button.addEventListener('click', () => {
    setSession(user.id);
    window.location.href = 'feed.html';
  });
  list.appendChild(button);
});

document.getElementById('reset-btn').addEventListener('click', resetDemo);