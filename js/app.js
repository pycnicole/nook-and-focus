// ================= 1. 安全讀取 LocalStorage 與模式文字定義 =================
function loadFromStorage(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return fallback;
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
}

// 定義三種模式對應的文字，解決切換時文字沒變的問題！
var MODE_TEXT = {
  focus: {
    readyStatus: '準備開始專注',
    runningStatus: '沉浸專注中...',
    startBtn: '▶ 開始專注',
    doneStatus: '太棒了！已完成一輪專注',
    tabTitle: '專注中'
  },
  short: {
    readyStatus: '準備短暫休息',
    runningStatus: '短暫休息放鬆中...',
    startBtn: '▶ 開始短休',
    doneStatus: '短休結束，準備繼續專注吧！',
    tabTitle: '短休中'
  },
  long: {
    readyStatus: '準備長假充電',
    runningStatus: '深度休息充電中...',
    startBtn: '▶ 開始長休',
    doneStatus: '長休結束，精神飽滿！',
    tabTitle: '長休中'
  }
};

var STORAGE_KEYS = {
  TODOS: 'nook_todos_empty_v1',
  BOOKS: 'nook_books_empty_v1',
  FOCUS_MINUTES: 'nook_focus_empty_v1'
};

var state = {
  todos: loadFromStorage(STORAGE_KEYS.TODOS, typeof DEFAULT_TODOS !== 'undefined' ? DEFAULT_TODOS : []),
  books: loadFromStorage(STORAGE_KEYS.BOOKS, typeof DEFAULT_BOOKS !== 'undefined' ? DEFAULT_BOOKS : []),
  focusMinutes: parseInt(localStorage.getItem(STORAGE_KEYS.FOCUS_MINUTES), 10) || 0,
  sounds: typeof DEFAULT_SOUNDS !== 'undefined' ? JSON.parse(JSON.stringify(DEFAULT_SOUNDS)) : [],
  currentFilter: 'all',
  activeBookId: null,
  timer: {
    mode: 'focus',
    totalSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    isRunning: false,
    intervalId: null
  }
};

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify(state.todos));
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(state.books));
    localStorage.setItem(STORAGE_KEYS.FOCUS_MINUTES, String(state.focusMinutes));
  } catch (e) {}
}

function refreshIcons() {
  if (typeof window.lucide !== 'undefined' && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// ================= 2. 真實環境音訊播放引擎 (HTML5 Audio + Web Audio 鐘聲) =================
var audioPlayers = {};
var audioCtx = null;

/**
 * 播放或控制真實環境音檔 (支援無縫循環播放)
 */
function toggleAmbientSound(soundId, shouldPlay, volumePercent) {
  var soundConfig = state.sounds.find(function (s) { return s.id === soundId; });
  if (!soundConfig) return;

  // 如果還沒建立過這個音軌的 Audio 物件，就建立一個
  if (!audioPlayers[soundId] && soundConfig.url) {
    var audio = new Audio(soundConfig.url);
    audio.loop = true;
    audio.preload = 'auto';
    audioPlayers[soundId] = audio;
  }

  var player = audioPlayers[soundId];
  if (!player) return;

  // 設定音量 (0.0 ~ 1.0)
  player.volume = Math.max(0, Math.min(1, volumePercent / 100));

  if (shouldPlay && volumePercent > 0) {
    if (player.paused) {
      player.play().catch(function (err) {
        console.warn('音訊播放失敗，請確認網路連線或音訊檔案路徑:', err);
      });
    }
  } else {
    if (!player.paused) {
      player.pause();
    }
  }
}

/**
 * 番茄鐘倒數結束時的 528Hz 頌缽提示鐘聲
 */
function playChimeSound() {
  try {
    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx && AudioContextClass) audioCtx = new AudioContextClass();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(528, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 2.5);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 2.5);
  } catch (e) {}
}

// ================= 3. 番茄鐘計時器邏輯 =================
function getCurrentModeConfig() {
  return MODE_TEXT[state.timer.mode] || MODE_TEXT.focus;
}

