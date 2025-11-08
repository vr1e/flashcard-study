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
	private timerInterval: number | null = null;
	private qualityRatings: number[] = [];

	constructor(deckId: number) {
		this.deckId = deckId;
	}

	/**
	 * Start the study session with selected direction
	 */
	async start(direction: 'A_TO_B' | 'B_TO_A' | 'RANDOM' = 'A_TO_B'): Promise<void> {
		// Hide direction selector and show loading
		document.getElementById('direction-selector')!.style.display = 'none';
		document.getElementById('loading-state')!.style.display = 'block';

		try {
			const response = await api.startStudySession(this.deckId, direction);

			this.sessionId = response.session_id;
			this.cards = response.cards;
			this.sessionStartTime = Date.now();

			// Hide loading, show appropriate state
			this.hideLoading();

			if (this.cards.length === 0) {
				this.showNoCards();
			} else {
				this.showCardDisplay();
				this.startTimer();
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

		// Update card content (support both old and new formats)
		const question = card.question || card.front;
		const answer = card.answer || card.back;
		document.getElementById("card-front-text")!.textContent = question;
		document.getElementById("card-back-text")!.textContent = answer;

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

		// Warn if card.direction is missing (potential data integrity issue)
		const direction = card.direction || 'A_TO_B';
		if (!card.direction) {
			console.warn(`Card ${card.id} is missing direction field, defaulting to 'A_TO_B'. This may indicate a data integrity issue.`);
		}

		try {
			await api.submitReview(card.id, {
				session_id: this.sessionId,
				quality: quality,
				time_taken: timeSpent,
				direction: direction,
			});

			// Track quality for average calculation
			this.qualityRatings.push(quality);

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
		this.stopTimer();
		const totalTime = Math.floor((Date.now() - this.sessionStartTime) / 1000);

		// Calculate average quality
		const avgQuality =
			this.qualityRatings.length > 0
				? (
						this.qualityRatings.reduce((a, b) => a + b, 0) /
						this.qualityRatings.length
				  ).toFixed(1)
				: "-";

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
		document.getElementById("summary-quality")!.textContent = avgQuality;
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
	 * Start the timer and update display every second
	 */
	private startTimer(): void {
		this.updateTimerDisplay();
		this.timerInterval = window.setInterval(() => {
			this.updateTimerDisplay();
		}, 1000);
	}

	/**
	 * Stop the timer
	 */
	private stopTimer(): void {
		if (this.timerInterval !== null) {
			clearInterval(this.timerInterval);
			this.timerInterval = null;
		}
	}

	/**
	 * Update timer display
	 */
	private updateTimerDisplay(): void {
		const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
		const timerDisplay = document.getElementById("timer-display");
		if (timerDisplay) {
			timerDisplay.innerHTML = `<i class="bi bi-clock"></i> ${this.formatTime(elapsed)}`;
		}
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
 * Start a new study session (called from direction selector)
 */
async function startStudyWithDirection(direction: 'A_TO_B' | 'B_TO_A' | 'RANDOM'): Promise<void> {
	const deckId = parseInt(window.location.pathname.split('/')[2]);
	if (deckId && !currentSession) {
		currentSession = new StudyController(deckId);
		await currentSession.start(direction);
	}
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
	(window as any).startStudyWithDirection = startStudyWithDirection;
	(window as any).submitRating = submitRating;
});

// Make this file a module to avoid global scope conflicts
export {};
