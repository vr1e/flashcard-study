/**
 * Card Management Module
 * Handles card CRUD operations within decks
 */

import { api } from './api.js';

// Bootstrap is loaded via CDN in the HTML
declare const bootstrap: any;

// ============================================================================
// Deck Details Loading
// ============================================================================

/**
 * Load and display deck details
 */
async function loadDeckDetails(deckId: number): Promise<void> {
    try {
        const deck = await api.getDeck(deckId);

        // Update page elements
        document.getElementById('deck-title')!.textContent = deck.title;
        document.getElementById('deck-description')!.textContent = deck.description || 'No description';
        document.getElementById('deck-title-breadcrumb')!.textContent = deck.title;
        document.getElementById('cards-due-badge')!.textContent =
            `${deck.cards_due} card${deck.cards_due === 1 ? '' : 's'} due`;
        document.getElementById('total-cards-badge')!.textContent =
            `${deck.total_cards} card${deck.total_cards === 1 ? '' : 's'}`;

        // Set up study button
        const studyBtn = document.getElementById('study-btn')!;
        if (deck.cards_due > 0) {
            studyBtn.onclick = () => window.location.href = `/decks/${deckId}/study/`;
        } else {
            studyBtn.classList.add('disabled');
            studyBtn.textContent = 'No cards due';
        }

    } catch (error) {
        console.error('Failed to load deck details:', error);
    }
}

// ============================================================================
// Card Loading and Display
// ============================================================================

/**
 * Load and display all cards in a deck
 */
async function loadCards(deckId: number): Promise<void> {
    const cardsList = document.getElementById('cards-list');
    if (!cardsList) return;

    try {
        const cards = await api.getCards(deckId);

        if (cards.length === 0) {
            cardsList.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-file-text text-muted" style="font-size: 3rem;"></i>
                    <p class="mt-3 text-muted">No cards yet. Add your first card!</p>
                </div>
            `;
            return;
        }

        cardsList.innerHTML = cards.map(card => createCardItem(card)).join('');

    } catch (error) {
        console.error('Failed to load cards:', error);
        cardsList.innerHTML = `
            <div class="alert alert-danger">
                Failed to load cards. Please refresh the page.
            </div>
        `;
    }
}

/**
 * Create HTML for a single card item
 */
function createCardItem(card: any): string {
    const nextReview = new Date(card.next_review);
    const isOverdue = nextReview < new Date();
    const reviewClass = isOverdue ? 'text-danger' : 'text-success';

    return `
        <div class="card card-item mb-2">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-5">
                        <strong>Front:</strong>
                        <p class="mb-0">${escapeHtml(card.front)}</p>
                    </div>
                    <div class="col-md-5">
                        <strong>Back:</strong>
                        <p class="mb-0">${escapeHtml(card.back)}</p>
                    </div>
                    <div class="col-md-2 text-end">
                        <small class="${reviewClass}">
                            <i class="bi bi-calendar"></i>
                            ${formatDate(nextReview)}
                        </small>
                        <div class="btn-group mt-2">
                            <button class="btn btn-sm btn-outline-primary" onclick="editCard(${card.id}, '${escapeHtml(card.front)}', '${escapeHtml(card.back)}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteCard(${card.id}, ${card.deck})">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============================================================================
// Card Creation
// ============================================================================

/**
 * Initialize card creation
 */
function initCardCreation(deckId: number): void {
    const createBtn = document.getElementById('create-card-btn');
    const frontInput = document.getElementById('card-front') as HTMLTextAreaElement;
    const backInput = document.getElementById('card-back') as HTMLTextAreaElement;

    if (!createBtn) return;

    createBtn.addEventListener('click', async () => {
        const front = frontInput.value.trim();
        const back = backInput.value.trim();

        if (!front || !back) {
            alert('Please fill in both front and back');
            return;
        }

        try {
            createBtn.textContent = 'Adding...';
            createBtn.setAttribute('disabled', 'true');

            await api.createCard(deckId, front, back);

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createCardModal')!);
            modal?.hide();

            // Reset form
            frontInput.value = '';
            backInput.value = '';

            // Reload cards and deck details
            await Promise.all([
                loadCards(deckId),
                loadDeckDetails(deckId)
            ]);
        } catch (error) {
            console.error('Error creating card:', error);
            alert('Failed to create card. Please try again.');
        } finally {
            createBtn.textContent = 'Add Card';
            createBtn.removeAttribute('disabled');
        }
    });
}

// ============================================================================
// Card Editing
// ============================================================================

/**
 * Open edit modal for a card
 */
function editCard(cardId: number, front: string, back: string): void {
    const editModal = new bootstrap.Modal(document.getElementById('editCardModal')!);
    const idInput = document.getElementById('edit-card-id') as HTMLInputElement;
    const frontInput = document.getElementById('edit-card-front') as HTMLTextAreaElement;
    const backInput = document.getElementById('edit-card-back') as HTMLTextAreaElement;

    idInput.value = cardId.toString();
    frontInput.value = front;
    backInput.value = back;

    editModal.show();
}

/**
 * Initialize card editing
 */
function initCardEditing(deckId: number): void {
    const updateBtn = document.getElementById('update-card-btn');
    if (!updateBtn) return;

    updateBtn.addEventListener('click', async () => {
        const cardId = parseInt((document.getElementById('edit-card-id') as HTMLInputElement).value);
        const front = (document.getElementById('edit-card-front') as HTMLTextAreaElement).value.trim();
        const back = (document.getElementById('edit-card-back') as HTMLTextAreaElement).value.trim();

        if (!front || !back) {
            alert('Please fill in both front and back');
            return;
        }

        try {
            updateBtn.textContent = 'Saving...';
            updateBtn.setAttribute('disabled', 'true');

            await api.updateCard(cardId, front, back);

            const modal = bootstrap.Modal.getInstance(document.getElementById('editCardModal')!);
            modal?.hide();

            await loadCards(deckId);
        } catch (error) {
            console.error('Error updating card:', error);
            alert('Failed to update card. Please try again.');
        } finally {
            updateBtn.textContent = 'Save Changes';
            updateBtn.removeAttribute('disabled');
        }
    });
}

// ============================================================================
// Card Deletion
// ============================================================================

/**
 * Delete a card with confirmation
 */
async function deleteCard(cardId: number, deckId: number): Promise<void> {
    if (!confirm('Are you sure you want to delete this card?')) {
        return;
    }

    try {
        await api.deleteCard(cardId);

        await Promise.all([
            loadCards(deckId),
            loadDeckDetails(deckId)
        ]);
    } catch (error) {
        console.error('Error deleting card:', error);
        alert('Failed to delete card. Please try again.');
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(date: Date): string {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `${diffDays} days`;
}

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    const deckId = parseInt(window.location.pathname.split('/')[2]);
    if (deckId) {
        initCardCreation(deckId);
        initCardEditing(deckId);
        loadDeckDetails(deckId);
        loadCards(deckId);
    }

    // Expose functions to global scope for HTML onclick handlers and template scripts
    (window as any).editCard = editCard;
    (window as any).deleteCard = deleteCard;
    (window as any).loadDeckDetails = loadDeckDetails;
    (window as any).loadCards = loadCards;
});

// Make this file a module to avoid global scope conflicts
export {};
