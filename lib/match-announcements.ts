export type MatchAnnouncement = {
  matchId: string;
  name: string;
  photo: string | null;
};

export type ActiveConnection = {
  matchId: string;
  partner: { name: string; photos: string[] };
};

/** The connections endpoint is ordered by match time, newest first. */
export function unseenMatchAnnouncements(
  connections: ActiveConnection[],
  seenIds: ReadonlySet<string>,
): MatchAnnouncement[] {
  return connections
    .filter((connection) => !seenIds.has(connection.matchId))
    .map((connection) => ({
      matchId: connection.matchId,
      name: connection.partner.name,
      photo: connection.partner.photos[0] ?? null,
    }));
}

export function planMatchAnnouncements(
  connections: ActiveConnection[],
  seenIds: ReadonlySet<string>,
  firstLoad: boolean,
): { announcements: MatchAnnouncement[]; markSeen: string[] } {
  const unseen = unseenMatchAnnouncements(connections, seenIds);
  return {
    announcements: firstLoad ? unseen.slice(0, 1) : unseen,
    markSeen: firstLoad ? connections.map((connection) => connection.matchId) : unseen.map((match) => match.matchId),
  };
}
