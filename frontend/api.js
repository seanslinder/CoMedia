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

window.logout = function() {
	localStorage.removeItem("comedia_token");
	localStorage.removeItem("comedia_username");
	window.location.reload();
};

async function performAuth() {
	let token = localStorage.getItem("comedia_token");
	let username = localStorage.getItem("comedia_username");
	if (!token) {
		username = await customPrompt("Welcome to CoMedia MVP!\nPlease enter your username to continue:");
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

function customPrompt(message) {
	return new Promise((resolve) => {
		const overlay = document.createElement("div");
		overlay.style.position = "fixed";
		overlay.style.top = "0";
		overlay.style.left = "0";
		overlay.style.width = "100%";
		overlay.style.height = "100%";
		overlay.style.backgroundColor = "rgba(0,0,0,0.5)";
		overlay.style.display = "flex";
		overlay.style.justifyContent = "center";
		overlay.style.alignItems = "center";
		overlay.style.zIndex = "9999";

		const modal = document.createElement("div");
		modal.style.backgroundColor = "var(--bg)";
		modal.style.padding = "20px";
		modal.style.borderRadius = "12px";
		modal.style.maxWidth = "400px";
		modal.style.width = "90%";
		modal.style.boxShadow = "var(--shadow)";
		
		const title = document.createElement("div");
		title.textContent = message;
		title.style.marginBottom = "15px";
		title.style.color = "var(--text)";
		title.style.whiteSpace = "pre-wrap";
		
		const input = document.createElement("input");
		input.type = "text";
		input.style.width = "100%";
		input.style.padding = "10px";
		input.style.marginBottom = "15px";
		input.style.borderRadius = "8px";
		input.style.border = "1px solid var(--border)";
		
		const btn = document.createElement("button");
		btn.textContent = "OK";
		btn.className = "btn-primary";
		btn.style.width = "100%";
		
		modal.appendChild(title);
		modal.appendChild(input);
		modal.appendChild(btn);
		overlay.appendChild(modal);
		document.body.appendChild(overlay);
		
		input.focus();
		
		const submit = () => {
			const val = input.value.trim();
			document.body.removeChild(overlay);
			resolve(val || null);
		};
		
		btn.onclick = submit;
		input.onkeydown = (e) => {
			if (e.key === "Enter") submit();
		};
	});
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
		let errorText = await response.text();
		try {
			const parsed = JSON.parse(errorText);
			if (parsed.error) errorText = parsed.error;
		} catch (e) {
			// ignore
		}
		throw new Error(errorText);
	}
	return response.json();
}
