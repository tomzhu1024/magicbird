import { useRef, useEffect } from 'react';

const useDidMount = (): boolean => {
  const hasMountedRef = useRef<boolean>(false);
  useEffect(() => {
    hasMountedRef.current = true;
  }, []);
  return hasMountedRef.current;
};

export { useDidMount };
