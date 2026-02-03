"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/custom-toast";

// Import stages
import { 
  OnboardingData, 
  STAGES, 
  TOTAL_STAGES 
} from "./stages";
import { Stage1BasicInfo } from "./stages/stage-1-basic-info";
import { Stage2LookingFor } from "./stages/stage-2-looking-for";
import { Stage3Academic } from "./stages/stage-3-academic";
import { Stage4Photos } from "./stages/stage-4-photos";
import { Stage5Personality } from "./stages/stage-5-personality";
import { Stage6Lifestyle } from "./stages/stage-6-lifestyle";
import { Stage7Interests } from "./stages/stage-7-interests";
import { Stage8Prompts } from "./stages/stage-8-prompts";
import { Stage9Socials } from "./stages/stage-9-socials";

interface User {
  id: string;
  name: string;
  email: string;
}

interface ExistingProfile {
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  age?: number | null;
  zodiacSign?: string | null;
  gender?: string | null;
  interestedIn?: string[] | null;
  lookingFor?: string | null;
  university?: string | null;
  course?: string | null;
  yearOfStudy?: number | null;
  loveLanguage?: string | null;
  communicationStyle?: string | null;
  sleepingHabits?: string | null;
  socialMediaUsage?: string | null;
  workoutFrequency?: string | null;
  height?: string | null;
  drinkingPreference?: string | null;
  smoking?: string | null;
  religion?: string | null;
  interests?: string[] | null;
  prompts?: { promptId: string; response: string }[] | null;
  bio?: string | null;
  instagram?: string | null;
  spotify?: string | null;
  snapchat?: string | null;
  phoneNumber?: string | null;
  photos?: string[] | null;
}

interface OnboardingFlowProps {
  user: User;
  existingProfile: ExistingProfile | null;
}

interface PhotoState {
  previewUrl: string;
  finalUrl: string | null;
  isUploading: boolean;
  uploadFailed: boolean;
}

// Helper to filter valid photo URLs
const getValidPhotos = (photos?: string[] | null): PhotoState[] => {
  if (!photos || !Array.isArray(photos)) return [];
  return photos
    .filter((url) => url && typeof url === "string" && !url.includes("undefined"))
    .map(url => ({
      previewUrl: url,
      finalUrl: url,
      isUploading: false,
      uploadFailed: false,
    }));
};

