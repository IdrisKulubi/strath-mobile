import React from "react";
import { SelectionSheet } from "@/components/ui/selection-sheet";

export type MissionRating = "amazing" | "nice" | "meh" | "not_for_me";

const RATING_OPTIONS = [
    { value: "amazing", label: "Amazing", emoji: "😍" },
    { value: "nice", label: "Nice", emoji: "😊" },
    { value: "meh", label: "Meh", emoji: "😐" },
    { value: "not_for_me", label: "Not for me", emoji: "👋" },
] as const;

interface MissionFeedbackSheetProps {
    visible: boolean;
    onClose: () => void;
    onSelectRating: (rating: MissionRating) => void;
    isSubmitting?: boolean;
}

export function MissionFeedbackSheet({
    visible,
    onClose,
    onSelectRating,
}: MissionFeedbackSheetProps) {
    return (
        <SelectionSheet
            visible={visible}
            onClose={onClose}
            title="How was the mission?"
            options={RATING_OPTIONS as any}
            onSelect={(value) => onSelectRating(value as MissionRating)}
        />
    );
}
