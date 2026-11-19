import { get, KEYS, seedFromFiles } from './storage.js';
import { getCurrentUser, clearSession } from './session.js';
import { subscribe } from './eventBus.js';
import { markNotificationsRead } from './notify.js';

await seedFromFiles();
const currentUser = getCurrentUser();

if (!currentUser) {
  window.location.href = 'index.html';
} else {
  document.getElementById('logout-btn').addEventListener('click', () => {
    clearSession();
    window.location.href = 'index.html';
  });

  const list = document.getElementById('notification-list');
  const allTab = document.getElementById('all-tab');
  const unreadTab = document.getElementById('unread-tab');
  let filter = 'all';

  function getUserNotifications() {
    const saved = get(KEYS.NOTIFICATIONS);
    return (Array.isArray(saved) ? saved : [])
      .filter(notification => notification.recipientId === currentUser.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function setFilter(nextFilter) {
    filter = nextFilter;
    allTab.setAttribute('aria-selected', String(filter === 'all'));
    unreadTab.setAttribute('aria-selected', String(filter === 'unread'));
    allTab.tabIndex = filter === 'all' ? 0 : -1;
    unreadTab.tabIndex = filter === 'unread' ? 0 : -1;
    list.setAttribute('aria-labelledby', filter === 'all' ? 'all-tab' : 'unread-tab');
    render();
  }

  function render() {
    const notifications = getUserNotifications()
      .filter(notification => filter === 'all' || !notification.read);
    list.replaceChildren();

    if (notifications.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = filter === 'unread' ? 'You are all caught up.' : 'No notifications yet.';
      list.append(empty);
      return;
    }

    notifications.forEach(notification => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.className = `notification-row${notification.read ? '' : ' unread'}`;
      link.href = notification.postId
        ? `post.html?id=${encodeURIComponent(notification.postId)}`
        : `profile.html?id=${encodeURIComponent(notification.actorId)}`;
      link.addEventListener('click', event => {
        event.preventDefault();
        markNotificationsRead(get(KEYS.NOTIFICATIONS) || [], current => current.id === notification.id);
        window.location.href = link.href;
      });

      const message = document.createElement('span');
      message.textContent = notification.message;
      const time = document.createElement('time');
      time.className = 'notification-time';
      time.dateTime = notification.createdAt;
      time.textContent = new Date(notification.createdAt).toLocaleString();
      link.append(message, time);
      item.append(link);
      list.append(item);
    });
  }

  allTab.addEventListener('click', () => setFilter('all'));
  unreadTab.addEventListener('click', () => setFilter('unread'));
  [allTab, unreadTab].forEach((tab, index, tabs) => {
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
      tabs[nextIndex].focus();
      tabs[nextIndex].click();
    });
  });
  document.getElementById('mark-all-read').addEventListener('click', () => {
    markNotificationsRead(get(KEYS.NOTIFICATIONS) || []);
    render();
  });

  subscribe('notification:new', render);
  subscribe('notifications:changed', render);
  window.addEventListener('storage', event => {
    if (event.key === KEYS.NOTIFICATIONS) render();
  });
  render();
}
