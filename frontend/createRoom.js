// Toggle room type

document.querySelectorAll(".room-type-btn").forEach((button) => {
	button.addEventListener("click", () => {
		document.querySelectorAll(".room-type-btn").forEach((btn) => {
			btn.classList.remove("active");
		});

		button.classList.add("active");
		const roomType = button.getAttribute("data-type");

		if (roomType === "public") {
			document.querySelectorAll(".private-section").forEach((el) => {
				el.style.display = "none";
			});
		} else {
			document.querySelectorAll(".private-section").forEach((el) => {
				el.style.display = "block";
			});
		}
	});
});

// Выбор категории
document.querySelectorAll(".category-item").forEach((item) => {
	item.addEventListener("click", function () {
		// Убираем активный класс у всех категорий
		document.querySelectorAll(".category-item").forEach((cat) => {
			cat.classList.remove("active");
		});

		// Добавляем активный класс к выбранной категории
		this.classList.add("active");

		// Сохраняем выбранную категорию
		const selectedCategory = this.textContent;
		console.log("Выбрана категория:", selectedCategory);
	});
});

function togglePasswordVisibility() {
	const passwordInput = document.getElementById("room-password");
	const icon = document.getElementById("password-icon");

	if (passwordInput.type === "password") {
		passwordInput.type = "text";
		icon.classList.replace("fa-eye", "fa-eye-slash");
	} else {
		passwordInput.type = "password";
		icon.classList.replace("fa-eye-slash", "fa-eye");
	}
}

function generatePassword() {
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
	let password = "";
	for (let i = 0; i < 12; i++) {
		password += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	document.getElementById("room-password").value = password;

	const icon = document.getElementById("password-icon");
	const passwordInput = document.getElementById("room-password");
	passwordInput.type = "text";
	icon.classList.replace("fa-eye", "fa-eye-slash");
}

async function createRoom() {
	const roomName = document.getElementById("room-name").value.trim();
	const roomType = document
		.querySelector(".room-type-btn.active")
		.getAttribute("data-type");

	if (!roomName) {
		showInlineMessage("Пожалуйста, введите название комнаты");
		document.getElementById("room-name").focus();
		return;
	}

	const mediaUrl = document.getElementById("media-url").value.trim();
	const mediaFile = document.getElementById("media-file").files[0];
	if (
		!document.getElementById("media-url").value.trim() &&
		!document.getElementById("media-file").files[0]
	) {
		showInlineMessage("Пожалуйста, укажите ссылку или загрузите MP4 файл");
		document.getElementById("media-url").focus();
		return;
	}

	clearInlineMessage();
	try {
		await performAuth();
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

		alert(`Комната "${roomName}" успешно создана!`);
		window.location.href = "room.html?id=" + room.id;
	} catch (e) {
		showInlineMessage("Ошибка создания комнаты: " + e.message);
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
			if (
				confirm(
					"Вы уверены, что хотите отменить создание комнаты? Все несохраненные данные будут потеряны.",
				)
			) {
				window.location.href = "index.html";
			}
		});
	}
});
