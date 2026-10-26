/* ============================================================
   NEON CASINO — игровая логика (игрушечные деньги!)
   ============================================================ */

// ---------- БАЛАНС ----------
const START_BALANCE = 300;
let balance = parseInt(localStorage.getItem('neonBalance')) || START_BALANCE;

const balanceEl = document.getElementById('balance');

function renderBalance() {
  balanceEl.textContent = balance + ' ₽';
  localStorage.setItem('neonBalance', balance);
}

function changeBalance(delta) {
  balance += delta;
  if (balance < 0) balance = 0;
  renderBalance();
  balanceEl.classList.remove('win', 'loss');
  void balanceEl.offsetWidth; // перезапуск анимации
  balanceEl.classList.add(delta >= 0 ? 'win' : 'loss');
  setTimeout(() => balanceEl.classList.remove('win', 'loss'), 600);
}

function notEnoughMoney(resultEl, cost) {
  resultEl.textContent = `💸 Не хватает денег! Нужно ${cost} ₽. Нажми «+300» сверху.`;
  resultEl.className = 'result bad';
  balanceEl.parentElement.classList.add('shake');
  setTimeout(() => balanceEl.parentElement.classList.remove('shake'), 400);
}

renderBalance();

// Кнопка пополнения (игрушечные деньги всегда можно получить снова)
document.getElementById('topUpBtn').addEventListener('click', () => {
  changeBalance(START_BALANCE);
});

// ---------- НАВИГАЦИЯ ----------
const tabs = document.querySelectorAll('.tab');
const pages = document.querySelectorAll('.page');
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    pages.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('page-' + tab.dataset.page).classList.add('active');
  });
});

// ============================================================
// 🎰 СЛОТ-МАШИНА
// ============================================================
const SYMBOLS = ['🍒', '🍋', '🔔', '💎', '7️⃣'];
const SPIN_COST = 10;
const reels = [
  document.getElementById('reel0'),
  document.getElementById('reel1'),
  document.getElementById('reel2')
];
const spinBtn = document.getElementById('spinBtn');
const slotResult = document.getElementById('slotResult');
let spinning = false;

function payout(combo) {
  const [a, b, c] = combo;
  if (a === b && b === c) {
    switch (a) {
      case '7️⃣': return 200;
      case '💎': return 150;
      case '🔔': return 100;
      case '🍋': return 60;
      case '🍒': return 40;
    }
  }
  const cherries = combo.filter(s => s === '🍒').length;
  if (cherries === 2) return 15;
  return 0;
}

spinBtn.addEventListener('click', () => {
  if (spinning) return;
  if (balance < SPIN_COST) { notEnoughMoney(slotResult, SPIN_COST); return; }

  spinning = true;
  spinBtn.disabled = true;
  slotResult.textContent = '';
  slotResult.className = 'result';
  changeBalance(-SPIN_COST);
  reels.forEach(r => { r.classList.remove('hit'); r.classList.add('spinning'); });

  // мелькание символов во время "ращения"
  const flicker = setInterval(() => {
    reels.forEach(r => r.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
  }, 80);

  const finalCombo = [0, 1, 2].map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);

  // барабаны останавливаются по очереди
  reels.forEach((r, i) => {
    setTimeout(() => {
      r.classList.remove('spinning');
      r.textContent = finalCombo[i];
      if (i === 2) {
        clearInterval(flicker);
        finishSpin(finalCombo);
      }
    }, 900 + i * 600);
  });
});

function finishSpin(combo) {
  const win = payout(combo);
  if (win > 0) {
    changeBalance(win);
    reels.forEach(r => r.classList.add('hit'));
    slotResult.textContent = `🎉 ВЫИГРЫШ +${win} ₽!`;
    slotResult.className = 'result good';
  } else {
    slotResult.textContent = '😢 Мимо. Попробуй ещё раз!';
    slotResult.className = 'result bad';
  }
  spinning = false;
  spinBtn.disabled = false;
}

