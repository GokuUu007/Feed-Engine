# FeedEngine

A browser-based campus community feed. The demo stores users, posts, follows, and notifications in `localStorage`.

## Run locally

Serve this directory over HTTP (for example, with VS Code Live Server or `python3 -m http.server 8000`) and open `index.html`. The app uses JavaScript modules, so opening the files directly with `file://` will not work.

## Features

- Choose a demo trainer and publish text posts with highlighted hashtags.
- Like posts, comment on post detail pages, and delete your own posts.
- Open trainer profiles, follow or unfollow trainers, and filter the feed to followed trainers.
- Receive notifications for likes, comments, follows, and `@Name` mentions. For names with spaces, mention the name without spaces (for example, `@AshKetchum`).
- Browse all or unread notifications, mark them read, and open the related post or profile.
- Start the activity simulator from the feed; it generates posts, likes, comments, and follows every 3–8 seconds until paused.
- Moderators can hide posts with a reason and restore them from the moderation page; hide/unhide and delete actions validate ownership or role in code.
- Authenticated pages use a three-column desktop shell and a single-column mobile layout with bottom navigation.
- Switch between dark and light themes; the selection is saved across pages.

Use **Reset demo data** on the login page to clear saved browser data and reload the demo. You can also run `localStorage.clear()` in the browser developer console.

## Deploy

The GitHub Actions workflow in `.github/workflows/pages.yml` publishes the static app to GitHub Pages on pushes to `main` and on manual workflow dispatch.
