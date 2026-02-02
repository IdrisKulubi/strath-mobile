"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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

export default function SettingsPage() {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await fetch("/api/user/delete", { method: "DELETE" });
      await authClient.signOut();
      router.push("/");
    } catch (error) {
      console.error("Failed to delete account:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Discovery Settings */}
        <Card className="bg-[#1a1a2e] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Discovery</CardTitle>
            <CardDescription className="text-gray-400">
              Control who can see your profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-profile" className="text-gray-300">
                Show my profile
              </Label>
              <Switch id="show-profile" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-distance" className="text-gray-300">
                Show distance
              </Label>
              <Switch id="show-distance" defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-[#1a1a2e] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Notifications</CardTitle>
            <CardDescription className="text-gray-400">
              Manage your email notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-matches" className="text-gray-300">
                New matches
              </Label>
              <Switch id="email-matches" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-messages" className="text-gray-300">
                New messages
              </Label>
              <Switch id="email-messages" defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Legal */}
        <Card className="bg-[#1a1a2e] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Legal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a href="/terms" className="block text-gray-300 hover:text-white py-2">
              Terms of Service
            </a>
            <Separator className="bg-white/10" />
            <a href="/privacy" className="block text-gray-300 hover:text-white py-2">
              Privacy Policy
            </a>
            <Separator className="bg-white/10" />
            <a href="/support" className="block text-gray-300 hover:text-white py-2">
              Contact Support
            </a>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card className="bg-[#1a1a2e] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#1a1a2e] border-white/10">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Delete Account?</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400">
                    This action cannot be undone. This will permanently delete your account,
                    profile, matches, and all messages.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
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
        <div className="text-center text-gray-500 text-sm">
          <p>Strathspace Web v1.0.0</p>
          <p className="mt-1">Made with 💕 for Strathmore students</p>
        </div>
      </div>
    </div>
  );
}
