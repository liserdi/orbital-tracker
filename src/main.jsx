import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, collection, deleteDoc } from "firebase/firestore";

// Конфігурація Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDsSvcjbfdTw18wWk9slxQksAzDdmy4FuU",
  authDomain: "warframe-orbital-tracker.firebaseapp.com",
  projectId: "warframe-orbital-tracker",
  storageBucket: "warframe-orbital-tracker.firebasestorage.app",
  messagingSenderId: "951364550110",
  appId: "1:951364550110:web:ac6c17989b1d25e0abf14f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- ДИНАМІЧНІ ДАНІ ---
// Кольори прив'язані до індексу кольору напряму, а не витягуються з готового
// тексту пошуком підрядка — раніше одна одруківка в реченні ламала підсвітку.
const BIRD_COLORS = { "Блакитний": "#4da6ff", "Бурштиновий": "#ffff00", "Багряний": "#ff4d4d" };
const getBird3 = () => {
    const s = ["Блакитний", "Бурштиновий", "Багряний"], start = new Date('2026-01-19T00:00:00Z');
    const w = Math.floor((new Date() - start) / 604800000);
    const name = s[(1 + w) % 3];
    return { text: `Bird 3: ${name} архонтовий уламок`, color: BIRD_COLORS[name] };
};

const getCircN = () => {
    const r = ["Екскалібур, Трініті, Ембер", "Локі, Меґ, Райно", "Еш, Фрост, Нікс", "Зарина, Вобан, Нова", "Некрос, Валькірія, Оберон", "Гідроїд, Міраж, Лімбо", "Меса, Хрома, Атлас", "Івара, Інар, Титанія", "Нідус, Октавія, Гарроу", "Ґара, Хора, Ревенант", "Ґаруда, Баруук, Гільдрина"];
    const w = Math.floor((new Date() - new Date('2026-01-19T00:00:00Z')) / 604800000);
    return `Ланцюг: ${r[(10 + w) % 11]}`;
};

const getCircS = () => {
    const r = ["Вепр, Гаммакор, Анґструм, Горгона, Анку", "Бо, Пагуба, Фуракс, Фуріс, Стран", "Лекс, Маґістар, Болтор, Бронко, Керамічний кинджал", "Торид, Парні Токсоцисти, Парні Іхори, Зріз, Атомос", "Ак і Брант, Сома, Васто, Намі-Solo, Берстон", "Зайлок, Сибір, Жах, Розпач, Ненависть", "Дера, Сибаріс, Цестра, Сикар, Окіни", "Братон, Лато, Скана, Паріс, Кунаї"];
    const w = Math.floor((new Date() - new Date('2026-01-19T00:00:00Z')) / 604800000);
    return `Ланцюг (Сталь): ${r[(1 + w) % 8]}`;
};