function updateTimerUI() {
  var mins = String(Math.floor(state.timer.remainingSeconds / 60)).padStart(2, '0');
  var secs = String(state.timer.remainingSeconds % 60).padStart(2, '0');
  var timeStr = mins + ':' + secs;
  var modeCfg = getCurrentModeConfig();

  var displayEl = document.getElementById('timer-display');
  if (displayEl) displayEl.textContent = timeStr;

  if (state.timer.isRunning) {
    document.title = '(' + timeStr + ') ' + modeCfg.tabTitle + ' — Nook & Focus';
  } else {
    document.title = 'Nook & Focus — 深夜書房與專注空間';
  }

  var progressEl = document.getElementById('timer-progress');
  if (progressEl) {
    var circumference = 276.46;
    var progress = 1 - (state.timer.remainingSeconds / state.timer.totalSeconds);
    progressEl.style.strokeDashoffset = String(circumference * progress);
  }
}

function toggleTimer() {
  var btn = document.getElementById('btn-timer-toggle');
  var statusEl = document.getElementById('timer-status');
  if (!btn || !statusEl) return;

  var modeCfg = getCurrentModeConfig();

  if (state.timer.isRunning) {
    // 暫停計時
    clearInterval(state.timer.intervalId);
    state.timer.isRunning = false;
    statusEl.textContent = '已暫停（點擊繼續）';
    btn.innerHTML = '<span>▶ 繼續計時</span>';
  } else {
    // 開始計時
    state.timer.isRunning = true;
    statusEl.textContent = modeCfg.runningStatus;
    btn.innerHTML = '<span>⏸ 暫停</span>';

    state.timer.intervalId = setInterval(function () {
      if (state.timer.remainingSeconds > 0) {
        state.timer.remainingSeconds--;
        updateTimerUI();
      } else {
        // 倒數結束
        clearInterval(state.timer.intervalId);
        state.timer.isRunning = false;
        playChimeSound();

        var currentCfg = getCurrentModeConfig();
        if (state.timer.mode === 'focus') {
          var addedMins = Math.round(state.timer.totalSeconds / 60);
          state.focusMinutes += addedMins;
          saveState();
          updateFocusStatsUI();
        }
        statusEl.textContent = currentCfg.doneStatus;

        state.timer.remainingSeconds = state.timer.totalSeconds;
        btn.innerHTML = '<span>' + currentCfg.startBtn + '</span>';
        updateTimerUI();
      }
    }, 1000);
  }
  updateTimerUI();
}

function resetTimer() {
  clearInterval(state.timer.intervalId);
  state.timer.isRunning = false;
  state.timer.remainingSeconds = state.timer.totalSeconds;

  var modeCfg = getCurrentModeConfig();
  var statusEl = document.getElementById('timer-status');
  var btn = document.getElementById('btn-timer-toggle');

  if (statusEl) statusEl.textContent = modeCfg.readyStatus;
  if (btn) btn.innerHTML = '<span>' + modeCfg.startBtn + '</span>';
  updateTimerUI();
}

function updateFocusStatsUI() {
  var statsEl = document.getElementById('focus-stats');
  if (statsEl) statsEl.textContent = state.focusMinutes + ' mins';
}

