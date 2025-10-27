/**
 * API Client for Flashcard Study Application
 * Handles all HTTP requests to Django backend
 */

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
    private baseURL: string = '/api';

    /**
     * Get CSRF token from Django cookie
     */
    private getCsrfToken(): string {
        const token = document.querySelector<HTMLInputElement>('[name=csrfmiddlewaretoken]');
        return token?.value || '';
    }

    /**
     * Generic fetch wrapper with error handling
     */
    private async fetch<T>(url: string, options?: RequestInit): Promise<T> {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken(),
                    ...options?.headers,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // ========================================================================
    // Deck Endpoints
    // ========================================================================

    async getDecks(): Promise<{ decks: Deck[] }> {
        return this.fetch<{ decks: Deck[] }>(`${this.baseURL}/decks/`);
    }

    async createDeck(title: string, description: string = ''): Promise<ApiResponse<Deck>> {
        return this.fetch<ApiResponse<Deck>>(`${this.baseURL}/decks/create/`, {
            method: 'POST',
            body: JSON.stringify({ title, description }),
        });
    }

    async getDeck(deckId: number): Promise<{ deck: Deck; cards: Card[] }> {
        return this.fetch<{ deck: Deck; cards: Card[] }>(`${this.baseURL}/decks/${deckId}/`);
    }

    async updateDeck(deckId: number, title: string, description: string): Promise<ApiResponse<Deck>> {
        return this.fetch<ApiResponse<Deck>>(`${this.baseURL}/decks/${deckId}/update/`, {
            method: 'PUT',
            body: JSON.stringify({ title, description }),
        });
    }

    async deleteDeck(deckId: number): Promise<ApiResponse<void>> {
        return this.fetch<ApiResponse<void>>(`${this.baseURL}/decks/${deckId}/delete/`, {
            method: 'DELETE',
        });
    }

    // ========================================================================
    // Card Endpoints
    // ========================================================================

    async getCards(deckId: number): Promise<{ cards: Card[] }> {
        return this.fetch<{ cards: Card[] }>(`${this.baseURL}/decks/${deckId}/cards/`);
    }

    async createCard(deckId: number, front: string, back: string): Promise<ApiResponse<Card>> {
        return this.fetch<ApiResponse<Card>>(`${this.baseURL}/decks/${deckId}/cards/create/`, {
            method: 'POST',
            body: JSON.stringify({ front, back }),
        });
    }

    async updateCard(cardId: number, front: string, back: string): Promise<ApiResponse<Card>> {
        return this.fetch<ApiResponse<Card>>(`${this.baseURL}/cards/${cardId}/update/`, {
            method: 'PUT',
            body: JSON.stringify({ front, back }),
        });
    }

    async deleteCard(cardId: number): Promise<ApiResponse<void>> {
        return this.fetch<ApiResponse<void>>(`${this.baseURL}/cards/${cardId}/delete/`, {
            method: 'DELETE',
        });
    }

    // ========================================================================
    // Study Session Endpoints
    // ========================================================================

    async startStudySession(deckId: number): Promise<StudySession> {
        return this.fetch<StudySession>(`${this.baseURL}/decks/${deckId}/study/`, {
            method: 'POST',
        });
    }

    async submitReview(cardId: number, review: ReviewSubmission): Promise<ApiResponse<Card>> {
        return this.fetch<ApiResponse<Card>>(`${this.baseURL}/cards/${cardId}/review/`, {
            method: 'POST',
            body: JSON.stringify(review),
        });
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
const api = new FlashcardAPI();
