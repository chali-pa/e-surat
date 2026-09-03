/**
 * opencvLoader.js
 *
 * Singleton lazy loader for OpenCV.js (WASM build via @techstark/opencv-js).
 *
 * - The WASM binary is ~7–8 MB; we load it only on demand (when the scan
 *   feature is opened) rather than on initial app load.
 * - A module-level promise ensures the heavy import + WASM init runs at most
 *   once per browser session, no matter how many components call loadOpenCV().
 * - Callers receive the fully-initialized `cv` object and can immediately
 *   call cv.Mat, cv.cvtColor, etc.
 *
 * Usage:
 *   import { loadOpenCV } from '../utils/opencvLoader';
 *   const cv = await loadOpenCV();
 */

/** @type {Promise<object> | null} */
let _promise = null;

/**
 * Returns a promise that resolves with the initialized OpenCV.js `cv` object.
 * Safe to call multiple times — always returns the same in-flight or resolved promise.
 *
 * @returns {Promise<object>} Resolves with `cv` (the global OpenCV namespace).
 */
export function loadOpenCV() {
  if (_promise) return _promise;

  _promise = new Promise((resolve, reject) => {
    import('@techstark/opencv-js')
      .then((module) => {
        // @techstark/opencv-js exports the cv object as the default export.
        // The WASM module may need to finish initializing asynchronously.
        const cv = module.default ?? module;

        if (typeof cv === 'object' && cv !== null && typeof cv.Mat === 'function') {
          // Already initialized (e.g. synchronous build or already resolved)
          resolve(cv);
          return;
        }

        // WASM still initializing — hook the Emscripten callback.
        // @techstark/opencv-js exposes this via cv.onRuntimeInitialized.
        if (cv && typeof cv.then === 'function') {
          // Some builds return a promise directly
          cv.then((resolvedCv) => resolve(resolvedCv)).catch(reject);
          return;
        }

        // Standard Emscripten pattern: set the callback before init fires.
        if (cv) {
          cv.onRuntimeInitialized = () => resolve(cv);
          return;
        }

        reject(new Error('OpenCV.js: unexpected module shape from @techstark/opencv-js'));
      })
      .catch((err) => {
        // Reset so callers can retry after a network failure
        _promise = null;
        reject(err);
      });
  });

  return _promise;
}

/**
 * Synchronously returns the already-resolved `cv` object, or null if
 * OpenCV has not finished loading yet. Useful for guards in non-async contexts.
 *
 * @returns {object | null}
 */
export function getOpenCVSync() {
  // We expose this by attaching the resolved value once the promise settles.
  // The value is stored on the function itself as a simple cache.
  return getOpenCVSync._cv ?? null;
}

// Attach resolved value to the synchronous getter as a side effect.
loadOpenCV()
  .then((cv) => { getOpenCVSync._cv = cv; })
  .catch(() => {});
