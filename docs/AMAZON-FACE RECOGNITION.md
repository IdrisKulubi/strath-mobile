# AWS Guide for Face Matching Verification

A practical setup for StrathSpace to verify that the uploaded profile photos belong to the same real person.

---

## Recommended MVP

Use **Amazon Rekognition CompareFaces** to compare a guided selfie against 2–4 uploaded profile photos. Only let users enter matchmaking after they pass the photo match. Add Face Liveness later if spoofing becomes a real problem.

---

## 1. What This Guide Covers

This guide shows the cheapest effective AWS-based way to verify that the person onboarding into the app is the same person shown in the photos they uploaded. It is designed for a fast MVP where verification happens during onboarding, before the user reaches Home.

---

## 2. Recommended Architecture

- **Frontend (Expo / React Native):** Capture 2–4 profile photos, then capture one guided selfie or 3 guided selfie frames.
- **Storage:** Upload images to a private S3 bucket.
- **Backend:** Create a lightweight verification endpoint in Next.js or your backend service.
- **Face matching:** Call Amazon Rekognition CompareFaces using the guided selfie as the source image and each uploaded photo as the target image.
- **Decision rule:** Pass the user only if at least 2 uploaded photos match above your threshold.
- **(Optional, later):** Add Amazon Rekognition Face Liveness if you start seeing spoof attempts.

---

## 3. Product Flow for StrathSpace

1. **User uploads profile photos during onboarding.**
2. **User is asked to verify with a quick guided selfie capture:** look straight, turn left, turn right, smile.
3. **Backend sends the selfie frame and uploaded photos to Rekognition CompareFaces.**
4. **App returns:**  
   - `Verified`  
   - `Retry with better lighting`  
   - `Replace unclear profile photos`
5. **Only verified users enter the daily curated matchmaking flow.**

---



## 5. Matching Logic That Is Fast and Practical

- Use the guided selfie as the source image.
- Compare it against each uploaded profile photo individually.
- Ignore uploaded photos with multiple faces, blur, or face obstruction.
- Pass only if at least 2 photos match above your chosen similarity threshold.
- Store the final result, confidence scores, and timestamp in your database.

**Suggested threshold strategy:**
- Start with a conservative threshold such as 85–90 similarity for an automatic pass.
- If exactly one photo passes strongly and the others are weak, ask the user to replace poor photos and retry.
- If no photos pass, fail the verification and keep the user in onboarding.

---

## 6. Cost Estimate

Amazon Rekognition pricing places CompareFaces in Group 1 image APIs. AWS pricing lists Group 1 image APIs at $0.001 per image at the first million-image tier, and multiple API calls against one image count as multiple operations.

| Scenario                     | Approx. operations   | Approx. cost   |
|------------------------------|---------------------|---------------|
| 1 selfie vs 3 uploaded photos| About 4 image ops   | $0.004 per user|
| 1,000 verifications          | About 4,000 image ops| $4            |
| 10,000 verifications         | About 40,000 image ops| $40           |

If you later add Face Liveness, AWS pricing examples list it separately, which raises per-user cost. That is why CompareFaces-only is the cheapest effective MVP.

---

## 7. Backend Implementation Outline

1. Create a private S3 bucket for onboarding verification assets.
2. Upload the guided selfie frame and uploaded profile photos to S3.
3. Call Rekognition CompareFaces with the selfie frame as `SourceImage` and each uploaded photo as `TargetImage`.
4. Collect similarity scores from all comparisons.
5. Apply your decision rule and update the user's verification status in the database.
6. Delete temporary verification assets that you do not need to retain.

---

## 8. Security and Privacy Essentials

- Keep all photos in private S3 storage. Do not expose raw asset URLs publicly.
- Retain only what you need: verification status, confidence scores, timestamps, and audit metadata.
- Delete temporary selfie captures after verification unless you truly need them for manual review.
- Tell users clearly that photos are being used only to verify that they match their uploaded profile pictures.

---

## 9. Recommended Data Model

- **user_verification_status:** `pending`, `verified`, `failed`, `review_needed`
- **verification_score:** numeric similarity summary
- **verification_completed_at:** timestamp
- **verification_retry_count:** integer
- **verification_method:** `comparefaces_v1`
- **profile_photo_quality_status:** `pass` / `retry_needed`

---

## 10. MVP Rollout Plan

1. **Phase 1:** CompareFaces-only verification during onboarding.
2. **Phase 2:** Add quality checks and manual review queue for edge cases.
3. **Phase 3:** Add Face Liveness only if spoofing becomes a real operational problem.
4. **Phase 4:** Make verified status visible inside matchmaking and prioritize verified users.

---

## 11. Practical Recommendation

For StrathSpace today, the cheapest effective path is:  
**upload profile photos → guided selfie capture → CompareFaces against 2–4 uploaded photos → allow entry only after passing.**  
This solves the catfishing problem much faster and more cheaply than building your own face verification stack from scratch.

---

## 12. Official AWS References Used for This Guide

- [Amazon Rekognition pricing — CompareFaces is in Group 1 image APIs](https://aws.amazon.com/rekognition/pricing/)
- [CompareFaces documentation](https://docs.aws.amazon.com/rekognition/latest/dg/faces-comparefaces.html)
- [CompareFaces API reference](https://docs.aws.amazon.com/rekognition/latest/APIReference/API_CompareFaces.html)
- [Face Liveness overview](https://aws.amazon.com/rekognition/face-liveness/)
- [Face Liveness developer guide](https://docs.aws.amazon.com/rekognition/latest/dg/face-liveness.html)
