import { seedFromFiles,get,KEYS } from "./storage.js";
import { setSession } from "./session.js";

await seedFromFiles()

const users=get(KEYS.USERS)
const list=document.getElementById('user-list')

users.forEach(user => {
  const button = document.createElement('button');
  button.className = 'btn btn-outline-secondary text-start';
  button.textContent = `${user.name} (${user.role})`;
  button.addEventListener('click', () => {
    setSession(user.id);
    window.location.href = 'feed.html';
  });
  list.appendChild(button);
});