// ================= 4. 環境白噪音混音器 =================
function renderSoundMixer() {
  var container = document.getElementById('sound-mixer-list');
  if (!container) return;

  var iconMap = {
    rain: '🌧️',
    fire: '🔥',
    cafe: '☕',
    pages: '🍃'
  };

  var html = '';
  for (var i = 0; i < state.sounds.length; i++) {
    var sound = state.sounds[i];
    var btnClass = sound.active
      ? 'bg-nook-accent/20 border-nook-accent text-nook-accent shadow-sm'
      : 'bg-nook-bg border-nook-border text-nook-muted hover:text-nook-text';
    var nameClass = sound.active ? 'text-nook-text font-medium' : 'text-nook-muted';
    var volText = sound.active ? (sound.volume + '%') : '點擊圖示開啟';
    var emoji = iconMap[sound.id] || '🎵';

    html += '<div class="flex items-center gap-3.5">' +
      '<button type="button" data-sound-toggle="' + sound.id + '" class="w-9 h-9 rounded-xl flex items-center justify-center border transition cursor-pointer ' + btnClass + '" title="點擊播放/暫停">' +
        '<span>' + emoji + '</span>' +
      '</button>' +
      '<div class="flex-1">' +
        '<div class="flex justify-between text-xs mb-1.5">' +
          '<span class="' + nameClass + '">' + sound.name + '</span>' +
          '<span id="vol-label-' + sound.id + '" class="text-nook-muted">' + volText + '</span>' +
        '</div>' +
        '<input type="range" data-sound-slider="' + sound.id + '" min="0" max="100" value="' + sound.volume + '" class="volume-slider">' +
      '</div>' +
    '</div>';
  }
  container.innerHTML = html;

  var toggleBtns = container.querySelectorAll('[data-sound-toggle]');
  toggleBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-sound-toggle');
      var target = state.sounds.find(function (s) { return s.id === id; });
      if (!target) return;
      target.active = !target.active;
      if (target.active && target.volume === 0) target.volume = 50;
      toggleAmbientSound(target.id, target.active, target.volume);
      renderSoundMixer();
    });
  });

  var sliders = container.querySelectorAll('[data-sound-slider]');
  sliders.forEach(function (slider) {
    slider.addEventListener('input', function (e) {
      var id = slider.getAttribute('data-sound-slider');
      var val = parseInt(e.target.value, 10);
      var target = state.sounds.find(function (s) { return s.id === id; });
      if (!target) return;

      target.volume = val;
      target.active = val > 0;
      var label = document.getElementById('vol-label-' + id);
      if (label) label.textContent = target.active ? (val + '%') : '點擊開啟';
      toggleAmbientSound(target.id, target.active, target.volume);
    });

    slider.addEventListener('change', function () {
      renderSoundMixer();
    });
  });
}

// ================= 5. 今日待辦清單 CRUD =================
function renderTodos() {
  var listEl = document.getElementById('todo-list');
  var counterEl = document.getElementById('todo-counter');
  if (!listEl || !counterEl) return;

  var completedCount = state.todos.filter(function (t) { return t.completed; }).length;
  counterEl.textContent = completedCount + ' / ' + state.todos.length + ' 完成';

  if (state.todos.length === 0) {
    listEl.innerHTML = '<li class="text-center text-xs text-nook-muted py-6">今天還沒有待辦事項，寫下一個小目標吧！</li>';
    return;
  }

  var html = '';
  for (var i = 0; i < state.todos.length; i++) {
    var todo = state.todos[i];
    var checkedAttr = todo.completed ? 'checked' : '';
    var textClass = todo.completed ? 'line-through text-nook-muted' : 'text-nook-text';

    html += '<li class="flex items-center justify-between gap-3 bg-nook-bg px-4 py-3 rounded-xl border border-nook-border group transition">' +
      '<label class="flex items-center gap-3 cursor-pointer flex-1">' +
        '<input type="checkbox" data-todo-check="' + todo.id + '" ' + checkedAttr + ' class="w-4 h-4 accent-[#D4A373] rounded cursor-pointer">' +
        '<span class="text-sm ' + textClass + '">' + todo.text + '</span>' +
      '</label>' +
      '<button type="button" data-todo-del="' + todo.id + '" class="text-xs text-nook-muted hover:text-red-400 opacity-70 group-hover:opacity-100 transition cursor-pointer px-1" title="刪除">✕</button>' +
    '</li>';
  }
  listEl.innerHTML = html;

  listEl.querySelectorAll('[data-todo-check]').forEach(function (chk) {
    chk.addEventListener('change', function () {
      var id = Number(chk.getAttribute('data-todo-check'));
      var todo = state.todos.find(function (t) { return t.id === id; });
      if (todo) {
        todo.completed = !todo.completed;
        saveState();
        renderTodos();
      }
    });
  });

  listEl.querySelectorAll('[data-todo-del]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = Number(btn.getAttribute('data-todo-del'));
      state.todos = state.todos.filter(function (t) { return t.id !== id; });
      saveState();
      renderTodos();
    });
  });
}

