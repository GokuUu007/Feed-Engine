import { get, KEYS, seedFromFiles, set } from './storage.js';
import { getCurrentUser } from './session.js';
import { publish, subscribe } from './eventBus.js';
import { startFanout } from './fanout.js';

await seedFromFiles();
startFanout();

const user = getCurrentUser();
if (user) {
  const actions = document.querySelector('.navbar-actions');
  const toastRegion = document.createElement('div');
  toastRegion.className = 'toast-region';
  toastRegion.setAttribute('aria-live', 'polite');
  toastRegion.setAttribute('aria-label', 'New notifications');
  document.body.append(toastRegion);

  let bell;
  if (actions) {
    bell = document.createElement('a');
    bell.className = 'notification-bell';
    bell.href = 'notifications.html';
    bell.setAttribute('aria-label', 'Notifications');
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '🔔';
    const badge = document.createElement('span');
    badge.className = 'notification-badge';
    badge.hidden = true;
    bell.append(icon, badge);
    actions.prepend(bell);
  }

  let toastItems = [];
  const knownIds = new Set(
    (Array.isArray(get(KEYS.NOTIFICATIONS)) ? get(KEYS.NOTIFICATIONS) : [])
      .filter(notification => notification.recipientId === user.id)
      .map(notification => notification.id)
  );

  function getNotifications() {
    const saved = get(KEYS.NOTIFICATIONS);
    return Array.isArray(saved) ? saved : [];
  }

  function notificationTarget(notification) {
    return notification.postId
      ? `post.html?id=${encodeURIComponent(notification.postId)}`
      : `profile.html?id=${encodeURIComponent(notification.actorId)}`;
  }

  function renderBadge() {
    if (!bell) return;
    const unread = getNotifications().filter(notification =>
      notification.recipientId === user.id && !notification.read
    ).length;
    const badge = bell.querySelector('.notification-badge');
    badge.hidden = unread === 0;
    badge.textContent = unread > 99 ? '99+' : String(unread);
    bell.setAttribute('aria-label', unread ? `Notifications, ${unread} unread` : 'Notifications');
  }

  function renderToasts() {
    const active = toastItems.filter(item => item.expiresAt > Date.now());
    toastItems = active;
    toastRegion.replaceChildren();

    const isOverflowing = active.length > 3;
    const visible = isOverflowing ? active.slice(0, 2) : active.slice(0, 3);
    visible.forEach(item => {
      const link = document.createElement('a');
      link.className = 'toast-card';
      link.href = notificationTarget(item.notification);
      link.textContent = item.notification.message;
      toastRegion.append(link);
    });

    if (isOverflowing) {
      const overflow = document.createElement('a');
      overflow.className = 'toast-card toast-overflow';
      overflow.href = 'notifications.html';
      overflow.textContent = `+${active.length - 2} more`;
      toastRegion.append(overflow);
    }
  }

  function addToast(notification) {
    toastItems.push({ notification, expiresAt: Date.now() + 6000 });
    renderToasts();
    window.setTimeout(renderToasts, 6100);
  }

  function handleNewNotification(notification) {
    if (notification.recipientId !== user.id) return;
    knownIds.add(notification.id);
    renderBadge();
    addToast(notification);
  }

  renderBadge();
  subscribe('notification:new', event => handleNewNotification(event.notification));
  subscribe('notifications:changed', renderBadge);

  window.addEventListener('storage', event => {
    if (event.key !== KEYS.NOTIFICATIONS) return;
    let updated = [];
    try {
      updated = JSON.parse(event.newValue || '[]');
    } catch (error) {
      console.error('Unable to read updated notifications.', error);
      return;
    }
    if (!Array.isArray(updated)) return;
    updated
      .filter(notification => notification.recipientId === user.id && !knownIds.has(notification.id))
      .forEach(handleNewNotification);
    renderBadge();
  });
}

export function markNotificationsRead(notifications, predicate = () => true) {
  let changed = false;
  const saved = Array.isArray(notifications) ? notifications : [];
  const updated = saved.map(notification => {
    if (notification.recipientId === user.id && !notification.read && predicate(notification)) {
      changed = true;
      return { ...notification, read: true };
    }
    return notification;
  });
  if (changed && !set(KEYS.NOTIFICATIONS, updated)) {
    throw new Error('Unable to update notifications.');
  }
  if (changed) publish({ type: 'notifications:changed' });
  return updated;
}