// ============================================================
// 🎡 РУЛЕТКА
// ============================================================
// Европейская рулетка: 0 + 1..36
const WHEEL_NUMBERS = (() => {
  const order = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36,
                 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9,
                 22, 18, 29, 7, 28, 12, 35, 3, 26];
  return order;
})();
const RED_SET = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const BET_COST = 20;
const SECTOR_ANGLE = 360 / WHEEL_NUMBERS.length;

const wheel = document.getElementById('wheel');
const rouletteResult = document.getElementById('rouletteResult');
let wheelAngle = 0;
let rouletteBusy = false;

// строим секторы
WHEEL_NUMBERS.forEach((n, i) => {
  const s = document.createElement('div');
  const color = n === 0 ? 'green' : (RED_SET.has(n) ? 'red' : 'black');
  s.className = 'sector s-' + color;
  s.style.transform = `rotate(${i * SECTOR_ANGLE}deg) skewY(${90 - SECTOR_ANGLE}deg)`;
  s.innerHTML = `<span>${n}</span>`;
  wheel.appendChild(s);
});

function colorOf(n) {
  if (n === 0) return 'green';
  return RED_SET.has(n) ? 'red' : 'black';
}

document.querySelectorAll('.bet-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (rouletteBusy) return;
    if (balance < BET_COST) { notEnoughMoney(rouletteResult, BET_COST); return; }

    const bet = btn.dataset.bet;
    rouletteBusy = true;
    document.querySelectorAll('.bet-btn').forEach(b => b.disabled = true);
    rouletteResult.textContent = '';
    rouletteResult.className = 'result';
    changeBalance(-BET_COST);

    const winIndex = Math.floor(Math.random() * WHEEL_NUMBERS.length);
    // цель: сектор winIndex должен оказаться под указателем сверху (270°)
    const targetAngle = 270 - (winIndex * SECTOR_ANGLE + SECTOR_ANGLE / 2);
    const fullSpins = 360 * (4 + Math.floor(Math.random() * 3));
    wheelAngle = targetAngle + fullSpins + (Math.random() * 5 - 2.5);
    wheel.style.transform = `rotate(${wheelAngle}deg)`;

    setTimeout(() => {
      const num = WHEEL_NUMBERS[winIndex];
      const col = colorOf(num);
      let msg;
      if (col === bet) {
        const mult = bet === 'green' ? 14 : 2;
        const win = BET_COST * mult;
        changeBalance(win);
        msg = `🎉 Выпало ${num} (${col === 'red' ? 'красное' : col === 'black' ? 'чёрное' : 'зеро'})! Выигрыш +${win} ₽!`;
        rouletteResult.className = 'result good';
      } else {
        msg = `Выпало ${num} (${col === 'red' ? 'красное' : col === 'black' ? 'чёрное' : 'зеро'}). Ставка сгорела 💀`;
        rouletteResult.className = 'result bad';
      }
      rouletteResult.textContent = msg;
      rouletteBusy = false;
      document.querySelectorAll('.bet-btn').forEach(b => b.disabled = false);
    }, 4200);
  });
});

// ============================================================
// ❓ УГАДАЙ ПРЕДМЕТ
// ============================================================
const ITEMS = [
  { name: 'холодильник', hint: 'Хранит еду холодной' },
  { name: 'телевизор', hint: 'Показывает картинки и звук' },
  { name: 'стул', hint: 'На нём сидят' },
  { name: 'зонтик', hint: 'Спасает от дождя' },
  { name: 'гитара', hint: 'На ней играют музыку' },
  { name: 'часы', hint: 'Показывают время' },
  { name: 'книга', hint: 'Её читают' },
  { name: 'самолёт', hint: 'Летает в небе' },
  { name: 'велосипед', hint: 'Два колеса и педали' },
  { name: 'чайник', hint: 'Кипятит воду' },
  { name: 'мяч', hint: 'Им играют в футбол' },
  { name: 'лампа', hint: 'Освещает комнату' },
  { name: 'телефон', hint: 'По нему звонят' },
  { name: 'шкаф', hint: 'Хранят одежду' },
  { name: 'ковёр', hint: 'Лежит на полу' },
  { name: 'очки', hint: 'Их носят на носу' },
  { name: 'ложка', hint: 'Едят суп' },
  { name: 'ножницы', hint: 'Ими режут бумагу' },
  { name: 'подушка', hint: 'Кладут под голову' },
  { name: 'робот', hint: 'Механический помощник' }
];
const GUESS_COST = 10;
const GUESS_PRIZE = 50;
const MAX_ATTEMPTS = 5;

