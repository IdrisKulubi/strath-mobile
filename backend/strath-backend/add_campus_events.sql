-- Add Campus Events tables
-- Run this migration to add the events feature

-- Campus Events table
CREATE TABLE IF NOT EXISTS campus_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('social', 'academic', 'sports', 'career', 'arts', 'gaming', 'faith', 'clubs')),
    cover_image TEXT,
    
    -- Location
    university TEXT NOT NULL,
    location TEXT,
    is_virtual BOOLEAN DEFAULT false,
    virtual_link TEXT,
    
    -- Time
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    
    -- Creator
    creator_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    organizer_name TEXT,
    
    -- Settings
    max_attendees INTEGER,
    is_public BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for campus_events
CREATE INDEX IF NOT EXISTS event_university_idx ON campus_events(university);
CREATE INDEX IF NOT EXISTS event_category_idx ON campus_events(category);
CREATE INDEX IF NOT EXISTS event_start_time_idx ON campus_events(start_time);
CREATE INDEX IF NOT EXISTS event_creator_idx ON campus_events(creator_id);
CREATE INDEX IF NOT EXISTS event_public_idx ON campus_events(is_public);

-- Event RSVPs table
CREATE TABLE IF NOT EXISTS event_rsvps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES campus_events(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'going' CHECK (status IN ('going', 'interested')),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for event_rsvps
CREATE INDEX IF NOT EXISTS rsvp_event_idx ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS rsvp_user_idx ON event_rsvps(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS rsvp_unique_idx ON event_rsvps(event_id, user_id);

-- Seed some sample events for Strathmore
INSERT INTO campus_events (title, description, category, university, location, start_time, end_time, creator_id, organizer_name, is_public)
SELECT 
    'Tech Networking Night',
    'Connect with fellow tech enthusiasts, share projects, and discover opportunities. Food and drinks provided!',
    'career',
    'Strathmore University',
    'Student Center',
    NOW() + INTERVAL '2 days',
    NOW() + INTERVAL '2 days' + INTERVAL '3 hours',
    (SELECT id FROM "user" LIMIT 1),
    'Tech Club',
    true
WHERE EXISTS (SELECT 1 FROM "user" LIMIT 1);

INSERT INTO campus_events (title, description, category, university, location, start_time, end_time, creator_id, organizer_name, is_public)
SELECT 
    'Friday Social Hangout',
    'End the week right! Chill vibes, good music, and great company. All students welcome.',
    'social',
    'Strathmore University',
    'Quad',
    NOW() + INTERVAL '4 days',
    NOW() + INTERVAL '4 days' + INTERVAL '4 hours',
    (SELECT id FROM "user" LIMIT 1),
    'Student Government',
    true
WHERE EXISTS (SELECT 1 FROM "user" LIMIT 1);

INSERT INTO campus_events (title, description, category, university, location, start_time, end_time, creator_id, organizer_name, is_public)
SELECT 
    'Basketball Tournament',
    'Inter-faculty basketball competition. Come support your team or sign up to play!',
    'sports',
    'Strathmore University',
    'Sports Complex',
    NOW() + INTERVAL '5 days',
    NOW() + INTERVAL '5 days' + INTERVAL '5 hours',
    (SELECT id FROM "user" LIMIT 1),
    'Sports Club',
    true
WHERE EXISTS (SELECT 1 FROM "user" LIMIT 1);

INSERT INTO campus_events (title, description, category, university, location, start_time, end_time, creator_id, organizer_name, is_public)
SELECT 
    'Study Session: Finals Prep',
    'Group study session for upcoming finals. Bring your notes and questions!',
    'academic',
    'Strathmore University',
    'Library 3rd Floor',
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '1 day' + INTERVAL '3 hours',
    (SELECT id FROM "user" LIMIT 1),
    'Academic Society',
    true
WHERE EXISTS (SELECT 1 FROM "user" LIMIT 1);

INSERT INTO campus_events (title, description, category, university, location, start_time, end_time, creator_id, organizer_name, is_public)
SELECT 
    'Gaming Night: FIFA Tournament',
    'Think you''re the best? Prove it! PS5 FIFA tournament with prizes for the winner.',
    'gaming',
    'Strathmore University',
    'Recreation Room',
    NOW() + INTERVAL '3 days',
    NOW() + INTERVAL '3 days' + INTERVAL '4 hours',
    (SELECT id FROM "user" LIMIT 1),
    'Gaming Club',
    true
WHERE EXISTS (SELECT 1 FROM "user" LIMIT 1);

INSERT INTO campus_events (title, description, category, university, location, start_time, end_time, creator_id, organizer_name, is_public)
SELECT 
    'Art Exhibition: Student Works',
    'Showcase of student artwork from this semester. Opening night with refreshments.',
    'arts',
    'Strathmore University',
    'Art Gallery',
    NOW() + INTERVAL '6 days',
    NOW() + INTERVAL '6 days' + INTERVAL '2 hours',
    (SELECT id FROM "user" LIMIT 1),
    'Art Society',
    true
WHERE EXISTS (SELECT 1 FROM "user" LIMIT 1);
