let socket;
let currentUsername = localStorage.getItem("username");
let userCount = 0;

// cek apakah user sudah melakukan login
if (currentUsername) {
  initializeWebSocket(currentUsername);
  showChat(currentUsername);
}

function initializeWebSocket(username) {
  socket = new WebSocket("ws://172.41.2.248:3000");

  // ketika user pertama kali login (handshake)
  socket.addEventListener("open", (event) => {
    const message = {
      username: username,
      message: {
        text: "Active",
        type: "system",
      },
    };
    socket.send(JSON.stringify(message));
  });

  // ketika ada yang mengirimkan pesan
  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    displayMessage(data);

    // Perbarui jumlah pengguna hanya untuk pesan sistem tentang bergabung/keluar
    if (
      data.username === "System" &&
      (data.message.text.includes("bergabung") ||
        data.message.text.includes("meninggalkan")) &&
      data.username !== currentUsername
    ) {
      updateUserCount(data.userCount);
    }
  });

  socket.addEventListener("close", () => {
    console.log("WebSocket connection closed");
  });
}

function updateUserCount(userCount) {
  const userCountElement = document.getElementById("userCount");
  userCountElement.textContent = userCount;
}

function displayMessage(data) {
  const messageList = document.getElementById("messageList");
  const newMessage = document.createElement("li");

  newMessage.classList.add(
    data.username === currentUsername ? "from-me" : "from-other"
  );

  const header = document.createElement("div");
  header.classList.add("message-header");
  header.textContent = data.username;

  const content = document.createElement("div");
  content.classList.add("message-content");

  switch (data.message.type) {
    case "text":
      content.textContent = data.message.text;
      break;
    case "image":
      const img = document.createElement("img");
      img.src = data.message.text;
      img.classList.add("message-image");
      img.onclick = () => window.open(img.src, "_blank");
      content.appendChild(img);
      break;
    case "file":
      const link = document.createElement("a");
      link.href = data.message.text;
      link.classList.add("file-download");
      link.download = data.message.filename;
      link.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        ${data.message.filename}
      `;
      content.appendChild(link);
      break;
  }

  newMessage.appendChild(header);
  newMessage.appendChild(content);
  messageList.appendChild(newMessage);
  messageList.scrollTop = messageList.scrollHeight;
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Daftar tipe file yang diizinkan
  const allowedTypes = ["image/", "application/pdf", "application/msword"];
  const maxFileSize = 500 * 1024; // 500 KB dalam byte

  // Periksa tipe file
  const isAllowedType = allowedTypes.some((type) => file.type.startsWith(type));
  if (!isAllowedType) {
    alert("File harus berupa gambar, PDF, atau Word.");
    return;
  }

  // Periksa ukuran file
  if (file.size > maxFileSize) {
    alert("Ukuran file maksimal 500 KB.");
    return;
  }

  // Jika file valid, baca file sebagai Base64
  const reader = new FileReader();
  reader.onload = function (e) {
    const base64Data = e.target.result;
    const isImage = file.type.startsWith("image/");

    const message = {
      username: currentUsername,
      message: {
        text: base64Data,
        type: isImage ? "image" : "file",
        filename: file.name,
      },
    };

    socket.send(JSON.stringify(message));
  };
  reader.readAsDataURL(file);
}

// Event Listeners
document.getElementById("attachButton").addEventListener("click", () => {
  document.getElementById("fileInput").click();
});

document
  .getElementById("fileInput")
  .addEventListener("change", handleFileSelect);

document.getElementById("buttonSend").addEventListener("click", sendMessage);

document.getElementById("chat").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

function sendMessage() {
  const chatInput = document.getElementById("chat");
  // trim untuk menghapus /n atau kode unik lainnya
  const messageText = chatInput.value.trim();

  if (messageText) {
    const message = {
      username: currentUsername,
      message: {
        text: messageText,
        type: "text",
      },
    };
    socket.send(JSON.stringify(message));
    chatInput.value = "";
  }
}

document.getElementById("loginButton").addEventListener("click", login);

document.getElementById("username").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    login();
  }
});

function login() {
  const username = document.getElementById("username").value.trim();
  if (username) {
    localStorage.setItem("username", username);
    currentUsername = username;
    initializeWebSocket(username);
    showChat(username);
  } else {
    alert("Nama pengguna tidak boleh kosong!");
  }
}

document.getElementById("logoutButton").addEventListener("click", () => {
  localStorage.removeItem("username");
  if (socket) {
    socket.close();
  }
  showLogin();
});

function showChat(username) {
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("chatContainer").style.display = "block";
  document.getElementById("userDisplay").textContent = username;
}

function showLogin() {
  document.getElementById("loginForm").style.display = "block";
  document.getElementById("chatContainer").style.display = "none";
  document.getElementById("username").value = "";
}
