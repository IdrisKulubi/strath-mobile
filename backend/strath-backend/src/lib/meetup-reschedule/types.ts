export const MEETUP_RESCHEDULE_STATUSES = [
    "pending",
    "accepted",
    "declined",
    "superseded",
    "cancelled",
] as const;

export type MeetupRescheduleStatus = (typeof MEETUP_RESCHEDULE_STATUSES)[number];

export type { MeetupSlotKind } from "@/lib/services/meetup-slot-service";
