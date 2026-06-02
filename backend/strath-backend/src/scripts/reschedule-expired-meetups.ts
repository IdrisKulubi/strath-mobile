import dotenv from "dotenv";
import { inArray, sql } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

const SATURDAY_2026_05_30_1500_EAT = new Date("2026-05-30T12:00:00.000Z");
const SATURDAY_CONFIRM_BY_0900_EAT = new Date("2026-05-30T06:00:00.000Z");

async function main() {
    const { default: db, pool } = await import("@/db/drizzle");
    const { mutualMatches } = await import("@/db/schema");

    const before = await db.execute(sql`
        select
            mm.id,
            mm.status,
            mm.assigned_slot,
            mm.scheduled_at,
            mm.slot_confirm_by,
            mm.user_a_slot_confirmed_at,
            mm.user_b_slot_confirmed_at,
            ua.email as a_email,
            ub.email as b_email,
            pa.first_name as a_first,
            pa.last_name as a_last,
            pb.first_name as b_first,
            pb.last_name as b_last
        from mutual_matches mm
        join "user" ua on ua.id = mm.user_a_id
        join "user" ub on ub.id = mm.user_b_id
        left join profiles pa on pa.user_id = mm.user_a_id
        left join profiles pb on pb.user_id = mm.user_b_id
        where mm.status = 'expired'
          and (
            lower(coalesce(pa.first_name, '') || ' ' || coalesce(pa.last_name, '')) like '%victor mboya%'
            or lower(coalesce(pb.first_name, '') || ' ' || coalesce(pb.last_name, '')) like '%victor mboya%'
            or lower(coalesce(pa.first_name, '') || ' ' || coalesce(pa.last_name, '')) like '%aurelia mwaniki%'
            or lower(coalesce(pb.first_name, '') || ' ' || coalesce(pb.last_name, '')) like '%aurelia mwaniki%'
            or lower(coalesce(pa.first_name, '') || ' ' || coalesce(pa.last_name, '')) like '%atieno patience%'
            or lower(coalesce(pb.first_name, '') || ' ' || coalesce(pb.last_name, '')) like '%atieno patience%'
            or lower(coalesce(pa.first_name, '') || ' ' || coalesce(pa.last_name, '')) like '%victor nzai%'
            or lower(coalesce(pb.first_name, '') || ' ' || coalesce(pb.last_name, '')) like '%victor nzai%'
            or lower(ua.email) in ('vm0203099@gmail.com', 'aureliamwaniki2.0@gmail.com', 'atienopatience@strathmore.edu', 'victor.nzai@strathmore.edu')
            or lower(ub.email) in ('vm0203099@gmail.com', 'aureliamwaniki2.0@gmail.com', 'atienopatience@strathmore.edu', 'victor.nzai@strathmore.edu')
          )
        order by mm.scheduled_at desc nulls last, mm.created_at desc
    `);

    const rows = (before.rows ?? before) as Array<{ id: string }>;
    const ids = [...new Set(rows.map((row) => row.id))];

    if (ids.length === 0) {
        console.log(JSON.stringify({ ok: false, reason: "No matching expired meetup rows found", before: rows }, null, 2));
        await pool.end();
        return;
    }

    const updated = await db
        .update(mutualMatches)
        .set({
            status: "mutual",
            assignedSlot: "saturday",
            scheduledAt: SATURDAY_2026_05_30_1500_EAT,
            slotConfirmBy: SATURDAY_CONFIRM_BY_0900_EAT,
            userASlotConfirmedAt: null,
            userBSlotConfirmedAt: null,
            slotConfirmReminderSentAt: null,
            updatedAt: new Date(),
        })
        .where(inArray(mutualMatches.id, ids))
        .returning({
            id: mutualMatches.id,
            status: mutualMatches.status,
            assignedSlot: mutualMatches.assignedSlot,
            scheduledAt: mutualMatches.scheduledAt,
            slotConfirmBy: mutualMatches.slotConfirmBy,
            userASlotConfirmedAt: mutualMatches.userASlotConfirmedAt,
            userBSlotConfirmedAt: mutualMatches.userBSlotConfirmedAt,
        });

    await db.execute(sql`
        update date_matches dm
        set
            status = 'pending_setup',
            scheduled_at = ${SATURDAY_2026_05_30_1500_EAT}
        from mutual_matches mm
        where mm.legacy_date_match_id = dm.id
          and mm.id in (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})
    `);

    console.log(JSON.stringify({
        ok: true,
        target: {
            scheduledAtUtc: SATURDAY_2026_05_30_1500_EAT.toISOString(),
            scheduledAtNairobi: "Saturday, 30 May 2026, 15:00",
            confirmByUtc: SATURDAY_CONFIRM_BY_0900_EAT.toISOString(),
            confirmByNairobi: "Saturday, 30 May 2026, 09:00",
        },
        matchedBefore: rows,
        updated,
    }, null, 2));

    await pool.end();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