function App() {
  const [nick, setNick] = useState(localStorage.getItem('wf_nick') || '');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [tab, setTab] = useState('me');
  const [myData, setMyData] = useState({});
  const [clanPlayers, setClanPlayers] = useState([]);
  const [timeLeft, setTimeLeft] = useState("");
  const [timerPercent, setTimerPercent] = useState(100);
  const [teshin, setTeshin] = useState("Синхронізація...");
  const [expandedPlayer, setExpandedPlayer] = useState(null);

  const isAdmin = nick.toUpperCase() === 'LISERDI' || nick.toUpperCase() === 'АУГМЕНТ';

  // Нік завжди нормалізуємо до верхнього регістру перед збереженням, інакше
  // "Liserdi" і "LISERDI" створювали б два різні документи в Firestore і
  // прогрес одного гравця "губився" би через регістр символів.
  const login = (raw) => {
    const v = raw.trim().toUpperCase();
    if (!v) return;
    setNick(v);
    localStorage.setItem('wf_nick', v);
  };

  useEffect(() => {
    if (!nick) return;
    const heartbeat = () => setDoc(doc(db, "players", nick), { lastSeen: Date.now() }, { merge: true });
    heartbeat();
    const interval = setInterval(heartbeat, 30000);
    return () => clearInterval(interval);
  }, [nick]);

  useEffect(() => {
    fetch('https://api.warframestat.us/pc/steelPath')
      .then(res => res.json())
      .then(data => setTeshin(`Тешін: ${data.currentReward?.name || "Оновлення"} (Шлях Сталі)`))
      .catch(() => setTeshin("Тешін: Перевірити ротацію вручну"));
  }, []);

  const [syncError, setSyncError] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "players"),
      (snapshot) => {
        setSyncError(null);
        const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClanPlayers(players);
        if (nick) {
          const me = players.find(p => p.id === nick);
          setMyData(me?.progress || {});
        }
      },
      (err) => {
        // Раніше помилка (напр. відмова доступу в правилах Firestore чи
        // втрата з'єднання) просто потрапляла в консоль, і клан-хаб міг
        // навічно зависнути на порожньому списку без пояснення.
        console.error('Firestore sync error:', err);
        setSyncError('Немає зв’язку з базою. Прогрес зберігається лише локально.');
      }
    );
    return () => unsub();
  }, [nick]);

  useEffect(() => {
    const updateTimer = () => {
        const now = new Date();
        const next = new Date();
        next.setUTCDate(now.getUTCDate() + (1 + 7 - now.getUTCDay()) % 7);
        next.setUTCHours(0,0,0,0);
        let d = next - now;
        if (d <= 0) d += 604800000;
        setTimerPercent((d / 604800000) * 100);
        const days = Math.floor(d/86400000), h = Math.floor((d/3600000)%24), m = Math.floor((d/60000)%60), s = Math.floor((d/1000)%60);
        setTimeLeft(`${days}д ${h}г ${m}хв ${s}с`);
    };
    updateTimer();
    const t = setInterval(updateTimer, 1000);
    return () => clearInterval(t);
  }, []);

  const bird3 = getBird3();
  const tasks = {
    "1999": [
        {id:'dn', text: "Спуск: Отримати нагороди"},
        {id:'ds', text: "Спуск (Сталь): Отримати нагороди"},
        {id:'w', text: "1999: Календар"}
    ],
    "ЛАБОРАТОРІЇ": [
        {id:'ga', text: "Часова Архімедія"},
        {id:'eda', text: "Поглиблена Архімедія"}
    ],
    "ОРБІТР": [
        {id:'teshin', text: teshin},
        {id:'iron', text: "Залізна Фортеця: Витратити уламки розколу"},
        {id:'bird', text: bird3.text, color: bird3.color, isBird: true},
        {id:'archon', text: "Архонтове полювання"}
    ],
    "ДУВІРІ": [
        {id:'cn', text: getCircN()},
        {id:'cs', text: getCircS()},
        {id:'dm', text: "Дормізона"}
    ]
  };

  const allTasksArray = Object.values(tasks).flat();

  const toggleTask = async (tid) => {
    const newProgress = { ...myData, [tid]: !myData[tid] };
    setMyData(newProgress);
    const validIds = allTasksArray.map(t => t.id);
    const total = Object.keys(newProgress).filter(k => validIds.includes(k) && newProgress[k]).length;
    await setDoc(doc(db, "players", nick), { nickname: nick, progress: newProgress, total }, { merge: true });
  };

  const deletePlayer = async (playerID) => {
    if(window.confirm(`Видалити нікнейм ${playerID} з бази?`)) {
        await deleteDoc(doc(db, "players", playerID));
        if (playerID === nick) { localStorage.removeItem('wf_nick'); setNick(''); }
    }
  };

  if (!nick) {
    return (
      <div className="login-box">
        <style>{`
          .login-box { height: 100vh; display: flex; align-items: center; justify-content: center; background: #d1d9e6; font-family: 'Exo 2', sans-serif; }
          .login-card { background: #e6e9ef; padding: 40px; border-radius: 4px; border: 1px solid #c2a67a; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.1); width: 350px; }
          .login-card h1 { color: #a68b5a; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 25px; font-weight: 700; }
          input { padding: 12px; border: 1px solid #ccc; width: 90%; margin-bottom: 20px; font-family: 'Exo 2'; font-weight: 600; text-align: center; font-size: 1.1em; }
          button { padding: 14px; background: #a68b5a; color: white; border: none; cursor: pointer; font-weight: 700; width: 100%; transition: 0.3s; }
          button:hover { background: #8a7043; }
        `}</style>
        <div className="login-card">
          <h1>Orbital Tracker</h1>
          <p style={{fontSize:'0.85em', fontWeight:700, marginBottom:'15px'}}>ВВЕДІТЬ ВАШ ІГРОВИЙ НІКНЕЙМ</p>
          <input id="nInput" placeholder="NICKNAME..." onKeyDown={(e) => { if(e.key === 'Enter') login(e.target.value); }} />
          <button onClick={() => login(document.getElementById('nInput').value)}>ПІДКЛЮЧИТИСЯ</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" data-theme={theme}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700&display=swap');
        :root { --bg-dark: #d1d9e6; --card-bg: #e6e9ef; --item-bg: rgba(255, 255, 255, 0.85); --gold-text: #a68b5a; --text-main: #2c3e50; --font-main: 'Exo 2', sans-serif; }
        [data-theme="dark"] { --bg-dark: #0a0d11; --card-bg: #1b222a; --item-bg: rgba(35, 44, 54, 0.9); --gold-text: #c2a67a; --text-main: #b0b8c1; }
        .app-container { background: radial-gradient(circle at center, var(--bg-dark) 0%, #07090c 100%); min-height: 100vh; display: flex; justify-content: center; padding: 40px 20px; color: var(--text-main); font-family: var(--font-main); transition: 0.4s; position: relative; }
        .app-container::before { content: ""; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: url('https://www.transparenttextures.com/patterns/carbon-fibre.png'); opacity: 0.08; pointer-events: none; }
        .glass-card { position: relative; z-index: 1; background-color: var(--card-bg); border: 1px solid rgba(194, 166, 122, 0.2); border-radius: 4px; width: 100%; max-width: 500px; padding: 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
        .theme-switch-wrapper { display: flex; justify-content: flex-end; align-items: center; margin-bottom: 5px; gap: 10px; }
        .theme-switch { position: relative; display: inline-block; width: 34px; height: 18px; cursor: pointer; }
        .theme-switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 12px; width: 12px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: var(--gold-text); }
        input:checked + .slider:before { transform: translateX(16px); }
        header h1 { color: var(--gold-text); text-align: center; text-transform: uppercase; letter-spacing: 2px; margin: 0; font-size: 24px; font-weight: 700; }
        .fuse-container { width: 100%; height: 4px; background: rgba(0,0,0,0.05); margin: 15px 0 5px; overflow: hidden; }
        .fuse-fill { height: 100%; background: linear-gradient(90deg, #fff, var(--gold-text)); transition: width 1s linear; }
        #reset-timer { text-align: center; font-size: 0.85em; opacity: 0.8; margin-bottom: 25px; font-weight: 600; }
        .category-title { color: var(--gold-text); font-size: 0.85em; font-weight: 700; margin: 20px 0 10px; text-transform: uppercase; display: flex; align-items: center; }
        .category-title::after { content: ""; flex-grow: 1; height: 1px; background: linear-gradient(to right, var(--gold-text), transparent); opacity: 0.3; margin-left: 15px; }
        .item { background-color: var(--item-bg); border: 1px solid rgba(0,0,0,0.03); margin-bottom: 8px; padding: 14px; display: flex; align-items: center; cursor: pointer; border-radius: 3px; border-left: 4px solid transparent; transition: 0.2s; }
        .item:hover { border-color: var(--gold-text); background: rgba(166, 139, 90, 0.05); transform: translateX(2px); }
        .checked-item { opacity: 0.4; }
        .tab-nav { display: flex; justify-content: center; gap: 20px; margin-bottom: 20px; border-bottom: 1px solid rgba(166,139,90,0.2); }
        .tab-item { color: var(--gold-text); cursor: pointer; font-weight: 700; font-size: 0.8em; text-transform: uppercase; padding-bottom: 10px; opacity: 0.5; transition: 0.3s; }
        .tab-item.active { opacity: 1; border-bottom: 2px solid var(--gold-text); }
        .grid-cell { height: 6px; flex: 1; background: rgba(0,0,0,0.1); border-radius: 1px; margin: 0 1px; }
        .grid-cell.active { background: var(--gold-text); box-shadow: 0 0 5px var(--gold-text); }
        .clan-card-header { display: flex; justify-content: space-between; align-items: center; min-height: 24px; }
        .player-info-block { display: flex; align-items: center; gap: 4px; }
        .status-space { width: 16px; display: flex; justify-content: center; align-items: center; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #00ff88; box-shadow: 0 0 8px #00ff88; }
        .hall-of-fame-card { border: 1px solid var(--gold-text) !important; box-shadow: 0 0 10px rgba(166, 139, 90, 0.2); }
        .crown-icon { color: #ffcc00; margin-left: 8px; font-size: 1.1em; }
        .discord-btn { display: block; background-color: #5d6d85; color: white; text-decoration: none; text-align: center; padding: 14px; border-radius: 4px; font-weight: 700; margin: 25px 0 15px; text-transform: uppercase; font-size: 0.85em; transition: 0.3s; }
        #reset-btn { width: 100%; background: transparent; border: 1px solid var(--gold-text); color: var(--gold-text); padding: 10px; cursor: pointer; font-weight: 700; font-family: var(--font-main); transition: 0.3s; }
        .logout-link { display: inline-block; margin-top: 15px; font-size: 0.7em; color: #ff4d4d; cursor: pointer; text-decoration: underline; font-weight: 700; text-transform: uppercase; opacity: 0.7; }
      `}</style>

      <div className="glass-card">
        <header>
            <div className="theme-switch-wrapper">
                <span style={{fontSize:'0.7em', fontWeight:700, color:'var(--gold-text)'}}>{theme === 'light' ? 'ДЕНЬ' : 'НІЧ'}</span>
                <label className="theme-switch">
                    <input type="checkbox" checked={theme === 'dark'} onChange={() => { const t = theme === 'light' ? 'dark' : 'light'; setTheme(t); localStorage.setItem('theme', t); }} />
                    <div className="slider"></div>
                </label>
            </div>
            <h1>Orbital Tracker</h1>
            <div className="fuse-container"><div className="fuse-fill" style={{width: `${timerPercent}%`}}></div></div>
            <div id="reset-timer">До оновлення: {timeLeft}</div>
            {syncError && <div style={{textAlign:'center', fontSize:'0.75em', color:'#ff4d4d', marginBottom:'10px', fontWeight:700}}>{syncError}</div>}
        </header>

        <div className="tab-nav">
            <span className={`tab-item ${tab === 'me' ? 'active' : ''}`} onClick={() => setTab('me')}>Мій список</span>
            <span className={`tab-item ${tab === 'clan' ? 'active' : ''}`} onClick={() => setTab('clan')}>Клан-хаб</span>
        </div>

        {tab === 'me' ? (
            <div>
                {Object.entries(tasks).map(([catName, items]) => (
                    <div key={catName}>
                        <div className="category-title">{catName}</div>
                        {items.map(t => (
                            <div key={t.id} className={`item ${myData[t.id] ? 'checked-item' : ''}`} 
                                 style={t.isBird ? {borderLeftColor: t.color} : {}}
                                 onClick={() => toggleTask(t.id)}>
                                <input type="checkbox" checked={!!myData[t.id]} readOnly style={{cursor:'pointer'}} />
                                <label style={{marginLeft:'15px', fontWeight:600, textDecoration: myData[t.id] ? 'line-through' : 'none', opacity: myData[t.id] ? 0.6 : 1, pointerEvents:'none'}}>{t.text}</label>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        ) : (
            <div className="clan-list">
                {clanPlayers.sort((a,b) => (b.total || 0) - (a.total || 0)).map(p => {
                    const isChampion = (p.total || 0) >= allTasksArray.length;
                    const isOnline = p.lastSeen && (Date.now() - p.lastSeen < 60000);
                    return (
                        <div key={p.id} className={`item clan-card ${isChampion ? 'hall-of-fame-card' : ''}`} style={{display:'block'}} onClick={() => setExpandedPlayer(expandedPlayer === p.id ? null : p.id)}>
                            <div className="clan-card-header">
                                <div className="player-info-block">
                                    <div className="status-space">{isOnline && <div className="status-dot"></div>}</div>
                                    <span style={{fontWeight:700, color: isChampion ? 'var(--gold-text)' : 'inherit'}}>{p.id.toUpperCase()}</span>
                                    {isChampion && <span className="crown-icon">👑</span>}
                                    {isAdmin && p.id !== nick && <span style={{color: '#ff4d4d', fontSize: '0.8em', marginLeft: '8px', cursor: 'pointer', fontWeight: 900}} onClick={(e) => { e.stopPropagation(); deletePlayer(p.id); }}>[X]</span>}
                                </div>
                                <span style={{fontSize:'0.85em', fontWeight:700, fontVariantNumeric: 'tabular-nums'}}>{p.total || 0} / {allTasksArray.length}</span>
                            </div>
                            <div style={{display:'flex', marginTop:'10px'}}>{allTasksArray.map(t => <div key={t.id} className={`grid-cell ${p.progress?.[t.id] ? 'active' : ''}`}></div>)}</div>
                            {expandedPlayer === p.id && (
                                <div style={{marginTop:'12px', borderTop:'1px solid rgba(166,139,90,0.1)', paddingTop:'8px'}}>
                                    {allTasksArray.map(t => (
                                        <div key={t.id} style={{ fontSize:'0.75em', padding:'4px 0', color: p.progress?.[t.id] ? 'var(--gold-text)' : 'inherit', fontWeight: p.progress?.[t.id] ? '700' : '400', opacity: p.progress?.[t.id] ? 1 : 0.5 }}>
                                            {p.progress?.[t.id] ? ' [✓] ' : ' [ ] '} {t.text}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}

        <div className="footer-ui">
            <a href="https://discord.gg/VcczersTWR" target="_blank" rel="noreferrer" className="discord-btn">JOIN DISCORD: AETERNUM INVICTUS</a>
            <div style={{textAlign:'center', fontSize:'0.7em', opacity:0.6}}>Orbital System v2.8.6 | <b>LISERDI & Аугмент</b></div>
            <div className="footer-controls">
                <button id="reset-btn" onClick={() => { if(window.confirm("Скинути ваш прогрес?")) { setMyData({}); setDoc(doc(db, "players", nick), {progress:{}, total:0}, {merge:true}); }}}>СКИНУТИ ТИЖДЕНЬ ВРУЧНУ</button>
                <div className="logout-link" onClick={() => deletePlayer(nick)}>Видалити свій нікнейм та вийти</div>
            </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
