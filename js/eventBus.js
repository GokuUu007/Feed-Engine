const handlers={}
// store the list of lintener functions for each event type

// Register a function to run whenever an event of this type is published.
export function subscribe(type, handler) {
  if (!handlers[type]) handlers[type] = [];
  handlers[type].push(handler);
  return () => {
    handlers[type] = handlers[type].filter(registered => registered !== handler);
  };
}

// Run every function registered for this event's type.
export function publish(event) {
  const list = handlers[event.type] || [];
  list.forEach(handler => handler(event));
}