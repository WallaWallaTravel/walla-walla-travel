'use client';

import { useRef, useEffect } from 'react';

interface HeroVideoProps {
  src: string;
  startPercent?: number; // Start at this percentage of the video (0-100)
}

export function HeroVideo({ src, startPercent = 50 }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      // Start at the specified percentage of the video
      const startTime = (video.duration * startPercent) / 100;
      video.currentTime = startTime;
      video.play().catch(() => {
        // Autoplay blocked - that's ok, we'll show the frame
      });
    };

    const handleEnded = () => {
      // Stop at the last frame instead of looping
      video.pause();
      video.currentTime = video.duration - 0.1; // Stay on last frame
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [startPercent]);

  return (
    <video
      ref={videoRef}
      muted
      playsInline
      className="absolute inset-0 w-full h-full object-cover"
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
