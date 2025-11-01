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
}

interface Card {
	id: number;
	deck: number;
	front: string;
	back: string;
	ease_factor: number;
	interval: number;
	repetitions: number;
	next_review: string;
	created_at: string;
}

interface StudySession {
	session_id: number;
	cards: Card[];
	total_due: number;
}

interface ReviewSubmission {
	session_id: number;
	quality: number;
	time_taken: number;
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

	async getDecks(): Promise<Deck[]> {
		return this.fetch<Deck[]>(`${this.baseURL}/decks/`);
	}

	async createDeck(title: string, description: string = ""): Promise<Deck> {
		return this.fetch<Deck>(`${this.baseURL}/decks/create/`, {
			method: "POST",
			body: JSON.stringify({ title, description }),
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

	async getCards(deckId: number): Promise<Card[]> {
		return this.fetch<Card[]>(`${this.baseURL}/decks/${deckId}/cards/`);
	}

	async createCard(deckId: number, front: string, back: string): Promise<Card> {
		return this.fetch<Card>(`${this.baseURL}/decks/${deckId}/cards/create/`, {
			method: "POST",
			body: JSON.stringify({ front, back }),
		});
	}

	async updateCard(cardId: number, front: string, back: string): Promise<Card> {
		return this.fetch<Card>(`${this.baseURL}/cards/${cardId}/update/`, {
			method: "PUT",
			body: JSON.stringify({ front, back }),
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

	async startStudySession(deckId: number): Promise<StudySession> {
		return this.fetch<StudySession>(`${this.baseURL}/decks/${deckId}/study/`, {
			method: "POST",
		});
	}

	async submitReview(
		cardId: number,
		review: ReviewSubmission
	): Promise<Card> {
		return this.fetch<Card>(
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
}

// Export singleton instance
export const api = new FlashcardAPI();
