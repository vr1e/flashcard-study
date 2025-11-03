/**
 * API Client for Flashcard Study Application
 * Handles all HTTP requests to Django backend
 */

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Custom error class for API failures
 */
class ApiError extends Error {
	code: string;

	constructor(error?: { code: string; message: string }) {
		super(error?.message || "API request failed");
		this.code = error?.code || "UNKNOWN_ERROR";
		this.name = "ApiError";
	}
}

// ============================================================================
// Type Definitions
// ============================================================================

interface Deck {
	id: number;
	title: string;
	description: string;
	total_cards: number;
	cards_due: number;
	created_at: string;
	updated_at: string;
	is_shared?: boolean;
	created_by?: {
		id: number;
		username: string;
	};
}

interface Card {
	id: number;
	// New language fields
	language_a?: string;
	language_b?: string;
	language_a_code?: string;
	language_b_code?: string;
	context?: string;
	// Legacy fields (for backward compatibility)
	front?: string;
	back?: string;
	created_at: string;
	updated_at?: string;
}

type StudyDirection = 'A_TO_B' | 'B_TO_A' | 'RANDOM';

interface StudySession {
	session_id: number;
	deck: {
		id: number;
		title: string;
		language_a: string;
		language_b: string;
	};
	direction: StudyDirection;
	cards: Array<{
		id: number;
		question: string;
		answer: string;
		context?: string;
		direction: 'A_TO_B' | 'B_TO_A';
	}>;
}

interface ReviewSubmission {
	session_id: number;
	quality: number;
	time_taken: number;
	direction: 'A_TO_B' | 'B_TO_A';
}

interface CardsResponse {
	cards: Card[];
	language_a_code: string;
	language_b_code: string;
}

interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: {
		code: string;
		message: string;
	};
}

interface Statistics {
	total_decks: number;
	total_cards: number;
	cards_due_today: number;
	total_reviews: number;
	average_quality: number;
	study_streak_days: number;
	recent_activity: Array<{
		date: string;
		cards_studied: number;
		time_spent: number;
	}>;
}

interface Partnership {
	id: number;
	partner: {
		id: number;
		username: string;
		email: string;
	};
	created_at: string;
	shared_decks_count: number;
}

interface PartnershipInvitation {
	code: string;
	created_at: string;
	expires_at: string;
}

interface DecksResponse {
	personal: Deck[];
	shared: Deck[];
}

// ============================================================================
// API Client Class
// ============================================================================

class FlashcardAPI {
	private baseURL: string = "/api";

	/**
	 * Get CSRF token from Django cookie
	 */
	private getCsrfToken(): string {
		const token = document.querySelector<HTMLInputElement>(
			"[name=csrfmiddlewaretoken]"
		);
		return token?.value || "";
	}

