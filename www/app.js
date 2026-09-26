const STORAGE_KEYS = {
  memories: "jarvis_memories_v01",
  tasks: "jarvis_tasks_v01",
  conversation: "jarvis_conversation_v01"
};

const conversation = document.getElementById("conversation");
const commandForm = document.getElementById("commandForm");
const commandInput = document.getElementById("commandInput");
const voiceButton = document.getElementById("voiceButton");
const systemMessage = document.getElementById("systemMessage");

const memoryCount = document.getElementById("memoryCount");
const taskCount = document.getElementById("taskCount");

const memoryButton = document.getElementById("memoryButton");
const taskButton = document.getElementById("taskButton");

const memoryPanel = document.getElementById("memoryPanel");
const taskPanel = document.getElementById("taskPanel");

const memoryList = document.getElementById("memoryList");
const taskList = document.getElementById("taskList");

const closeMemory = document.getElementById("closeMemory");
const closeTasks = document.getElementById("closeTasks");


let memories = load(STORAGE_KEYS.memories, []);
let tasks = load(STORAGE_KEYS.tasks, []);
let conversationHistory = load(
  STORAGE_KEYS.conversation,
  []
);


function load(key, fallback) {
  try {
    const saved = localStorage.getItem(key);

    if (!saved) {
      return fallback;
    }

    return JSON.parse(saved);

  } catch {
    return fallback;
  }
}


function save(key, value) {
  localStorage.setItem(
    key,
    JSON.stringify(value)
  );
}


function escapeHTML(value) {
  const div = document.createElement("div");

  div.textContent = value;

  return div.innerHTML;
}


function addMessage(role, text, saveMessage = true) {

  const message = document.createElement("div");

  message.className =
    role === "user"
      ? "message user-message"
      : "message";

  if (role === "user") {

    message.innerHTML = `
      <div class="message-content">
        <div class="message-label">YOU</div>
        ${escapeHTML(text)}
      </div>
    `;

  } else {

    message.innerHTML = `
      <div class="message-avatar">J</div>

      <div class="message-content">
        <div class="message-label">JARVIS</div>
        ${escapeHTML(text)}
      </div>
    `;
  }

  conversation.appendChild(message);

  conversation.scrollTop =
    conversation.scrollHeight;


  if (saveMessage) {

    conversationHistory.push({
      role,
      text,
      timestamp: Date.now()
    });

    if (conversationHistory.length > 80) {
      conversationHistory =
        conversationHistory.slice(-80);
    }

    save(
      STORAGE_KEYS.conversation,
      conversationHistory
    );
  }
}


function restoreConversation() {

  if (!conversationHistory.length) {

    addMessage(
      "jarvis",
      "Systems online. I'm ready. Try asking me something."
    );

    return;
  }

  conversationHistory
    .slice(-30)
    .forEach(message => {
      addMessage(
        message.role,
        message.text,
        false
      );
    });
}


function updateDashboard() {

  memoryCount.textContent =
    memories.length;

  taskCount.textContent =
    tasks.filter(task => !task.completed).length;
}


function nowTime() {

  return new Intl.DateTimeFormat(
    undefined,
    {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit"
    }
  ).format(new Date());
}


function todayDate() {

  return new Intl.DateTimeFormat(
    undefined,
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  ).format(new Date());
}


function calculateExpression(input) {

  let expression = input
    .replace(/calculate/gi, "")
    .replace(/what is/gi, "")
    .replace(/what's/gi, "")
    .replace(/=/g, "")
    .trim();

  expression = expression
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/plus/gi, "+")
    .replace(/minus/gi, "-")
    .replace(/multiplied by/gi, "*")
    .replace(/times/gi, "*")
    .replace(/divided by/gi, "/")
    .replace(/\^/g, "**");

  if (!/^[0-9+\-*/().%\s*]+$/.test(expression)) {
    return null;
  }

  try {

    const result = Function(
      `"use strict"; return (${expression})`
    )();

    if (
      typeof result !== "number" ||
      !Number.isFinite(result)
    ) {
      return null;
    }

    return result;

  } catch {

    return null;
  }
}


