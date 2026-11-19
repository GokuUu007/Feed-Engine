import { get, set, KEYS, seedFromFiles } from './storage.js';
import { getCurrentUser, clearSession } from './session.js';
import { publish, subscribe } from './eventBus.js';
import { renderPostCard } from './postView.js';

const MAX_REASON_LENGTH = 280;

function requireModerator() {
  const moderator = getCurrentUser();
  if (!moderator || moderator.role !== 'moderator') {
    throw new Error('Only moderators can perform moderation actions.');
  }
  return moderator;
}

function normalizeReason(reason, action) {
  if (typeof reason !== 'string' || !reason.trim()) {
    throw new Error(`A reason is required to ${action} a post.`);
  }
  const normalized = reason.trim();
  if (normalized.length > MAX_REASON_LENGTH) {
    throw new Error(`The reason must be ${MAX_REASON_LENGTH} characters or fewer.`);
  }
  return normalized;
}

export function moderatePost(postId, hidden, reason = '') {
  requireModerator();
  const normalizedReason = hidden ? normalizeReason(reason, 'hide') : null;
  const posts = get(KEYS.POSTS) || [];
  const index = posts.findIndex(post => post.id === postId);
  if (index === -1) throw new Error('This post no longer exists.');
  if (posts[index].removed) throw new Error('This post has already been removed.');

  posts[index] = {
    ...posts[index],
    hidden,
    hiddenReason: normalizedReason
  };
  if (!set(KEYS.POSTS, posts)) throw new Error('Unable to update post visibility.');
  publish({ type: 'moderation:changed', postId, hidden });
  publish({ type: 'posts:changed', postId });
  return true;
}

