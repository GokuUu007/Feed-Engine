import { get, KEYS, seedFromFiles } from './storage.js';
import { getCurrentUser } from './session.js';

await seedFromFiles();
const currentUser = getCurrentUser();
const main = document.querySelector('.app-main');

if (currentUser && main) {
  const users = get(KEYS.USERS) || [];
  const links = [
    { href: 'feed.html', label: 'Feed', icon: '🏠' },
    { href: `profile.html?id=${encodeURIComponent(currentUser.id)}`, label: 'Profile', icon: '👤' },
    { href: 'notifications.html', label: 'Notifications', icon: '🔔' }
  ];
  if (currentUser.role === 'moderator') {
    links.push({ href: 'moderation.html', label: 'Moderation', icon: '🛡️' });
  }
  const activePage = window.location.pathname.split('/').pop();

  function makeLink(link, className) {
    const anchor = document.createElement('a');
    anchor.className = className;
    anchor.href = link.href;
    if (link.href.split('?')[0] === activePage) {
      anchor.setAttribute('aria-current', 'page');
    }
    const icon = document.createElement('span');
    icon.className = 'layout-link-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = link.icon;
    const label = document.createElement('span');
    label.textContent = link.label;
    anchor.append(icon, label);
    return anchor;
  }

  const grid = document.createElement('div');
  grid.className = 'app-grid';

  const sidebar = document.createElement('aside');
  sidebar.className = 'app-sidebar';
  const sidebarNavigation = document.createElement('nav');
  sidebarNavigation.className = 'sidebar-navigation';
  sidebarNavigation.setAttribute('aria-label', 'Main navigation');
  links.forEach(link => sidebarNavigation.append(makeLink(link, 'sidebar-link')));
  sidebar.append(sidebarNavigation);

  const rail = document.createElement('aside');
  rail.className = 'app-rail';
  const currentTrainerCard = document.createElement('section');
  currentTrainerCard.className = 'rail-card';
  const currentHeading = document.createElement('h2');
  currentHeading.textContent = 'Your trainer';
  const currentName = document.createElement('p');
  currentName.className = 'rail-trainer-name';
  currentName.textContent = currentUser.name;
  const currentRole = document.createElement('p');
  currentRole.className = 'text-secondary mb-0';
  currentRole.textContent = currentUser.role;
  currentTrainerCard.append(currentHeading, currentName, currentRole);

  const trainersCard = document.createElement('section');
  trainersCard.className = 'rail-card';
  const trainersHeading = document.createElement('h2');
  trainersHeading.textContent = 'Community trainers';
  const trainersList = document.createElement('ul');
  trainersList.className = 'rail-trainers';
  users
    .filter(user => user.id !== currentUser.id)
    .forEach(user => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `profile.html?id=${encodeURIComponent(user.id)}`;
      link.textContent = user.name;
      item.append(link);
      trainersList.append(item);
    });
  trainersCard.append(trainersHeading, trainersList);
  rail.append(currentTrainerCard, trainersCard);

  main.parentNode.insertBefore(grid, main);
  grid.append(sidebar, main, rail);

  const bottomNavigation = document.createElement('nav');
  bottomNavigation.className = 'bottom-tabbar';
  bottomNavigation.setAttribute('aria-label', 'Main navigation');
  links.forEach(link => bottomNavigation.append(makeLink(link, 'bottom-tab')));
  document.body.append(bottomNavigation);
}
