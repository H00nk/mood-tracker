console.log('script.js підключено');
 
// Дані: масив записів настрою. mood - число від 1 до 5
// (1 - злий, 2 - сумний, 3 - нейтральний, 4 - добрий, 5 - щасливий).
// note - коротка примітка до запису; id - унікальний номер, який видає IndexedDB
// (autoIncrement); потім він потрібен Vue для :key.
// Джерело даних - IndexedDB (практична №11): цей масив лише відображає вміст бази
// і заповнюється функцією refreshList() після кожної операції з нею.
const moodRecords = [];

// Демонстраційні записи: показуються лише тоді, коли IndexedDB недоступна
// (наприклад, у приватному режимі), щоб застосунок лишався робочим.
const DEMO_RECORDS = [
    { id: 1, date: '2026-09-03', mood: 2, note: 'Важкий день: багато пар і дедлайнів' },
    { id: 2, date: '2026-09-17', mood: 5, note: 'Гарний день: вдала презентація й прогулянка ввечері' },
    { id: 3, date: '2026-10-01', mood: 3, note: 'Звичайний день без особливих подій' }
];

// Кореневий екземпляр Vue (створюється в блоці практичної №10 нижче).
// Поки Vue не завантажився, лишається null.
let moodApp = null;

// Елементи підсумку (історію записів тепер виводить Vue).
const avgMoodElement = document.querySelector('#avg-mood');
const totalCountElement = document.querySelector('#records-count');

// Секція «Записи з сервера»: список, кнопка «Оновити» та елементи стану.
const apiList = document.querySelector('#api-list');
const refreshButton = document.querySelector('#refresh-btn');
const apiStatus = document.querySelector('#api-status');
const apiError = document.querySelector('#api-error');

// Форма додавання запису та її елементи.
const form = document.querySelector('#mood-form');
const dateInput = document.querySelector('#date');
const moodInput = document.querySelector('#mood');
const noteInput = document.querySelector('#note');
const noteCounter = document.querySelector('#note-counter');
const moodError = document.querySelector('#mood-error');

// Повідомлення про помилку сховища та підказка «записів ще немає» (секція «Історія записів»).
const storageError = document.querySelector('#storage-error');
const emptyState = document.querySelector('#empty-state');

// Статичні картки-заглушки з практикуму 2 лишаються в index.html як запасний варіант
// (їх видно, якщо Vue не завантажився). Раніше їх видаляв card.remove(); тепер це зайве,
// бо Vue під час mount() сам очищає контейнер #mood-history і малює список компонентами.
 
// Назви рівнів настрою; індекс у масиві = mood - 1.
const MOOD_LABELS = ['Злий', 'Сумний', 'Нейтральний', 'Добрий', 'Щасливий'];
 
// Стрілкова функція: перетворює число настрою (1-5) на текстову назву рівня.
const moodToLabel = mood => MOOD_LABELS[mood - 1] || 'Невідомий настрій';
 
// Ключі рівнів настрою для CSS-класів mood--*; індекс = mood - 1.
const MOOD_KEYS = ['angry', 'sad', 'neutral', 'good', 'happy'];

// Стрілкова функція: клас картки за настроєм (good - від 3 і вище, інакше hard);
// той самий поріг, що й у classifyPeriod.
const moodToClass = mood => (mood >= 3 ? 'good' : 'hard');

// Перетворює дату '2026-09-03' на текст «3 вересня 2026».
// timeZone: 'UTC' потрібен, щоб день не зсувався залежно від часового поясу.
const formatDate = isoDate =>
    new Date(isoDate)
        .toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
        .replace(/\s?р\.$/, '');

// Рахує середній настрій за період: підсумовує mood у циклі for...of
// і ділить суму на кількість записів. Для порожнього масиву повертає 0.
function calcAverageMood(records) {
    let sum = 0;
    for (const record of records) {
        sum += record.mood;
    }
    return records.length > 0 ? sum / records.length : 0;
}
 
// Класифікує середній настрій за допомогою if / else:
// від 3 і вище - «гарний тиждень», нижче - «важкий тиждень».
function classifyPeriod(average) {
    if (average >= 3) {
        return 'гарний тиждень';
    } else {
        return 'важкий тиждень';
    }
}
 
