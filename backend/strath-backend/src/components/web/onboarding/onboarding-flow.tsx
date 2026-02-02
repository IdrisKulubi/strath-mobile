"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Profile {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  interestedIn?: string;
  course?: string;
  yearOfStudy?: string;
  bio?: string;
  interests?: string[];
  photos?: string[];
}

interface OnboardingFlowProps {
  user: User;
  existingProfile: Profile | null;
}

const TOTAL_STEPS = 5;

const INTERESTS = [
  "Music", "Movies", "Sports", "Gaming", "Reading", "Cooking", "Travel",
  "Photography", "Art", "Dancing", "Fitness", "Fashion", "Tech", "Nature",
  "Animals", "Food", "Coffee", "Wine", "Hiking", "Swimming", "Running",
  "Yoga", "Meditation", "Volunteering", "Entrepreneurship", "Writing"
];

const COURSES = [
  "Computer Science", "Business Administration", "Law", "Medicine",
  "Engineering", "Economics", "Accounting", "Finance", "Marketing",
  "Information Technology", "Data Science", "Hospitality", "Tourism",
  "Communications", "Journalism", "Psychology", "Other"
];

export function OnboardingFlow({ user, existingProfile }: OnboardingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    firstName: existingProfile?.firstName || user.name?.split(" ")[0] || "",
    lastName: existingProfile?.lastName || user.name?.split(" ").slice(1).join(" ") || "",
    dateOfBirth: existingProfile?.dateOfBirth || "",
    gender: existingProfile?.gender || "",
    interestedIn: existingProfile?.interestedIn || "",
    course: existingProfile?.course || "",
    yearOfStudy: existingProfile?.yearOfStudy || "",
    bio: existingProfile?.bio || "",
    interests: existingProfile?.interests || [],
    photos: existingProfile?.photos || [],
  });

  const progress = (step / TOTAL_STEPS) * 100;

  const updateForm = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleInterest = (interest: string) => {
    setFormData((prev) => {
      const interests = prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest].slice(0, 10); // Max 10 interests
      return { ...prev, interests };
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (formData.photos.length >= 6) break;

      try {
        // Get presigned URL
        const response = await fetch("/api/upload/presigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
          }),
        });

        const { url, key } = await response.json();

        // Upload to S3
        await fetch(url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        // Add photo URL to state
        const photoUrl = `https://${process.env.NEXT_PUBLIC_S3_BUCKET}.s3.amazonaws.com/${key}`;
        setFormData((prev) => ({
          ...prev,
          photos: [...prev.photos, photoUrl],
        }));
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }
  };

  const removePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.firstName && formData.dateOfBirth && formData.gender;
      case 2:
        return formData.interestedIn;
      case 3:
        return formData.photos.length >= 1;
      case 4:
        return formData.interests.length >= 3;
      case 5:
        return true; // Bio is optional
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          onboardingCompleted: true,
          profilePhoto: formData.photos[0],
        }),
      });

      const data = await response.json();
      if (data.success) {
        router.push("/app/discover");
      } else {
        setError(data.message || "Failed to save profile");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Image src="/logo.png" alt="Strathspace" width={24} height={24} />
          </div>
          <span className="text-lg font-bold text-white">Strathspace</span>
        </div>
        <span className="text-gray-400 text-sm">Step {step} of {TOTAL_STEPS}</span>
      </header>

      {/* Progress */}
      <div className="px-4">
        <Progress value={progress} className="h-1 bg-white/10" />
      </div>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-md"
          >
            <Card className="bg-[#1a1a2e]/90 border-white/10 p-6">
              {error && (
                <div className="mb-4 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
                  {error}
                </div>
              )}

              {/* Step 1: Basic Info */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Let&apos;s get started</h2>
                    <p className="text-gray-400 mt-1">Tell us about yourself</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">First Name</Label>
                      <Input
                        value={formData.firstName}
                        onChange={(e) => updateForm("firstName", e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Last Name</Label>
                      <Input
                        value={formData.lastName}
                        onChange={(e) => updateForm("lastName", e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Birthday</Label>
                    <Input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => updateForm("dateOfBirth", e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">I am a</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Man", "Woman", "Other"].map((g) => (
                        <Button
                          key={g}
                          type="button"
                          variant={formData.gender === g.toLowerCase() ? "default" : "outline"}
                          onClick={() => updateForm("gender", g.toLowerCase())}
                          className={formData.gender === g.toLowerCase()
                            ? "bg-gradient-to-r from-pink-500 to-rose-500"
                            : "border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
                          }
                        >
                          {g}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Looking For */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Who are you looking for?</h2>
                    <p className="text-gray-400 mt-1">Select your preference</p>
                  </div>

                  <div className="space-y-3">
                    {["Men", "Women", "Everyone"].map((pref) => (
                      <Button
                        key={pref}
                        type="button"
                        variant={formData.interestedIn === pref.toLowerCase() ? "default" : "outline"}
                        onClick={() => updateForm("interestedIn", pref.toLowerCase())}
                        className={`w-full h-14 text-lg ${
                          formData.interestedIn === pref.toLowerCase()
                            ? "bg-gradient-to-r from-pink-500 to-rose-500"
                            : "border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {pref}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-2 pt-4">
                    <Label className="text-gray-300">Course (Optional)</Label>
                    <Select value={formData.course} onValueChange={(v) => updateForm("course", v)}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Select your course" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-white/10">
                        {COURSES.map((course) => (
                          <SelectItem key={course} value={course} className="text-white">
                            {course}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Year of Study (Optional)</Label>
                    <Select value={formData.yearOfStudy} onValueChange={(v) => updateForm("yearOfStudy", v)}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-white/10">
                        {["1", "2", "3", "4", "5", "Graduate"].map((year) => (
                          <SelectItem key={year} value={year} className="text-white">
                            {year === "Graduate" ? "Graduate" : `Year ${year}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Step 3: Photos */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Add your photos</h2>
                    <p className="text-gray-400 mt-1">Add at least 1 photo (up to 6)</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[...Array(6)].map((_, index) => (
                      <div
                        key={index}
                        className="aspect-square relative rounded-xl overflow-hidden bg-white/5 border-2 border-dashed border-white/20"
                      >
                        {formData.photos[index] ? (
                          <>
                            <Image
                              src={formData.photos[index]}
                              alt={`Photo ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                            <button
                              onClick={() => removePhoto(index)}
                              className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
                            >
                              ×
                            </button>
                          </>
                        ) : (
                          <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                            <span className="text-2xl text-gray-500">+</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoUpload}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    ))}
                  </div>

                  <p className="text-sm text-gray-500 text-center">
                    Tip: Your first photo will be your main profile picture
                  </p>
                </div>
              )}

              {/* Step 4: Interests */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Your interests</h2>
                    <p className="text-gray-400 mt-1">
                      Select 3-10 interests ({formData.interests.length}/10)
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto">
                    {INTERESTS.map((interest) => {
                      const isSelected = formData.interests.includes(interest);
                      return (
                        <Badge
                          key={interest}
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer transition-all ${
                            isSelected
                              ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0"
                              : "border-white/20 text-gray-300 hover:border-pink-500/50"
                          }`}
                          onClick={() => toggleInterest(interest)}
                        >
                          {interest}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 5: Bio */}
              {step === 5 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white">About you</h2>
                    <p className="text-gray-400 mt-1">Write a short bio (optional)</p>
                  </div>

                  <Textarea
                    value={formData.bio}
                    onChange={(e) => updateForm("bio", e.target.value)}
                    placeholder="Tell others about yourself..."
                    className="bg-white/5 border-white/10 text-white min-h-[150px] resize-none"
                    maxLength={500}
                  />

                  <p className="text-sm text-gray-500 text-right">
                    {formData.bio.length}/500
                  </p>
                </div>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="p-6 flex justify-between max-w-md mx-auto w-full">
        <Button
          variant="ghost"
          onClick={prevStep}
          disabled={step === 1}
          className="text-gray-400 hover:text-white"
        >
          Back
        </Button>
        <Button
          onClick={nextStep}
          disabled={!canProceed() || isSubmitting}
          className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 min-w-[120px]"
        >
          {isSubmitting ? "Saving..." : step === TOTAL_STEPS ? "Complete" : "Next"}
        </Button>
      </footer>
    </div>
  );
}
