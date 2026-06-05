(function () {
  "use strict";

  const PEERS = [
    "https://gun-manhattan.herokuapp.com/gun",
    "https://gun-us.herokuapp.com/gun",
    "https://gun-eu.herokuapp.com/gun",
  ];

  const PRESENCE_INTERVAL = 15000;
  const PRESENCE_TIMEOUT = 45000;
  const MAX_MESSAGES = 200;

  const $ = (sel) => document.querySelector(sel);

  const loginScreen = $("#login-screen");
  const chatScreen = $("#chat-screen");
  const loginForm = $("#login-form");
  const messageForm = $("#message-form");
  const usernameInput = $("#username-input");
  const roomInput = $("#room-input");
  const messageInput = $("#message-input");
  const messagesEl = $("#messages");
  const roomBadge = $("#room-badge");
  const userLabel = $("#user-label");
  const onlineCount = $("#online-count");
  const leaveBtn = $("#leave-btn");

  let gun, roomRef, presenceRef;
  let username = "";
  let room = "general";
  let userId = "";
  let seenMessages = new Set();
  let presenceTimer = null;

  function initGun() {
    gun = Gun(PEERS);
  }

  function generateId() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function sanitizeRoom(name) {
    return (name || "general")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-")
      .slice(0, 32) || "general";
  }

  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMessage({ id, author, text, time, own, system }) {
    if (seenMessages.has(id)) return;
    seenMessages.add(id);

    const li = document.createElement("li");
    li.className = "message" + (system ? " system" : own ? " own" : " other");
    li.dataset.id = id;

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = text;

    if (!system) {
      const meta = document.createElement("div");
      meta.className = "message-meta";

      const authorEl = document.createElement("span");
      authorEl.className = "message-author";
      authorEl.textContent = author;

      const timeEl = document.createElement("span");
      timeEl.className = "message-time";
      timeEl.textContent = formatTime(time);

      meta.append(authorEl, timeEl);
      li.append(meta, bubble);
    } else {
      li.append(bubble);
    }

    messagesEl.appendChild(li);

    while (messagesEl.children.length > MAX_MESSAGES) {
      const removed = messagesEl.firstChild;
      if (removed?.dataset?.id) seenMessages.delete(removed.dataset.id);
      messagesEl.removeChild(removed);
    }

    scrollToBottom();
  }

  function addSystemMessage(text) {
    addMessage({
      id: "sys-" + Date.now(),
      text,
      system: true,
    });
  }

  function subscribeToMessages() {
    roomRef
      .get("messages")
      .map()
      .on((data, key) => {
        if (!data || !data.text || !data.author || !data.time) return;
        addMessage({
          id: key,
          author: data.author,
          text: data.text,
          time: data.time,
          own: data.author === username,
        });
      });
  }

  function sendMessage(text) {
    const id = generateId();
    const payload = {
      author: username,
      text: text.trim(),
      time: Date.now(),
    };
    roomRef.get("messages").get(id).put(payload);
  }

  function heartbeat() {
    presenceRef.get(userId).put({
      name: username,
      lastSeen: Date.now(),
    });
  }

  function subscribeToPresence() {
    const online = new Map();

    presenceRef.map().on((data, key) => {
      if (!data || !data.lastSeen) {
        online.delete(key);
      } else if (Date.now() - data.lastSeen < PRESENCE_TIMEOUT) {
        online.set(key, data.name || "Anonymous");
      } else {
        online.delete(key);
      }
      onlineCount.textContent =
        online.size + " online";
    });

    heartbeat();
    presenceTimer = setInterval(heartbeat, PRESENCE_INTERVAL);
  }

  function leavePresence() {
    if (presenceTimer) {
      clearInterval(presenceTimer);
      presenceTimer = null;
    }
    if (presenceRef && userId) {
      presenceRef.get(userId).put(null);
    }
  }

  function enterChat(name, roomName) {
    username = name.trim().slice(0, 24);
    room = sanitizeRoom(roomName);
    userId = generateId();

    localStorage.setItem("chatroom-username", username);
    localStorage.setItem("chatroom-room", room);

    roomBadge.textContent = "#" + room;
    userLabel.textContent = username;
    messagesEl.innerHTML = "";
    seenMessages.clear();

    const roomKey = "chatroom-" + room;
    roomRef = gun.get(roomKey);
    presenceRef = gun.get(roomKey).get("presence");

    subscribeToMessages();
    subscribeToPresence();

    loginScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");
    messageInput.focus();

    addSystemMessage(username + " joined #" + room);
    history.replaceState(null, "", "#" + room);
  }

  function leaveChat() {
    leavePresence();
    roomRef = null;
    presenceRef = null;

    chatScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    usernameInput.focus();
  }

  function restoreFromStorage() {
    const savedName = localStorage.getItem("chatroom-username");
    const hashRoom = location.hash.slice(1);
    const savedRoom = localStorage.getItem("chatroom-room");

    if (savedName) usernameInput.value = savedName;
    roomInput.value = hashRoom || savedRoom || "general";
  }

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = usernameInput.value.trim();
    if (!name) return;
    enterChat(name, roomInput.value);
  });

  messageForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;
    sendMessage(text);
    messageInput.value = "";
  });

  leaveBtn.addEventListener("click", leaveChat);

  window.addEventListener("beforeunload", leavePresence);

  initGun();
  restoreFromStorage();
})();
