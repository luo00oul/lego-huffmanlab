import {useCallback, useEffect, useState} from 'react';
import type {PageRoute} from '../types/algorithm';

const VALID_ROUTES: readonly PageRoute[] = [
  'workshop',
  'lab',
  'tree',
  'challenge',
  'strategy',
  'benchmark',
  'docs',
];

function readHashRoute(): PageRoute {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  if ((VALID_ROUTES as readonly string[]).includes(raw)) {
    return raw as PageRoute;
  }
  return 'workshop';
}

/**
 * Hash-based router guaranteeing zero 404 errors on GitHub Pages refresh.
 */
export function useHashRoute(): [PageRoute, (route: PageRoute) => void] {
  const [route, setRoute] = useState<PageRoute>(() => readHashRoute());

  useEffect(() => {
    const onHashChange = () => {
      setRoute(readHashRoute());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((next: PageRoute) => {
    const targetHash = `#/${next}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    setRoute(next);
    window.scrollTo({top: 0, behavior: 'smooth'});
  }, []);

  return [route, navigate];
}
