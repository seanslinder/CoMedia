const API_URL = "http://localhost:3000";

function showInlineMessage(message, type = "error") {
	const messageEl = document.getElementById("inline-message");
	if (!messageEl) return;
	messageEl.textContent = message;
	messageEl.classList.remove("error", "success");
	if (type) {
		messageEl.classList.add(type);
	}
	messageEl.style.display = "block";
}

function clearInlineMessage() {
	const messageEl = document.getElementById("inline-message");
	if (!messageEl) return;
	messageEl.textContent = "";
	messageEl.classList.remove("error", "success");
	messageEl.style.display = "none";
}

async function performAuth() {
	let token = localStorage.getItem("comedia_token");
	let username = localStorage.getItem("comedia_username");
	if (!token) {
		username = prompt(
			"Welcome to CoMedia MVP!\nPlease enter your username to continue:",
		);
		if (!username) {
			showInlineMessage("Username is required.");
			throw new Error("No username");
		}
		const res = await fetch(`${API_URL}/auth/register`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ username }),
		});
		if (
			res.status === 400 &&
			(await res.clone().json()).error === "User already exists"
		) {
			const loginRes = await fetch(`${API_URL}/auth/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username }),
			});
			const data = await loginRes.json();
			token = data.token;
			showInlineMessage("Вход выполнен успешно", "success");
			setTimeout(clearInlineMessage, 3000);
		} else {
			const data = await res.json();
			token = data.token;
			showInlineMessage("Регистрация успешна", "success");
			setTimeout(clearInlineMessage, 3000);
		}
		if (token) {
			localStorage.setItem("comedia_token", token);
			localStorage.setItem("comedia_username", username);
		}
	}
	return { token, username };
}

async function apiFetch(endpoint, options = {}) {
	const token = localStorage.getItem("comedia_token");
	const headers = {
		"Content-Type": "application/json",
		...(token ? { Authorization: `Bearer ${token}` } : {}),
		...(options.headers || {}),
	};
	const response = await fetch(`${API_URL}${endpoint}`, {
		...options,
		headers,
	});
	if (!response.ok) {
		if (response.status === 401 || response.status === 403) {
			localStorage.removeItem("comedia_token");
			localStorage.removeItem("comedia_username");
			showInlineMessage("Сессия истекла. Войдите снова.");
		}
		throw new Error(await response.text());
	}
	return response.json();
}
