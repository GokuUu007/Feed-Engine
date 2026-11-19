import { get, set, KEYS, seedFromFiles } from './storage.js';
import { getCurrentUser, clearSession } from './session.js';
import { publish, subscribe } from './eventBus.js';
import { renderPostCard } from './postView.js';
import { createUserAvatar, encodeProfilePicture } from './avatar.js';

await seedFromFiles();
const currentUser = getCurrentUser();

if (!currentUser) {
  window.location.href = 'index.html';
} else {
  document.getElementById('logout-btn').addEventListener('click', () => {
    clearSession();
    window.location.href = 'index.html';
  });

  const profileId = new URLSearchParams(window.location.search).get('id') || currentUser.id;
  const summary = document.getElementById('profile-summary');
  const postsList = document.getElementById('profile-posts');
  const profileStatus = document.getElementById('profile-status');
  let users = get(KEYS.USERS) || [];
  let profileUser = users.find(user => user.id === profileId);

  if (!profileUser) {
    summary.textContent = 'Trainer profile not found.';
    postsList.hidden = true;
  } else {
    function saveProfilePicture(profilePicture) {
      const actor = getCurrentUser();
      if (!actor || actor.id !== profileId) {
        throw new Error('You can only change your own profile picture.');
      }

      const latestUsers = get(KEYS.USERS) || [];
      const index = latestUsers.findIndex(user => user.id === profileId);
      if (index === -1) throw new Error('This trainer profile no longer exists.');
      latestUsers[index] = { ...latestUsers[index], profilePicture };
      if (!set(KEYS.USERS, latestUsers)) {
        throw new Error('Unable to save the profile picture.');
      }
      publish({ type: 'profile:changed', userId: profileId });
    }

    function renderProfile() {
      users = get(KEYS.USERS) || [];
      profileUser = users.find(user => user.id === profileId);
      if (!profileUser) {
        summary.textContent = 'Trainer profile not found.';
        postsList.hidden = true;
        return;
      }

      const follows = get(KEYS.FOLLOWS) || {};
      const following = Array.isArray(follows[currentUser.id]) ? follows[currentUser.id] : [];
      const profileFollowing = Array.isArray(follows[profileUser.id]) ? follows[profileUser.id] : [];
      const followersCount = Object.values(follows)
        .filter(ids => Array.isArray(ids) && ids.includes(profileUser.id))
        .length;
      const isFollowing = following.includes(profileUser.id);

      summary.replaceChildren();
      const information = document.createElement('div');
      const heading = document.createElement('h1');
      heading.className = 'h3';
      heading.textContent = profileUser.name;
      const role = document.createElement('p');
      role.className = 'text-secondary mb-1';
      role.textContent = profileUser.role;
      const bio = document.createElement('p');
      bio.className = 'profile-bio mb-3';
      bio.textContent = profileUser.bio || 'No bio yet.';
      const stats = document.createElement('div');
      stats.className = 'profile-stats';
      const followers = document.createElement('span');
      const followerCount = document.createElement('strong');
      followerCount.textContent = String(followersCount);
      followers.append(followerCount, ' followers');
      const followingCount = document.createElement('span');
      const followingCountValue = document.createElement('strong');
      followingCountValue.textContent = String(profileFollowing.length);
      followingCount.append(followingCountValue, ' following');
      stats.append(followers, followingCount);
      information.className = 'profile-information';
      information.append(heading, role, bio, stats);

      const controls = document.createElement('div');
      controls.className = 'profile-controls';
      if (profileUser.id !== currentUser.id) {
        const followButton = document.createElement('button');
        followButton.className = 'btn btn-accent';
        followButton.type = 'button';
        followButton.textContent = isFollowing ? 'Unfollow' : 'Follow';
        followButton.setAttribute('aria-pressed', String(isFollowing));
        followButton.addEventListener('click', () => {
          const updated = get(KEYS.FOLLOWS) || {};
          const ids = Array.isArray(updated[currentUser.id]) ? updated[currentUser.id] : [];
          if (ids.includes(profileUser.id)) {
            updated[currentUser.id] = ids.filter(id => id !== profileUser.id);
          } else {
            updated[currentUser.id] = [...ids, profileUser.id];
          }
          if (!set(KEYS.FOLLOWS, updated)) throw new Error('Unable to update follows.');
          if (updated[currentUser.id].includes(profileUser.id)) {
            publish({ type: 'follow', actorId: currentUser.id, targetId: profileUser.id });
          }
          publish({ type: 'follows:changed', actorId: currentUser.id, targetId: profileUser.id });
          renderProfile();
        });
        controls.append(followButton);
      } else {
        const pictureHelp = document.createElement('span');
        pictureHelp.className = 'text-secondary small';
        pictureHelp.textContent = 'JPEG, PNG, or WebP up to 5 MB. Saved in this browser.';
        controls.append(pictureHelp);

        const uploadLabel = document.createElement('label');
        uploadLabel.className = 'btn btn-sm btn-outline-secondary profile-picture-upload';
        uploadLabel.append(document.createTextNode(
          profileUser.profilePicture ? 'Change picture' : 'Add picture'
        ));

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/jpeg,image/png,image/webp';
        fileInput.className = 'visually-hidden';
        fileInput.setAttribute('aria-label', 'Choose a profile picture');
        fileInput.addEventListener('change', async () => {
          const file = fileInput.files?.[0];
          if (!file) return;
          try {
            saveProfilePicture(await encodeProfilePicture(file));
            profileStatus.textContent = 'Profile picture saved.';
          } catch (error) {
            profileStatus.textContent = error.message;
          } finally {
            fileInput.value = '';
          }
        });
        uploadLabel.append(fileInput);
        controls.append(uploadLabel);

        if (profileUser.profilePicture) {
          const removePictureButton = document.createElement('button');
          removePictureButton.className = 'btn btn-sm btn-outline-secondary';
          removePictureButton.type = 'button';
          removePictureButton.textContent = 'Remove picture';
          removePictureButton.addEventListener('click', () => {
            try {
              saveProfilePicture(null);
              profileStatus.textContent = 'Profile picture removed.';
            } catch (error) {
              profileStatus.textContent = error.message;
            }
          });
          controls.append(removePictureButton);
        }
      }
      summary.append(
        createUserAvatar(profileUser, { className: 'user-avatar-profile' }),
        information,
        controls
      );

      const profilePosts = (get(KEYS.POSTS) || [])
        .filter(post => post.authorId === profileUser.id && !post.hidden)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      postsList.replaceChildren();
      if (profilePosts.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'empty-state';
        empty.textContent = 'No posts yet.';
        postsList.append(empty);
      } else {
        profilePosts.forEach(post => postsList.append(renderPostCard(post, currentUser, users)));
      }
    }

    subscribe('posts:changed', renderProfile);
    subscribe('post:deleted', renderProfile);
    subscribe('follows:changed', renderProfile);
    subscribe('profile:changed', event => {
      if (event.userId === profileId) renderProfile();
    });
    window.addEventListener('storage', event => {
      if ([KEYS.POSTS, KEYS.FOLLOWS, KEYS.USERS].includes(event.key)) renderProfile();
    });
    renderProfile();
  }
}
