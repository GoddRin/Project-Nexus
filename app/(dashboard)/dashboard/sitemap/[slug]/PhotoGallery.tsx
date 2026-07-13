"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface SitePhoto {
  id: string;
  storagePath: string;
  caption: string | null;
  createdAt: Date;
  takenAt: Date | null;
}

interface PhotoGalleryProps {
  photos: SitePhoto[];
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [scale, setScale] = useState(1);

  const resetZoom = useCallback(() => {
    setScale(1);
  }, []);

  const zoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((s) => Math.min(s + 0.25, 3));
  };

  const zoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((s) => Math.max(s - 0.25, 1));
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2);
    }
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    if (e.deltaY < 0) {
      setScale((s) => Math.min(s + 0.15, 3));
    } else {
      setScale((s) => Math.max(s - 0.15, 1));
    }
  }, []);

  useEffect(() => {
    if (activeIdx === null) return;

    // Prevent body scroll when lightbox is open
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveIdx(null);
      } else if (e.key === "ArrowLeft") {
        setActiveIdx((prev) => (prev !== null ? (prev === 0 ? photos.length - 1 : prev - 1) : null));
        resetZoom();
      } else if (e.key === "ArrowRight") {
        setActiveIdx((prev) => (prev !== null ? (prev === photos.length - 1 ? 0 : prev + 1) : null));
        resetZoom();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIdx, photos.length, resetZoom]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIdx((prev) => (prev !== null ? (prev === 0 ? photos.length - 1 : prev - 1) : null));
    resetZoom();
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIdx((prev) => (prev !== null ? (prev === photos.length - 1 ? 0 : prev + 1) : null));
    resetZoom();
  };

  const activePhoto = activeIdx !== null ? photos[activeIdx] : null;

  return (
    <div className="p-6 rounded-2xl bg-bg-panel border border-white/5 shadow-lg min-h-[300px]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
          <Camera className="h-4 w-4" /> Site Photos
        </h3>
      </div>

      {photos.length === 0 ? (
        <div className="h-48 w-full rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-text-muted space-y-2">
          <Camera className="h-8 w-8 opacity-20" />
          <p className="text-sm">No photos uploaded for this zone.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              onClick={() => setActiveIdx(idx)}
              className="group relative aspect-square rounded-xl overflow-hidden bg-black cursor-pointer border border-white/5 hover:border-white/20 transition-all shadow-md"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.storagePath}
                alt={photo.caption || "Site photo"}
                className="object-cover w-full h-full opacity-85 group-hover:opacity-100 group-hover:scale-102 transition-all duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-3.5">
                <div className="w-full">
                  <p className="text-xs text-white font-medium line-clamp-2">{photo.caption}</p>
                  <p className="text-[10px] text-white/50 mt-1">
                    {photo.takenAt ? new Date(photo.takenAt).toLocaleDateString() : new Date(photo.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      <AnimatePresence>
        {activePhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveIdx(null)}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-6"
          >
            {/* Top Toolbar */}
            <div className="w-full max-w-6xl flex justify-between items-center text-white/70 z-20">
              <span className="text-xs font-mono font-semibold tracking-wider">
                PHOTO {activeIdx! + 1} OF {photos.length}
              </span>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2 py-1">
                <button
                  onClick={zoomOut}
                  disabled={scale === 1}
                  className="p-1.5 rounded-full hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-xs px-2 font-mono font-bold w-12 text-center select-none text-white">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={zoomIn}
                  disabled={scale === 3}
                  className="p-1.5 rounded-full hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                {scale > 1 && (
                  <button
                    onClick={() => resetZoom()}
                    className="p-1.5 rounded-full hover:bg-white/10 hover:text-white transition-colors ml-1 border-l border-white/10 pl-2 rounded-l-none"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setActiveIdx(null);
                  resetZoom();
                }}
                className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-colors"
                title="Close (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Main Interactive Stage */}
            <div className="relative w-full max-w-5xl flex-1 flex items-center justify-center py-4 overflow-hidden">
              {/* Left Arrow */}
              {scale === 1 && (
                <button
                  onClick={handlePrev}
                  className="absolute left-0 p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-colors z-10"
                  title="Previous (Left Arrow)"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}

              {/* Central Image with scale transition */}
              <motion.img
                key={activePhoto.id}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={scale === 1 ? { scale: 1, opacity: 1, x: 0, y: 0 } : { scale: scale, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
                drag={scale > 1}
                dragConstraints={{ left: -400, right: 400, top: -300, bottom: 300 }}
                dragElastic={0.15}
                onDoubleClick={handleDoubleClick}
                onClick={(e) => e.stopPropagation()}
                onWheel={handleWheel}
                src={activePhoto.storagePath}
                alt={activePhoto.caption || "Site photo"}
                className={`max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl select-none transition-shadow ${
                  scale > 1 ? "cursor-grab active:cursor-grabbing" : ""
                }`}
              />

              {/* Right Arrow */}
              {scale === 1 && (
                <button
                  onClick={handleNext}
                  className="absolute right-0 p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-colors z-10"
                  title="Next (Right Arrow)"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}
            </div>

            {/* Bottom Details panel */}
            {activePhoto.caption && (
              <div className="w-full max-w-3xl text-center bg-white/[0.02] border border-white/5 px-6 py-4 rounded-2xl">
                <p className="text-white text-sm font-medium leading-relaxed">{activePhoto.caption}</p>
                <p className="text-[10px] text-white/40 mt-1.5 uppercase tracking-wider font-semibold">
                  Captured: {activePhoto.takenAt ? new Date(activePhoto.takenAt).toLocaleDateString() : new Date(activePhoto.createdAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
