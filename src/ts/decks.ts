/**
 * Deck Management Module
 * Handles deck listing, creation, editing, and deletion
 */

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
        const decks = response.decks;

        if (decks.length === 0) {
            deckGrid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-inbox text-muted" style="font-size: 4rem;"></i>
                    <h3 class="mt-3">No decks yet</h3>
                    <p class="text-muted">Create your first deck to get started!</p>
                </div>
            `;
            return;
        }

        deckGrid.innerHTML = decks.map(deck => createDeckCard(deck)).join('');

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
function createDeckCard(deck: any): string {
    const dueClass = deck.cards_due > 0 ? 'text-danger' : 'text-muted';

    return `
        <div class="col-md-6 col-lg-4">
            <div class="card deck-card h-100">
                <div class="card-body">
                    <h5 class="card-title">${escapeHtml(deck.title)}</h5>
                    <p class="card-text text-muted">${escapeHtml(deck.description) || 'No description'}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="badge bg-secondary">${deck.total_cards} cards</span>
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

    if (!createBtn) return;

    createBtn.addEventListener('click', async () => {
        const title = titleInput.value.trim();
        const description = descInput.value.trim();

        if (!title) {
            alert('Please enter a deck title');
            return;
        }

        try {
            createBtn.textContent = 'Creating...';
            createBtn.setAttribute('disabled', 'true');

            const response = await api.createDeck(title, description);

            if (response.success) {
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('createDeckModal')!);
                modal?.hide();

                // Reset form
                titleInput.value = '';
                descInput.value = '';

                // Reload decks
                await loadDecks();
            } else {
                throw new Error(response.error?.message || 'Failed to create deck');
            }
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
        const response = await api.deleteDeck(deckId);

        if (response.success) {
            await loadDecks();
        } else {
            throw new Error(response.error?.message || 'Failed to delete deck');
        }
    } catch (error) {
        console.error('Error deleting deck:', error);
        alert('Failed to delete deck. Please try again.');
    }
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
    initDeckCreation();
});