function remember(text) {

  const cleaned = text
    .replace(
      /^(remember that|remember|don't forget that|do not forget that)\s*/i,
      ""
    )
    .trim();

  if (!cleaned) {
    return "Tell me what you'd like me to remember.";
  }

  const exists = memories.some(
    memory =>
      memory.text.toLowerCase() ===
      cleaned.toLowerCase()
  );

  if (exists) {
    return "I already have that in memory.";
  }

  memories.unshift({
    id: Date.now(),
    text: cleaned,
    createdAt: Date.now()
  });

  save(
    STORAGE_KEYS.memories,
    memories
  );

  updateDashboard();
  renderMemories();

  return `Understood. I'll remember: "${cleaned}"`;
}


function forget(text) {

  const target = text
    .replace(
      /^(forget that|forget|remove from memory)\s*/i,
      ""
    )
    .trim()
    .toLowerCase();

  if (!target) {
    return "Tell me what you want me to forget.";
  }

  const before = memories.length;

  memories = memories.filter(
    memory =>
      !memory.text
        .toLowerCase()
        .includes(target)
  );

  const removed =
    before - memories.length;

  save(
    STORAGE_KEYS.memories,
    memories
  );

  updateDashboard();
  renderMemories();

  if (!removed) {
    return "I couldn't find that in my memory.";
  }

  return `Removed ${removed} memory item${removed === 1 ? "" : "s"}.`;
}


function createTask(text) {

  let taskText = text
    .replace(
      /^(add task|create task|new task|remind me to|remind me)\s*/i,
      ""
    )
    .trim();

  if (!taskText) {
    return "Tell me what task you'd like me to create.";
  }

  tasks.unshift({
    id: Date.now(),
    text: taskText,
    completed: false,
    createdAt: Date.now()
  });

  save(
    STORAGE_KEYS.tasks,
    tasks
  );

  updateDashboard();
  renderTasks();

  return `Task created: "${taskText}"`;
}


function completeTask(index) {

  if (!tasks[index]) {
    return;
  }

  tasks[index].completed =
    !tasks[index].completed;

  save(
    STORAGE_KEYS.tasks,
    tasks
  );

  updateDashboard();
  renderTasks();
}


function capabilities() {

  return [
    "I can currently:",
    "",
    "• Answer basic conversational requests",
    "• Calculate mathematical expressions",
    "• Tell you the current time and date",
    "• Remember information",
    "• Forget stored memories",
    "• Create and manage tasks",
    "• Read my local memory",
    "• Read my task list",
    "• Speak responses aloud",
    "• Accept voice commands",
    "",
    "My cloud AI brain and advanced external tools will be connected in a later version."
  ].join("\n");
}


function getMemoryResponse() {

  if (!memories.length) {
    return "My memory is currently empty.";
  }

  return [
    "I currently remember:",
    "",
    ...memories
      .slice(0, 10)
      .map(
        (memory, index) =>
          `${index + 1}. ${memory.text}`
      )
  ].join("\n");
}


function getTaskResponse() {

  const activeTasks =
    tasks.filter(task => !task.completed);

  if (!activeTasks.length) {
    return "You have no unfinished tasks.";
  }

  return [
    "Your active tasks:",
    "",
    ...activeTasks
      .slice(0, 10)
      .map(
        (task, index) =>
          `${index + 1}. ${task.text}`
      )
  ].join("\n");
}


function processCommand(rawInput) {

  const input = rawInput.trim();

  const lower =
    input.toLowerCase();


  if (!input) {
    return "I'm listening.";
  }


  if (
    lower === "hi" ||
    lower === "hello" ||
    lower.includes("hey jarvis")
  ) {

    return "Hello. All local systems are operational.";
  }


  if (
    lower.includes("what can you do") ||
    lower.includes("your capabilities") ||
    lower === "capabilities"
  ) {

    return capabilities();
  }


  if (
    lower.includes("what time") ||
    lower === "time" ||
    lower.includes("current time")
  ) {

    return `The current time is ${nowTime()}.`;
  }


  if (
    lower.includes("what date") ||
    lower.includes("today's date") ||
    lower.includes("todays date")
  ) {

    return `Today is ${todayDate()}.`;
  }


  if (
    lower.startsWith("remember ") ||
    lower.startsWith("remember that ") ||
    lower.startsWith("don't forget ") ||
    lower.startsWith("do not forget ")
  ) {

    return remember(input);
  }


  if (
    lower.startsWith("forget ") ||
    lower.startsWith("forget that ") ||
    lower.startsWith("remove from memory ")
  ) {

    return forget(input);
  }


  if (
    lower.startsWith("add task ") ||
    lower.startsWith("create task ") ||
    lower.startsWith("new task ") ||
    lower.startsWith("remind me to ") ||
    lower.startsWith("remind me ")
  ) {

    return createTask(input);
  }


  if (
    lower.includes("show my tasks") ||
    lower.includes("show tasks") ||
    lower.includes("my tasks") ||
    lower === "tasks"
  ) {

    return getTaskResponse();
  }


  if (
    lower.includes("show my memory") ||
    lower.includes("show memory") ||
    lower.includes("what do you remember") ||
    lower === "memory"
  ) {

    return getMemoryResponse();
  }


  if (
    lower.startsWith("calculate ") ||
    lower.startsWith("what is ") ||
    lower.startsWith("what's ") ||
    /^[0-9]/.test(lower)
  ) {

    const result =
      calculateExpression(input);

    if (result !== null) {

      return `The result is ${result}.`;
    }
  }


  if (
    lower.includes("thank")
  ) {

    return "You're welcome.";
  }


  return [
    "I understand the request, but that capability isn't connected to my local core yet.",
    "",
    "In v0.1 I can handle:",
    "• calculations",
    "• time and date",
    "• memory",
    "• tasks",
    "• basic conversation",
    "• voice interaction",
    "",
    "The next upgrade will connect my actual AI reasoning engine."
  ].join("\n");
}


function speak(text) {

  if (
    !("speechSynthesis" in window)
  ) {
    return;
  }

  window.speechSynthesis.cancel();

  const cleanText =
    text
      .replace(/•/g, "")
      .replace(/\n+/g, ". ");

  const utterance =
    new SpeechSynthesisUtterance(cleanText);

  utterance.rate = 0.95;
  utterance.pitch = 0.9;
  utterance.volume = 1;

  window.speechSynthesis.speak(
    utterance
  );
}


async function sendCommand(input) {

  const command = input.trim();

  if (!command) {
    return;
  }

  addMessage(
    "user",
    command
  );

  commandInput.value = "";

  systemMessage.textContent =
    "PROCESSING REQUEST...";

  await new Promise(
    resolve =>
      setTimeout(resolve, 250)
  );

  const response =
    processCommand(command);

  addMessage(
    "jarvis",
    response
  );

  systemMessage.textContent =
    "SYSTEM READY";

  speak(response);
}


function renderMemories() {

  if (!memories.length) {

    memoryList.innerHTML = `
      <div class="empty-state">
        No memories stored yet.
      </div>
    `;

    return;
  }

  memoryList.innerHTML =
    memories
      .map(
        memory => `
          <div class="memory-item">

            <div class="memory-text">
              ${escapeHTML(memory.text)}
            </div>

            <div class="memory-date">
              ${new Date(
                memory.createdAt
              ).toLocaleDateString()}
            </div>

          </div>
        `
      )
      .join("");
}


function renderTasks() {

  if (!tasks.length) {

    taskList.innerHTML = `
      <div class="empty-state">
        No tasks created yet.
      </div>
    `;

    return;
  }

  taskList.innerHTML =
    tasks
      .map(
        (task, index) => `
          <div class="task-item ${
            task.completed
              ? "task-completed"
              : ""
          }">

            <div class="task-left">

              <button
                class="task-check"
                data-task-index="${index}"
              >
                ${task.completed ? "✓" : ""}
              </button>

              <div class="task-text">
                ${escapeHTML(task.text)}
              </div>

            </div>

            <div class="task-date">
              ${new Date(
                task.createdAt
              ).toLocaleDateString()}
            </div>

          </div>
        `
      )
      .join("");
}


commandForm.addEventListener(
  "submit",
  event => {

    event.preventDefault();

    sendCommand(
      commandInput.value
    );
  }
);


document
  .querySelectorAll(
    ".quick-actions button"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        sendCommand(
          button.dataset.command
        );
      }
    );
  });


