-- Purge unverified users from cached discovery pools and close live candidate pairs.

-- 1) Remove unverified users from all cached daily shortlists
DELETE FROM daily_shortlists ds
USING profiles p
WHERE p.user_id = ds.candidate_user_id
  AND p.face_verification_status <> 'verified'
  AND p.face_verified_at IS NULL;

-- 2) Close active/queued candidate pairs where either side is unverified
UPDATE candidate_pairs cp
SET status = 'closed',
    updated_at = NOW()
FROM profiles pa, profiles pb
WHERE cp.user_a_id = pa.user_id
  AND cp.user_b_id = pb.user_id
  AND cp.status IN ('active', 'queued')
  AND (
    (pa.face_verification_status <> 'verified' AND pa.face_verified_at IS NULL)
    OR (pb.face_verification_status <> 'verified' AND pb.face_verified_at IS NULL)
  );
