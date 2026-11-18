import { seedFromFiles, get, set, KEYS } from './storage.js';
import { requireSession, getCurrentUser, clearSession } from './session.js';

await seedFromFiles();
requireSession();

const user = getCurrentUser();
document.getElementById('greeting').textContent = `Hello, ${user.name}`;

document.getElementById('logout-btn').addEventListener('click', () => {
  clearSession();
  window.location.href = 'index.html';
});

const textarea = document.getElementById('composer-text');
const counter = document.getElementById('char-counter');
const postBtn = document.getElementById('post-btn');

// Update the counter and enable Post only when there is text.
textarea.addEventListener('input', () => {
  const len = textarea.value.length;
  counter.textContent = `${len} / 280`;
  postBtn.disabled = len === 0;
});

// Save the new post to storage, then clear the box.
postBtn.addEventListener('click', () => {
  const text = textarea.value.trim();
  if (!text) return;

  const posts = get(KEYS.POSTS) || [];
  posts.unshift({
    id: 'p_' + Date.now(),
    authorId: user.id,
    text,
    createdAt: new Date().toISOString(),
    likes: [],
    comments: [],
    hidden: false,
    hiddenReason: null
  });
  set(KEYS.POSTS, posts);

  textarea.value = '';
  counter.textContent = '0 / 280';
  postBtn.disabled = true;
});