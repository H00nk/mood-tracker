console.log('script.js підключено');
 
// Дані: масив записів настрою. mood - число від 1 до 5
// (1 - злий, 2 - сумний, 3 - нейтральний, 4 - добрий, 5 - щасливий).
// note - коротка примітка до запису.
const moodRecords = [
    { date: '2026-09-03', mood: 2, note: 'Важкий день: багато пар і дедлайнів' },
    { date: '2026-09-17', mood: 5, note: 'Гарний день: вдала презентація й прогулянка ввечері' },
    { date: '2026-10-01', mood: 3, note: 'Звичайний день без особливих подій' }
];

// Контейнер історії записів і елемент підсумку.
const listContainer = document.querySelector('#mood-history');
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

// Прибираємо статичні картки-заглушки з практикуму 2: вони лишаються
// в index.html як орієнтир структури, але на сторінці їх заміняє динамічний список.
document.querySelectorAll('#mood-history .card').forEach(card => card.remove());
 
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
 
// Рендер списку: очищає контейнер (за замовчуванням - історія записів) і для кожного
// запису створює картку <article> із заголовком (h3) та приміткою (p).
// Запис свого застосунку {date, mood, note}: заголовок - дата, додатково підпис настрою
// (span), атрибут data-mood та класи mood--* і good/hard (за moodToClass).
// Запис з API {title, note, email}: заголовок береться з title, настрою немає,
// тому додається лише рядок з email. Так одна функція обслуговує обидва списки.
function renderMoodHistory(records, container = listContainer) {
    container.innerHTML = '';

    for (const record of records) {
        const card = document.createElement('article');
        card.classList.add('card');

        const title = document.createElement('h3');
        title.textContent = record.title ?? formatDate(record.date);

        const note = document.createElement('p');
        note.textContent = record.note;

        card.append(title, note);

        if (record.mood !== undefined) {
            card.classList.add(`mood--${MOOD_KEYS[record.mood - 1]}`, moodToClass(record.mood));
            card.dataset.mood = record.mood;

            const label = document.createElement('span');
            label.classList.add('mood-label');
            label.textContent = moodToLabel(record.mood);
            card.append(label);
        }

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
        date: dateInput.value,
        mood: Number(moodInput.value),   // value з number-поля - рядок
        note: noteInput.value.trim()
    };

    moodRecords.push(newRecord);
    renderMoodHistory(moodRecords);
    updateAverageMood(moodRecords);
    updateTotalCount(moodRecords);

    form.reset();           // reset не викликає подій input, тому оновлюємо стан вручну
    validateMood();
    updateNoteCounter();
});

renderMoodHistory(moodRecords);
updateAverageMood(moodRecords);
updateTotalCount(moodRecords);
updateNoteCounter();

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