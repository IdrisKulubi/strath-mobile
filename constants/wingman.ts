// Wingman UX config
// Keep these numbers here so we can tune the experience without touching logic.

// How many results to show immediately ("Top picks")
export const WINGMAN_INITIAL_RESULTS = 8;

// After tapping "Show more", how many to show total
export const WINGMAN_EXPANDED_RESULTS = 15;

// How many results to request from the backend per query.
// Set to at least WINGMAN_EXPANDED_RESULTS so we can expand without another network call.
export const WINGMAN_REQUEST_PAGE_SIZE = 15;

// Hard cap for any requests coming from the client
export const WINGMAN_MAX_REQUEST_PAGE_SIZE = 50;
