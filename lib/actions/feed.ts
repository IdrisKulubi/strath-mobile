
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface FeedProfile {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    age: number;
    bio: string;
    photos: string[];
    interests: string[];
    university?: string;
    course?: string;
    yearOfStudy?: number;
    // Add other fields as needed
}

export async function getFeedProfiles(): Promise<FeedProfile[]> {
    try {
        const response = await fetch(`${API_URL}/api/feed`);
        if (!response.ok) {
            throw new Error('Failed to fetch feed');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching feed profiles:", error);
        return [];
    }
}
