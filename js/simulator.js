import { get, set, KEYS } from './storage.js';
import { publish } from './eventBus.js';
import { createId } from './postView.js';

const samplePosts = [
  'Training for the campus event today! #campus',
  'Just wrapped up a fun study session. #community',
  'Who is joining the next club meetup?'
];

export function createSimulator(currentUser) {
  let timer = null;
  let running = false;

  function getActors() {
    return (get(KEYS.USERS) || []).filter(user => user.id !== currentUser.id);
  }

  function createPost(actor) {
    const baseText = samplePosts[Math.floor(Math.random() * samplePosts.length)];
    const mention = Math.random() < 0.4 ? ` @${currentUser.name.replace(/\s+/g, '')}` : '';
    const text = `${baseText}${mention}`;
    const posts = get(KEYS.POSTS) || [];
    const post = {
      id: createId('p'),
      authorId: actor.id,
      text,
      createdAt: new Date().toISOString(),
      likes: [],
      comments: [],
      hidden: false,
      hiddenReason: null
    };
    posts.unshift(post);
    if (!set(KEYS.POSTS, posts)) throw new Error('Unable to save a simulated post.');
    publish({ type: 'post', postId: post.id, actorId: actor.id, text });
    publish({ type: 'posts:changed', postId: post.id });
  }

  function createLike(actor, posts) {
    const candidates = posts.filter(post => !(post.likes || []).includes(actor.id));
    if (!candidates.length) return false;
    const post = candidates[Math.floor(Math.random() * candidates.length)];
    post.likes = [...(post.likes || []), actor.id];
    if (!set(KEYS.POSTS, posts)) throw new Error('Unable to save a simulated like.');
    publish({ type: 'like', postId: post.id, actorId: actor.id });
    publish({ type: 'posts:changed', postId: post.id });
    return true;
  }

  function createComment(actor, posts) {
    if (!posts.length) return false;
    const post = posts[Math.floor(Math.random() * posts.length)];
    const comment = {
      id: createId('c'),
      authorId: actor.id,
      text: `Nice work${Math.random() < 0.5 ? `, @${currentUser.name.replace(/\s+/g, '')}` : ''}!`,
      createdAt: new Date().toISOString()
    };
    post.comments = [...(post.comments || []), comment];
    if (!set(KEYS.POSTS, posts)) throw new Error('Unable to save a simulated comment.');
    publish({ type: 'comment', postId: post.id, commentId: comment.id, actorId: actor.id, text: comment.text });
    publish({ type: 'posts:changed', postId: post.id });
    return true;
  }

  function createFollow(actor) {
    const follows = get(KEYS.FOLLOWS) || {};
    const following = Array.isArray(follows[actor.id]) ? follows[actor.id] : [];
    if (following.includes(currentUser.id)) return false;
    follows[actor.id] = [...following, currentUser.id];
    if (!set(KEYS.FOLLOWS, follows)) throw new Error('Unable to save a simulated follow.');
    publish({ type: 'follow', actorId: actor.id, targetId: currentUser.id });
    publish({ type: 'follows:changed', actorId: actor.id, targetId: currentUser.id });
    return true;
  }

  function performAction() {
    const actors = getActors();
    if (!actors.length) return;
    const actor = actors[Math.floor(Math.random() * actors.length)];
    const posts = (get(KEYS.POSTS) || []).filter(post => !post.hidden);
    const actions = ['post', 'like', 'comment', 'follow'];
    const action = actions[Math.floor(Math.random() * actions.length)];

    if (action === 'post') createPost(actor);
    else if (action === 'like' && !createLike(actor, posts)) createPost(actor);
    else if (action === 'comment' && !createComment(actor, posts)) createPost(actor);
    else if (action === 'follow' && !createFollow(actor)) createComment(actor, posts);
  }

  function schedule() {
    if (!running) return;
    timer = window.setTimeout(() => {
      performAction();
      schedule();
    }, 3000 + Math.floor(Math.random() * 5000));
  }

  return {
    start() {
      if (running) return;
      running = true;
      schedule();
    },
    pause() {
      running = false;
      window.clearTimeout(timer);
    },
    isRunning() {
      return running;
    }
  };
}
