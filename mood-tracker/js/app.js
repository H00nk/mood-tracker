console.log('script.js підключено');
 
// Дані: масив записів настрою. mood - число від 1 до 5
// (1 - злий, 2 - сумний, 3 - нейтральний, 4 - добрий, 5 - щасливий).
// note - коротка примітка до запису; id - унікальний номер (Vue потрібен для :key).
const moodRecords = [
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
form.addEventListener('submit', event => {
    event.preventDefault();   // без цього сторінка перезавантажилась би

    const newRecord = {
        id: Math.max(0, ...moodRecords.map(record => record.id)) + 1,   // унікальний id
        date: dateInput.value,
        mood: Number(moodInput.value),   // value з number-поля - рядок
        note: noteInput.value.trim()
    };

    // Додаємо запис через реактивний масив moodApp.records: Vue сам перемалює список,
    // жодного ручного рендеру. Той самий масив читає й підсумок (moodRecords).
    // Якщо Vue не завантажився, просто додаємо в звичайний масив.
    (moodApp ? moodApp.records : moodRecords).push(newRecord);
    updateAverageMood(moodRecords);
    updateTotalCount(moodRecords);

    form.reset();           // reset не викликає подій input, тому оновлюємо стан вручну
    validateMood();
    updateNoteCounter();
});

updateAverageMood(moodRecords);
updateTotalCount(moodRecords);
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

// Виводимо кожен запис: дата і назва настрою.
for (const record of moodRecords) {
    console.log(record.date, '-', moodToLabel(record.mood));
}
 
const averageMood = calcAverageMood(moodRecords);
console.log(`Усього записів: ${moodRecords.length}`);
console.log(`Середній настрій: ${averageMood.toFixed(2)} (${moodToLabel(Math.round(averageMood))})`);
console.log(`Підсумок: ${classifyPeriod(averageMood)}`);