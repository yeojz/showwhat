// Polyfills for radix-ui components in jsdom
// These methods are used by radix-ui but not available in jsdom

if (typeof Element.prototype.hasPointerCapture !== "function") {
  Element.prototype.hasPointerCapture = function () {
    return false;
  };
}

if (typeof Element.prototype.setPointerCapture !== "function") {
  Element.prototype.setPointerCapture = function () {};
}

if (typeof Element.prototype.releasePointerCapture !== "function") {
  Element.prototype.releasePointerCapture = function () {};
}

if (typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = function () {};
}

// ResizeObserver polyfill for radix-ui scroll-area
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
}
