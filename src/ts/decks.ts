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
 * Load and display all user's decks with progressive disclosure
 */
async function loadDecks(): Promise<void> {
    const loading = document.getElementById('decks-loading');
    const singleModeView = document.getElementById('single-mode-view');
    const dualModeView = document.getElementById('dual-mode-view');
    const coursesSection = document.getElementById('courses-section');
    const collectionsSection = document.getElementById('collections-section');
    const singleCollectionsSection = document.getElementById('single-collections-section');
    const singlePendingSection = document.getElementById('single-pending-section');
    const noDecks = document.getElementById('no-decks');
    const coursesGrid = document.getElementById('courses-grid');
    const collectionsGrid = document.getElementById('collections-grid');
    const singleCollectionsGrid = document.getElementById('single-collections-grid');
    const singlePendingGrid = document.getElementById('single-pending-grid');

    if (!loading || !singleModeView || !dualModeView) return;

    try {
        // Fetch both decks and partnership status
        const [decksResponse, partnershipResponse] = await Promise.all([
            api.getDecks(),
            api.getPartnership()
        ]);

        const collections = decksResponse.collections || [];
        const courses = decksResponse.courses || [];
        const pendingCourses = decksResponse.pending_courses || [];
        const hasPartnership = partnershipResponse !== null;

        // Hide loading
        loading.style.display = 'none';

        if (collections.length === 0 && courses.length === 0 && pendingCourses.length === 0) {
            if (noDecks) noDecks.style.display = 'block';
            return;
        }

        // Progressive disclosure based on partnership status
        if (hasPartnership) {
            // DUAL MODE: Show both partner and personal sections
            singleModeView.style.display = 'none';
            dualModeView.style.display = ''; // Remove inline style to let CSS grid take over

            // Show courses section if any (include any not-yet-promoted pending decks)
            const allCourses = [...courses, ...pendingCourses];
            if (allCourses.length > 0 && coursesSection && coursesGrid) {
                coursesSection.style.display = 'block';
                const courseCards = allCourses.map(deck => createDeckCard(deck, true));
                coursesGrid.innerHTML = courseCards.join('');
            }

            // Show collections section if any
            if (collections.length > 0 && collectionsSection && collectionsGrid) {
                collectionsSection.style.display = 'block';
                const collectionCards = collections.map(deck => createDeckCard(deck, false));
                collectionsGrid.innerHTML = collectionCards.join('');
            }
        } else {
            // SINGLE MODE: Show collections + any pending shared courses, with invite banner
            singleModeView.style.display = 'block';
            dualModeView.style.display = 'none';

            // Show pending shared courses (created before partnering)
            if (pendingCourses.length > 0 && singlePendingSection && singlePendingGrid) {
                singlePendingSection.style.display = 'block';
                const pendingCards = pendingCourses.map(deck => createDeckCard(deck, true));
                singlePendingGrid.innerHTML = pendingCards.join('');
            } else if (singlePendingSection) {
                singlePendingSection.style.display = 'none';
            }

            // Show collections in single mode
            if (collections.length > 0 && singleCollectionsSection && singleCollectionsGrid) {
                singleCollectionsSection.style.display = 'block';
                const collectionCards = collections.map(deck => createDeckCard(deck, false));
                singleCollectionsGrid.innerHTML = collectionCards.join('');
            }
        }

        // Load activity feed if in dual mode with partnership
        if (hasPartnership) {
            await loadActivityFeed();
        }

    } catch (error) {
        console.error('Failed to load decks:', error);
        loading.innerHTML = `
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
function createDeckCard(deck: any, isCourse: boolean = false): string {
    const typeBadge = deck.share_pending
        ? `<span class="badge bg-warning text-dark"><i class="bi bi-hourglass-split"></i> Pending share</span> `
        : isCourse
        ? `<span class="badge course-badge"><i class="bi bi-people-fill"></i> Course</span> `
        : `<span class="badge collection-badge"><i class="bi bi-book"></i> Collection</span> `;

    const creatorInfo = deck.share_pending
        ? `<small class="text-muted d-block">Shared automatically once you partner up</small>`
        : (isCourse && deck.created_by)
        ? `<small class="text-muted d-block">Created by @${escapeHtml(deck.created_by.username)}</small>`
        : '';

    const studyBtn = deck.cards_due > 0
        ? `<a href="/decks/${deck.id}/study/" class="btn btn-primary flex-fill">
                <i class="bi bi-play-circle"></i> Study
            </a>`
        : '';

    return `
            <div class="card deck-card h-100">
                <div class="card-body">
                    <div class="mb-2">${typeBadge}</div>
                    <h5 class="card-title">${escapeHtml(deck.title)}</h5>
                    ${creatorInfo}
                    <p class="card-text text-muted">${escapeHtml(deck.description) || 'No description'}</p>
                    <div class="d-flex gap-2">
                        <span class="badge bg-secondary">${deck.total_cards} card${deck.total_cards === 1 ? '' : 's'}</span>
                        <span class="badge ${deck.cards_due > 0 ? 'bg-danger' : 'bg-success'}">
                            ${deck.cards_due} due
                        </span>
                    </div>
                </div>
                <div class="card-footer bg-transparent">
                    <div class="deck-actions d-flex gap-2">
                        <a href="/decks/${deck.id}/" class="btn btn-outline-primary flex-fill">
                            <i class="bi bi-eye"></i> View
                        </a>
                        ${studyBtn}
                        <button class="btn btn-outline-secondary" title="Edit" aria-label="Edit" onclick="editDeck(${deck.id}, '${escapeHtml(deck.title)}', '${escapeHtml(deck.description)}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger" title="Delete" aria-label="Delete" onclick="deleteDeck(${deck.id}, '${escapeHtml(deck.title)}')">
                            <i class="bi bi-trash"></i>
                        </button>
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
            const message = error instanceof Error ? error.message : 'Failed to create deck. Please try again.';
            alert(message);
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
// Activity Feed
// ============================================================================

/**
 * Load and display partnership activity feed
 */
async function loadActivityFeed(): Promise<void> {
    const activityFeed = document.getElementById('activity-feed');
    if (!activityFeed) return;

    try {
        const response = await api.getActivities(10);

        if (!response.has_partnership || response.activities.length === 0) {
            activityFeed.innerHTML = '<div class="text-center text-muted py-3">No recent activity</div>';
            return;
        }

        const activitiesHtml = response.activities.map((activity: any) => {
            const timeAgo = formatTimeAgo(new Date(activity.created_at));
            return `
                <div class="activity-item">
                    <div class="activity-time">${timeAgo}</div>
                    <p class="activity-text">
                        <span class="activity-user">@${escapeHtml(activity.user.username)}</span>
                        ${escapeHtml(activity.display_text)}
                    </p>
                </div>
            `;
        }).join('');

        activityFeed.innerHTML = activitiesHtml;

    } catch (error) {
        console.error('Failed to load activity feed:', error);
        activityFeed.innerHTML = '<div class="text-center text-muted py-3">Failed to load activities</div>';
    }
}

/**
 * Format timestamp as "X minutes ago", "X hours ago", etc.
 */
function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
        return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else {
        return 'Just now';
    }
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
