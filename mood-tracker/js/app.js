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
 
// Рендер історії: очищає контейнер і для кожного запису створює картку <article>
// із заголовком-датою (h3), приміткою (p) і підписом настрою (span). Картка отримує
// атрибут data-mood та класи: mood--* (колір рівня) і good/hard (за moodToClass).
function renderMoodHistory(records) {
    listContainer.innerHTML = '';

    for (const record of records) {
        const card = document.createElement('article');
        card.classList.add('card', `mood--${MOOD_KEYS[record.mood - 1]}`, moodToClass(record.mood));
        card.dataset.mood = record.mood;

        const title = document.createElement('h3');
        title.textContent = formatDate(record.date);

        const note = document.createElement('p');
        note.textContent = record.note;

        const label = document.createElement('span');
        label.classList.add('mood-label');
        label.textContent = moodToLabel(record.mood);

        card.append(title, note, label);
        listContainer.append(card);   // додаємо кожну картку всередині циклу
    }
}

// Оновлює вже наявний елемент p#avg-mood: середній настрій за всіма записами.
function updateAverageMood(records) {
    const average = calcAverageMood(records);
    avgMoodElement.textContent = `Середній настрій: ${average.toFixed(2)} (${moodToLabel(Math.round(average))})`;
}

renderMoodHistory(moodRecords);
updateAverageMood(moodRecords);

// Виводимо кожен запис: дата і назва настрою.
for (const record of moodRecords) {
    console.log(record.date, '-', moodToLabel(record.mood));
}
 
const averageMood = calcAverageMood(moodRecords);
console.log(`Усього записів: ${moodRecords.length}`);
console.log(`Середній настрій: ${averageMood.toFixed(2)} (${moodToLabel(Math.round(averageMood))})`);
console.log(`Підсумок: ${classifyPeriod(averageMood)}`);
 