/**
 * Study Session Module
 * Handles interactive flashcard study with spaced repetition
 */

import { api } from './api.js';

// ============================================================================
// Study Session Controller Class
// ============================================================================

class StudyController {
	private deckId: number;
	private cards: any[] = [];
	private currentIndex: number = 0;
	private sessionId: number = 0;
	private cardStartTime: number = 0;
	private sessionStartTime: number = 0;
	private flipped: boolean = false;

	constructor(deckId: number) {
		this.deckId = deckId;
	}

	/**
	 * Start the study session
	 */
	async start(): Promise<void> {
		try {
			const response = await api.startStudySession(this.deckId);

			this.sessionId = response.session_id;
			this.cards = response.cards;
			this.sessionStartTime = Date.now();

			// Hide loading, show appropriate state
			this.hideLoading();

			if (this.cards.length === 0) {
				this.showNoCards();
			} else {
				this.showCardDisplay();
				this.showCard();
			}
		} catch (error) {
			console.error("Failed to start study session:", error);
			alert("Failed to load study session. Please try again.");
		}
	}

	/**
	 * Display current card
	 */
	showCard(): void {
		if (this.currentIndex >= this.cards.length) {
			this.endSession();
			return;
		}

		const card = this.cards[this.currentIndex];
		this.flipped = false;
		this.cardStartTime = Date.now();

		// Update card content
		document.getElementById("card-front-text")!.textContent = card.front;
		document.getElementById("card-back-text")!.textContent = card.back;

		// Reset card to front
		const flashcard = document.getElementById("flashcard")!;
		flashcard.classList.remove("flipped");

		// Update progress
		this.updateProgress();

		// Set up flip button
		const flipBtn = document.getElementById("flip-btn")!;
		flipBtn.onclick = () => this.flipCard();
	}

	/**
	 * Flip the card to show answer
	 */
	flipCard(): void {
		if (this.flipped) return;

		this.flipped = true;
		const flashcard = document.getElementById("flashcard")!;
		flashcard.classList.add("flipped");
	}

	/**
	 * Submit rating and move to next card
	 */
	async submitRating(quality: number): Promise<void> {
		if (!this.flipped) {
			alert("Please flip the card first to see the answer!");
			return;
		}

		const card = this.cards[this.currentIndex];
		const timeSpent = Math.floor((Date.now() - this.cardStartTime) / 1000);

		try {
			await api.submitReview(card.id, {
				session_id: this.sessionId,
				quality: quality,
				time_taken: timeSpent,
			});

			this.nextCard();
		} catch (error) {
			console.error("Failed to submit review:", error);
			alert("Failed to save review. Please try again.");
		}
	}

	/**
	 * Move to next card
	 */
	nextCard(): void {
		this.currentIndex++;

		if (this.currentIndex < this.cards.length) {
			this.showCard();
		} else {
			this.endSession();
		}
	}

	/**
	 * End study session and show summary
	 */
	endSession(): void {
		const totalTime = Math.floor((Date.now() - this.sessionStartTime) / 1000);

		// Hide card display
		document.getElementById("card-display")!.classList.add("d-none");

		// Show completion state
		const completionState = document.getElementById("completion-state")!;
		completionState.classList.remove("d-none");

		// Update summary
		document.getElementById("summary-cards")!.textContent =
			this.cards.length.toString();
		document.getElementById("summary-time")!.textContent =
			this.formatTime(totalTime);
	}

	/**
	 * Update progress bar and text
	 */
	private updateProgress(): void {
		const progress = ((this.currentIndex + 1) / this.cards.length) * 100;
		document.getElementById("progress-bar")!.style.width = `${progress}%`;
		document.getElementById("progress-text")!.textContent = `Card ${
			this.currentIndex + 1
		} of ${this.cards.length}`;
	}

	/**
	 * Format seconds to MM:SS
	 */
	private formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	}

	/**
	 * Hide loading state
	 */
	private hideLoading(): void {
		document.getElementById("loading-state")!.classList.add("d-none");
	}

	/**
	 * Show no cards state
	 */
	private showNoCards(): void {
		document.getElementById("no-cards-state")!.classList.remove("d-none");
	}

	/**
	 * Show card display
	 */
	private showCardDisplay(): void {
		document.getElementById("card-display")!.classList.remove("d-none");
	}
}

// ============================================================================
// Global Session Instance
// ============================================================================

let currentSession: StudyController | null = null;

/**
 * Start a new study session
 */
async function startStudySession(deckId: number): Promise<void> {
	currentSession = new StudyController(deckId);
	await currentSession.start();
}

/**
 * Submit rating (called from HTML onclick)
 */
function submitRating(quality: number): void {
	if (currentSession) {
		currentSession.submitRating(quality);
	}
}

// ============================================================================
// Keyboard Shortcuts
// ============================================================================

document.addEventListener("keydown", (event: KeyboardEvent) => {
	if (!currentSession) return;

	// Space to flip
	if (event.code === "Space") {
		event.preventDefault();
		currentSession.flipCard();
	}

	// 0-5 to rate
	const num = parseInt(event.key);
	if (num >= 0 && num <= 5) {
		event.preventDefault();
		submitRating(num);
	}

	// Escape to exit (with confirmation)
	if (event.code === "Escape") {
		const exitLink = document.getElementById("exit-study");
		if (
			exitLink &&
			confirm("Are you sure you want to exit this study session?")
		) {
			window.location.href = exitLink.getAttribute("href") || "/";
		}
	}
});

// ============================================================================
// Exit Confirmation
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
	const exitLink = document.getElementById("exit-study");
	if (exitLink) {
		exitLink.addEventListener("click", (e: Event) => {
			if (!confirm("Are you sure you want to exit this study session?")) {
				e.preventDefault();
			}
		});
	}

	// Expose functions to global scope for HTML onclick handlers
	(window as any).startStudySession = startStudySession;
	(window as any).submitRating = submitRating;
});

// Make this file a module to avoid global scope conflicts
export {};
