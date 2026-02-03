"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/custom-toast";

// Constants
const COURSE_OPTIONS = [
  "Computer Science",
  "Business Administration",
  "Commerce",
  "Finance",
  "Accounting",
  "Marketing",
  "Hospitality & Tourism",
  "Information Technology",
  "Journalism & Media Studies",
  "Law",
  "Economics",
  "Telecommunications",
  "Mathematics",
  "Philosophy",
  "International Relations",
  "Supply Chain Management",
  "Real Estate",
  "Film & Animation",
  "Music",
  "Other",
];

const YEAR_OPTIONS = [
  { value: 1, label: "1st Year" },
  { value: 2, label: "2nd Year" },
  { value: 3, label: "3rd Year" },
  { value: 4, label: "4th Year" },
  { value: 5, label: "5th Year+" },
];

const HEIGHT_OPTIONS = [
  "Under 5'0\" (152cm)",
  "5'0\" - 5'3\" (152-160cm)",
  "5'4\" - 5'6\" (163-168cm)",
  "5'7\" - 5'9\" (170-175cm)",
  "5'10\" - 6'0\" (178-183cm)",
  "6'1\" - 6'3\" (185-191cm)",
  "Over 6'3\" (191cm+)",
];

const DRINKING_OPTIONS = ["Never", "Socially", "Regularly", "Prefer not to say"];
const SMOKING_OPTIONS = ["Never", "Sometimes", "Regularly", "Prefer not to say"];
const RELIGION_OPTIONS = [
  "Christian",
  "Muslim",
  "Hindu",
  "Buddhist",
  "Jewish",
  "Spiritual",
  "Agnostic",
  "Atheist",
  "Other",
  "Prefer not to say",
];

const INTERESTS_DATA = [
  "Music", "Movies", "Travel", "Food", "Fitness", "Gaming",
  "Photography", "Art", "Reading", "Sports", "Fashion", "Technology",
  "Cooking", "Dancing", "Hiking", "Yoga", "Coffee", "Wine",
  "Anime", "K-Pop", "Netflix", "Concerts", "Festivals", "Beach",
  "Mountains", "Cats", "Dogs", "Volunteering",
];

const LOOKING_FOR_OPTIONS = [
  { value: "relationship", label: "Relationship", emoji: "💕" },
  { value: "casual", label: "Something Casual", emoji: "🎉" },
  { value: "friends", label: "New Friends", emoji: "👋" },
  { value: "notSure", label: "Not Sure Yet", emoji: "🤷" },
];

const GENDER_OPTIONS = [
  { value: "male", label: "Man", emoji: "👨" },
  { value: "female", label: "Woman", emoji: "👩" },
  { value: "other", label: "Other", emoji: "🌈" },
];

const INTERESTED_IN_OPTIONS = [
  { value: "male", label: "Men", emoji: "👨" },
  { value: "female", label: "Women", emoji: "👩" },
  { value: "other", label: "Everyone", emoji: "🌈" },
];

// Icons
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
  </svg>
);

const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
    <circle cx="12" cy="13" r="3"/>
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

