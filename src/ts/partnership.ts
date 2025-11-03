/**
 * Partnership Management Module
 * Handles partnership UI interactions and state
 */

import { api } from "./api.js";

// ============================================================================
// State Management
// ============================================================================

let currentPartnership: any | null = null;

// ============================================================================
// Navbar Partnership Status
// ============================================================================

/**
 * Initialize and render partnership status in navbar
 */
export async function initNavbarPartnership(): Promise<void> {
	const container = document.getElementById("partnership-nav-status");
	if (!container) return;

	try {
		currentPartnership = await api.getPartnership();
		renderNavbarStatus(container, currentPartnership);
	} catch (error) {
		console.error("Failed to load partnership:", error);
	}
}

function renderNavbarStatus(container: HTMLElement, partnership: any | null): void {
	if (partnership) {
		container.innerHTML = `
			<a href="#" class="nav-link" onclick="window.showPartnershipModal(); return false;">
				<i class="bi bi-people-fill"></i> @${partnership.partner.username}
			</a>
		`;
	} else {
		container.innerHTML = `
			<a href="#" class="nav-link" onclick="window.showPartnershipModal(); return false;">
				<i class="bi bi-person-plus"></i> Invite Partner
			</a>
		`;
	}
}

// ============================================================================
// Dashboard Partnership Card
// ============================================================================

/**
 * Initialize and render partnership card in dashboard
 */
export async function initDashboardPartnership(): Promise<void> {
	const container = document.getElementById("partnership-card-content");
	if (!container) return;

	try {
		currentPartnership = await api.getPartnership();
		renderDashboardCard(container, currentPartnership);
	} catch (error) {
		console.error("Failed to load partnership:", error);
	}
}

function renderDashboardCard(container: HTMLElement, partnership: any | null): void {
	if (partnership) {
		const createdDate = new Date(partnership.created_at).toLocaleDateString();
		container.innerHTML = `
			<div class="d-flex justify-content-between align-items-center">
				<div>
					<h6 class="mb-1">
						<i class="bi bi-people-fill text-success"></i>
						Partnered with <strong>@${partnership.partner.username}</strong>
					</h6>
					<small class="text-muted">Since ${createdDate} • ${partnership.shared_decks_count} shared deck(s)</small>
				</div>
				<div>
					<button class="btn btn-sm btn-outline-danger" onclick="window.confirmDissolvePartnership()">
						<i class="bi bi-x-circle"></i> Dissolve
					</button>
				</div>
			</div>
		`;
	} else {
		container.innerHTML = `
			<div class="text-center py-3">
				<i class="bi bi-people" style="font-size: 2rem; color: #6c757d;"></i>
				<p class="mt-2 mb-3">No active partnership</p>
				<button class="btn btn-primary btn-sm me-2" onclick="window.showInviteModal()">
					<i class="bi bi-send"></i> Create Invitation
				</button>
				<button class="btn btn-success btn-sm" onclick="window.showAcceptModal()">
					<i class="bi bi-box-arrow-in-down"></i> Accept Invitation
				</button>
			</div>
		`;
	}
}

// ============================================================================
// Modal Functions
// ============================================================================

/**
 * Show main partnership management modal
 */
export function showPartnershipModal(): void {
	const modal = new (window as any).bootstrap.Modal(document.getElementById("partnershipModal"));
	modal.show();
}

/**
 * Show invite creation modal and generate code
 */
export async function showInviteModal(): Promise<void> {
	const modal = new (window as any).bootstrap.Modal(document.getElementById("inviteModal"));
	const codeElement = document.getElementById("invite-code") as HTMLElement;
	const codeContainer = document.getElementById("invite-code-container") as HTMLElement;
	const loadingElement = document.getElementById("invite-loading") as HTMLElement;
	const errorElement = document.getElementById("invite-error") as HTMLElement;

	// Show loading state
	codeContainer.style.display = "none";
	loadingElement.style.display = "block";
	errorElement.style.display = "none";

	modal.show();

	try {
		const invitation = await api.createPartnershipInvite();
		codeElement.textContent = invitation.code;
		codeContainer.style.display = "block";
		loadingElement.style.display = "none";

		const expiresDate = new Date(invitation.expires_at).toLocaleString();
		const expiresElement = document.getElementById("invite-expires") as HTMLElement;
		expiresElement.textContent = `Expires: ${expiresDate}`;
	} catch (error: any) {
		loadingElement.style.display = "none";
		errorElement.textContent = error.message || "Failed to create invitation";
		errorElement.style.display = "block";
	}
}

