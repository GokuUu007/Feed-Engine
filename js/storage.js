export const KEYS = {
    USERS:'fe_users',
    POSTS: 'fe_posts',
    FOLLOWS:'fe_follows',
    NOTIFICATIONS:'fe_notifications',
    SESSION:'fe_session'
}
// KEYS FOR EVERYTHING WE STORE IN LOCALSTORAGE

export function get(key){
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch{
        return null ;
    }
}

export function set(key,value){
    try {
        localStorage.setItem(key,JSON.stringify(value))
        return true;

    }catch (e) {
        console.error('storage write failed ',e)
        return false;
    }
}

export function remove(key) {
    localStorage.removeItem(key)
}

// Load the JSON files into localStorage, but only the first time.
export async function seedFromFiles() {
  if (get(KEYS.USERS)) return;
  const users = await (await fetch('data/users.json')).json();
  const posts = await (await fetch('data/posts.json')).json();
  set(KEYS.USERS, users);
  set(KEYS.POSTS, posts);
  set(KEYS.FOLLOWS, {});
  set(KEYS.NOTIFICATIONS, {});
}

export function resetDemo() {
  localStorage.clear();
  location.reload();
}



