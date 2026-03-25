"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertTriangle, Camera, CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/custom-toast";

type VerificationStatus =
    | "not_started"
    | "pending_capture"
    | "processing"
    | "verified"
    | "retry_required"
    | "manual_review"
    | "failed"
    | "blocked";

interface VerificationSession {
    id: string;
    status: VerificationStatus;
    attemptNumber: number;
    failureReasons: string[];
}

interface VerificationFlowProps {
    profilePhotos: string[];
    initialStatus: VerificationStatus;
}

export function VerificationFlow({ profilePhotos, initialStatus }: VerificationFlowProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [selfieFile, setSelfieFile] = useState<File | null>(null);
    const [selfiePreviewUrl, setSelfiePreviewUrl] = useState<string | null>(null);
    const [session, setSession] = useState<VerificationSession | null>(null);
    const [status, setStatus] = useState<VerificationStatus>(initialStatus);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canRetry = status === "retry_required" || status === "failed";
    const canContinue = status === "verified";

    const statusCopy = useMemo(() => {
        switch (status) {
            case "verified":
                return "Your profile is verified. You can continue into discovery.";
            case "processing":
                return "Your verification is processing. If async mode is enabled, the cron/worker path will finalize it shortly.";
            case "retry_required":
            case "failed":
                return "This attempt needs another try. Capture a clearer selfie with bright lighting and a centered face.";
            case "manual_review":
                return "This attempt has been escalated for review. An admin can process it from the verification tooling.";
            default:
                return "Take a quick selfie so we can compare it with your profile photos before unlocking matchmaking.";
        }
    }, [status]);

    const handleChooseSelfie = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            toast.error("Invalid file", "Please choose an image for verification.");
            return;
        }

        if (selfiePreviewUrl) {
            URL.revokeObjectURL(selfiePreviewUrl);
        }

        setSelfieFile(file);
        setSelfiePreviewUrl(URL.createObjectURL(file));
    };

    const handleSubmit = async () => {
        if (!selfieFile) {
            toast.warning("Selfie required", "Upload or capture a selfie before submitting.");
            return;
        }

        if (profilePhotos.length < 2) {
            toast.error("More photos needed", "You need at least two profile photos before verification can run.");
            return;
        }

        setIsSubmitting(true);

        try {
            const sessionResponse = await fetch("/api/verification/face/session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    resetActiveSession: canRetry,
                }),
            });

            const sessionPayload = await sessionResponse.json();
            if (!sessionResponse.ok) {
                throw new Error(sessionPayload.error || "Failed to start verification session");
            }

            const activeSession = sessionPayload.data as VerificationSession;
            setSession(activeSession);

            const uploadTargetsResponse = await fetch("/api/verification/face/upload-targets", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    sessionId: activeSession.id,
                    uploads: [
                        {
                            slot: "front",
                            contentType: selfieFile.type || "image/jpeg",
                        },
                    ],
                }),
            });

            const uploadTargetsPayload = await uploadTargetsResponse.json();
            if (!uploadTargetsResponse.ok) {
                throw new Error(uploadTargetsPayload.error || "Failed to create upload target");
            }

            const uploadTarget = uploadTargetsPayload.data.uploadTargets[0];
            const uploadResponse = await fetch(uploadTarget.signedUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": uploadTarget.contentType,
                },
                body: selfieFile,
            });

            if (!uploadResponse.ok) {
                throw new Error("Failed to upload verification selfie");
            }

            const submitResponse = await fetch("/api/verification/face/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    sessionId: activeSession.id,
                    profilePhotoUrls: profilePhotos,
                }),
            });

            const submitPayload = await submitResponse.json();
            if (!submitResponse.ok) {
                throw new Error(submitPayload.error || "Verification submission failed");
            }

            const nextSession = submitPayload.data.session as VerificationSession;
            setSession(nextSession);
            setStatus(nextSession.status);

            if (nextSession.status === "verified") {
                toast.success("Verified", "Your profile has been verified.");
            } else if (submitPayload.data.queued) {
                toast.success("Submitted", "Verification queued. It will be processed shortly.");
            } else {
                toast.warning("Review result", "Verification finished, but you may need another attempt.");
            }
        } catch (error) {
            console.error("[WebVerification] Submit failed", error);
            toast.error(
                "Verification failed",
                error instanceof Error ? error.message : "Something went wrong during verification.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f0d23] px-4 py-10 text-white">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
                <Card className="border-white/10 bg-[#16112f]/90 p-8">
                    <div className="mb-6 flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-500/15 text-pink-300">
                            <ShieldCheck className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Face verification checkpoint</h1>
                            <p className="mt-1 text-sm text-slate-300">
                                We compare one selfie against your profile photos before unlocking discovery.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-[1.1fr,0.9fr]">
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-lg font-semibold">Profile photos</h2>
                                <p className="mt-1 text-sm text-slate-400">
                                    We use up to four of your uploaded photos for the CompareFaces check.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {profilePhotos.map((photo, index) => (
                                    <div key={`${photo}-${index}`} className="relative h-28 w-20 overflow-hidden rounded-2xl border border-white/10">
                                        <Image src={photo} alt={`Profile photo ${index + 1}`} fill className="object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h2 className="text-lg font-semibold">Selfie capture</h2>
                                <p className="mt-1 text-sm text-slate-400">
                                    Use a clear front-facing photo with good light and no heavy obstructions.
                                </p>
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="user"
                                className="hidden"
                                onChange={handleFileChange}
                            />

                            <button
                                type="button"
                                onClick={handleChooseSelfie}
                                className="flex h-72 w-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-pink-400/35 bg-pink-500/5 text-pink-200 transition hover:bg-pink-500/10"
                            >
                                {selfiePreviewUrl ? (
                                    <div className="relative h-full w-full overflow-hidden rounded-3xl">
                                        <Image src={selfiePreviewUrl} alt="Verification selfie preview" fill className="object-cover" />
                                    </div>
                                ) : (
                                    <>
                                        <Camera className="h-10 w-10" />
                                        <span className="text-sm font-semibold">Capture or upload selfie</span>
                                    </>
                                )}
                            </button>

                            <div className="flex gap-3">
                                <Button type="button" variant="secondary" onClick={handleChooseSelfie}>
                                    {selfiePreviewUrl ? "Retake selfie" : "Choose selfie"}
                                </Button>
                                <Button type="button" onClick={handleSubmit} disabled={isSubmitting || status === "processing"}>
                                    {isSubmitting ? (
                                        <>
                                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                            Submitting
                                        </>
                                    ) : canRetry ? (
                                        "Retry verification"
                                    ) : (
                                        "Submit verification"
                                    )}
                                </Button>
                                {canContinue ? (
                                    <Button type="button" className="bg-emerald-500 hover:bg-emerald-600" onClick={() => router.push("/app/discover")}>
                                        Continue
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="border-white/10 bg-[#16112f]/90 p-6">
                    <div className="flex items-start gap-3">
                        {status === "verified" ? (
                            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
                        ) : status === "retry_required" || status === "failed" || status === "manual_review" ? (
                            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-400" />
                        ) : (
                            <ShieldCheck className="mt-0.5 h-5 w-5 text-sky-400" />
                        )}
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Status</span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold capitalize text-white">
                                    {status.replace(/_/g, " ")}
                                </span>
                                {session ? (
                                    <span className="text-xs text-slate-500">Attempt {session.attemptNumber}</span>
                                ) : null}
                            </div>
                            <p className="max-w-2xl text-sm leading-6 text-slate-300">{statusCopy}</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