// ================= 6. 個人數位書架渲染與 CRUD =================
function renderBookshelf() {
  var container = document.getElementById('bookshelf-container');
  if (!container) return;

  var filteredBooks = state.currentFilter === 'all'
    ? state.books
    : state.books.filter(function (b) { return b.status === state.currentFilter; });

  var summaryEl = document.getElementById('shelf-summary');
  if (summaryEl) {
    summaryEl.textContent = '目前顯示 ' + filteredBooks.length + ' 本書（總館藏 ' + state.books.length + ' 本）';
  }
  
  var booksPerRow = 7;
  var shelves = [];
  for (var i = 0; i < filteredBooks.length; i += booksPerRow) {
    shelves.push(filteredBooks.slice(i, i + booksPerRow));
  }
  while (shelves.length < 2) {
    shelves.push([]);
  }

  var html = '';
  for (var s = 0; s < shelves.length; s++) {
    var shelfBooks = shelves[s];
    html += '<div class="bookshelf-row">';
    if (shelfBooks.length > 0) {
      for (var b = 0; b < shelfBooks.length; b++) {
        var book = shelfBooks[b];
        var h = book.height || '146px';
        var w = book.width || '38px';
        html += '<div class="book-spine" data-book-id="' + book.id + '" ' +
          'style="background-color: ' + book.color + '; height: ' + h + '; width: ' + w + ';" ' +
          'title="點擊查看《' + book.title + '》筆記">' +
          '<span class="book-spine-title">' + book.title + '</span>' +
        '</div>';
      }
    } else {
      html += '<span class="text-xs text-nook-muted m-auto pb-4">這層書架目前空空的...</span>';
    }
    html += '</div>';
  }
  container.innerHTML = html;

  container.querySelectorAll('.book-spine').forEach(function (spine) {
    spine.addEventListener('click', function () {
      var bookId = spine.getAttribute('data-book-id');
      var book = state.books.find(function (item) { return item.id === bookId; });
      if (book) openBookModal(book);
    });
  });
}

