'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';

interface MediaItem {
  type: 'video' | 'image';
  src: string;
  startPercent?: number; // For videos: start at this percentage (0-100)
}

// Define your media rotation here
const mediaItems: MediaItem[] = [
  { type: 'video', src: '/videos/walla-walla-hero.mp4', startPercent: 60 },
  { type: 'image', src: '/images/IMG_0267.jpg' },
  { type: 'image', src: '/images/IMG_8386.jpg' },
  { type: 'image', src: '/images/IMG_8831.jpg' },
  { type: 'image', src: '/images/IMG_9515.jpg' },
  { type: 'image', src: '/images/IMG_9540.jpg' },
  { type: 'image', src: '/images/IMG_9650.jpg' },
  { type: 'image', src: '/images/IMG_9762.jpg' },
  { type: 'image', src: '/images/IMG_9836.jpg' },
  { type: 'image', src: '/images/IMG_9907.jpg' },
];

const IMAGE_DISPLAY_DURATION = 5000; // 5 seconds per image

export function HeroMedia() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentItem = mediaItems[currentIndex];

  const goToNext = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % mediaItems.length);
      setIsTransitioning(false);
    }, 500); // Fade transition duration
  }, []);

  // Handle video playback
  useEffect(() => {
    if (currentItem.type !== 'video') return;

    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      if (currentItem.startPercent) {
        const startTime = (video.duration * currentItem.startPercent) / 100;
        video.currentTime = startTime;
      }
      video.play().catch(() => {
        // Autoplay blocked - move to next after delay
        timerRef.current = setTimeout(goToNext, IMAGE_DISPLAY_DURATION);
      });
    };

    const handleEnded = () => {
      goToNext();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [currentIndex, currentItem, goToNext]);

  // Handle image display timing
  useEffect(() => {
    if (currentItem.type !== 'image') return;

    timerRef.current = setTimeout(goToNext, IMAGE_DISPLAY_DURATION);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentIndex, currentItem.type, goToNext]);

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* Current Media */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {currentItem.type === 'video' ? (
          <video
            ref={videoRef}
            key={currentItem.src}
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source
              src={currentItem.src}
              type={currentItem.src.endsWith('.mov') ? 'video/quicktime' : 'video/mp4'}
            />
          </video>
        ) : (
          <Image
            key={currentItem.src}
            src={currentItem.src}
            alt="Walla Walla Wine Country"
            fill
            className="object-cover"
            priority={currentIndex === 0}
            unoptimized
          />
        )}
      </div>

      {/* Progress indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {mediaItems.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              if (timerRef.current) clearTimeout(timerRef.current);
              setCurrentIndex(index);
            }}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex
                ? 'bg-white w-6'
                : 'bg-white/50 hover:bg-white/70'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
