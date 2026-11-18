import { seedFromFiles, get, set, KEYS } from './storage.js';
import { requireSession, getCurrentUser, clearSession } from './session.js';
import { publish } from './eventBus.js';

await seedFromFiles();
requireSession();

const user = getCurrentUser();
const users = get(KEYS.USERS) || [];
const PAGE_SIZE = 10;
let shownCount = 0; // how many posts are currently drawn

document.getElementById('greeting').textContent = `Hello, ${user.name}`;

document.getElementById('logout-btn').addEventListener('click', () => {
  clearSession();
  window.location.href = 'index.html';
});

// Composer
const textarea = document.getElementById('composer-text');
const counter = document.getElementById('char-counter');
const postBtn = document.getElementById('post-btn');

textarea.addEventListener('input', () => {
  const len = textarea.value.length;
  counter.textContent = `${len} / 280`;
  postBtn.disabled = len === 0;
});

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
  renderFeed();
});


// Draw the next page of posts (or the first page on load).
function renderFeed(reset = true) {
  const list = document.getElementById('post-list');
  if (reset) {
    list.innerHTML = '';
    shownCount = 0;
  }

  const posts = (get(KEYS.POSTS) || [])
    .filter(p => !p.hidden)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const batch = posts.slice(shownCount, shownCount + PAGE_SIZE);
  batch.forEach(post => list.appendChild(buildCard(post)));
  shownCount += batch.length;

  document.getElementById('load-more-btn').style.display =
    shownCount < posts.length ? 'inline-block' : 'none';
}

// Build one post card. Same content as before, moved into its own function.
function buildCard(post) {
  const author = users.find(u => u.id === post.authorId);
  const liked = post.likes.includes(user.id);

  const article = document.createElement('article');
  article.className = 'post-card';

  const name = document.createElement('strong');
  name.textContent = author ? author.name : 'Unknown';

  const text = document.createElement('p');
  text.textContent = post.text;

  const meta = document.createElement('div');
  meta.className = 'counter';
  meta.textContent = `${post.comments.length} comments`;

  const likeBtn = document.createElement('button');
  likeBtn.className = `btn btn-sm like-btn ${liked ? 'is-liked' : ''}`;
  likeBtn.setAttribute('aria-pressed', String(liked));
  likeBtn.textContent = `♥ ${post.likes.length}`;
  likeBtn.addEventListener('click', () => toggleLike(post.id));

  const actions = [name, text, meta, likeBtn];

  if (post.authorId === user.id) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-outline-danger delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deletePost(post.id));
    actions.push(deleteBtn);
  }

  const commentList = document.createElement('ul');
  commentList.className = 'comment-list';
  post.comments.forEach(c => {
    const commenter = users.find(u => u.id === c.authorId);
    const row = document.createElement('li');
    row.textContent = `${commenter ? commenter.name : 'Unknown'}: ${c.text}`;
    commentList.appendChild(row);
  });

  const form = document.createElement('form');
  form.className = 'comment-form';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'form-control form-control-sm';
  input.placeholder = 'Write a comment';
  input.maxLength = 280;
  input.setAttribute('aria-label', `Comment on post by ${author ? author.name : 'Unknown'}`);
  const send = document.createElement('button');
  send.type = 'submit';
  send.className = 'btn btn-sm btn-accent';
  send.textContent = 'Reply';
  form.append(input, send);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    addComment(post.id, input.value);
  });

  article.append(...actions, commentList, form);

  const li = document.createElement('li');
  li.appendChild(article);
  return li;
}

// Add or remove the current user's like, then redraw.
function toggleLike(postId) {
  const posts = get(KEYS.POSTS) || [];
  const post = posts.find(p => p.id === postId);
  if (!post) return;

  if (post.likes.includes(user.id)) {
    post.likes = post.likes.filter(id => id !== user.id);
  } else {
    post.likes.push(user.id);
    publish({ type: 'like', actorId: user.id, postId, postAuthorId: post.authorId });
  }

  set(KEYS.POSTS, posts);
  renderFeed();
}

// Save a comment, publish it, then redraw.
function addComment(postId, rawText) {
  const text = rawText.trim();
  if (!text) return;

  const posts = get(KEYS.POSTS) || [];
  const post = posts.find(p => p.id === postId);
  if (!post) return;

  const comment = {
    id: 'c_' + Date.now(),
    authorId: user.id,
    text,
    createdAt: new Date().toISOString()
  };
  post.comments.push(comment);
  set(KEYS.POSTS, posts);

  publish({
    type: 'comment',
    actorId: user.id,
    postId,
    postAuthorId: post.authorId,
    commentId: comment.id,
    commentText: text
  });

  renderFeed();
}

// Remove a post, but only if the current user wrote it.
function deletePost(postId) {
  const posts = get(KEYS.POSTS) || [];
  const post = posts.find(p => p.id === postId);
  if (!post || post.authorId !== user.id) return;

  if (!confirm('Delete this post? This cannot be undone.')) return;

  set(KEYS.POSTS, posts.filter(p => p.id !== postId));
  renderFeed();
}
document.getElementById('load-more-btn').addEventListener('click', () => renderFeed(false));
// First draw on page load. Keep this last.
renderFeed();