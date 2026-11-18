import { seedFromFiles, get, set, KEYS } from './storage.js';
import { requireSession, getCurrentUser } from './session.js';
import { publish } from './eventBus.js';

await seedFromFiles();
requireSession();

const user = getCurrentUser();
const users = get(KEYS.USERS) || [];
const postId = new URLSearchParams(location.search).get('id');
const container = document.getElementById('post-container');

// Find the post by the id in the URL (post.html?id=p_1).
function findPost() {
  const posts = get(KEYS.POSTS) || [];
  return posts.find(p => p.id === postId);
}

// Draw the post, its comments, and the comment box.
function render() {
  const post = findPost();
  container.innerHTML = '';

  if (!post || post.hidden) {
    const msg = document.createElement('div');
    msg.className = 'text-center py-5';
    msg.innerHTML = `<h2>This post isn't available</h2><p class="text-secondary">It may have been hidden or removed.</p>`;
    container.appendChild(msg);
    return;
  }

  const author = users.find(u => u.id === post.authorId);
  const liked = post.likes.includes(user.id);

  const article = document.createElement('article');
  article.className = 'post-card';

  const name = document.createElement('strong');
  name.textContent = author ? author.name : 'Unknown';

  const text = document.createElement('p');
  text.className = 'fs-5';
  text.textContent = post.text;

  const likeBtn = document.createElement('button');
  likeBtn.className = `btn btn-sm like-btn ${liked ? 'is-liked' : ''}`;
  likeBtn.setAttribute('aria-pressed', String(liked));
  likeBtn.textContent = `♥ ${post.likes.length}`;
  likeBtn.addEventListener('click', () => toggleLike(post.id));

  article.append(name, text, likeBtn);
  container.appendChild(article);

  const heading = document.createElement('h3');
  heading.className = 'mt-4';
  heading.textContent = 'Comments';
  container.appendChild(heading);

  const commentList = document.createElement('ul');
  commentList.className = 'comment-list';
  if (post.comments.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = 'No comments yet. Be the first.';
    commentList.appendChild(empty);
  }
  post.comments.forEach(c => {
    const commenter = users.find(u => u.id === c.authorId);
    const row = document.createElement('li');
    row.textContent = `${commenter ? commenter.name : 'Unknown'}: ${c.text}`;
    commentList.appendChild(row);
  });
  container.appendChild(commentList);

  const form = document.createElement('form');
  form.className = 'comment-form';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'form-control form-control-sm';
  input.placeholder = 'Write a comment';
  input.maxLength = 280;
  input.setAttribute('aria-label', 'Write a comment');
  const send = document.createElement('button');
  send.type = 'submit';
  send.className = 'btn btn-sm btn-accent';
  send.textContent = 'Reply';
  form.append(input, send);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    addComment(post.id, input.value);
  });
  container.appendChild(form);
}

// Add or remove the current user's like, then redraw.
function toggleLike(id) {
  const posts = get(KEYS.POSTS) || [];
  const post = posts.find(p => p.id === id);
  if (!post) return;

  if (post.likes.includes(user.id)) {
    post.likes = post.likes.filter(uid => uid !== user.id);
  } else {
    post.likes.push(user.id);
    publish({ type: 'like', actorId: user.id, postId: id, postAuthorId: post.authorId });
  }

  set(KEYS.POSTS, posts);
  render();
}

// Save a comment, publish it, then redraw.
function addComment(id, rawText) {
  const text = rawText.trim();
  if (!text) return;

  const posts = get(KEYS.POSTS) || [];
  const post = posts.find(p => p.id === id);
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
    postId: id,
    postAuthorId: post.authorId,
    commentId: comment.id,
    commentText: text
  });

  render();
}

render();