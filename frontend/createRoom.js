// Helper to set visibility of private sections
function setPrivateSectionVisibility(show) {
	document.querySelectorAll(".private-section").forEach((el) => {
		el.style.display = show ? "block" : "none";
	});
}

function togglePasswordVisibility() {
	const passwordInput = document.getElementById("room-password");
	const icon = document.getElementById("password-icon");
	if (!passwordInput) return;

	if (passwordInput.type === "password") {
		passwordInput.type = "text";
		if (icon) {
			if (icon.classList.contains("fa-eye")) {
				icon.classList.replace("fa-eye", "fa-eye-slash");
			} else {
				icon.classList.add("fa-eye-slash");
			}
		}
	} else {
		passwordInput.type = "password";
		if (icon) {
			if (icon.classList.contains("fa-eye-slash")) {
				icon.classList.replace("fa-eye-slash", "fa-eye");
			} else {
				icon.classList.add("fa-eye");
			}
		}
	}
}

function generatePassword() {
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
	let password = "";
	for (let i = 0; i < 12; i++) {
		password += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	const passwordInput = document.getElementById("room-password");
	if (passwordInput) {
		passwordInput.value = password;
		passwordInput.type = "text";
	}
	const icon = document.getElementById("password-icon");
	if (icon) {
		if (icon.classList.contains("fa-eye")) {
			icon.classList.replace("fa-eye", "fa-eye-slash");
		} else {
			icon.classList.add("fa-eye-slash");
		}
	}
}

async function createRoom() {
	const roomNameEl = document.getElementById("room-name");
	const roomName = roomNameEl ? roomNameEl.value.trim() : "";

	const activeBtn = document.querySelector(".room-type-btn.active");
	const roomType = activeBtn ? activeBtn.getAttribute("data-type") : "public";

	if (!roomName) {
		showInlineMessage("Пожалуйста, введите название комнаты");
		document.getElementById("room-name").focus();
		return;
	}

	const mediaUrlEl = document.getElementById("media-url");
	const mediaFileEl = document.getElementById("media-file");
	const mediaUrl = mediaUrlEl ? mediaUrlEl.value.trim() : "";
	const mediaFile = mediaFileEl && mediaFileEl.files ? mediaFileEl.files[0] : null;

	if (!mediaUrl && !mediaFile) {
		showInlineMessage("Пожалуйста, укажите ссылку или загрузите MP4 файл");
		if (mediaUrlEl) mediaUrlEl.focus();
		return;
	}

	clearInlineMessage();
	try {
		// avoid duplicate auth requests when token already present
		const token = localStorage.getItem("comedia_token");
		if (!token) {
			await performAuth();
		}
	} catch (e) {
		showInlineMessage("Требуется авторизация для создания комнаты.");
		return;
	}

	try {
		const passwordInput = document.getElementById("room-password");
		const password = passwordInput ? passwordInput.value : "";

		let resolvedUrl = mediaUrl;
		if (resolvedUrl && resolvedUrl.startsWith("/")) {
			resolvedUrl = `${API_URL}${resolvedUrl}`;
		}
		if (mediaFile) {
			if (mediaFile.type && mediaFile.type !== "video/mp4") {
				showInlineMessage("Выберите MP4 файл для загрузки.");
				return;
			}
			const uploadData = await uploadMediaFile(mediaFile);
			if (!uploadData || !uploadData.url) {
				showInlineMessage("Не удалось загрузить файл.");
				return;
			}
			resolvedUrl = uploadData.url.startsWith("/")
				? `${API_URL}${uploadData.url}`
				: uploadData.url;
		}

		const room = await apiFetch("/rooms", {
			method: "POST",
			body: JSON.stringify({
				name: roomName,
				is_private: roomType === "private",
				password: roomType === "private" ? password : null,
			}),
		});

		await apiFetch(`/rooms/${room.id}/queue`, {
			method: "POST",
			body: JSON.stringify({ url: resolvedUrl }),
		});

		window.location.href = "room?id=" + room.id;
	} catch (e) {
		showInlineMessage(e.message || "Ошибка создания комнаты");
	}
}

async function uploadMediaFile(file) {
	const formData = new FormData();
	formData.append("file", file);
	const token = localStorage.getItem("comedia_token");
	const headers = token ? { Authorization: `Bearer ${token}` } : {};
	const response = await fetch(`${API_URL}/media/upload`, {
		method: "POST",
		headers,
		body: formData,
	});
	if (!response.ok) {
		throw new Error(await response.text());
	}
	return response.json();
}

document.addEventListener("DOMContentLoaded", () => {
	const roomNameInput = document.getElementById("room-name");
	if (roomNameInput) {
		roomNameInput.addEventListener("input", function () {
			const name = this.value || "Название комнаты";
			const previewElement = document.getElementById("preview-room-name");
			if (previewElement) {
				previewElement.textContent = name;
			}
		});
	}

	// Toggle room type setup
	document.querySelectorAll(".room-type-btn").forEach((button) => {
		button.addEventListener("click", () => {
			document.querySelectorAll(".room-type-btn").forEach((btn) => {
				btn.classList.remove("active");
			});

			button.classList.add("active");
			const roomType = button.getAttribute("data-type");

			setPrivateSectionVisibility(roomType === "private");
		});
	});

	// Select category
	document.querySelectorAll(".category-item").forEach((item) => {
		item.addEventListener("click", function () {
			document.querySelectorAll(".category-item").forEach((cat) => {
				cat.classList.remove("active");
			});
			this.classList.add("active");
			const selectedCategory = this.textContent;
			console.log("Выбрана категория:", selectedCategory);
		});
	});

	const passwordToggle = document.getElementById("password-toggle");
	if (passwordToggle) {
		passwordToggle.addEventListener("click", togglePasswordVisibility);
	}

	const generatePasswordLink = document.getElementById("generate-password");
	if (generatePasswordLink) {
		generatePasswordLink.addEventListener("click", (event) => {
			event.preventDefault();
			generatePassword();
		});
	}

	const createRoomButton = document.getElementById("create-room-btn");
	if (createRoomButton) {
		createRoomButton.addEventListener("click", (event) => {
			event.preventDefault();
			createRoom();
		});
	}

	performAuth()
		.then(() => clearInlineMessage())
		.catch((e) => {
			showInlineMessage("Требуется авторизация для создания комнаты.");
			console.error(e);
		});

	const cancelButton = document.querySelector(".btn-secondary");
	if (cancelButton) {
		cancelButton.addEventListener("click", (e) => {
			e.preventDefault();
			window.location.href = "index.html";
		});
	}
});