// Рендер списку для секції «Записи з сервера» (практична 9): очищає контейнер і для
// кожного запису {title, note, email} створює картку <article> із заголовком (h3),
// приміткою (p) та рядком з email. Історію власних записів (#mood-history) раніше
// виводила ця ж функція (гілка для {date, mood, note}), але в практичній №10 її замінив
// Vue-компонент MoodEntry, тому ручний DOM-код для цієї ділянки видалено.
function renderMoodHistory(records, container) {
    container.innerHTML = '';

    for (const record of records) {
        const card = document.createElement('article');
        card.classList.add('card');

        const title = document.createElement('h3');
        title.textContent = record.title;

        const note = document.createElement('p');
        note.textContent = record.note;

        card.append(title, note);

        if (record.email) {
            const meta = document.createElement('span');
            meta.classList.add('card-meta');
            meta.textContent = record.email;
            card.append(meta);
        }

        container.append(card);   // додаємо кожну картку всередині циклу
    }
}

// Оновлює вже наявний елемент p#avg-mood: середній настрій за всіма записами.
function updateAverageMood(records) {
    if (records.length === 0) {
        avgMoodElement.textContent = 'Середній настрій: -';
        return;
    }
    const average = calcAverageMood(records);
    avgMoodElement.textContent = `Середній настрій: ${average.toFixed(2)} (${moodToLabel(Math.round(average))})`;
}

// Оновлює лічильник записів в aside: після додавання нового запису він має змінитися.
function updateTotalCount(records) {
    totalCountElement.textContent = `Усього записів: ${records.length}`;
}

// Власна валідація поля mood понад required/min/max з HTML. Викликається на подію input.
// Якщо значення не ціле число від 1 до 5, setCustomValidity блокує надсилання форми,
// а те саме повідомлення виводиться в абзац під полем. Порожній рядок знімає помилку.
function validateMood() {
    let message = '';

    if (moodInput.value !== '') {
        const mood = Number(moodInput.value);
        if (!Number.isInteger(mood) || mood < 1 || mood > 5) {
            message = 'Настрій має бути цілим числом від 1 до 5';
        }
    }

    moodInput.setCustomValidity(message);
    moodError.textContent = message;
    moodInput.setAttribute('aria-invalid', message ? 'true' : 'false');
}

// Лічильник символів примітки: показує, скільки символів лишилося до maxlength.
// Коли лишається 20 і менше, додається клас near-limit (акцентний колір).
const NOTE_NEAR_LIMIT = 20;

function updateNoteCounter() {
    const left = noteInput.maxLength - noteInput.value.length;
    noteCounter.textContent = `Залишилось символів: ${left}`;
    noteCounter.classList.toggle('near-limit', left <= NOTE_NEAR_LIMIT);
}

// Подія input: спрацьовує на кожну зміну значення поля, зокрема на кожне натискання клавіші.
moodInput.addEventListener('input', validateMood);
noteInput.addEventListener('input', updateNoteCounter);

// Подія submit: додає новий запис без перезавантаження сторінки.
// Якщо поле не пройшло валідацію (required, min/max, setCustomValidity), браузер сам
// блокує надсилання й показує повідомлення, тому сюди потрапляють лише коректні дані.
// Запис спочатку потрапляє в IndexedDB (async), а список і підсумок оновлюються вже
// з бази: так на екрані завжди те, що справді збережено.
form.addEventListener('submit', async event => {
    event.preventDefault();   // без цього сторінка перезавантажилась би

    const newRecord = {
        date: dateInput.value,
        mood: Number(moodInput.value),   // value з number-поля - рядок
        note: noteInput.value.trim()
        // id не вказуємо: його видає база (autoIncrement)
    };

    await storageReady;   // чекаємо, поки завершиться відкриття бази й міграція

    if (dbAvailable) {
        try {
            await addItem(newRecord);
            await refreshList();
            showStorageError('');
        } catch (error) {
            console.error(error);
            showStorageError('Не вдалося зберегти запис у локальну базу даних. Спробуйте ще раз.');
            return;   // введені дані лишаються у формі
        }
    } else {
        // Режим без бази: запис живе лише в пам'яті сторінки до перезавантаження.
        newRecord.id = Math.max(0, ...moodRecords.map(record => record.id)) + 1;
        (moodApp ? moodApp.records : moodRecords).push(newRecord);
        updateAverageMood(moodRecords);
        updateTotalCount(moodRecords);
        updateEmptyState();
    }

    form.reset();           // reset не викликає подій input, тому оновлюємо стан вручну
    validateMood();
    updateNoteCounter();
});

