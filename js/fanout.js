import { get, set, KEYS } from './storage.js';
import { publish, subscribe } from './eventBus.js';

let started = false;

function addNotification({ recipientId, actorId, type, postId = null, commentId = null }) {
  if (!recipientId || !actorId || recipientId === actorId) return;

  const users = get(KEYS.USERS) || [];
  const actor = users.find(user => user.id === actorId);
  const labels = {
    like: 'liked your post',
    comment: 'commented on your post',
    follow: 'started following you',
    mention: 'mentioned you'
  };
  const notification = {
    id: `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    recipientId,
    actorId,
    type,
    postId,
    commentId,
    message: `${actor?.name || 'A trainer'} ${labels[type] || 'interacted with you'}`,
    createdAt: new Date().toISOString(),
    read: false
  };
  const saved = get(KEYS.NOTIFICATIONS);
  const notifications = Array.isArray(saved) ? saved : [];
  notifications.unshift(notification);
  if (!set(KEYS.NOTIFICATIONS, notifications)) {
    throw new Error('Unable to save the notification.');
  }
  publish({ type: 'notification:new', notification });
}

function notifyMentions(event) {
  const text = event.text || '';
  const users = get(KEYS.USERS) || [];
  const mentioned = new Set(
    [...text.matchAll(/@([\p{L}\p{N}_]+)/gu)].map(match =>
      match[1].replace(/[_\s]/g, '').toLocaleLowerCase()
    )
  );

  users.forEach(user => {
    const normalizedName = user.name.replace(/[\s_]/g, '').toLocaleLowerCase();
    const normalizedId = user.id.replace(/[\s_]/g, '').toLocaleLowerCase();
    if (mentioned.has(normalizedName) || mentioned.has(normalizedId)) {
      publish({
        type: 'mention',
        recipientId: user.id,
        actorId: event.actorId,
        postId: event.postId,
        commentId: event.commentId
      });
    }
  });
}

export function startFanout() {
  if (started) return;
  started = true;

  subscribe('like', event => {
    const post = (get(KEYS.POSTS) || []).find(item => item.id === event.postId);
    if (post) addNotification({ recipientId: post.authorId, actorId: event.actorId, type: 'like', postId: post.id });
  });

  subscribe('comment', event => {
    const post = (get(KEYS.POSTS) || []).find(item => item.id === event.postId);
    if (post) addNotification({ recipientId: post.authorId, actorId: event.actorId, type: 'comment', postId: post.id, commentId: event.commentId });
    notifyMentions(event);
  });

  subscribe('follow', event => {
    addNotification({ recipientId: event.targetId, actorId: event.actorId, type: 'follow' });
  });

  subscribe('post', notifyMentions);
  subscribe('mention', event => {
    addNotification({
      recipientId: event.recipientId,
      actorId: event.actorId,
      type: 'mention',
      postId: event.postId,
      commentId: event.commentId
    });
  });
}
