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
  const BOT_COUNT = 107;
  const BOT_INTERVAL_TARGET_MS = 2 * 60 * 1000;
  const BOT_INTERVAL_MIN_MS = 90 * 1000;
  const BOT_INTERVAL_MAX_MS = 150 * 1000;
  const BOT_DURATION_MS = 115 * 60 * 60 * 1000;

  const BOT_NAME_POOL = [
    "Luna", "Kai", "Nova", "River", "Atlas", "Milo", "Zara", "Finn",
    "Iris", "Jade", "Remy", "Sage", "Cleo", "Nico", "Aria", "Theo",
    "Wren", "Ezra", "Lyra", "Orion", "Piper", "Rowan", "Skye", "Vera",
  ];

  const BOT_ADJECTIVES = [
    "Swift", "Calm", "Bold", "Quiet", "Bright", "Cosmic", "Neon", "Shadow",
    "Golden", "Silver", "Lucky", "Happy", "Chill", "Frosty", "Sunny", "Mystic",
    "Cyber", "Retro", "Wild", "Clever", "Brave", "Gentle", "Fierce", "Stellar",
  ];

  const BOT_MESSAGE_POOL = [
    "Hey everyone!",
    "What's up?",
    "Anyone around?",
    "Just dropped in — this chat is pretty cool.",
    "Love the dark theme on this.",
    "Has anyone tried the gaming room yet?",
    "Good morning from the west coast!",
    "Anyone want to start a thread about music?",
    "brb, grabbing coffee",
    "lol that made my day",
    "Can we get a dev room going?",
    "First time here — hi all!",
    "The GitHub Pages setup was surprisingly easy.",
    "Who else is coding tonight?",
    "This room feels cozy.",
    "👋 waving from across the internet",
    "Anyone watching the game later?",
    "Just pushed a new commit, feeling productive.",
    "Recommend me a good podcast?",
    "Night shift crew checking in.",
    "Still awake over here.",
    "Checking in — room still active?",
    "Anyone else working late?",
    "Quick hello from my corner of the world.",
    "Messages every few minutes keep this place lively.",
    "What are you all up to today?",
    "I could use a good book recommendation.",
    "Rainy day here, perfect chat weather.",
    "Sunny and bright on my end!",
    "Just finished lunch, back at it.",
    "Taking a short break, wanted to say hi.",
    "This room has good vibes.",
    "Anyone learning something new this week?",
    "Thinking about starting a side project.",
    "Coffee round two — who's with me?",
    "Weekend plans anyone?",
    "Monday mood, but this chat helps.",
    "Throwing another message into the void.",
    "Hope everyone's having a solid day.",
    "Holy shit this chat is actually popping off.",
    "What the hell is everyone up to?",
    "Damn, y'all are quiet today.",
    "This code is pissing me off ngl.",
    "Bullshit traffic made me late, I'm here now.",
    "Anyone else having a crap day or just me?",
    "Screw it, I'm staying up all night.",
    "That bug can go to hell.",
    "No fucking way that just worked first try.",
    "Jesus christ it's already midnight.",
    "My boss is being a real asshole today.",
    "This coffee tastes like crap but I need it.",
    "Who the fuck broke the build?",
    "Goddamn that was a long meeting.",
    "Shit, I forgot what I was gonna say.",
    "Hell yeah, finally got it deployed.",
    "What a clusterfuck of a morning.",
    "I'm so damn tired of this deadline.",
    "Lmao that's some bullshit right there.",
    "Frick this weather, it's awful out.",
    "Bloody hell, wrong room again.",
    "Kick ass work on that last push btw.",
  ];

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
  let botPresenceTimers = [];
  let botMessageTimers = new Map();
  let botLastPostLocal = new Map();
  let botMessagingEnded = false;
  let activeBots = [];
  let recentChat = [];
  const RECENT_CHAT_LIMIT = 40;

  function initGun() {
    gun = Gun(PEERS);
  }

  function generateId() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function pickRandom(items, count) {
    const copy = items.slice();
    const picked = [];
    while (picked.length < count && copy.length) {
      const i = Math.floor(Math.random() * copy.length);
      picked.push(copy.splice(i, 1)[0]);
    }
    return picked;
  }

  function pickRandomMessage() {
    return BOT_MESSAGE_POOL[Math.floor(Math.random() * BOT_MESSAGE_POOL.length)];
  }

  function truncateText(text, max) {
    if (!text || text.length <= max) return text;
    return text.slice(0, max) + "…";
  }

  function trackChatMessage(author, text) {
    if (!author || !text) return;
    recentChat.push({ author, text, time: Date.now() });
    if (recentChat.length > RECENT_CHAT_LIMIT) {
      recentChat.shift();
    }
  }

  function getChatParticipants(bot) {
    const names = new Set(activeBots.map((b) => b.name));
    if (username) names.add(username);
    names.delete(bot.name);
    return [...names];
  }

  function pickOtherRecentMessage(bot) {
    const others = recentChat.filter((m) => m.author !== bot.name);
    if (!others.length) return null;
    const window = others.slice(-12);
    return window[Math.floor(Math.random() * window.length)];
  }

  function pickConversationalMessage(bot) {
    const target = pickOtherRecentMessage(bot);
    const participants = getChatParticipants(bot);
    const randomUser = participants.length
      ? participants[Math.floor(Math.random() * participants.length)]
      : null;

    if (target && Math.random() < 0.85) {
      const other = target.author;
      const short = truncateText(target.text, 42);
      const replies = [
        `@${other} wait — "${short}" — are you serious?`,
        `${other} lol "${short}" 😂`,
        `@${other} nah, I don't buy that at all`,
        `@${other} hard agree. "${short}" is facts`,
        `${other} can you explain what you meant by that?`,
        `@${other} ok but *why* though?`,
        `${other} that's a wild take ngl`,
        `@${other} re: "${short}" — never thought of it that way`,
        `@${other} counterpoint: you're completely wrong lol`,
        `${other} tbh "${short}" might be the best thing said here today`,
        `@${other} did you really just post that in public chat?`,
        `${other} asking the real questions with "${short}"`,
        `@${other} I'm gonna need you to elaborate on that`,
        `${other} hold up — "${short}"? say more`,
        `@${other} 💀 "${short}"`,
        `${other} holy shit that's actually a solid point`,
        `@${other} respectfully… no. ${other} respectfully… yes?`,
        `${other} so we're all just ignoring "${short}" now?`,
        `@${other} fired. absolutely fired message.`,
        `${other} ok but what's the opposite take on "${short}"?`,
        `@${other} see I was thinking the same until you said that`,
        `${other} wait ${other} wait — go back to "${short}"`,
        `@${other} who asked? …actually fair, "${short}"`,
        `${other} not me disagreeing in the group chat again but…`,
        `@${other} ${short} — W or L? vote now`,
      ];
      return replies[Math.floor(Math.random() * replies.length)];
    }

    if (randomUser) {
      const third =
        participants.length > 1
          ? participants[Math.floor(Math.random() * participants.length)]
          : randomUser;
      const prompts = [
        `@${randomUser} you there? need your opinion on something`,
        `${randomUser} what's your take on all this?`,
        `@${randomUser} coffee or tea — go`,
        `${randomUser} am I overthinking or underthinking right now?`,
        `@${randomUser} bounce an idea off you real quick`,
        `${randomUser} you've been quiet — everything good?`,
        `@${randomUser} fight me on this (jk… unless?)`,
        `${randomUser} hot take incoming — you ready?`,
        `@${randomUser} did you catch what ${third} said earlier?`,
        `${randomUser} random question: what are you working on?`,
        `@${randomUser} agree or disagree — this room is chaos`,
        `${randomUser} ok real talk for a sec`,
        `@${randomUser} wrong answers only: best programming language?`,
        `${randomUser} scale of 1-10 how's your day?`,
        `@${randomUser} convince me I'm wrong about something`,
      ];
      return prompts[Math.floor(Math.random() * prompts.length)];
    }

    const openers = [
      "Ok who wants to debate something dumb?",
      "Real talk — what is everyone actually working on?",
      "Someone give me a hot take to respond to",
      "Anybody else stuck on a bug or just me?",
      "Who's got opinions? I need a conversation starter",
      "Throw a question at the room — I'll answer first",
      "What's the vibe in here tonight?",
      "Ok I'll start: who's winning, morning people or night owls?",
      "Can we get a poll going or what",
      "First one to reply picks the next topic",
    ];
    return openers[Math.floor(Math.random() * openers.length)];
  }

  function randomBotInterval() {
    return (
      BOT_INTERVAL_MIN_MS +
      Math.floor(Math.random() * (BOT_INTERVAL_MAX_MS - BOT_INTERVAL_MIN_MS + 1))
    );
  }

  function buildBotNameCandidates() {
    const candidates = BOT_NAME_POOL.slice();
    for (const adj of BOT_ADJECTIVES) {
      for (const base of BOT_NAME_POOL) {
        candidates.push(adj + " " + base);
      }
    }
    let n = 1;
    while (candidates.length < BOT_COUNT + 50) {
      candidates.push("Guest" + n++);
    }
    return candidates;
  }

  function generateBotNames(count, excludeNames) {
    const excluded = excludeNames || new Set();
    const available = buildBotNameCandidates().filter((name) => !excluded.has(name));
    return pickRandom(available, count);
  }

  function createBot(name) {
    return {
      id: "bot-" + room + "-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name,
      messageIntervalMs: randomBotInterval(),
    };
  }

  function applyBotInterval(bots) {
    const updated = bots.map((bot) => ({
      ...bot,
      messageIntervalMs: randomBotInterval(),
    }));
    roomRef.get("meta").get("botList").put(updated);
    updated.forEach((bot) => {
      roomRef.get("meta").get("botLastMessage").get(bot.id).put(null);
    });
    return updated;
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

    if (!system && author && text) {
      trackChatMessage(author, text);
    }

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
      onlineCount.textContent = "150 online";
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
    stopBotMessaging();
    stopBotPresence();
  }

  function stopBotMessaging() {
    botMessageTimers.forEach((handles) => {
      if (handles.timeout) clearTimeout(handles.timeout);
      if (handles.interval) clearInterval(handles.interval);
    });
    botMessageTimers.clear();
    botLastPostLocal.clear();
  }

  function endBotMessagingIfExpired(endAt) {
    if (Date.now() < endAt || botMessagingEnded) return;
    botMessagingEnded = true;
    stopBotMessaging();
    addSystemMessage("Bot messages ended after 115 hours.");
  }

  function postBotMessage(bot, force) {
    if (!roomRef || !bot) return false;

    const now = Date.now();
    const last = botLastPostLocal.get(bot.id) || 0;
    const minGap = Math.min(bot.messageIntervalMs || BOT_INTERVAL_TARGET_MS, 5000);
    if (!force && now - last < minGap - 250) return false;

    botLastPostLocal.set(bot.id, now);

    const id = generateId();
    const text = pickConversationalMessage(bot);
    const payload = { author: bot.name, text, time: now };

    addMessage({
      id,
      author: bot.name,
      text,
      time: now,
      own: false,
    });
    roomRef.get("messages").get(id).put(payload);
    return true;
  }

  function scheduleNextBotMessage(bot, endAt) {
    if (Date.now() >= endAt) {
      endBotMessagingIfExpired(endAt);
      return;
    }

    const delay = randomBotInterval();
    bot.messageIntervalMs = delay;

    const timeout = setTimeout(() => {
      if (Date.now() >= endAt) {
        endBotMessagingIfExpired(endAt);
        return;
      }
      postBotMessage(bot, false);
      scheduleNextBotMessage(bot, endAt);
    }, delay);

    botMessageTimers.set(bot.id, { timeout, interval: null });
  }

  function scheduleBotMessages(bot, endAt, index, total) {
    if (!bot.messageIntervalMs) {
      bot.messageIntervalMs = randomBotInterval();
    }

    const staggerMs = Math.floor((index / total) * BOT_INTERVAL_TARGET_MS);

    const timeout = setTimeout(() => {
      postBotMessage(bot, true);
      scheduleNextBotMessage(bot, endAt);
    }, staggerMs);

    botMessageTimers.set(bot.id, { timeout, interval: null });
  }

  function startBotMessaging() {
    stopBotMessaging();
    botMessagingEnded = false;
    botLastPostLocal.clear();

    if (!activeBots.length) return;

    const now = Date.now();
    let endAt = now + BOT_DURATION_MS;

    roomRef.get("meta").get("botMessagingStartedAt").once((startedAt) => {
      if (!startedAt) {
        roomRef.get("meta").get("botMessagingStartedAt").put(now);
      } else {
        endAt = startedAt + BOT_DURATION_MS;
        if (Date.now() >= endAt) {
          stopBotMessaging();
        }
      }
    });

    const total = activeBots.length;
    activeBots.forEach((bot, index) => scheduleBotMessages(bot, endAt, index, total));
  }

  function stopBotPresence() {
    botPresenceTimers.forEach(clearInterval);
    botPresenceTimers = [];
    activeBots.forEach((bot) => {
      if (presenceRef) presenceRef.get(bot.id).put(null);
    });
    activeBots = [];
  }

  function startBotPresence(bots) {
    stopBotPresence();
    activeBots = bots;

    bots.forEach((bot) => {
      const pulse = () => {
        presenceRef.get(bot.id).put({
          name: bot.name,
          lastSeen: Date.now(),
        });
      };
      pulse();
      botPresenceTimers.push(setInterval(pulse, PRESENCE_INTERVAL));
    });
  }

  function seedHistoryMessages(bots, startIndex) {
    bots.forEach((bot, i) => {
      const idx = startIndex + i;
      const messages = pickRandom(BOT_MESSAGE_POOL, 1 + (idx % 2));
      messages.forEach((text, j) => {
        roomRef
          .get("messages")
          .get(generateId())
          .put({
            author: bot.name,
            text,
            time: Date.now() - (BOT_COUNT - idx) * 90000 - j * 12000,
          });
      });
    });
  }

  function seedRandomUsers() {
    roomRef.get("meta").get("botList").once((stored) => {
      const existing = stored && stored.length ? stored.slice(0, BOT_COUNT) : [];

      if (existing.length >= BOT_COUNT) {
        const bots = applyBotInterval(existing);
        startBotPresence(bots);
        startBotMessaging();
        return;
      }

      const existingNames = new Set(existing.map((bot) => bot.name));
      const newNames = generateBotNames(BOT_COUNT - existing.length, existingNames);
      const newBots = newNames.map(createBot);
      const bots = existing
        .map((bot) => ({
          ...bot,
          messageIntervalMs: randomBotInterval(),
        }))
        .concat(newBots);

      seedHistoryMessages(newBots, existing.length);

      roomRef.get("meta").get("botList").put(bots);
      if (existing.length === 0) {
        roomRef.get("meta").get("botMessagingStartedAt").put(Date.now());
      }
      startBotPresence(bots);
      startBotMessaging();
    });
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
    recentChat = [];

    const roomKey = "chatroom-" + room;
    roomRef = gun.get(roomKey);
    presenceRef = gun.get(roomKey).get("presence");

    subscribeToMessages();
    subscribeToPresence();
    seedRandomUsers();

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