/**
 * Copy invitation code to clipboard
 */
export function copyInviteCode(): void {
	const codeElement = document.getElementById("invite-code") as HTMLElement;
	const code = codeElement.textContent || "";

	navigator.clipboard.writeText(code).then(() => {
		const btn = document.getElementById("copy-code-btn") as HTMLButtonElement;
		const originalText = btn.innerHTML;
		btn.innerHTML = '<i class="bi bi-check"></i> Copied!';
		btn.classList.remove("btn-outline-secondary");
		btn.classList.add("btn-success");

		setTimeout(() => {
			btn.innerHTML = originalText;
			btn.classList.remove("btn-success");
			btn.classList.add("btn-outline-secondary");
		}, 2000);
	});
}

/**
 * Show accept invitation modal
 */
export function showAcceptModal(): void {
	const modal = new (window as any).bootstrap.Modal(document.getElementById("acceptModal"));
	const input = document.getElementById("accept-code-input") as HTMLInputElement;
	const errorElement = document.getElementById("accept-error") as HTMLElement;

	input.value = "";
	errorElement.style.display = "none";

	modal.show();
}

/**
 * Accept invitation with code
 */
export async function acceptInvitation(): Promise<void> {
	const input = document.getElementById("accept-code-input") as HTMLInputElement;
	const errorElement = document.getElementById("accept-error") as HTMLElement;
	const submitBtn = document.getElementById("accept-submit-btn") as HTMLButtonElement;

	const code = input.value.trim().toUpperCase();

	if (!code || code.length !== 6) {
		errorElement.textContent = "Please enter a valid 6-character code";
		errorElement.style.display = "block";
		return;
	}

	submitBtn.disabled = true;
	submitBtn.textContent = "Accepting...";

	try {
		await api.acceptPartnershipInvite(code);

		// Close modal and update partnership state/UI dynamically
		const modalElement = document.getElementById("acceptModal") as HTMLElement;
		const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
		modal.hide();

		// Fetch updated partnership and re-render navbar status
		currentPartnership = await api.getPartnership();
		const navbarContainer = document.getElementById("partnership-nav-status");
		if (navbarContainer) {
			renderNavbarStatus(navbarContainer, currentPartnership);
		}
	} catch (error: any) {
		errorElement.textContent = error.message || "Failed to accept invitation";
		errorElement.style.display = "block";
		submitBtn.disabled = false;
		submitBtn.textContent = "Accept";
	}
}

/**
 * Show confirmation modal for dissolving partnership
 */
export function confirmDissolvePartnership(): void {
	const modal = new (window as any).bootstrap.Modal(document.getElementById("dissolveModal"));
	modal.show();
}

/**
 * Dissolve the current partnership
 */
export async function dissolvePartnership(): Promise<void> {
	const submitBtn = document.getElementById("dissolve-submit-btn") as HTMLButtonElement;
	const errorElement = document.getElementById("dissolve-error") as HTMLElement;

	submitBtn.disabled = true;
	submitBtn.textContent = "Dissolving...";
	errorElement.style.display = "none";

	try {
		await api.dissolvePartnership();

		// Close modal and update UI dynamically
		const modalElement = document.getElementById("dissolveModal") as HTMLElement;
		const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
		modal.hide();

		currentPartnership = null;
		await initNavbarPartnership();
	} catch (error: any) {
		errorElement.textContent = error.message || "Failed to dissolve partnership";
		errorElement.style.display = "block";
		submitBtn.disabled = false;
		submitBtn.textContent = "Yes, Dissolve Partnership";
	}
}

// ============================================================================
// Export functions to window for onclick handlers
// ============================================================================

(window as any).showPartnershipModal = showPartnershipModal;
(window as any).showInviteModal = showInviteModal;
(window as any).copyInviteCode = copyInviteCode;
(window as any).showAcceptModal = showAcceptModal;
(window as any).acceptInvitation = acceptInvitation;
(window as any).confirmDissolvePartnership = confirmDissolvePartnership;
(window as any).dissolvePartnership = dissolvePartnership;