let currentItem = null;
let attemptsLeft = 0;
let guessActive = false;
let playerName = '';

const nameInput = document.getElementById('playerNameInput');
const guessInput = document.getElementById('guessInput');
const startGuessBtn = document.getElementById('startGuessBtn');
const checkGuessBtn = document.getElementById('checkGuessBtn');
const newGuessBtn = document.getElementById('newGuessBtn');
const attemptsEl = document.getElementById('attemptsLeft');
const guessResult = document.getElementById('guessResult');
const guessLog = document.getElementById('guessLog');
const mysteryEl = document.querySelector('.mystery');

function normalize(s) {
  return s.trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, '');
}

function startGuessGame() {
  if (balance < GUESS_COST) { notEnoughMoney(guessResult, GUESS_COST); return; }
  playerName = nameInput.value.trim() || 'Игрок';
  changeBalance(-GUESS_COST);

  currentItem = ITEMS[Math.floor(Math.random() * ITEMS.length)];
  attemptsLeft = MAX_ATTEMPTS;
  guessActive = true;

  guessResult.textContent = '';
  guessResult.className = 'result';
  guessLog.innerHTML = '';
  mysteryEl.textContent = '❓';
  attemptsEl.textContent = `Загадан предмет: «${currentItem.hint}». Осталось попыток: ${attemptsLeft}`;

  startGuessBtn.style.display = 'none';
  nameInput.style.display = 'none';
  guessInput.style.display = 'block';
  checkGuessBtn.style.display = 'inline-block';
  newGuessBtn.style.display = 'none';
  guessInput.value = '';
  guessInput.focus();
}

function endGuessGame(won) {
  guessActive = false;
  checkGuessBtn.style.display = 'none';
  guessInput.style.display = 'none';
  newGuessBtn.style.display = 'inline-block';
  nameInput.style.display = 'block';
  if (won) {
    changeBalance(GUESS_PRIZE);
    mysteryEl.textContent = '🏆';
    guessResult.textContent = `🎉 ${playerName}, ты угадал! +${GUESS_PRIZE} ₽!`;
    guessResult.className = 'result good';
  } else {
    mysteryEl.textContent = '💀';
    guessResult.textContent = `😢 Попытки кончились. Это был: «${currentItem.name}».`;
    guessResult.className = 'result bad';
  }
  attemptsEl.textContent = 'Нажми «НОВАЯ ИГРА», чтобы сыграть ещё раз (-10 ₽)';
}

function checkGuess() {
  if (!guessActive) return;
  const val = normalize(guessInput.value);
  if (!val) return;

  const li = document.createElement('li');
  if (val === normalize(currentItem.name)) {
    li.textContent = `✅ «${guessInput.value.trim()}» — ТОЧНО В ЦЕЛЬ!`;
    guessLog.prepend(li);
    endGuessGame(true);
    return;
  }

  attemptsLeft--;
  const contains = normalize(currentItem.name).includes(val) || val.includes(normalize(currentItem.name));
  let feedback;
  if (contains) {
    feedback = '🔥 Горячо! Ты почти угадал — добавь/убери буквы.';
  } else if (currentItem.name.length === val.length) {
    feedback = '🌡 Тёпло: слово такой же длины, но не оно.';
  } else {
    feedback = '❄ Холодно. Не то слово.';
  }
  li.textContent = `«${guessInput.value.trim()}» — ${feedback}`;
  guessLog.prepend(li);
  attemptsEl.textContent = `Осталось попыток: ${attemptsLeft}`;
  guessInput.value = '';
  guessInput.focus();

  if (attemptsLeft <= 0) endGuessGame(false);
}

startGuessBtn.addEventListener('click', startGuessGame);
newGuessBtn.addEventListener('click', startGuessGame);
checkGuessBtn.addEventListener('click', checkGuess);
guessInput.addEventListener('keydown', e => { if (e.key === 'Enter') checkGuess(); });