export function OnboardingFlow({ user, existingProfile }: OnboardingFlowProps) {
  const router = useRouter();
  const [currentStage, setCurrentStage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Initialize form data from existing profile or defaults
  const [formData, setFormData] = useState<OnboardingData>(() => ({
    firstName: existingProfile?.firstName || user.name?.split(" ")[0] || "",
    lastName: existingProfile?.lastName || user.name?.split(" ").slice(1).join(" ") || "",
    dateOfBirth: existingProfile?.dateOfBirth || "",
    age: existingProfile?.age || null,
    zodiacSign: existingProfile?.zodiacSign || "",
    gender: (existingProfile?.gender as OnboardingData['gender']) || "",
    interestedIn: existingProfile?.interestedIn || [],
    lookingFor: existingProfile?.lookingFor || "",
    university: existingProfile?.university || "",
    course: existingProfile?.course || "",
    yearOfStudy: existingProfile?.yearOfStudy || null,
    loveLanguage: existingProfile?.loveLanguage || "",
    communicationStyle: existingProfile?.communicationStyle || "",
    sleepingHabits: existingProfile?.sleepingHabits || "",
    socialMediaUsage: existingProfile?.socialMediaUsage || "",
    workoutFrequency: existingProfile?.workoutFrequency || "",
    height: existingProfile?.height || "",
    drinkingPreference: existingProfile?.drinkingPreference || "",
    smoking: existingProfile?.smoking || "",
    religion: existingProfile?.religion || "",
    interests: existingProfile?.interests || [],
    prompts: existingProfile?.prompts || [],
    bio: existingProfile?.bio || "",
    instagram: existingProfile?.instagram || "",
    spotify: existingProfile?.spotify || "",
    snapchat: existingProfile?.snapchat || "",
    phoneNumber: existingProfile?.phoneNumber || "",
  }));

  // Photo states
  const [photoStates, setPhotoStates] = useState<PhotoState[]>(() => 
    getValidPhotos(existingProfile?.photos)
  );

  const progress = (currentStage / TOTAL_STAGES) * 100;
  const stageInfo = STAGES[currentStage - 1];

  // Update form data
  const updateField = (field: keyof OnboardingData, value: string | string[] | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Toggle interest selection
  const toggleInterest = (interest: string) => {
    setFormData(prev => {
      const current = prev.interests || [];
      const updated = current.includes(interest)
        ? current.filter(i => i !== interest)
        : current.length < 10 ? [...current, interest] : current;
      return { ...prev, interests: updated };
    });
  };

  // Photo upload handlers
  const uploadPhotoToR2 = async (file: File, index: number) => {
    try {
      const response = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });

      const data = await response.json();
      
      if (!data.signedUrl || !data.publicUrl) {
        throw new Error("Failed to get upload URL");
      }

      const uploadResponse = await fetch(data.signedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      setPhotoStates(prev => prev.map((p, i) => 
        i === index ? { ...p, finalUrl: data.publicUrl, isUploading: false } : p
      ));
    } catch (err) {
      console.error("Upload failed:", err);
      setPhotoStates(prev => prev.map((p, i) => 
        i === index ? { ...p, isUploading: false, uploadFailed: true } : p
      ));
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (photoStates.length >= 6) break;

      const previewUrl = URL.createObjectURL(file);
      const newIndex = photoStates.length;

      setPhotoStates(prev => [...prev, {
        previewUrl,
        finalUrl: null,
        isUploading: true,
        uploadFailed: false,
      }]);

      uploadPhotoToR2(file, newIndex);
    }
  };

  const removePhoto = (index: number) => {
    setPhotoStates(prev => {
      const photo = prev[index];
      if (photo.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(photo.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const hasUploadingPhotos = photoStates.some(p => p.isUploading);
  const getUploadedPhotoUrls = (): string[] => {
    return photoStates
      .filter(p => p.finalUrl !== null)
      .map(p => p.finalUrl as string);
  };

  // Validation per stage
  const canProceed = (): boolean => {
    switch (currentStage) {
      case 1:
        return !!(formData.firstName && formData.dateOfBirth && formData.gender);
      case 2:
        return !!(formData.interestedIn.length > 0 && formData.lookingFor);
      case 3:
        return !!(formData.university && formData.course && formData.yearOfStudy);
      case 4:
        return photoStates.length >= 1;
      case 5:
        // Personality - requires at least 3 answers
        const personalityAnswers = [
          formData.loveLanguage,
          formData.communicationStyle,
          formData.sleepingHabits,
          formData.socialMediaUsage,
          formData.workoutFrequency,
        ].filter(Boolean);
        return personalityAnswers.length >= 3;
      case 6:
        return true; // Lifestyle is optional
      case 7:
        return formData.interests.length >= 3;
      case 8:
        return true; // Prompts are optional
      case 9:
        return true; // Socials/Bio are optional
      default:
        return false;
    }
  };

  // Submit profile
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");

    if (hasUploadingPhotos) {
      toast.warning("Please wait", "Photos are still uploading...");
      setIsSubmitting(false);
      return;
    }

    const uploadedPhotos = getUploadedPhotoUrls();
    if (uploadedPhotos.length === 0) {
      toast.error("Missing photos", "Please add at least one photo");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          // Ensure age is a number
          age: typeof formData.age === 'number' ? formData.age : (formData.age ? parseInt(String(formData.age), 10) : undefined),
          // Ensure yearOfStudy is a number
          yearOfStudy: typeof formData.yearOfStudy === 'number' ? formData.yearOfStudy : (formData.yearOfStudy ? parseInt(String(formData.yearOfStudy), 10) : undefined),
          photos: uploadedPhotos,
          profileCompleted: true,
          profilePhoto: uploadedPhotos[0],
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Profile created! 🎉", "Welcome to Strathspace!");
        router.push("/app/discover");
      } else {
        toast.error("Failed to save", data.message || "Something went wrong");
        setError(data.message || "Failed to save profile");
      }
    } catch {
      toast.error("Oops!", "Something went wrong. Please try again.");
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStage = () => {
    if (currentStage < TOTAL_STAGES) {
      setCurrentStage(currentStage + 1);
    } else {
      handleSubmit();
    }
  };

  const prevStage = () => {
    if (currentStage > 1) setCurrentStage(currentStage - 1);
  };

  // Render current stage
  const renderStage = () => {
    switch (currentStage) {
      case 1:
        return <Stage1BasicInfo data={formData} onUpdate={updateField} />;
      case 2:
        return <Stage2LookingFor data={formData} onUpdate={updateField} />;
      case 3:
        return <Stage3Academic data={formData} onUpdate={updateField} />;
      case 4:
        return (
          <Stage4Photos 
            data={formData}
            photoStates={photoStates}
            onPhotoUpload={handlePhotoUpload}
            onRemovePhoto={removePhoto}
            hasUploadingPhotos={hasUploadingPhotos}
          />
        );
      case 5:
        return <Stage5Personality data={formData} onUpdate={updateField} />;
      case 6:
        return <Stage6Lifestyle data={formData} onUpdate={updateField} />;
      case 7:
        return <Stage7Interests data={formData} onToggleInterest={toggleInterest} />;
      case 8:
        return (
          <Stage8Prompts 
            data={formData} 
            onUpdatePrompts={(prompts) => setFormData(prev => ({ ...prev, prompts }))} 
          />
        );
      case 9:
        return <Stage9Socials data={formData} onUpdate={updateField} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0f0d23]">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Image src="/logo.png" alt="Strathspace" width={24} height={24} />
          </div>
          <span className="text-lg font-bold text-white">Strathspace</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{stageInfo.emoji}</span>
          <span className="text-gray-400 text-sm">{currentStage}/{TOTAL_STAGES}</span>
        </div>
      </header>

      {/* Progress */}
      <div className="px-4">
        <Progress value={progress} className="h-1.5 bg-white/10" />
      </div>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center p-6 pt-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStage}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md"
          >
            <Card className="bg-[#1a1a2e]/90 border-white/10 p-6">
              {/* Stage Header */}
              <div className="text-center mb-6">
                <motion.span 
                  key={stageInfo.emoji}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="text-4xl block mb-2"
                >
                  {stageInfo.emoji}
                </motion.span>
                <h2 className="text-2xl font-bold text-white">{stageInfo.title}</h2>
                <p className="text-gray-400 mt-1">{stageInfo.subtitle}</p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
                  {error}
                </div>
              )}

              {/* Stage Content */}
              {renderStage()}
            </Card>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="p-6 flex justify-between max-w-md mx-auto w-full">
        <Button
          variant="ghost"
          onClick={prevStage}
          disabled={currentStage === 1}
          className="text-gray-400 hover:text-white"
        >
          Back
        </Button>
        <Button
          onClick={nextStage}
          disabled={!canProceed() || isSubmitting}
          className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 min-w-[120px]"
        >
          {isSubmitting 
            ? "Saving..." 
            : currentStage === TOTAL_STAGES 
              ? "Let's Go! 🚀" 
              : "Continue"
          }
        </Button>
      </footer>
    </div>
  );
}
