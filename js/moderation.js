import { get, set, KEYS, seedFromFiles } from './storage.js';
import { getCurrentUser, clearSession } from './session.js';
import { publish, subscribe } from './eventBus.js';
import { renderPostCard } from './postView.js';

export function moderatePost(postId, hidden, reason = '') {
  const moderator = getCurrentUser();
  if (!moderator || moderator.role !== 'moderator') {
    throw new Error('Only moderators can change post visibility.');
  }
  if (hidden && !reason.trim()) {
    throw new Error('A reason is required to hide a post.');
  }

  const posts = get(KEYS.POSTS) || [];
  const index = posts.findIndex(post => post.id === postId);
  if (index === -1) throw new Error('This post no longer exists.');
  posts[index] = {
    ...posts[index],
    hidden,
    hiddenReason: hidden ? reason.trim() : null
  };
  if (!set(KEYS.POSTS, posts)) throw new Error('Unable to update post visibility.');
  publish({ type: 'moderation:changed', postId, hidden });
  publish({ type: 'posts:changed', postId });
  return true;
}

await seedFromFiles();
const currentUser = getCurrentUser();

if (!currentUser) {
  window.location.href = 'index.html';
} else if (currentUser.role !== 'moderator') {
  window.location.href = 'feed.html';
} else {
  document.getElementById('logout-btn').addEventListener('click', () => {
    clearSession();
    window.location.href = 'index.html';
  });

  const users = get(KEYS.USERS) || [];
  const list = document.getElementById('moderation-list');
  const form = document.getElementById('moderation-reason-form');
  const reasonInput = document.getElementById('moderation-reason');
  const status = document.getElementById('moderation-status');
  let selectedPostId = null;

  function render() {
    const posts = (get(KEYS.POSTS) || []).slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    list.replaceChildren();

    if (posts.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = 'There are no posts to review.';
      list.append(empty);
      return;
    }

    posts.forEach(post => {
      const item = document.createElement('li');
      item.className = 'moderation-item';
      item.append(renderPostCard(post, currentUser, users));

      if (post.hidden) {
        const reason = document.createElement('p');
        reason.className = 'moderation-hidden-reason';
        reason.textContent = `Hidden: ${post.hiddenReason || 'No reason recorded.'}`;
        const unhide = document.createElement('button');
        unhide.className = 'btn btn-sm btn-outline-secondary';
        unhide.type = 'button';
        unhide.textContent = 'Unhide';
        unhide.addEventListener('click', () => {
          try {
            moderatePost(post.id, false);
            status.textContent = 'Post restored.';
            render();
          } catch (error) {
            status.textContent = error.message;
          }
        });
        item.append(reason, unhide);
      } else {
        const hide = document.createElement('button');
        hide.className = 'btn btn-sm btn-outline-danger';
        hide.type = 'button';
        hide.textContent = 'Hide';
        hide.setAttribute('aria-label', `Hide post by ${users.find(user => user.id === post.authorId)?.name || 'trainer'}`);
        hide.addEventListener('click', () => {
          selectedPostId = post.id;
          reasonInput.value = '';
          form.hidden = false;
          reasonInput.focus();
        });
        item.append(hide);
      }

      list.append(item);
    });
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!selectedPostId) return;
    const reason = reasonInput.value.trim();
    if (!reason) {
      reasonInput.setCustomValidity('Enter a reason before hiding the post.');
      reasonInput.reportValidity();
      return;
    }
    reasonInput.setCustomValidity('');
    try {
      moderatePost(selectedPostId, true, reason);
      selectedPostId = null;
      form.hidden = true;
      status.textContent = 'Post hidden.';
      render();
    } catch (error) {
      status.textContent = error.message;
    }
  });

  reasonInput.addEventListener('input', () => reasonInput.setCustomValidity(''));
  document.getElementById('cancel-hide').addEventListener('click', () => {
    selectedPostId = null;
    form.hidden = true;
  });

  subscribe('posts:changed', render);
  subscribe('moderation:changed', render);
  window.addEventListener('storage', event => {
    if (event.key === KEYS.POSTS) render();
  });
  render();
}
