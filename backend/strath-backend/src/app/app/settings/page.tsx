"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { authClient } from "@/lib/auth-client";
import { toast } from "@/components/ui/custom-toast";

// Icons
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
  </svg>
);

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
  </svg>
);

const LogOutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
  </svg>
);

const FileTextIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const HeadphonesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

const HeartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-500">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
  </svg>
);

export default function SettingsPage() {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [settings, setSettings] = useState({
    showProfile: true,
    showDistance: true,
    emailMatches: true,
    emailMessages: true,
  });

  const handleSignOut = async () => {
    toast.loading("Signing out...");
    await authClient.signOut();
    toast.success("Signed out", "See you soon! 👋");
    router.push("/login");
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await fetch("/api/user/delete", { method: "DELETE" });
      await authClient.signOut();
      toast.success("Account deleted", "Your data has been removed");
      router.push("/");
    } catch (error) {
      console.error("Failed to delete account:", error);
      toast.error("Failed to delete", "Please try again later");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success("Setting updated");
  };

  return (
    <div className="max-w-2xl mx-auto p-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/app/profile">
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/5">
            <ArrowLeftIcon />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 text-sm">Manage your account preferences</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Discovery Settings */}
        <Card className="bg-[#1a1a2e] border-white/10 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center">
                <EyeIcon />
              </div>
              <div>
                <CardTitle className="text-white text-lg">Discovery</CardTitle>
                <CardDescription className="text-gray-400 text-sm">
                  Control who can see your profile
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 pt-4">
            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
              <div>
                <Label htmlFor="show-profile" className="text-white font-medium cursor-pointer">
                  Show my profile
                </Label>
                <p className="text-gray-500 text-xs mt-0.5">Others can discover you</p>
              </div>
              <Switch 
                id="show-profile" 
                checked={settings.showProfile}
                onCheckedChange={() => toggleSetting('showProfile')}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-pink-500 data-[state=checked]:to-rose-500"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
              <div>
                <Label htmlFor="show-distance" className="text-white font-medium cursor-pointer">
                  Show distance
                </Label>
                <p className="text-gray-500 text-xs mt-0.5">Display distance on your profile</p>
              </div>
              <Switch 
                id="show-distance" 
                checked={settings.showDistance}
                onCheckedChange={() => toggleSetting('showDistance')}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-pink-500 data-[state=checked]:to-rose-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-[#1a1a2e] border-white/10 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <BellIcon />
              </div>
              <div>
                <CardTitle className="text-white text-lg">Notifications</CardTitle>
                <CardDescription className="text-gray-400 text-sm">
                  Manage your notification preferences
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 pt-4">
            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
              <div>
                <Label htmlFor="email-matches" className="text-white font-medium cursor-pointer">
                  New matches
                </Label>
                <p className="text-gray-500 text-xs mt-0.5">Get notified when you match</p>
              </div>
              <Switch 
                id="email-matches" 
                checked={settings.emailMatches}
                onCheckedChange={() => toggleSetting('emailMatches')}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-pink-500 data-[state=checked]:to-rose-500"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
              <div>
                <Label htmlFor="email-messages" className="text-white font-medium cursor-pointer">
                  New messages
                </Label>
                <p className="text-gray-500 text-xs mt-0.5">Get notified for new messages</p>
              </div>
              <Switch 
                id="email-messages" 
                checked={settings.emailMessages}
                onCheckedChange={() => toggleSetting('emailMessages')}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-pink-500 data-[state=checked]:to-rose-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Legal */}
        <Card className="bg-[#1a1a2e] border-white/10 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                <ShieldIcon />
              </div>
              <div>
                <CardTitle className="text-white text-lg">Legal & Support</CardTitle>
                <CardDescription className="text-gray-400 text-sm">
                  Policies and help resources
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-1">
              <Link 
                href="/terms" 
                className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <FileTextIcon />
                  <span className="text-white font-medium">Terms of Service</span>
                </div>
                <ChevronRightIcon />
              </Link>
              <Link 
                href="/privacy" 
                className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <LockIcon />
                  <span className="text-white font-medium">Privacy Policy</span>
                </div>
                <ChevronRightIcon />
              </Link>
              <Link 
                href="/support" 
                className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <HeadphonesIcon />
                  <span className="text-white font-medium">Contact Support</span>
                </div>
                <ChevronRightIcon />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card className="bg-[#1a1a2e] border-white/10 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-lg">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <Button
              variant="outline"
              className="w-full h-12 border-white/10 text-white hover:text-white hover:bg-white/5 justify-start gap-3 font-medium"
              onClick={handleSignOut}
            >
              <LogOutIcon />
              Sign Out
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-12 border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/10 justify-start gap-3 font-medium"
                >
                  <TrashIcon />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#1a1a2e] border-white/10">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white text-xl">Delete Account?</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400">
                    This action cannot be undone. This will permanently delete your account,
                    profile, matches, and all messages.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3">
                  <AlertDialogCancel className="bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    {isDeleting ? "Deleting..." : "Delete Account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* App Info */}
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 mb-3">
            <span className="text-sm text-gray-400">Strathspace Web</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400">v1.0.0</span>
          </div>
          <p className="text-gray-500 text-sm flex items-center justify-center gap-1">
            Made with <HeartIcon /> for Strathmore students
          </p>
        </div>
      </div>
    </div>
  );
}