memoryButton.addEventListener(
  "click",
  () => {

    memoryPanel.classList.remove(
      "hidden"
    );

    renderMemories();

    memoryPanel.scrollIntoView({
      behavior: "smooth"
    });
  }
);


taskButton.addEventListener(
  "click",
  () => {

    taskPanel.classList.remove(
      "hidden"
    );

    renderTasks();

    taskPanel.scrollIntoView({
      behavior: "smooth"
    });
  }
);


closeMemory.addEventListener(
  "click",
  () => {
    memoryPanel.classList.add(
      "hidden"
    );
  }
);


closeTasks.addEventListener(
  "click",
  () => {
    taskPanel.classList.add(
      "hidden"
    );
  }
);


taskList.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        ".task-check"
      );

    if (!button) {
      return;
    }

    completeTask(
      Number(
        button.dataset.taskIndex
      )
    );
  }
);


let recognition = null;

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;


if (SpeechRecognition) {

  recognition =
    new SpeechRecognition();

  recognition.lang = "en-IN";

  recognition.continuous = false;

  recognition.interimResults = false;


  recognition.onstart = () => {

    systemMessage.textContent =
      "LISTENING...";

    voiceButton.classList.add(
      "listening"
    );
  };


  recognition.onend = () => {

    systemMessage.textContent =
      "SYSTEM READY";

    voiceButton.classList.remove(
      "listening"
    );
  };


  recognition.onerror = () => {

    systemMessage.textContent =
      "VOICE INPUT ERROR";

    voiceButton.classList.remove(
      "listening"
    );
  };


  recognition.onresult = event => {

    const transcript =
      event.results[0][0].transcript;

    commandInput.value =
      transcript;

    sendCommand(
      transcript
    );
  };

} else {

  voiceButton.style.opacity = "0.4";
}


voiceButton.addEventListener(
  "click",
  () => {

    if (!recognition) {

      systemMessage.textContent =
        "VOICE INPUT IS NOT AVAILABLE ON THIS DEVICE";

      return;
    }

    try {

      recognition.start();

    } catch {

      recognition.stop();

    }
  }
);


restoreConversation();

updateDashboard();

renderMemories();

renderTasks();