updateNoteCounter();

// ---------------------------------------------------------------------------
// Практична №10: бібліотеки та фреймворки. Варіант 3: компонент MoodEntry.
// Обрано Vue 3 (глобальна збірка з CDN): шаблон компонента - звичайний рядок, тому не
// потрібні ні збірка, ні Babel (для React довелося б підключати Babel standalone), а
// скрипт працює навіть при відкритті index.html як файлу.
// ---------------------------------------------------------------------------

// Емодзі за рівнем настрою; індекс = mood - 1.
const MOOD_EMOJIS = ['😠', '😢', '😐', '🙂', '😄'];

// Компонент одного запису. Отримує дані лише через props (date, mood, note).
// Емодзі - похідне (computed) значення: воно обчислюється зі значення props.mood,
// автоматично змінюється разом із ним і ніде не зберігається окремо.
const MoodEntry = {
    props: {
        date: String,
        mood: Number,
        note: String
    },
    computed: {
        emoji() { return MOOD_EMOJIS[this.mood - 1] ?? '❔'; },
        label() { return moodToLabel(this.mood); },
        moodKey() { return MOOD_KEYS[this.mood - 1]; },
        levelClass() { return moodToClass(this.mood); },
        formattedDate() { return formatDate(this.date); }
    },
    template: `
        <article class="card" :class="['mood--' + moodKey, levelClass]" :data-mood="mood">
            <h3>{{ formattedDate }}</h3>
            <p>{{ note }}</p>
            <span class="mood-label"><span class="mood-emoji" aria-hidden="true">{{ emoji }}</span> {{ label }}</span>
        </article>`
};

if (typeof Vue !== 'undefined') {
    // mount() повертає кореневий екземпляр: через нього форма додає записи в records.
    moodApp = Vue.createApp({
        components: { MoodEntry },
        data() {
            // records - той самий масив moodRecords, який Vue обгортає в реактивний проксі:
            // зміни через moodApp.records.push(...) відстежуються й перемальовують список.
            return { records: moodRecords };
        },
        // v-for створює по одному компоненту на запис; :key прив'язує вузол до унікального id.
        template: `
            <mood-entry v-for="record in records" :key="record.id"
                        :date="record.date" :mood="record.mood" :note="record.note"></mood-entry>`
    }).mount('#mood-history');
} else {
    console.error('Vue не завантажився (перевірте з\'єднання з unpkg.com): історія записів показує статичні картки.');
}

// ---------------------------------------------------------------------------
// Практична №11: локальні сховища даних. Варіант 3: IndexedDB, база MoodDB, сховище
// "moodEntries" з keyPath "id" та autoIncrement: true (id видає сама база).
// Етап 1 (localStorage) замінено на IndexedDB; раніше збережені записи переносить міграція.
// ---------------------------------------------------------------------------

const DB_NAME = 'MoodDB';
const DB_VERSION = 1;
const STORE_NAME = 'moodEntries';

// localStorage після переходу на IndexedDB потрібен лише для міграції:
// LEGACY_KEY - старий список записів з етапу 1, MIGRATED_KEY - прапорець «вже перенесено».
const LEGACY_KEY = 'moodRecords';
const MIGRATED_KEY = 'migrated';

// Запис має вигляд {id, date, mood, note}. Дані в сховищі може змінити хто завгодно
// (DevTools, стара версія застосунку), тому форму кожного елемента перевіряємо.
function isValidRecord(record) {
    return record !== null && typeof record === 'object'
        && (record.id === undefined || Number.isInteger(record.id))
        && typeof record.date === 'string'
        && Number.isInteger(record.mood) && record.mood >= 1 && record.mood <= 5
        && typeof record.note === 'string';
}

// Читає масив записів. JSON.parse кидає виняток на пошкодженому рядку, тому виклик
// обгорнуто в try/catch: при помилці застосунок просто починає з порожнього списку.
function loadFromLocalStorage() {
    try {
        const raw = localStorage.getItem(LEGACY_KEY);
        const data = raw ? JSON.parse(raw) : [];
        return Array.isArray(data) ? data.filter(isValidRecord) : [];
    } catch (error) {
        console.error('Пошкоджені дані в localStorage:', error);
        return [];
    }
}

