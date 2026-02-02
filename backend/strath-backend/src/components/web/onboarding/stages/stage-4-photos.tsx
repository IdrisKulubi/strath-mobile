"use client";

import { OnboardingData } from "./index";

interface PhotoState {
  previewUrl: string;
  finalUrl: string | null;
  isUploading: boolean;
  uploadFailed: boolean;
}

interface Stage4Props {
  data: OnboardingData;
  photoStates: PhotoState[];
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (index: number) => void;
  hasUploadingPhotos: boolean;
}

export function Stage4Photos({ 
  photoStates, 
  onPhotoUpload, 
  onRemovePhoto,
  hasUploadingPhotos 
}: Stage4Props) {
  return (
    <div className="space-y-6">
      {/* Photo Grid */}
      <div className="grid grid-cols-3 gap-3">
        {[...Array(6)].map((_, index) => {
          const photo = photoStates[index];
          const isMain = index === 0;
          
          return (
            <div
              key={index}
              className={`relative rounded-xl overflow-hidden bg-white/5 border-2 border-dashed border-white/20 ${
                isMain ? 'col-span-2 row-span-2 aspect-[4/5]' : 'aspect-square'
              }`}
            >
              {photo ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.previewUrl}
                    alt={`Photo ${index + 1}`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  
                  {/* Upload status overlay */}
                  {photo.isUploading && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="text-white text-xs">Uploading...</span>
                    </div>
                  )}
                  
                  {photo.uploadFailed && (
                    <div className="absolute inset-0 bg-red-500/60 flex flex-col items-center justify-center">
                      <span className="text-white text-2xl">⚠️</span>
                      <span className="text-white text-xs">Failed</span>
                    </div>
                  )}
                  
                  {/* Success indicator */}
                  {photo.finalUrl && !photo.isUploading && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-green-500/90 rounded-full flex items-center gap-1">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                  
                  {/* Main badge */}
                  {isMain && photo.finalUrl && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full">
                      <span className="text-white text-xs font-medium">Main</span>
                    </div>
                  )}
                  
                  {/* Remove button */}
                  <button
                    onClick={() => onRemovePhoto(index)}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                  >
                    ×
                  </button>
                </>
              ) : (
                <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                  <span className="text-3xl text-gray-500">+</span>
                  {isMain && (
                    <span className="text-xs text-gray-500 mt-1">Main Photo</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onPhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>

      {/* Tips */}
      <div className="space-y-2 p-4 rounded-xl bg-white/5">
        <p className="text-sm text-gray-300 font-medium">📸 Photo tips</p>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Your first photo is your main profile picture</li>
          <li>• Use clear, well-lit photos of yourself</li>
          <li>• Show your personality and interests</li>
          <li>• Avoid group photos as your main</li>
        </ul>
      </div>

      {/* Upload status */}
      {hasUploadingPhotos && (
        <div className="flex items-center justify-center gap-2 text-pink-400">
          <div className="w-4 h-4 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Uploading photos...</span>
        </div>
      )}
    </div>
  );
}
