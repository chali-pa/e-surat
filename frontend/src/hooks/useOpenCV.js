/**
 * useOpenCV.js
 *
 * React hook that manages the OpenCV.js WASM loading lifecycle.
 *
 * Returns { cv, loading, error }:
 *   cv      — the initialized OpenCV namespace (null while loading)
 *   loading — true while the WASM module is still downloading / initializing
 *   error   — string message if the load failed, null otherwise
 *
 * Usage:
 *   const { cv, loading, error } = useOpenCV();
 *   if (loading) return <Spinner />;
 *   if (error)   return <ErrorMsg>{error}</ErrorMsg>;
 *   // cv is ready — pass it to pipeline functions
 */

import { useState, useEffect } from 'react';
import { loadOpenCV } from '../utils/opencvLoader';

/**
 * @returns {{ cv: object | null, loading: boolean, error: string | null }}
 */
export function useOpenCV() {
  const [cv, setCv]           = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let mounted = true;

    loadOpenCV()
      .then((resolvedCv) => {
        if (mounted) {
          setCv(resolvedCv);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          console.error('[useOpenCV] Failed to load OpenCV.js:', err);
          setError('Gagal memuat modul pemrosesan gambar (OpenCV). Silakan muat ulang halaman.');
          setLoading(false);
        }
      });

    return () => { mounted = false; };
  }, []); // Only run once — loadOpenCV() is memoized

  return { cv, loading, error };
}
