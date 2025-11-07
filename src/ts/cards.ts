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
        const deckType = deck.type === 'course' ? 'Course' : 'Collection';
        document.getElementById('deck-title-breadcrumb')!.textContent = `${deckType}: ${deck.title}`;
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
        const response = await api.getCards(deckId);
        const cards = response.cards;

        if (cards.length === 0) {
            cardsList.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-file-text text-muted" style="font-size: 3rem;"></i>
                    <p class="mt-3 text-muted">No cards yet. Add your first card!</p>
                </div>
            `;
            return;
        }

        cardsList.innerHTML = cards.map((card: any) => createCardItem(card)).join('');

        // Attach event listeners to card action buttons
        attachCardEventListeners();

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
    // Support both new language fields and legacy front/back
    const langA = card.language_a || card.front || '';
    const langB = card.language_b || card.back || '';
    const context = card.context || '';

    return `
        <div class="card card-item mb-2">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-5">
                        <strong>Language A:</strong>
                        <p class="mb-0">${escapeHtml(langA)}</p>
                    </div>
                    <div class="col-md-5">
                        <strong>Language B:</strong>
                        <p class="mb-0">${escapeHtml(langB)}</p>
                        ${context ? `<small class="text-muted d-block mt-1"><em>${escapeHtml(context)}</em></small>` : ''}
                    </div>
                    <div class="col-md-2 text-end">
                        <div class="btn-group mt-2">
                            <button class="btn btn-sm btn-outline-primary card-edit-btn"
                                    data-card-id="${card.id}"
                                    data-language-a="${escapeHtml(langA)}"
                                    data-language-b="${escapeHtml(langB)}"
                                    data-context="${escapeHtml(context)}">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger card-delete-btn"
                                    data-card-id="${card.id}"
                                    data-deck-id="${card.deck}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Attach event listeners to card action buttons
 */
function attachCardEventListeners(): void {
    // Attach edit button listeners
    const editButtons = document.querySelectorAll('.card-edit-btn');
    editButtons.forEach((button) => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const btn = button as HTMLElement;
            const cardId = parseInt(btn.dataset.cardId || '0', 10);
            const languageA = btn.dataset.languageA || '';
            const languageB = btn.dataset.languageB || '';
            const context = btn.dataset.context || '';
            editCard(cardId, languageA, languageB, context);
        });
    });

    // Attach delete button listeners
    const deleteButtons = document.querySelectorAll('.card-delete-btn');
    deleteButtons.forEach((button) => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const btn = button as HTMLElement;
            const cardId = parseInt(btn.dataset.cardId || '0', 10);
            const deckId = parseInt(btn.dataset.deckId || '0', 10);
            deleteCard(cardId, deckId);
        });
    });
}

// ============================================================================
// Card Creation
// ============================================================================

/**
 * Initialize card creation
 */
function initCardCreation(deckId: number): void {
    const createBtn = document.getElementById('create-card-btn');
    const langAInput = document.getElementById('card-language-a') as HTMLTextAreaElement;
    const langBInput = document.getElementById('card-language-b') as HTMLTextAreaElement;
    const contextInput = document.getElementById('card-context') as HTMLTextAreaElement;

    if (!createBtn) return;

    createBtn.addEventListener('click', async () => {
        const language_a = langAInput.value.trim();
        const language_b = langBInput.value.trim();
        const context = contextInput.value.trim();

        if (!language_a || !language_b) {
            alert('Please fill in both language fields');
            return;
        }

        try {
            createBtn.textContent = 'Adding...';
            createBtn.setAttribute('disabled', 'true');

            await api.createCard(deckId, language_a, language_b, context);

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createCardModal')!);
            modal?.hide();

            // Reset form
            langAInput.value = '';
            langBInput.value = '';
            contextInput.value = '';

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
function editCard(cardId: number, language_a: string, language_b: string, context: string = ''): void {
    const editModal = new bootstrap.Modal(document.getElementById('editCardModal')!);
    const idInput = document.getElementById('edit-card-id') as HTMLInputElement;
    const langAInput = document.getElementById('edit-card-language-a') as HTMLTextAreaElement;
    const langBInput = document.getElementById('edit-card-language-b') as HTMLTextAreaElement;
    const contextInput = document.getElementById('edit-card-context') as HTMLTextAreaElement;

    idInput.value = cardId.toString();
    langAInput.value = language_a;
    langBInput.value = language_b;
    contextInput.value = context;

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
        const language_a = (document.getElementById('edit-card-language-a') as HTMLTextAreaElement).value.trim();
        const language_b = (document.getElementById('edit-card-language-b') as HTMLTextAreaElement).value.trim();
        const context = (document.getElementById('edit-card-context') as HTMLTextAreaElement).value.trim();

        if (!language_a || !language_b) {
            alert('Please fill in both language fields');
            return;
        }

        try {
            updateBtn.textContent = 'Saving...';
            updateBtn.setAttribute('disabled', 'true');

            await api.updateCard(cardId, language_a, language_b, context);

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
