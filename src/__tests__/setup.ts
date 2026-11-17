// jsdom has no scrolling implementation; real scroll behavior is checked in Chrome.
if (typeof window !== 'undefined') window.scrollTo = () => {}