	/**
	 * Generic fetch wrapper with error handling
	 * Unwraps {success, data, error} responses from backend
	 */
	private async fetch<T>(url: string, options?: RequestInit): Promise<T> {
		try {
			const response = await fetch(url, {
				...options,
				headers: {
					"Content-Type": "application/json",
					"X-CSRFToken": this.getCsrfToken(),
					...options?.headers,
				},
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const json: ApiResponse<any> = await response.json();

			// Check if API request was successful
			if (!json.success) {
				throw new ApiError(json.error);
			}

			// Return unwrapped data
			return json.data as T;
		} catch (error) {
			console.error("API Error:", error);
			throw error;
		}
	}

	// ========================================================================
	// Deck Endpoints
	// ========================================================================

	async getDecks(): Promise<DecksResponse> {
		return this.fetch<DecksResponse>(`${this.baseURL}/decks/`);
	}

	async createDeck(title: string, description: string = "", isShared: boolean = false): Promise<Deck> {
		return this.fetch<Deck>(`${this.baseURL}/decks/create/`, {
			method: "POST",
			body: JSON.stringify({ title, description, shared: isShared }),
		});
	}

	async getDeck(deckId: number): Promise<Deck> {
		return this.fetch<Deck>(`${this.baseURL}/decks/${deckId}/`);
	}

	async updateDeck(
		deckId: number,
		title: string,
		description: string
	): Promise<Deck> {
		return this.fetch<Deck>(`${this.baseURL}/decks/${deckId}/update/`, {
			method: "PUT",
			body: JSON.stringify({ title, description }),
		});
	}

	async deleteDeck(deckId: number): Promise<void> {
		return this.fetch<void>(`${this.baseURL}/decks/${deckId}/delete/`, {
			method: "DELETE",
		});
	}

	// ========================================================================
	// Card Endpoints
	// ========================================================================

	async getCards(deckId: number): Promise<CardsResponse> {
		return this.fetch<CardsResponse>(`${this.baseURL}/decks/${deckId}/cards/`);
	}

	async createCard(
		deckId: number,
		languageA: string,
		languageB: string,
		languageACode: string = 'en',
		languageBCode: string = 'en',
		context: string = ''
	): Promise<Card> {
		return this.fetch<Card>(`${this.baseURL}/decks/${deckId}/cards/create/`, {
			method: "POST",
			body: JSON.stringify({
				language_a: languageA,
				language_b: languageB,
				language_a_code: languageACode,
				language_b_code: languageBCode,
				context
			}),
		});
	}

	async updateCard(
		cardId: number,
		languageA: string,
		languageB: string,
		languageACode?: string,
		languageBCode?: string,
		context?: string
	): Promise<Card> {
		const body: any = {
			language_a: languageA,
			language_b: languageB
		};
		if (languageACode) body.language_a_code = languageACode;
		if (languageBCode) body.language_b_code = languageBCode;
		if (context !== undefined) body.context = context;

		return this.fetch<Card>(`${this.baseURL}/cards/${cardId}/update/`, {
			method: "PUT",
			body: JSON.stringify(body),
		});
	}

	async deleteCard(cardId: number): Promise<void> {
		return this.fetch<void>(`${this.baseURL}/cards/${cardId}/delete/`, {
			method: "DELETE",
		});
	}

	// ========================================================================
	// Study Session Endpoints
	// ========================================================================

	async startStudySession(deckId: number, direction: StudyDirection = 'A_TO_B'): Promise<StudySession> {
		return this.fetch<StudySession>(`${this.baseURL}/decks/${deckId}/study/`, {
			method: "POST",
			body: JSON.stringify({ direction }),
		});
	}

	async submitReview(
		cardId: number,
		review: ReviewSubmission
	): Promise<{ next_review: string; interval: number; ease_factor: number }> {
		return this.fetch<{ next_review: string; interval: number; ease_factor: number }>(
			`${this.baseURL}/cards/${cardId}/review/`,
			{
				method: "POST",
				body: JSON.stringify(review),
			}
		);
	}

	// ========================================================================
	// Statistics Endpoints
	// ========================================================================

	async getUserStats(): Promise<Statistics> {
		return this.fetch<Statistics>(`${this.baseURL}/stats/`);
	}

	async getDeckStats(deckId: number): Promise<any> {
		return this.fetch<any>(`${this.baseURL}/decks/${deckId}/stats/`);
	}

	// ========================================================================
	// Partnership Endpoints
	// ========================================================================

	async createPartnershipInvite(): Promise<PartnershipInvitation> {
		return this.fetch<PartnershipInvitation>(`${this.baseURL}/partnership/invite/`, {
			method: "POST",
		});
	}

	async acceptPartnershipInvite(code: string): Promise<Partnership> {
		return this.fetch<Partnership>(`${this.baseURL}/partnership/accept/`, {
			method: "POST",
			body: JSON.stringify({ code }),
		});
	}

	async getPartnership(): Promise<Partnership | null> {
		const response = await this.fetch<Partnership | null>(`${this.baseURL}/partnership/`);
		// Backend returns null when no partnership exists
		return response;
	}

	async dissolvePartnership(): Promise<void> {
		return this.fetch<void>(`${this.baseURL}/partnership/dissolve/`, {
			method: "DELETE",
		});
	}

	async convertDeckType(deckId: number, toShared: boolean): Promise<Deck> {
		return this.fetch<Deck>(`${this.baseURL}/decks/${deckId}/update/`, {
			method: "PUT",
			body: JSON.stringify({ shared: toShared }),
		});
	}
}

// Export singleton instance
export const api = new FlashcardAPI();
