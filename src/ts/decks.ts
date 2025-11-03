/**
 * Deck Management Module
 * Handles deck listing, creation, editing, and deletion
 */

import { api } from './api.js';

// Bootstrap is loaded via CDN in the HTML
declare const bootstrap: any;

// ============================================================================
// Deck Loading and Display
// ============================================================================

/**
 * Load and display all user's decks
 */
async function loadDecks(): Promise<void> {
    const deckGrid = document.getElementById('deck-grid');
    if (!deckGrid) return;

    try {
        const response = await api.getDecks();
        const personalDecks = response.personal || [];
        const sharedDecks = response.shared || [];
        const allDecks = [...personalDecks, ...sharedDecks];

        if (allDecks.length === 0) {
            deckGrid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-inbox text-muted" style="font-size: 4rem;"></i>
                    <h3 class="mt-3">No decks yet</h3>
                    <p class="text-muted">Create your first deck to get started!</p>
                </div>
            `;
            return;
        }

        // Mark shared decks
        const personalCards = personalDecks.map(deck => createDeckCard(deck, false));
        const sharedCards = sharedDecks.map(deck => createDeckCard(deck, true));

        deckGrid.innerHTML = [...personalCards, ...sharedCards].join('');

    } catch (error) {
        console.error('Failed to load decks:', error);
        deckGrid.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    Failed to load decks. Please refresh the page.
                </div>
            </div>
        `;
    }
}

/**
 * Create HTML for a single deck card
 */
function createDeckCard(deck: any, isShared: boolean = false): string {
    const sharedBadge = isShared
        ? `<span class="badge bg-info"><i class="bi bi-people-fill"></i> Shared</span> `
        : '';

    const creatorInfo = (isShared && deck.created_by)
        ? `<small class="text-muted d-block">Created by @${escapeHtml(deck.created_by.username)}</small>`
        : '';

    return `
        <div class="col-md-6 col-lg-4">
            <div class="card deck-card h-100">
                <div class="card-body">
                    <h5 class="card-title">
                        ${sharedBadge}${escapeHtml(deck.title)}
                    </h5>
                    ${creatorInfo}
                    <p class="card-text text-muted">${escapeHtml(deck.description) || 'No description'}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="badge bg-secondary">${deck.total_cards} card${deck.total_cards === 1 ? '' : 's'}</span>
                            <span class="badge ${deck.cards_due > 0 ? 'bg-danger' : 'bg-success'}">
                                ${deck.cards_due} due
                            </span>
                        </div>
                    </div>
                </div>
                <div class="card-footer bg-transparent">
                    <div class="btn-group w-100" role="group">
                        <a href="/decks/${deck.id}/" class="btn btn-outline-primary">
                            <i class="bi bi-eye"></i> View
                        </a>
                        <button class="btn btn-outline-secondary" onclick="editDeck(${deck.id}, '${escapeHtml(deck.title)}', '${escapeHtml(deck.description)}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        ${deck.cards_due > 0 ? `
                            <a href="/decks/${deck.id}/study/" class="btn btn-primary">
                                <i class="bi bi-play-circle"></i> Study
                            </a>
                        ` : ''}
                        <button class="btn btn-outline-danger" onclick="deleteDeck(${deck.id}, '${escapeHtml(deck.title)}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============================================================================
// Deck Creation
// ============================================================================

/**
 * Initialize deck creation modal
 */
function initDeckCreation(): void {
    const createBtn = document.getElementById('create-deck-btn');
    const titleInput = document.getElementById('deck-title') as HTMLInputElement;
    const descInput = document.getElementById('deck-description') as HTMLTextAreaElement;
    const sharedCheckbox = document.getElementById('deck-shared') as HTMLInputElement;

    if (!createBtn) return;

    createBtn.addEventListener('click', async () => {
        const title = titleInput.value.trim();
        const description = descInput.value.trim();
        const isShared = sharedCheckbox?.checked || false;

        if (!title) {
            alert('Please enter a deck title');
            return;
        }

        try {
            createBtn.textContent = 'Creating...';
            createBtn.setAttribute('disabled', 'true');

            await api.createDeck(title, description, isShared);

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createDeckModal')!);
            modal?.hide();

            // Reset form
            titleInput.value = '';
            descInput.value = '';
            if (sharedCheckbox) sharedCheckbox.checked = false;

            // Reload decks
            await loadDecks();
        } catch (error) {
            console.error('Error creating deck:', error);
            alert('Failed to create deck. Please try again.');
        } finally {
            createBtn.textContent = 'Create Deck';
            createBtn.removeAttribute('disabled');
        }
    });
}

// ============================================================================
// Deck Deletion
// ============================================================================

/**
 * Delete a deck with confirmation
 */
async function deleteDeck(deckId: number, deckTitle: string): Promise<void> {
    if (!confirm(`Are you sure you want to delete "${deckTitle}"? This will delete all cards in the deck.`)) {
        return;
    }

    try {
        await api.deleteDeck(deckId);
        await loadDecks();
    } catch (error) {
        console.error('Error deleting deck:', error);
        alert('Failed to delete deck. Please try again.');
    }
}

// ============================================================================
// Edit Deck
// ============================================================================

/**
 * Open edit modal and populate with deck data
 */
function editDeck(deckId: number, title: string, description: string): void {
    document.getElementById('edit-deck-id')!.setAttribute('value', deckId.toString());
    (document.getElementById('edit-deck-title')! as HTMLInputElement).value = title;
    (document.getElementById('edit-deck-description')! as HTMLTextAreaElement).value = description;

    // Show modal
    const modal = new (window as any).bootstrap.Modal(document.getElementById('editDeckModal'));
    modal.show();
}

/**
 * Initialize deck edit form
 */
function initDeckEdit(): void {
    const updateBtn = document.getElementById('update-deck-btn');
    if (!updateBtn) return;

    updateBtn.addEventListener('click', async () => {
        const deckId = parseInt(document.getElementById('edit-deck-id')!.getAttribute('value') || '0');
        const title = (document.getElementById('edit-deck-title')! as HTMLInputElement).value.trim();
        const description = (document.getElementById('edit-deck-description')! as HTMLTextAreaElement).value.trim();

        if (!title) {
            alert('Please enter a deck title');
            return;
        }

        try {
            await api.updateDeck(deckId, title, description);

            // Close modal
            const modal = (window as any).bootstrap.Modal.getInstance(document.getElementById('editDeckModal'));
            if (modal) modal.hide();

            // Reload decks
            await loadDecks();
        } catch (error) {
            console.error('Error updating deck:', error);
            alert('Failed to update deck. Please try again.');
        }
    });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadDecks();
    initDeckCreation();
    initDeckEdit();

    // Expose functions to global scope for HTML onclick handlers
    (window as any).deleteDeck = deleteDeck;
    (window as any).editDeck = editDeck;
});

// Make this file a module to avoid global scope conflicts
export {};
