import '@testing-library/jest-dom';

// Mock Date.now to prevent jsdom Event constructor issues
const originalDateNow = Date.now;
Date.now = originalDateNow;
