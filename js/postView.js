import { get, set, KEYS } from './storage.js';
import { getCurrentUser } from './session.js';
import { publish } from './eventBus.js';

function formatText(text) {
  const fragment = document.createDocumentFragment();
  const tags = /#[\p{L}\p{N}_]+/gu;
  let start = 0;
  let match;

  while ((match = tags.exec(text))) {
    fragment.append(document.createTextNode(text.slice(start, match.index)));
    const tag = document.createElement('span');
    tag.className = 'hashtag';
    tag.textContent = match[0];
    fragment.append(tag);
    start = tags.lastIndex;
  }

  fragment.append(document.createTextNode(text.slice(start)));
  return fragment;
}

function updatePost(postId, update) {
  const posts = get(KEYS.POSTS) || [];
  const index = posts.findIndex(post => post.id === postId);
  if (index === -1) return null;

  posts[index] = update(posts[index]);
  if (!set(KEYS.POSTS, posts)) throw new Error('Unable to save the post.');
  return posts[index];
}

export function renderPostCard(post, currentUser, users) {
  const article = document.createElement('article');
  article.className = 'post-card';
  article.dataset.postId = post.id;

  const author = users.find(user => user.id === post.authorId);
  const header = document.createElement('header');
  header.className = 'post-header';

  const authorLink = document.createElement('a');
  authorLink.className = 'post-author';
  authorLink.href = `profile.html?id=${encodeURIComponent(post.authorId)}`;
  authorLink.textContent = author?.name || 'Unknown trainer';

  const time = document.createElement('time');
  time.className = 'post-time';
  time.dateTime = post.createdAt;
  time.textContent = new Date(post.createdAt).toLocaleString();
  header.append(authorLink, time);

  const content = document.createElement('p');
  content.className = 'post-content';
  content.append(formatText(post.text || ''));

  const actions = document.createElement('div');
  actions.className = 'post-actions';

  const likes = Array.isArray(post.likes) ? post.likes : [];
  const liked = likes.includes(currentUser.id);
  const likeButton = document.createElement('button');
  likeButton.className = `post-action like-action${liked ? ' is-active' : ''}`;
  likeButton.type = 'button';
  likeButton.setAttribute('aria-pressed', String(liked));
  likeButton.setAttribute('aria-label', `${liked ? 'Unlike' : 'Like'} this post`);
  likeButton.textContent = `${liked ? '♥' : '♡'} Like · ${likes.length}`;
  likeButton.addEventListener('click', () => {
    const updated = updatePost(post.id, current => {
      const currentLikes = Array.isArray(current.likes) ? current.likes : [];
      const hasLiked = currentLikes.includes(currentUser.id);
      return {
        ...current,
        likes: hasLiked
          ? currentLikes.filter(userId => userId !== currentUser.id)
          : [...currentLikes, currentUser.id]
      };
    });
    if (!updated) return;

    if (updated.likes.includes(currentUser.id)) {
      publish({ type: 'like', postId: post.id, actorId: currentUser.id });
    }
    publish({ type: 'posts:changed', postId: post.id });
  });

  const comments = Array.isArray(post.comments) ? post.comments : [];
  const commentLink = document.createElement('a');
  commentLink.className = 'post-action';
  commentLink.href = `post.html?id=${encodeURIComponent(post.id)}`;
  commentLink.textContent = `Comments · ${comments.length}`;

  const detailLink = document.createElement('a');
  detailLink.className = 'post-action post-detail-link';
  detailLink.href = commentLink.href;
  detailLink.textContent = 'View post';
  actions.append(likeButton, commentLink, detailLink);

  article.append(header, content, actions);

  if (post.authorId === currentUser.id) {
    const deleteButton = document.createElement('button');
    deleteButton.className = 'post-delete';
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';
    deleteButton.setAttribute('aria-label', 'Delete your post');
    deleteButton.addEventListener('click', () => {
      if (!window.confirm('Delete this post?')) return;
      const currentPosts = get(KEYS.POSTS) || [];
      const target = currentPosts.find(item => item.id === post.id);
      const actor = getCurrentUser();
      if (!target || !actor || target.authorId !== actor.id) {
        throw new Error('You can only delete your own posts.');
      }
      const posts = currentPosts.filter(item => item.id !== post.id);
      if (!set(KEYS.POSTS, posts)) throw new Error('Unable to delete the post.');
      publish({ type: 'post:deleted', postId: post.id });
    });
    header.append(deleteButton);
  }

  return article;
}

export function renderComment(comment, users) {
  const item = document.createElement('li');
  item.className = 'comment-item';

  const author = users.find(user => user.id === comment.authorId);
  const authorLink = document.createElement('a');
  authorLink.href = `profile.html?id=${encodeURIComponent(comment.authorId)}`;
  authorLink.textContent = author?.name || 'Unknown trainer';

  const time = document.createElement('time');
  time.dateTime = comment.createdAt;
  time.textContent = new Date(comment.createdAt).toLocaleString();

  const text = document.createElement('p');
  text.append(formatText(comment.text || ''));
  item.append(authorLink, time, text);
  return item;
}

export function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
