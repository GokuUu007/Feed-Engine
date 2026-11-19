import { seedFromFiles, get, set, KEYS } from './storage.js';
import { getCurrentUser, clearSession } from './session.js';
import { publish, subscribe } from './eventBus.js';
import { renderPostCard, createId } from './postView.js';
import { createSimulator } from './simulator.js';

await seedFromFiles();
const user = getCurrentUser();

if (!user) {
  window.location.href = 'index.html';
} else {
  let users = get(KEYS.USERS) || [];
  const greeting = document.getElementById('greeting');
  const postList = document.getElementById('post-list');
  const textarea = document.getElementById('composer-text');
  const counter = document.getElementById('char-counter');
  const postButton = document.getElementById('post-btn');
  const loadMoreButton = document.getElementById('load-more-btn');
  const followingOnly = document.getElementById('following-only');
  const simulatorButton = document.getElementById('simulator-toggle');
  const simulatorStatus = document.getElementById('simulator-status');
  const status = document.getElementById('post-status');
  let visibleCount = 10;

  greeting.textContent = `Hello, ${user.name}`;
  document.getElementById('logout-btn').addEventListener('click', () => {
    clearSession();
    window.location.href = 'index.html';
  });
  document.getElementById('my-profile-link').href = `profile.html?id=${encodeURIComponent(user.id)}`;

  function getVisiblePosts() {
    const posts = get(KEYS.POSTS) || [];
    const follows = get(KEYS.FOLLOWS) || {};
    const followedIds = new Set(Array.isArray(follows[user.id]) ? follows[user.id] : []);
    return posts
      .filter(post => !post.hidden)
      .filter(post => !followingOnly.checked || followedIds.has(post.authorId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function renderFeed() {
    const posts = getVisiblePosts();
    postList.replaceChildren();

    if (posts.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = followingOnly.checked
        ? 'No posts from people you follow yet.'
        : 'No posts yet. Share the first update!';
      postList.append(empty);
    } else {
      posts.slice(0, visibleCount).forEach(post => {
        postList.append(renderPostCard(post, user, users));
      });
    }

    loadMoreButton.hidden = posts.length <= visibleCount;
  }

  function savePost(text, authorId = user.id) {
    const posts = get(KEYS.POSTS) || [];
    const post = {
      id: createId('p'),
      authorId,
      text,
      createdAt: new Date().toISOString(),
      likes: [],
      comments: [],
      hidden: false,
      hiddenReason: null
    };
    posts.unshift(post);
    if (!set(KEYS.POSTS, posts)) throw new Error('Unable to save the post.');
    publish({ type: 'post', postId: post.id, actorId: authorId, text });
    publish({ type: 'posts:changed', postId: post.id });
  }

  textarea.addEventListener('input', () => {
    counter.textContent = `${textarea.value.length} / 280`;
    postButton.disabled = textarea.value.trim().length === 0;
  });

  postButton.addEventListener('click', () => {
    const text = textarea.value.trim();
    if (!text) return;
    savePost(text);
    textarea.value = '';
    counter.textContent = '0 / 280';
    postButton.disabled = true;
    status.textContent = 'Post published.';
  });

  loadMoreButton.addEventListener('click', () => {
    visibleCount += 10;
    renderFeed();
  });
  followingOnly.addEventListener('change', () => {
    visibleCount = 10;
    renderFeed();
  });

  subscribe('posts:changed', renderFeed);
  subscribe('post:deleted', renderFeed);
  window.addEventListener('storage', event => {
    if (event.key === KEYS.USERS) {
      users = get(KEYS.USERS) || [];
      renderFeed();
    } else if (event.key === KEYS.POSTS || event.key === KEYS.FOLLOWS) {
      renderFeed();
    }
  });
  renderFeed();

  if ('IntersectionObserver' in window) {
    const sentinel = document.getElementById('feed-sentinel');
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting) && !loadMoreButton.hidden) {
        visibleCount += 10;
        renderFeed();
      }
    });
    observer.observe(sentinel);
  }

  const simulator = createSimulator(user);
  simulatorButton.addEventListener('click', () => {
    if (simulator.isRunning()) {
      simulator.pause();
      simulatorButton.textContent = 'Start simulator';
      simulatorStatus.textContent = 'Simulator paused.';
    } else {
      simulator.start();
      simulatorButton.textContent = 'Pause simulator';
      simulatorStatus.textContent = 'Simulator running. New activity arrives every 3–8 seconds.';
    }
  });
}