const LoaderIcon = () => (
  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

interface Profile {
  id: string;
  userId: string;
  firstName: string;
  lastName?: string | null;
  age: number | null;
  dateOfBirth?: string | null;
  zodiacSign?: string | null;
  gender?: string | null;
  bio?: string | null;
  profilePhoto?: string | null;
  photos: string[] | null;
  course?: string | null;
  yearOfStudy?: number | null;
  interests: string[] | null;
  university?: string | null;
  height?: string | null;
  drinkingPreference?: string | null;
  smoking?: string | null;
  religion?: string | null;
  lookingFor?: string | null;
  interestedIn?: string[] | null;
  instagram?: string | null;
  spotify?: string | null;
}

interface PhotoState {
  previewUrl: string;
  finalUrl: string | null;
  isUploading: boolean;
  uploadFailed: boolean;
}

interface EditProfileFormProps {
  profile: Profile;
}

export function EditProfileForm({ profile }: EditProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Initial form data for change detection
  const initialFormData = useRef({
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
    bio: profile.bio || "",
    course: profile.course || "",
    yearOfStudy: profile.yearOfStudy || null,
    height: profile.height || "",
    drinkingPreference: profile.drinkingPreference || "",
    smoking: profile.smoking || "",
    religion: profile.religion || "",
    lookingFor: profile.lookingFor || "",
    gender: profile.gender || "",
    interestedIn: profile.interestedIn || [],
    interests: profile.interests || [],
    instagram: profile.instagram || "",
    spotify: profile.spotify || "",
  });

  const initialPhotos = useRef<string[]>(
    profile.photos || (profile.profilePhoto ? [profile.profilePhoto] : [])
  );

  // Form state
  const [formData, setFormData] = useState({
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
    bio: profile.bio || "",
    course: profile.course || "",
    yearOfStudy: profile.yearOfStudy || null,
    height: profile.height || "",
    drinkingPreference: profile.drinkingPreference || "",
    smoking: profile.smoking || "",
    religion: profile.religion || "",
    lookingFor: profile.lookingFor || "",
    gender: profile.gender || "",
    interestedIn: profile.interestedIn || [],
    interests: profile.interests || [],
    instagram: profile.instagram || "",
    spotify: profile.spotify || "",
  });

  // Photo states
  const [photoStates, setPhotoStates] = useState<PhotoState[]>(() => {
    const existingPhotos = profile.photos || (profile.profilePhoto ? [profile.profilePhoto] : []);
    return existingPhotos.map(url => ({
      previewUrl: url,
      finalUrl: url,
      isUploading: false,
      uploadFailed: false,
    }));
  });

  const hasUploadingPhotos = photoStates.some(p => p.isUploading);

  // Detect changes
  const hasChanges = (() => {
    // Check form data changes
    const initial = initialFormData.current;
    if (formData.firstName !== initial.firstName) return true;
    if (formData.lastName !== initial.lastName) return true;
    if (formData.bio !== initial.bio) return true;
    if (formData.course !== initial.course) return true;
    if (formData.yearOfStudy !== initial.yearOfStudy) return true;
    if (formData.height !== initial.height) return true;
    if (formData.drinkingPreference !== initial.drinkingPreference) return true;
    if (formData.smoking !== initial.smoking) return true;
    if (formData.religion !== initial.religion) return true;
    if (formData.lookingFor !== initial.lookingFor) return true;
    if (formData.gender !== initial.gender) return true;
    if (formData.instagram !== initial.instagram) return true;
    if (formData.spotify !== initial.spotify) return true;
    
    // Check arrays
    if (JSON.stringify(formData.interestedIn.sort()) !== JSON.stringify([...initial.interestedIn].sort())) return true;
    if (JSON.stringify(formData.interests.sort()) !== JSON.stringify([...initial.interests].sort())) return true;
    
    // Check photos
    const currentPhotos = photoStates.filter(p => p.finalUrl && !p.uploadFailed).map(p => p.finalUrl);
    if (currentPhotos.length !== initialPhotos.current.length) return true;
    if (JSON.stringify(currentPhotos) !== JSON.stringify(initialPhotos.current)) return true;
    
    return false;
  })();

  // Handlers
  const updateField = (field: string, value: string | number | string[] | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleInterest = (interest: string) => {
    setFormData(prev => {
      const current = prev.interests || [];
      const updated = current.includes(interest)
        ? current.filter(i => i !== interest)
        : current.length < 10 ? [...current, interest] : current;
      return { ...prev, interests: updated };
    });
  };

  const toggleInterestedIn = (value: string) => {
    setFormData(prev => {
      const current = prev.interestedIn || [];
      const updated = current.includes(value)
        ? current.filter(i => i !== value)
        : [...current, value];
      return { ...prev, interestedIn: updated };
    });
  };

  // Photo upload
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

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setPhotoStates(prev => prev.filter((_, i) => i !== index));
  };

  const getUploadedPhotoUrls = () => {
    return photoStates
      .filter(p => p.finalUrl && !p.uploadFailed)
      .map(p => p.finalUrl as string);
  };

  // Submit
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");
    setSuccess("");

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

    if (!formData.firstName.trim()) {
      toast.error("Missing info", "First name is required");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          yearOfStudy: typeof formData.yearOfStudy === 'number' ? formData.yearOfStudy : (formData.yearOfStudy ? parseInt(String(formData.yearOfStudy), 10) : undefined),
          photos: uploadedPhotos,
          profilePhoto: uploadedPhotos[0],
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Profile updated!", "Your changes have been saved");
        setTimeout(() => router.push("/app/profile"), 1500);
      } else {
        toast.error("Failed to save", data.message || "Something went wrong");
      }
    } catch {
      toast.error("Oops!", "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative max-w-4xl mx-auto p-4 md:p-6 pb-32 md:pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
        <Link href="/app/profile">
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white active:bg-white/10 w-10 h-10">
            <ArrowLeftIcon />
          </Button>
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-white">Edit Profile</h1>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
          {success}
        </div>
      )}

      <div className="space-y-4 md:space-y-6">
        {/* Photos Section */}
        <Card className="bg-[#1a1a2e] border-white/10">
          <CardHeader className="px-4 md:px-6 pb-2 md:pb-4">
            <CardTitle className="text-white flex items-center gap-2 text-base md:text-lg">
              <span className="text-xl md:text-2xl">📸</span> Photos
            </CardTitle>
            <p className="text-xs md:text-sm text-gray-400">Add up to 6 photos. First photo is your main profile picture.</p>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              {photoStates.map((photo, index) => (
                <div key={index} className="relative aspect-square rounded-lg md:rounded-xl overflow-hidden bg-white/5">
                  <Image
                    src={photo.previewUrl}
                    alt={`Photo ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  {photo.isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <LoaderIcon />
                    </div>
                  )}
                  {photo.uploadFailed && (
                    <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                      <span className="text-xs text-white">Failed</span>
                    </div>
                  )}
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute top-1.5 md:top-2 right-1.5 md:right-2 w-5 h-5 md:w-6 md:h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 active:bg-black"
                  >
                    <XIcon />
                  </button>
                  {index === 0 && (
                    <div className="absolute bottom-1.5 md:bottom-2 left-1.5 md:left-2 bg-pink-500 text-white text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded-full">
                      Main
                    </div>
                  )}
                </div>
              ))}
              
              {photoStates.length < 6 && (
                <label className="aspect-square rounded-lg md:rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-pink-500/50 active:border-pink-500 transition-colors">
                  <CameraIcon />
                  <span className="text-xs md:text-sm text-gray-400 mt-1 md:mt-2">Add Photo</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card className="bg-[#1a1a2e] border-white/10">
          <CardHeader className="px-4 md:px-6 pb-2 md:pb-4">
            <CardTitle className="text-white flex items-center gap-2 text-base md:text-lg">
              <span className="text-xl md:text-2xl">👤</span> Basic Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 md:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div>
                <Label className="text-gray-300 text-sm">First Name *</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  className="bg-white/5 border-white/10 text-white mt-1 h-11"
                  placeholder="Your first name"
                />
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Last Name</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  className="bg-white/5 border-white/10 text-white mt-1 h-11"
                  placeholder="Your last name"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300 text-sm">Gender</Label>
              <div className="flex gap-2 mt-2">
                {GENDER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField("gender", option.value)}
                    className={`flex-1 py-2.5 md:py-3 px-2 md:px-4 rounded-xl text-xs md:text-sm font-medium transition-all active:scale-95 ${
                      formData.gender === option.value
                        ? "bg-pink-500 text-white"
                        : "bg-white/5 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    <span className="mr-1 md:mr-2">{option.emoji}</span>
                    <span className="hidden sm:inline">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card className="bg-[#1a1a2e] border-white/10">
          <CardHeader className="px-4 md:px-6 pb-2 md:pb-4">
            <CardTitle className="text-white flex items-center gap-2 text-base md:text-lg">
              <span className="text-xl md:text-2xl">💭</span> About You
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 md:px-6">
            <div>
              <Label className="text-gray-300 text-sm">Bio</Label>
              <Textarea
                value={formData.bio}
                onChange={(e) => updateField("bio", e.target.value.slice(0, 500))}
                className="bg-white/5 border-white/10 text-white mt-1 min-h-[100px] md:min-h-[120px] text-sm"
                placeholder="Tell others about yourself..."
              />
              <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/500</p>
            </div>
          </CardContent>
        </Card>

        {/* Looking For */}
        <Card className="bg-[#1a1a2e] border-white/10">
          <CardHeader className="px-4 md:px-6 pb-2 md:pb-4">
            <CardTitle className="text-white flex items-center gap-2 text-base md:text-lg">
              <span className="text-xl md:text-2xl">💕</span> Looking For
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 md:px-6">
            <div>
              <Label className="text-gray-300 text-sm">Interested In</Label>
              <div className="flex gap-2 mt-2">
                {INTERESTED_IN_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleInterestedIn(option.value)}
                    className={`flex-1 py-2.5 md:py-3 px-2 md:px-4 rounded-xl text-xs md:text-sm font-medium transition-all active:scale-95 ${
                      formData.interestedIn.includes(option.value)
                        ? "bg-pink-500 text-white"
                        : "bg-white/5 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    <span className="mr-1 md:mr-2">{option.emoji}</span>
                    <span className="hidden sm:inline">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-gray-300 text-sm">What are you looking for?</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {LOOKING_FOR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField("lookingFor", option.value)}
                    className={`py-2.5 md:py-3 px-2 md:px-4 rounded-xl text-xs md:text-sm font-medium transition-all active:scale-95 ${
                      formData.lookingFor === option.value
                        ? "bg-pink-500 text-white"
                        : "bg-white/5 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    <span className="mr-1 md:mr-2">{option.emoji}</span>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Academic Info */}
        <Card className="bg-[#1a1a2e] border-white/10">
          <CardHeader className="px-4 md:px-6 pb-2 md:pb-4">
            <CardTitle className="text-white flex items-center gap-2 text-base md:text-lg">
              <span className="text-xl md:text-2xl">🎓</span> Academic
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 md:px-6">
            <div>
              <Label className="text-gray-300 text-sm">Course</Label>
              <select
                value={formData.course}
                onChange={(e) => updateField("course", e.target.value)}
                className="w-full mt-1 p-2.5 md:p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm appearance-none"
              >
                <option value="" className="bg-[#1a1a2e]">Select your course</option>
                {COURSE_OPTIONS.map((course) => (
                  <option key={course} value={course} className="bg-[#1a1a2e]">
                    {course}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-gray-300 text-sm">Year of Study</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {YEAR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField("yearOfStudy", option.value)}
                    className={`flex-1 min-w-[60px] py-2.5 md:py-3 px-2 md:px-4 rounded-xl text-xs md:text-sm font-medium transition-all active:scale-95 ${
                      formData.yearOfStudy === option.value
                        ? "bg-pink-500 text-white"
                        : "bg-white/5 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lifestyle */}
        <Card className="bg-[#1a1a2e] border-white/10">
          <CardHeader className="px-4 md:px-6 pb-2 md:pb-4">
            <CardTitle className="text-white flex items-center gap-2 text-base md:text-lg">
              <span className="text-xl md:text-2xl">🌟</span> Lifestyle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 md:px-6">
            <div>
              <Label className="text-gray-300 text-sm">Height</Label>
              <select
                value={formData.height}
                onChange={(e) => updateField("height", e.target.value)}
                className="w-full mt-1 p-2.5 md:p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm appearance-none"
              >
                <option value="" className="bg-[#1a1a2e]">Select height</option>
                {HEIGHT_OPTIONS.map((height) => (
                  <option key={height} value={height} className="bg-[#1a1a2e]">
                    {height}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div>
                <Label className="text-gray-300 text-sm">Drinking</Label>
                <select
                  value={formData.drinkingPreference}
                  onChange={(e) => updateField("drinkingPreference", e.target.value)}
                  className="w-full mt-1 p-2.5 md:p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm appearance-none"
                >
                  <option value="" className="bg-[#1a1a2e]">Select</option>
                  {DRINKING_OPTIONS.map((option) => (
                    <option key={option} value={option} className="bg-[#1a1a2e]">
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Smoking</Label>
                <select
                  value={formData.smoking}
                  onChange={(e) => updateField("smoking", e.target.value)}
                  className="w-full mt-1 p-2.5 md:p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm appearance-none"
                >
                  <option value="" className="bg-[#1a1a2e]">Select</option>
                  {SMOKING_OPTIONS.map((option) => (
                    <option key={option} value={option} className="bg-[#1a1a2e]">
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label className="text-gray-300 text-sm">Religion</Label>
              <select
                value={formData.religion}
                onChange={(e) => updateField("religion", e.target.value)}
                className="w-full mt-1 p-2.5 md:p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm appearance-none"
              >
                <option value="" className="bg-[#1a1a2e]">Select religion</option>
                {RELIGION_OPTIONS.map((option) => (
                  <option key={option} value={option} className="bg-[#1a1a2e]">
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Interests */}
        <Card className="bg-[#1a1a2e] border-white/10">
          <CardHeader className="px-4 md:px-6 pb-2 md:pb-4">
            <CardTitle className="text-white flex items-center gap-2 text-base md:text-lg">
              <span className="text-xl md:text-2xl">✨</span> Interests
            </CardTitle>
            <p className="text-xs md:text-sm text-gray-400">Select 3-10 interests</p>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              {INTERESTS_DATA.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all active:scale-95 ${
                    formData.interests.includes(interest)
                      ? "bg-pink-500 text-white"
                      : "bg-white/5 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">{formData.interests.length}/10 selected</p>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card className="bg-[#1a1a2e] border-white/10">
          <CardHeader className="px-4 md:px-6 pb-2 md:pb-4">
            <CardTitle className="text-white flex items-center gap-2 text-base md:text-lg">
              <span className="text-xl md:text-2xl">🔗</span> Social Links
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 md:px-6">
            <div>
              <Label className="text-gray-300 text-sm">Instagram</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">@</span>
                <Input
                  value={formData.instagram}
                  onChange={(e) => updateField("instagram", e.target.value.replace("@", ""))}
                  className="bg-white/5 border-white/10 text-white pl-8 h-11 text-sm"
                  placeholder="username"
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-300 text-sm">Spotify</Label>
              <Input
                value={formData.spotify}
                onChange={(e) => updateField("spotify", e.target.value)}
                className="bg-white/5 border-white/10 text-white mt-1 h-11 text-sm"
                placeholder="Your favorite song or artist"
              />
            </div>
          </CardContent>
        </Card>

        {/* Spacer for floating buttons */}
        <div className="h-20 md:h-24" />
      </div>

      {/* Floating Save Button - fixed above bottom nav on mobile */}
      <div className="fixed md:sticky bottom-20 md:bottom-0 left-0 right-0 p-3 md:p-4 bg-gradient-to-t from-[#0f0d23] via-[#0f0d23] to-transparent z-50 px-4 md:px-6 safe-area-bottom">
        <div className="flex gap-3 md:gap-4 max-w-4xl mx-auto">
          <Link href="/app/profile" className="flex-1">
            <Button variant="outline" className="w-full h-11 md:h-12 border-white/10 text-gray-300 hover:bg-white/5 active:bg-white/10 bg-[#1a1a2e] text-sm md:text-base">
              Cancel
            </Button>
          </Link>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || hasUploadingPhotos || !hasChanges}
            className={`flex-1 h-11 md:h-12 transition-all active:scale-[0.98] text-sm md:text-base ${
              hasChanges 
                ? "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600" 
                : "bg-gray-600 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <>
                <LoaderIcon />
                <span className="ml-2">Saving...</span>
              </>
            ) : hasChanges ? (
              "Save Changes"
            ) : (
              "No Changes"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
