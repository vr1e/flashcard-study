/**
 * Statistics Module
 * Handles data visualization and analytics using Chart.js
 */

import { api } from './api.js';

// Chart.js is loaded via CDN in the HTML
declare const Chart: any;

// ============================================================================
// Chart Instances
// ============================================================================

let cardsDueChart: any;
let studyActivityChart: any;
let deckQualityChart: any;
let qualityDistributionChart: any;

// ============================================================================
// Load Statistics
// ============================================================================

/**
 * Load and display user statistics
 */
async function loadStatistics(): Promise<void> {
    try {
        const stats = await api.getUserStats();

        // Update summary cards
        document.getElementById('total-decks')!.textContent = stats.total_decks.toString();
        document.getElementById('total-cards')!.textContent = stats.total_cards.toString();
        document.getElementById('cards-due')!.textContent = stats.cards_due_today.toString();
        document.getElementById('study-streak')!.textContent = stats.study_streak_days.toString();

        // Update charts with data
        updateCardsDueChart(stats);
        updateStudyActivityChart(stats);
        updateDeckQualityChart(stats);
        updateQualityDistributionChart(stats);

        // Load recent sessions
        loadRecentSessions(stats);

    } catch (error) {
        console.error('Failed to load statistics:', error);
    }
}

// ============================================================================
// Initialize Charts
// ============================================================================

/**
 * Initialize all Chart.js charts
 */
function initializeCharts(): void {
    // Cards Due Chart (Line)
    const cardsDueCtx = document.getElementById('cards-due-chart') as HTMLCanvasElement;
    cardsDueChart = new Chart(cardsDueCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Cards Due',
                data: [],
                borderColor: 'rgb(13, 110, 253)',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    // Study Activity Chart (Bar)
    const studyActivityCtx = document.getElementById('study-activity-chart') as HTMLCanvasElement;
    studyActivityChart = new Chart(studyActivityCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Cards Studied',
                data: [],
                backgroundColor: 'rgba(25, 135, 84, 0.8)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    // Deck Quality Chart (Bar)
    const deckQualityCtx = document.getElementById('deck-quality-chart') as HTMLCanvasElement;
    deckQualityChart = new Chart(deckQualityCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Average Quality',
                data: [],
                backgroundColor: 'rgba(255, 193, 7, 0.8)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5
                }
            }
        }
    });

    // Quality Distribution Chart (Doughnut)
    const qualityDistCtx = document.getElementById('quality-distribution-chart') as HTMLCanvasElement;
    qualityDistributionChart = new Chart(qualityDistCtx, {
        type: 'doughnut',
        data: {
            labels: ['0 - Blackout', '1 - Hard', '2 - Medium', '3 - Good', '4 - Easy', '5 - Perfect'],
            datasets: [{
                data: [0, 0, 0, 0, 0, 0],
                backgroundColor: [
                    'rgba(220, 53, 69, 0.8)',
                    'rgba(255, 193, 7, 0.8)',
                    'rgba(255, 193, 7, 0.6)',
                    'rgba(13, 202, 240, 0.8)',
                    'rgba(25, 135, 84, 0.8)',
                    'rgba(13, 110, 253, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true
        }
    });
}

// ============================================================================
// Update Charts with Data
// ============================================================================

/**
 * Update cards due chart
 */
function updateCardsDueChart(_stats: any): void {
    // TODO: Implement with real data from stats
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = [12, 15, 8, 10, 20, 5, 3]; // Placeholder

    cardsDueChart.data.labels = labels;
    cardsDueChart.data.datasets[0].data = data;
    cardsDueChart.update();
}

/**
 * Update study activity chart
 */
function updateStudyActivityChart(stats: any): void {
    if (!stats.recent_activity || stats.recent_activity.length === 0) {
        return;
    }

    const labels = stats.recent_activity.map((a: any) => formatDate(new Date(a.date)));
    const data = stats.recent_activity.map((a: any) => a.cards_studied);

    studyActivityChart.data.labels = labels;
    studyActivityChart.data.datasets[0].data = data;
    studyActivityChart.update();
}

/**
 * Update deck quality chart
 */
function updateDeckQualityChart(_stats: any): void {
    // TODO: Implement with real deck-specific data
    const labels = ['Deck 1', 'Deck 2', 'Deck 3']; // Placeholder
    const data = [4.2, 3.8, 4.5]; // Placeholder

    deckQualityChart.data.labels = labels;
    deckQualityChart.data.datasets[0].data = data;
    deckQualityChart.update();
}

/**
 * Update quality distribution chart
 */
function updateQualityDistributionChart(_stats: any): void {
    // TODO: Implement with real quality distribution data
    const data = [5, 10, 15, 30, 25, 15]; // Placeholder

    qualityDistributionChart.data.datasets[0].data = data;
    qualityDistributionChart.update();
}

// ============================================================================
// Recent Sessions
// ============================================================================

/**
 * Load and display recent study sessions
 */
function loadRecentSessions(stats: any): void {
    const container = document.getElementById('recent-sessions');
    if (!container) return;

    if (!stats.recent_activity || stats.recent_activity.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No recent study sessions</p>';
        return;
    }

    const tableHtml = `
        <table class="table table-hover">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Cards Studied</th>
                    <th>Time Spent</th>
                </tr>
            </thead>
            <tbody>
                ${stats.recent_activity.map((session: any) => `
                    <tr>
                        <td>${formatDate(new Date(session.date))}</td>
                        <td>${session.cards_studied}</td>
                        <td>${formatSeconds(session.time_spent)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHtml;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format date to readable string
 */
function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format seconds to readable time
 */
function formatSeconds(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins === 0) {
        return `${secs}s`;
    }

    return `${mins}m ${secs}s`;
}

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Expose functions to global scope for HTML
    (window as any).loadStatistics = loadStatistics;
    (window as any).initializeCharts = initializeCharts;
});

// Make this file a module to avoid global scope conflicts
export {};
