import { seedFromFiles, get, KEYS, resetDemo } from "./storage.js";
import { setSession } from "./session.js";
import { createUserAvatar } from './avatar.js';

await seedFromFiles()

const list = document.getElementById('user-list');

function renderUsers() {
  const users = get(KEYS.USERS) || [];
  list.replaceChildren();

  users.forEach(user => {
    const button = document.createElement('button');
    button.className = 'user-card';
    button.setAttribute('aria-label', `Continue as ${user.name}, ${user.role}`);

    const name = document.createElement('span');
    name.className = 'user-card-name';
    name.textContent = user.name;

    const role = document.createElement('span');
    role.className = 'user-card-role';
    role.textContent = user.role;

    button.append(createUserAvatar(user, { showPokemon: true }), name, role);
    button.addEventListener('click', () => {
      setSession(user.id);
      window.location.href = 'feed.html';
    });
    list.appendChild(button);
  });
}

renderUsers();
window.addEventListener('storage', event => {
  if (event.key === KEYS.USERS) renderUsers();
});
document.getElementById('reset-btn').addEventListener('click', resetDemo);