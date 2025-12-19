"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mediaApi } from "@/lib/api";

interface Photo {
  id: number;
  url: string;
  order: number;
}

interface StoriesViewerProps {
  photos: Photo[];
  initialIndex?: number;
  onClose: () => void;
  autoplayDuration?: number;
}

export function StoriesViewer({
  photos,
  initialIndex = 0,
  onClose,
  autoplayDuration = 4000,
}: StoriesViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [direction, setDirection] = useState(0);

  const goToNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, photos.length, onClose]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  // Auto-advance with progress
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          goToNext();
          return 0;
        }
        return prev + (100 / (autoplayDuration / 50));
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPaused, goToNext, autoplayDuration]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "Escape") onClose();
      if (e.key === " ") {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrev, goToNext, onClose]);

  const handleDragEnd = (e: any, info: PanInfo) => {
    const threshold = 50;
    
    if (info.offset.x > threshold) {
      goToPrev();
    } else if (info.offset.x < -threshold) {
      goToNext();
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
    }),
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-4">
        {photos.map((_, index) => (
          <div
            key={index}
            className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width:
                  index < currentIndex
                    ? "100%"
                    : index === currentIndex
                    ? `${progress}%`
                    : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Navigation buttons */}
      {currentIndex > 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
          onClick={goToPrev}
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>
      )}
      
      {currentIndex < photos.length - 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
          onClick={goToNext}
        >
          <ChevronRight className="w-8 h-8" />
        </Button>
      )}

      {/* Photo container */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          
          if (x < rect.width / 3) {
            goToPrev();
          } else if (x > (rect.width * 2) / 3) {
            goToNext();
          } else {
            setIsPaused((prev) => !prev);
          }
        }}
      >
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={handleDragEnd}
            className="absolute max-w-full max-h-full"
          >
            <img
              src={photos[currentIndex].url.startsWith('http') ? photos[currentIndex].url : mediaApi.getUrl(photos[currentIndex].url)}
              alt=""
              className="max-w-full max-h-screen object-contain select-none"
              draggable={false}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
        {currentIndex + 1} / {photos.length}
      </div>

      {/* Pause indicator */}
      {isPaused && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="text-white text-6xl opacity-50">⏸</div>
        </div>
      )}
    </div>
  );
}

