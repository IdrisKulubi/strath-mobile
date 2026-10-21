"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin-auth";
import { backfillPhotoEmbeddings, reanalyzeUserPhotos } from "@/lib/services/photo-intelligence-service";

type ActionResult = { ok: boolean; message: string };

export async function reanalyzeUserPhotosAction(userId: string): Promise<ActionResult> {
    try {
        await requireAdmin();
        if (!userId) {
            return { ok: false, message: "User ID is required." };
        }

        const result = await reanalyzeUserPhotos(userId);
        revalidatePath("/admin/photo-intelligence");
        return {
            ok: true,
            message: `Reanalyzed ${result.analyzed ?? 0} photo(s) for user ${userId}.`,
        };
    } catch (error) {
        return {
            ok: false,
            message: error instanceof Error ? error.message : "Reanalyze failed.",
        };
    }
}

export async function runPhotoBackfillAction(input?: {
    limit?: number;
    offset?: number;
    onlyMissingEmbeddings?: boolean;
}): Promise<ActionResult> {
    try {
        await requireAdmin();
        const result = await backfillPhotoEmbeddings({
            limit: input?.limit ?? 25,
            offset: input?.offset ?? 0,
            onlyMissingEmbeddings: input?.onlyMissingEmbeddings ?? true,
        });

        revalidatePath("/admin/photo-intelligence");
        return {
            ok: true,
            message: `Backfill processed ${result.processed ?? 0} user(s). Next offset: ${result.nextOffset ?? "done"}.`,
        };
    } catch (error) {
        return {
            ok: false,
            message: error instanceof Error ? error.message : "Backfill failed.",
        };
    }
}