// З'єднання з базою відкривається один раз і використовується повторно (dbPromise);
// якщо відкриття не вдалося, наступний виклик спробує ще раз.
let dbPromise = null;

// Відкриває базу MoodDB і повертає Promise з об'єктом бази. onupgradeneeded спрацьовує
// лише тоді, коли бази ще немає або її версія нижча за DB_VERSION - тільки тут створюється
// сховище; перевірка contains() не дає створити його вдруге. Помилку відкриття (IndexedDB
// вимкнена, приватний режим) перехоплює той, хто викликає openDB().
function openDB() {
    if (dbPromise) {
        return dbPromise;
    }
    dbPromise = new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error('IndexedDB недоступна в цьому браузері'));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = () => {
            const db = request.result;
            // Інша вкладка оновлює версію бази: закриваємо з'єднання, щоб не блокувати її.
            db.onversionchange = () => {
                db.close();
                dbPromise = null;
            };
            resolve(db);
        };
        request.onerror = () => reject(request.error);
    });
    dbPromise.catch(() => { dbPromise = null; });
    return dbPromise;
}

// Додає запис і повертає його id. put() працює і для нового запису, і для наявного (за
// тим самим id), тому зручніший за add(), який кидає помилку при дублюванні ключа.
// Запис без поля id отримує наступне число від генератора (autoIncrement).
// Операція виконується в транзакції readwrite: якщо вона провалиться, зміни не застосуються.
async function addItem(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const request = tx.objectStore(STORE_NAME).put(item);
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

// Оновлює наявний запис: повний об'єкт із тим самим id замінює старий, дубліката не буде.
async function updateItem(item) {
    if (!Number.isInteger(item.id)) {
        throw new Error('updateItem: для оновлення потрібен id запису');
    }
    return addItem(item);
}

// Додає кілька записів в одній транзакції: або збережуться всі, або жоден. Потрібна міграції,
// щоб збій посередині не залишив базу з половиною даних.
async function addItems(items) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        try {
            items.forEach(item => store.put(item));
        } catch (error) {
            tx.abort();   // виняток у JS сам транзакцію не скасовує
            reject(error);
            return;
        }
        tx.oncomplete = () => resolve(items.length);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

// Повертає всі записи (масив у порядку зростання id). Транзакція readonly: тільки читання.
async function getAllItems() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Видаляє запис за id (транзакція readwrite).
async function deleteItem(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

// Одноразова міграція з localStorage. Виконується лише поки прапорець migrated не стоїть:
// якщо сховище порожнє, а в localStorage є записи, вони переносяться в IndexedDB (в одній
// транзакції). Прапорець ставиться в будь-якому разі, тож при наступних запусках міграція
// не повторюється й не дублює записи. Старий список у localStorage не видаляється.
// Повертає кількість перенесених записів.
async function migrateFromLocalStorage() {
    try {
        if (localStorage.getItem(MIGRATED_KEY) === 'true') {
            return 0;
        }
    } catch (error) {
        return 0;   // localStorage недоступний - переносити нема з чого
    }

    const existing = await getAllItems();
    const legacy = loadFromLocalStorage();
    let moved = 0;
    if (existing.length === 0 && legacy.length > 0) {
        moved = await addItems(legacy);
    }

    try {
        localStorage.setItem(MIGRATED_KEY, 'true');
    } catch (error) {
        console.error('Не вдалося позначити міграцію виконаною:', error);
    }
    return moved;
}

// Показує повідомлення про помилку сховища над списком; порожній рядок його ховає.
function showStorageError(message) {
    storageError.textContent = message;
    storageError.hidden = message === '';
}

// Підказка «записів ще немає» видна лише тоді, коли список порожній.
function updateEmptyState() {
    emptyState.hidden = moodRecords.length > 0;
}

// Перечитує всі записи з IndexedDB і кладе їх у реактивний масив: Vue сам перемальовує
// список, а підсумок оновлюється з тих самих даних. Викликається після кожної операції.
async function refreshList() {
    const items = await getAllItems();
    const records = moodApp ? moodApp.records : moodRecords;   // через проксі Vue, щоб спрацювала реактивність
    records.splice(0, records.length, ...items);
    updateAverageMood(moodRecords);
    updateTotalCount(moodRecords);
    updateEmptyState();
}

// Підсумок у консоль (практична №6): викликається один раз, коли дані завантажено.
function logSummary(records) {
    if (records.length === 0) {
        console.log('Записів ще немає');
        return;
    }
    for (const record of records) {
        console.log(record.date, '-', moodToLabel(record.mood));
    }
    const averageMood = calcAverageMood(records);
    console.log(`Усього записів: ${records.length}`);
    console.log(`Середній настрій: ${averageMood.toFixed(2)} (${moodToLabel(Math.round(averageMood))})`);
    console.log(`Підсумок: ${classifyPeriod(averageMood)}`);
}

// true, якщо база відкрилася й дані з неї прочитано; інакше застосунок працює лише в пам'яті.
let dbAvailable = false;

// Запуск сховища: відкрити базу, виконати міграцію, показати збережені записи. Помилка
// відкриття (IndexedDB вимкнена чи недоступна) не ламає сторінку: користувач бачить
// зрозуміле повідомлення, а застосунок лишається робочим із демонстраційними записами.
async function initStorage() {
    try {
        await openDB();
        const moved = await migrateFromLocalStorage();
        await refreshList();
        dbAvailable = true;
        if (moved > 0) {
            console.log(`Міграція: з localStorage перенесено записів - ${moved}`);
        }
    } catch (error) {
        console.error('IndexedDB недоступна:', error);
        showStorageError('Не вдалося відкрити локальну базу даних. Можливо, браузер блокує IndexedDB '
            + '(наприклад, у приватному режимі перегляду). Записи працюватимуть лише до перезавантаження сторінки.');
        const records = moodApp ? moodApp.records : moodRecords;
        records.splice(0, records.length, ...DEMO_RECORDS);
        updateAverageMood(moodRecords);
        updateTotalCount(moodRecords);
        updateEmptyState();
    }
    logSummary(moodRecords);
}

// Promise завершення запуску: submit чекає на нього, щоб не додати запис раніше за відкриття бази.
const storageReady = initStorage();

// ---------------------------------------------------------------------------
// Практична №9: клієнт для API (fetch). Варіант 3: тестові дані JSONPlaceholder.
// ---------------------------------------------------------------------------

// Публічний безкоштовний API без ключа: https://jsonplaceholder.typicode.com
// Відповідь - масив коментарів [{postId, id, name, email, body}], які трактуємо
// як записи настрою: name - заголовок запису, body - текст нотатки.
const API_URL = 'https://jsonplaceholder.typicode.com/comments?postId=1';

// Повідомлення для користувача (технічний текст помилки йде лише в консоль).
const API_ERROR_MESSAGE = 'Записи тимчасово недоступні';

// Адаптує поля відповіді API до формату, який приймає renderMoodHistory.
const commentToRecord = comment => ({
    title: comment.name,
    note: comment.body,
    email: comment.email
});

// Стан завантаження: показує текст «Завантаження…» і блокує кнопку «Оновити».
function showLoading(isLoading) {
    apiStatus.hidden = !isLoading;
    refreshButton.disabled = isLoading;
    apiList.setAttribute('aria-busy', String(isLoading));
}

// Показує повідомлення про помилку в окремому елементі; порожній рядок його ховає.
function showError(message) {
    apiError.textContent = message;
    apiError.hidden = message === '';
}

// Запит до API: https://jsonplaceholder.typicode.com/comments?postId=1
// 1) вмикає індикатор завантаження; 2) fetch і очікування відповіді; 3) перевірка
// response.ok (fetch не вважає 404/500 помилкою, тому кидаємо виняток вручну);
// 4) розбір JSON і рендер списку; 5) у catch - зрозуміле повідомлення на сторінці
// й деталі для розробника в console.error; 6) у finally індикатор вимикається
// незалежно від результату.
async function loadData() {
    showLoading(true);
    showError('');
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`Сервер відповів кодом ${response.status}`);
        }
        const data = await response.json();
        console.log(data);   // перевірка структури відповіді (крок 5)
        renderMoodHistory(data.map(commentToRecord), apiList);
    } catch (error) {
        apiList.innerHTML = '';   // не показуємо застарілі записи поруч із помилкою
        showError(API_ERROR_MESSAGE);
        console.error(error);
    } finally {
        showLoading(false);
    }
}

// Кнопка «Оновити» повторює запит без перезавантаження сторінки.
refreshButton.addEventListener('click', loadData);

loadData();   // перше завантаження списку при відкритті сторінки