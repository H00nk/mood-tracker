console.log('script.js підключено');
 
// Дані: масив записів настрою. mood - число від 1 до 5
// (1 - злий, 2 - сумний, 3 - нейтральний, 4 - добрий, 5 - щасливий).
const moodRecords = [
    { date: '2026-09-03', mood: 2 },
    { date: '2026-09-17', mood: 5 },
    { date: '2026-10-01', mood: 3 }
];
 
// Назви рівнів настрою; індекс у масиві = mood - 1.
const MOOD_LABELS = ['Злий', 'Сумний', 'Нейтральний', 'Добрий', 'Щасливий'];
 
// Стрілкова функція: перетворює число настрою (1-5) на текстову назву рівня.
const moodToLabel = mood => MOOD_LABELS[mood - 1] || 'Невідомий настрій';
 
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
 
// Виводимо кожен запис: дата і назва настрою.
for (const record of moodRecords) {
    console.log(record.date, '-', moodToLabel(record.mood));
}
 
const averageMood = calcAverageMood(moodRecords);
console.log(`Усього записів: ${moodRecords.length}`);
console.log(`Середній настрій: ${averageMood.toFixed(2)} (${moodToLabel(Math.round(averageMood))})`);
console.log(`Підсумок: ${classifyPeriod(averageMood)}`);
 