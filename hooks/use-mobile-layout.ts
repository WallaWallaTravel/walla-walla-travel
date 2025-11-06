'use client';

import { useState, useEffect } from 'react';

export function useDeviceInfo() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const hasTouchScreen =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0;

    setIsTouchDevice(hasTouchScreen);
  }, []);

  return { isTouchDevice };
}
