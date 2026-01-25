const listContainer = document.getElementById('checklist');

// --- РОТАЦІЇ ---
async function fetchTeshin() {
    try {
        const res = await fetch('https://api.warframestat.us/pc/steelPath');
        const data = await res.json();
        return `Тешін: ${data.currentReward.name} (Шлях Сталі)`;
    } catch { return "Тешін: Перевірити ротацію вручну"; }
}

const getBird3 = () => {
    const s = ["Блакитний", "Бурштиновий", "Багряний"], start = new Date('2026-01-19T00:00:00Z');
    const w = Math.floor((new Date() - start) / 604800000);
    return `Bird 3: ${s[(1 + w) % 3]} архонтовий уламок`;
};

const getCircN = () => {
    const r = ["Екскалібур, Трініті, Ембер", "Локі, Меґ, Райно", "Еш, Фрост, Нікс", "Зарина, Вобан, Нова", "Некрос, Валькірія, Оберон", "Гідроїд, Міраж, Лімбо", "Меса, Хрома, Атлас", "Івара, Інар, Титанія", "Нідус, Октавія, Гарроу", "Ґара, Хора, Ревенант", "Ґаруда, Баруук, Гільдрина"];
    const w = Math.floor((new Date() - new Date('2026-01-19T00:00:00Z')) / 604800000);
    return `Ланцюг: ${r[(10 + w) % 11]}`;
};

const getCircS = () => {
    const r = ["Вепр, Гаммакор, Анґструм, Горгона, Анку", "Бо, Пагуба, Фуракс, Фуріс, Стран", "Лекс, Маґістар, Болтор, Бронко, Керамічний кинджал", "Торид, Парні Токсоцисти, Парні Іхори, Зріз, Атомос", "Ак і Брант, Сома, Васто, Намі-Соло, Берстон", "Зайлок, Сибір, Жах, Розпач, Ненависть", "Дера, Сибаріс, Цестра, Сикар, Окіни", "Братон, Лато, Скана, Паріс, Кунаї"];
    const w = Math.floor((new Date() - new Date('2026-01-19T00:00:00Z')) / 604800000);
    return `Ланцюг (Сталь): ${r[(1 + w) % 8]}`;
};

// --- СИСТЕМНА ЛОГІКА ---
const updateUI = () => {
    const items = document.querySelectorAll('.item').length;
    const checked = document.querySelectorAll('.checked-item').length;
    document.getElementById('progress-bar').style.width = (items ? (checked / items) * 100 : 0) + '%';
};

const updateTimer = () => {
    const now = new Date(), next = new Date();
    next.setUTCDate(now.getUTCDate() + (1 + 7 - now.getUTCDay()) % 7);
    next.setUTCHours(0,0,0,0);
    const d = next - now, days = Math.floor(d/86400000), h = Math.floor((d/3600000)%24), m = Math.floor((d/60000)%60), s = Math.floor((d/1000)%60);
    document.getElementById('reset-timer').innerText = `До оновлення: ${days}д ${h}г ${m}хв ${s}с`;
};

function render(cats) {
    listContainer.innerHTML = '';
    for (const [name, tasks] of Object.entries(cats)) {
        const title = document.createElement('div'); title.className = 'category-title'; title.innerText = name;
        listContainer.appendChild(title);
        tasks.forEach(task => {
            const key = `task-${task.id}`, isDone = localStorage.getItem(key) === 'true';
            const div = document.createElement('div'); div.className = `item ${isDone ? 'checked-item' : ''}`;
            
            // ПЕРЕВІРКА КОЛЬОРУ ПТАХА
            if (task.id === 'bird') {
                const colors = {"БУРШТИНОВИЙ": "#ffff00", "БАГРЯНИЙ": "#ff4d4d", "БЛАКИТНИЙ": "#4da6ff"};
                const txt = task.text.toUpperCase();
                for (let c in colors) { if (txt.includes(c)) div.style.borderLeft = `4px solid ${colors[c]}`; }
            }

            div.innerHTML = `<input type="checkbox" ${isDone?'checked':''}><label class="${isDone?'done':''}">${task.text}</label>`;
            div.onclick = () => {
                const cb = div.querySelector('input'); cb.checked = !cb.checked;
                localStorage.setItem(key, cb.checked);
                div.classList.toggle('checked-item', cb.checked);
                div.querySelector('label').classList.toggle('done', cb.checked);
                updateUI();
            };
            listContainer.appendChild(div);
        });
    }
    updateUI();
}

async function init() {
    const teshin = await fetchTeshin();
    render({
        "Орбітр": [
            {id:'teshin', text:teshin}, 
            {id:'iron', text:"Залізна Фортеця: Витратити уламки розколу"}, 
            {id:'bird', text:getBird3()}, 
            {id:'archon', text:"Архонтове полювання"}
        ],
        "1999": [
            {id:'dn', text:"Спуск: Отримати нагороди"}, 
            {id:'ds', text:"Спуск (Сталь): Отримати нагороди"}, 
            {id:'w', text:"1999: Календар"}
        ],
        "Дувірі": [
            {id:'cn', text:getCircN()}, 
            {id:'cs', text:getCircS()}, 
            {id:'dm', text:"Дормізона"}
        ]
    });
    setInterval(updateTimer, 1000); updateTimer();
}

// ТЕМИ
const themeCb = document.getElementById('theme-checkbox'), themeLbl = document.getElementById('theme-label');
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
themeCb.checked = (savedTheme === 'light');
themeLbl.innerText = (savedTheme === 'light' ? "ДЕНЬ" : "НІЧ");

themeCb.onchange = (e) => {
    const t = e.target.checked ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    themeLbl.innerText = (t === 'light' ? "ДЕНЬ" : "НІЧ");
};

document.getElementById('reset-btn').onclick = () => {
    if(confirm("Скинути прогрес тижня?")) {
        Object.keys(localStorage).forEach(k => k.startsWith('task-') && localStorage.removeItem(k));
        location.reload();
    }
};
init();