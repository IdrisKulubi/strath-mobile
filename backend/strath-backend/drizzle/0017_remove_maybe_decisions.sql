-- Treat historical "maybe" intro decisions as passes for queue and analytics.
UPDATE candidate_pairs SET a_decision = 'passed' WHERE a_decision = 'maybe';
UPDATE candidate_pairs SET b_decision = 'passed' WHERE b_decision = 'maybe';

UPDATE user_match_interests SET decision = 'passed' WHERE decision = 'maybe';

UPDATE recommendation_events SET decision = 'passed' WHERE decision = 'maybe';