export function removePost(postId, reason) {
  const moderator = requireModerator();
  const normalizedReason = normalizeReason(reason, 'delete');
  const posts = get(KEYS.POSTS) || [];
  const index = posts.findIndex(post => post.id === postId);
  if (index === -1) throw new Error('This post no longer exists.');
  if (posts[index].removed) throw new Error('This post has already been removed.');

  const post = posts[index];
  posts[index] = {
    id: post.id,
    authorId: post.authorId,
    createdAt: post.createdAt,
    likes: [],
    comments: [],
    hidden: true,
    hiddenReason: null,
    removed: true,
    removedReason: normalizedReason,
    removedAt: new Date().toISOString(),
    removedBy: moderator.id
  };
  if (!set(KEYS.POSTS, posts)) throw new Error('Unable to delete the post.');
  publish({ type: 'post:deleted', postId });
  publish({ type: 'posts:changed', postId });
  publish({ type: 'moderation:changed', postId, removed: true });
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

  let users = get(KEYS.USERS) || [];
  const list = document.getElementById('moderation-list');
  const removedList = document.getElementById('removed-posts-list');
  const form = document.getElementById('moderation-reason-form');
  const reasonLabel = document.getElementById('moderation-reason-label');
  const reasonInput = document.getElementById('moderation-reason');
  const submitButton = document.getElementById('moderation-submit');
  const status = document.getElementById('moderation-status');
  let selectedPostId = null;
  let selectedAction = null;

  function showReasonForm(postId, action) {
    selectedPostId = postId;
    selectedAction = action;
    reasonLabel.textContent = action === 'delete'
      ? 'Reason for deleting this post'
      : 'Reason for hiding this post';
    submitButton.textContent = action === 'delete' ? 'Delete post' : 'Hide post';
    reasonInput.value = '';
    reasonInput.setCustomValidity('');
    form.hidden = false;
    reasonInput.focus();
  }

  function renderRemovedPost(post) {
    const summary = document.createElement('div');
    summary.className = 'moderation-removed-post';
    const title = document.createElement('strong');
    title.textContent = 'Post deleted';
    const author = users.find(user => user.id === post.authorId);
    const details = document.createElement('p');
    details.textContent = `Originally posted by ${author?.name || 'Unknown trainer'} · ${new Date(post.createdAt).toLocaleString()}`;
    const moderator = users.find(user => user.id === post.removedBy);
    const removalDetails = document.createElement('p');
    removalDetails.textContent = `Removed by ${moderator?.name || 'moderator'} · ${new Date(post.removedAt).toLocaleString()}`;
    const reason = document.createElement('p');
    reason.className = 'moderation-hidden-reason';
    reason.textContent = `Removal reason: ${post.removedReason}`;
    summary.append(title, details, removalDetails, reason);
    return summary;
  }

  function render() {
    const allPosts = (get(KEYS.POSTS) || []).slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const posts = allPosts.filter(post => !post.removed);
    const removedPosts = allPosts.filter(post => post.removed);
    list.replaceChildren();
    removedList.replaceChildren();

    if (posts.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = 'There are no posts to review.';
      list.append(empty);
    } else {
      posts.forEach(post => {
        const item = document.createElement('li');
        item.className = 'moderation-item';
        item.append(renderPostCard(post, currentUser, users));
        const actions = document.createElement('div');
        actions.className = 'moderation-actions';

        if (post.hidden) {
          const hiddenReason = document.createElement('p');
          hiddenReason.className = 'moderation-hidden-reason';
          hiddenReason.textContent = `Hidden: ${post.hiddenReason || 'No reason recorded.'}`;
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
          actions.append(unhide);
          item.append(hiddenReason);
        } else {
          const hide = document.createElement('button');
          hide.className = 'btn btn-sm btn-outline-secondary';
          hide.type = 'button';
          hide.textContent = 'Hide';
          hide.setAttribute('aria-label', `Hide post by ${users.find(user => user.id === post.authorId)?.name || 'trainer'}`);
          hide.addEventListener('click', () => showReasonForm(post.id, 'hide'));
          actions.append(hide);
        }

        const remove = document.createElement('button');
        remove.className = 'btn btn-sm btn-outline-danger';
        remove.type = 'button';
        remove.textContent = 'Delete';
        remove.setAttribute('aria-label', `Delete post by ${users.find(user => user.id === post.authorId)?.name || 'trainer'}`);
        remove.addEventListener('click', () => showReasonForm(post.id, 'delete'));
        actions.append(remove);
        item.append(actions);
        list.append(item);
      });
    }

    if (removedPosts.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = 'No posts have been deleted.';
      removedList.append(empty);
    } else {
      removedPosts.forEach(post => {
      const item = document.createElement('li');
      item.className = 'moderation-item';
        item.append(renderRemovedPost(post));
        removedList.append(item);
      });
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!selectedPostId || !selectedAction) return;
    const reason = reasonInput.value.trim();
    if (!reason) {
      reasonInput.setCustomValidity('Enter a reason before continuing.');
      reasonInput.reportValidity();
      return;
    }
    reasonInput.setCustomValidity('');
    try {
      if (selectedAction === 'delete') {
        removePost(selectedPostId, reason);
        status.textContent = 'Post deleted. Its removal details are in the audit list below.';
      } else {
        moderatePost(selectedPostId, true, reason);
        status.textContent = 'Post hidden.';
      }
      selectedPostId = null;
      selectedAction = null;
      form.hidden = true;
      render();
    } catch (error) {
      status.textContent = error.message;
    }
  });

  reasonInput.addEventListener('input', () => reasonInput.setCustomValidity(''));
  document.getElementById('cancel-hide').addEventListener('click', () => {
    selectedPostId = null;
    selectedAction = null;
    form.hidden = true;
  });

  subscribe('posts:changed', render);
  subscribe('moderation:changed', render);
  window.addEventListener('storage', event => {
    if (event.key === KEYS.USERS) {
      users = get(KEYS.USERS) || [];
      render();
    } else if (event.key === KEYS.POSTS) {
      render();
    }
  });
  render();
}