function openBookModal(book) {
  state.activeBookId = book.id;
  var statusMap = { read: '已讀完', reading: '閱讀中', wishlist: '想看清單' };

  document.getElementById('modal-book-title').textContent = book.title;
  document.getElementById('modal-book-author').textContent = book.author;
  document.getElementById('modal-book-status').textContent = statusMap[book.status] || '館藏';
  document.getElementById('modal-book-note').textContent = book.note || '尚未寫下閱讀筆記。';

  var coverEl = document.getElementById('modal-book-cover');
  if (coverEl) {
    coverEl.style.backgroundColor = book.color;
    coverEl.textContent = book.title.slice(0, 6);
  }

  var modal = document.getElementById('book-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

// ================= 7. 初始化與事件綁定 =================
document.addEventListener('DOMContentLoaded', function () {
  var dateEl = document.getElementById('current-date');
  if (dateEl) {
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var dd = String(today.getDate()).padStart(2, '0');
    dateEl.textContent = yyyy + '.' + mm + '.' + dd;
  }

  updateFocusStatsUI();
  resetTimer(); // 初始化番茄鐘文字
  renderSoundMixer();
  renderTodos();
  renderBookshelf();
  bindEvents();
  refreshIcons();
});

function bindEvents() {
  var toggleBtn = document.getElementById('btn-timer-toggle');
  var resetBtn = document.getElementById('btn-timer-reset');
  if (toggleBtn) toggleBtn.addEventListener('click', toggleTimer);
  if (resetBtn) resetBtn.addEventListener('click', resetTimer);

  // 切換 專注 / 短休 / 長休 Tabs
  var timerTabs = document.querySelectorAll('.timer-tab');
  timerTabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () {
      timerTabs.forEach(function (t) {
        t.classList.remove('active', 'bg-nook-card', 'text-nook-accent', 'font-medium', 'shadow-sm');
        t.classList.add('text-nook-muted');
      });
      tab.classList.add('active', 'bg-nook-card', 'text-nook-accent', 'font-medium', 'shadow-sm');
      tab.classList.remove('text-nook-muted');

      // 就算 HTML 沒有寫 data-mode，也會自動根據按鈕順序 (0: focus, 1: short, 2: long) 判斷！
      var fallbackModes = ['focus', 'short', 'long'];
      var fallbackMins = [25, 5, 15];
      var mode = tab.getAttribute('data-mode') || fallbackModes[index] || 'focus';
      var mins = parseInt(tab.getAttribute('data-minutes'), 10) || fallbackMins[index] || 25;

      state.timer.mode = mode;
      state.timer.totalSeconds = mins * 60;
      resetTimer(); // 這會自動把下方文字與按鈕更新成對應的「開始短休 / 開始長休」！
    });
  });

  var muteAllBtn = document.getElementById('btn-mute-all');
  if (muteAllBtn) {
    muteAllBtn.addEventListener('click', function () {
      state.sounds.forEach(function (s) {
        s.active = false;
        toggleAmbientSound(s.id, false, 0);
      });
      renderSoundMixer();
    });
  }

  var todoForm = document.getElementById('todo-form');
  if (todoForm) {
    todoForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = document.getElementById('todo-input');
      var text = input.value.trim();
      if (!text) return;

      state.todos.unshift({
        id: Date.now(),
        text: text,
        completed: false
      });
      input.value = '';
      saveState();
      renderTodos();
    });
  }

  var shelfTabs = document.querySelectorAll('.shelf-tab');
  shelfTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      shelfTabs.forEach(function (t) {
        t.classList.remove('active', 'bg-nook-accent', 'text-nook-bg', 'font-medium');
        t.classList.add('text-nook-muted');
      });
      tab.classList.add('active', 'bg-nook-accent', 'text-nook-bg', 'font-medium');
      tab.classList.remove('text-nook-muted');

      state.currentFilter = tab.getAttribute('data-filter');
      renderBookshelf();
    });
  });

  var bookModal = document.getElementById('book-modal');
  var closeBookModal = function () {
    if (!bookModal) return;
    bookModal.classList.add('hidden');
    bookModal.classList.remove('flex');
  };
  var closeModalBtn = document.getElementById('btn-close-modal');
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeBookModal);
  if (bookModal) bookModal.addEventListener('click', function (e) { if (e.target === bookModal) closeBookModal(); });

  var deleteBookBtn = document.getElementById('btn-delete-book');
  if (deleteBookBtn) {
    deleteBookBtn.addEventListener('click', function () {
      if (!state.activeBookId) return;
      state.books = state.books.filter(function (b) { return b.id !== state.activeBookId; });
      saveState();
      renderBookshelf();
      closeBookModal();
    });
  }

  var addModal = document.getElementById('add-book-modal');
  var openAddBtn = document.getElementById('btn-open-add-book') || document.getElementById('btn-add-book');
  var closeAddBtn = document.getElementById('btn-close-add-modal');

  var closeAddModal = function () {
    if (!addModal) return;
    addModal.classList.add('hidden');
    addModal.classList.remove('flex');
  };

  if (openAddBtn && addModal) {
    openAddBtn.addEventListener('click', function () {
      addModal.classList.remove('hidden');
      addModal.classList.add('flex');
    });
  }
  if (closeAddBtn) closeAddBtn.addEventListener('click', closeAddModal);
  if (addModal) addModal.addEventListener('click', function (e) { if (e.target === addModal) closeAddModal(); });

  var swatches = document.querySelectorAll('.color-swatch');
  swatches.forEach(function (swatch) {
    swatch.addEventListener('click', function () {
      swatches.forEach(function (s) {
        s.classList.remove('ring-2', 'ring-offset-2', 'ring-offset-nook-card', 'ring-nook-accent');
        s.classList.add('opacity-70');
      });
      swatch.classList.add('ring-2', 'ring-offset-2', 'ring-offset-nook-card', 'ring-nook-accent');
      swatch.classList.remove('opacity-70');
      var colorInput = document.getElementById('input-book-color');
      if (colorInput) colorInput.value = swatch.getAttribute('data-color');
    });
  });

  var addBookForm = document.getElementById('add-book-form');
  if (addBookForm) {
    addBookForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var title = document.getElementById('input-book-title').value.trim();
      var author = document.getElementById('input-book-author').value.trim();
      var status = document.getElementById('input-book-status').value;
      var color = document.getElementById('input-book-color').value;
      var note = document.getElementById('input-book-note').value.trim();

      if (!title || !author) return;

      var randomHeight = (Math.floor(Math.random() * 20) + 136) + 'px';
      var randomWidth = (Math.floor(Math.random() * 8) + 35) + 'px';

      state.books.push({
        id: 'b_' + Date.now(),
        title: title,
        author: author,
        status: status,
        color: color,
        height: randomHeight,
        width: randomWidth,
        note: note || '尚未寫下閱讀筆記。'
      });

      saveState();
      renderBookshelf();
      e.target.reset();
      closeAddModal();
    });
  }
}