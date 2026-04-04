export interface ExternalMatch {
  id: string;
  name: string;
  matchType: string;
  status: string;
  venue: string;
  date: string;
  teams: string[];
  score: {
    r: number;
    w: number;
    o: number;
    inning: string;
  }[];
  series_id: string;
  fantasyEnabled: boolean;
  bbbEnabled: boolean;
  hasSquad: boolean;
  matchStarted: boolean;
  matchEnded: boolean;
}

export interface ExternalMatchesResponse {
  status: string;
  data: ExternalMatch[];
  info: {
    hitsToday: number;
    hitsUsed: number;
    hitsLimit: number;
    credits: number;
    server: number;
    offset: number;
    totalRows: number;
    queryTime: number;
    s: number;
    cache: number;
  };
}

export async function fetchExternalMatches(): Promise<ExternalMatch[]> {
  try {
    const response = await fetch('/api/external/matches');
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server returned ${response.status}`);
    }
    const result: ExternalMatchesResponse = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching external matches:', error);
    // Re-throw the error so the UI can handle it
    throw error;
  }
}
