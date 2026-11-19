import { get, set, KEYS, seedFromFiles } from './storage.js';
import { getCurrentUser, clearSession } from './session.js';
import { publish, subscribe } from './eventBus.js';
import { createId, renderComment, renderPostCard } from './postView.js';

await seedFromFiles();
const currentUser = getCurrentUser();

if (!currentUser) {
  window.location.href = 'index.html';
} else {
  document.getElementById('logout-btn').addEventListener('click', () => {
    clearSession();
    window.location.href = 'index.html';
  });

  const users = get(KEYS.USERS) || [];
  const postId = new URLSearchParams(window.location.search).get('id');
  const detail = document.getElementById('post-detail');
  const commentsList = document.getElementById('comments-list');
  const commentForm = document.getElementById('comment-form');
  const commentText = document.getElementById('comment-text');
  const commentStatus = document.getElementById('comment-status');

  function getPost() {
    return (get(KEYS.POSTS) || []).find(post => post.id === postId && !post.hidden);
  }

  function renderPage() {
    const post = getPost();
    detail.replaceChildren();
    commentsList.replaceChildren();

    if (!post) {
      detail.textContent = 'This post could not be found.';
      commentForm.hidden = true;
      return;
    }

    commentForm.hidden = false;
    detail.append(renderPostCard(post, currentUser, users));
    const comments = Array.isArray(post.comments) ? post.comments : [];
    if (comments.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = 'No comments yet.';
      commentsList.append(empty);
    } else {
      comments.forEach(comment => commentsList.append(renderComment(comment, users)));
    }
  }

  commentForm.addEventListener('submit', event => {
    event.preventDefault();
    const text = commentText.value.trim();
    const post = getPost();
    if (!text || !post) return;

    const comment = {
      id: createId('c'),
      authorId: currentUser.id,
      text,
      createdAt: new Date().toISOString()
    };
    const posts = get(KEYS.POSTS) || [];
    const index = posts.findIndex(item => item.id === post.id);
    if (index === -1) return;
    posts[index] = {
      ...posts[index],
      comments: [...(posts[index].comments || []), comment]
    };
    if (!set(KEYS.POSTS, posts)) throw new Error('Unable to save the comment.');

    commentText.value = '';
    commentStatus.textContent = 'Comment added.';
    publish({
      type: 'comment',
      postId: post.id,
      commentId: comment.id,
      actorId: currentUser.id,
      text
    });
    publish({ type: 'posts:changed', postId: post.id });
  });

  subscribe('posts:changed', renderPage);
  subscribe('post:deleted', renderPage);
  window.addEventListener('storage', event => {
    if (event.key === KEYS.POSTS) renderPage();
  });
  renderPage();
}
