(function(window, document) {
	'use strict';

	if (!window || !document) {
		return;
	}

	const CF_BASE = 'https://us-central1-end-of-time-94cd3.cloudfunctions.net';
	const CREATE_SESSION_URL = CF_BASE + '/createDonationSession';

	function getCurrentUser() {
		try {
			if (window.AuthManager && typeof window.AuthManager.getUser === 'function') {
				return window.AuthManager.getUser();
			}
		} catch (_) {}
		return null;
	}

	function showToast(message) {
		const existing = document.querySelector('.donation-toast');
		if (existing) existing.remove();
		const toast = document.createElement('div');
		toast.className = 'donation-toast';
		toast.textContent = message;
		toast.style.cssText = 'position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(11,11,12,0.95); color: #fff; padding: 12px 20px; border-radius: 999px; box-shadow: 0 8px 24px rgba(0,0,0,0.35); font-weight: 600; letter-spacing: 0.02em; z-index: 10000;';
		document.body.appendChild(toast);
		setTimeout(() => {
			toast.style.opacity = '0';
			toast.style.transition = 'opacity 250ms ease';
			setTimeout(() => { if (toast.parentNode) toast.remove(); }, 250);
		}, 2200);
	}

	async function openDonationPrompt() {
		const user = getCurrentUser();
		const amountStr = window.prompt('Enter donation amount (USD):', '10');
		if (amountStr === null) return; // cancelled
		const amountNumber = Number(String(amountStr).replace(/[^0-9.]/g, ''));
		if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
			window.alert('Please enter a valid amount.');
			return;
		}
		const amountCents = Math.round(amountNumber * 100);
		try {
			const resp = await fetch(CREATE_SESSION_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					amount: amountCents,
					currency: 'usd',
					customer_email: user && user.email ? user.email : undefined,
					metadata: user && user.uid ? { uid: user.uid } : undefined,
				}),
			});
			const data = await resp.json();
			if (!resp.ok) {
				throw new Error(data && data.error ? data.error : 'Failed to start donation');
			}
			if (data && data.url) {
				window.location.href = data.url;
				return;
			}
			throw new Error('No checkout URL received');
		} catch (err) {
			console.error('Donation error:', err);
			window.alert('Could not start the donation. Please try again later.');
		}
	}

	function bindDonateItem() {
		const donateItem = document.querySelector('.menu-item[data-action="donate"]');
		if (!donateItem) return;
		donateItem.addEventListener('click', () => {
			openDonationPrompt();
		});
		donateItem.addEventListener('touchend', () => {
			openDonationPrompt();
		}, { passive: true });
	}

	function showStatusFromQuery() {
		try {
			const params = new URLSearchParams(window.location.search);
			const status = params.get('donation');
			if (status === 'success') {
				showToast('Thank you for your donation!');
			} else if (status === 'cancelled') {
				showToast('Donation cancelled');
			}
		} catch (_) {}
	}

	function init() {
		bindDonateItem();
		showStatusFromQuery();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init, { once: true });
	} else {
		init();
	}

})(window, document);


