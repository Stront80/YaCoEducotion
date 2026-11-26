/* Учебные материалы и данные проверок. Задания оцениваются по результатам,
   а не по совпадению исходного кода с эталоном. Допускаются альтернативные решения. */
(function(root){
  'use strict';
  const lessons=[];
  const output=(label,expected)=>({label,kind:'stdout',expected});
  const value=(label,name,expected)=>({label,kind:'value',name,expected});
  const expr=(label,expression)=>({label,kind:'expr',expression});
  const call=(label,name,cases)=>({label,kind:'call',name,cases:cases.map(([args,expected])=>({args,expected}))});
  const program=(label,cases)=>({label,kind:'program',cases:cases.map(([stdin,expected])=>({stdin,expected}))});
  function add(id,group,title,topic,theory,task,hint,start,solution,alternative,checks,stdin='',explanation=''){
    lessons.push({id,group,title,topic,theory,task,hint,start,solution,alternative,checks,stdin,explanation:explanation||'Сначала разберите пример, затем попробуйте изменить значения и запустить программу ещё раз. Проверяется результат, поэтому другой корректный код тоже подходит.'});
  }
  add('first-1','Первые программы','Первая строка Python','print()',
    'Python выполняет программу сверху вниз. print() выводит значения. Текст заключают в одинарные или двойные кавычки. Комментарий начинается с # и помогает объяснить код.',
    'Выведите одну строку: Привет, Python!',
    'Напишите print("Привет, Python!"). В конце строки вывода print добавляет перевод строки.',
    '# Напишите свою первую программу\n',
    'print("Привет, Python!")\n',
    'print("Привет,", "Python!")\n',
    [output('Выведено приветствие','Привет, Python!\n')]);
  add('first-2','Первые программы','Имена для значений','Переменные',
    'Переменная связывает имя со значением: name = "Анна". Знак = присваивает, а не проверяет равенство. Строки и числа — разные типы значений.',
    'Создайте переменные name = "Анна" и age = 20. Выведите строку «Анна 20», используя переменные.',
    'print(name, age) разделяет значения пробелом.',
    '# Задайте name и age\n',
    'name = "Анна"\nage = 20\nprint(name, age)\n',
    'name, age = "Анна", 20\nprint(f"{name} {age}")\n',
    [value('Имя — Анна','name','Анна'),value('Возраст — число 20','age',20),output('Имя и возраст показаны','Анна 20\n')]);
  add('first-3','Первые программы','Python как калькулятор','Числа и операции',
    'С числами работают +, -, *, / и скобки. Оператор * умножает, ** возводит в степень, // выполняет целочисленное деление, % возвращает остаток. Результат можно сохранить в переменной.',
    'Цена price — 120, количество count — 3. Сохраните стоимость в total и выведите 360.',
    'total = price * count, затем print(total).',
    'price = 120\ncount = 3\n# Рассчитайте total\n',
    'price = 120\ncount = 3\ntotal = price * count\nprint(total)\n',
    'price, count = 120, 3\ntotal = count * price\nprint(total)\n',
    [value('Цена и количество','price',120),value('Стоимость равна 360','total',360),output('Стоимость выведена','360\n')]);
  add('first-4','Первые программы','Приводим текст в порядок','Строки и методы',
    'Строка — последовательность символов. Метод strip() убирает пробелы по краям, lower() переводит буквы в нижний регистр. Методы можно вызывать последовательно. Исходная строка при этом не изменяется.',
    'Из text = "  PyThOn  " получите переменную clean со значением "python" и выведите её.',
    'clean = text.strip().lower().',
    'text = "  PyThOn  "\n# Подготовьте clean\n',
    'text = "  PyThOn  "\nclean = text.strip().lower()\nprint(clean)\n',
    'text = "  PyThOn  "\nclean = text.lower().strip()\nprint(clean)\n',
    [value('Исходный текст сохранён','text','  PyThOn  '),value('Текст очищен','clean','python'),output('Результат показан','python\n')]);
  add('first-5','Первые программы','Программа слушает вас','input()',
    'input() читает одну строку и возвращает str. В этой мастерской строки задаются заранее в поле «Входные данные», по одной на каждый вызов input. Программа не открывает всплывающих окон.',
    'Прочитайте имя через input() в name и выведите «Привет, ИМЯ!». Для исходного ввода Анна получится «Привет, Анна!». Подсказку внутри input пока не печатайте.',
    'name = input(); затем print(f"Привет, {name}!").',
    '# Прочитайте имя и поприветствуйте человека\n',
    'name = input()\nprint(f"Привет, {name}!")\n',
    'name = input()\nprint("Привет, " + name + "!")\n',
    [value('Имя прочитано','name','Анна'),program('Приветствие работает с разными именами',[['Анна\n','Привет, Анна!\n'],['Марк\n','Привет, Марк!\n']])],
    'Анна\n');
  add('first-6','Первые программы','Из строки в число','int() и типы',
    'input возвращает текст, даже если введены цифры. int() преобразует запись целого числа в int. После этого можно складывать числа, а не склеивать строки.',
    'Прочитайте целое число, прибавьте 10 и выведите результат. Для ввода 4 результат — 14.',
    'number = int(input()), затем print(number + 10).',
    '# Получите число из входной строки\n',
    'number = int(input())\nprint(number + 10)\n',
    'text = input()\nnumber = int(text)\nprint(10 + number)\n',
    [program('Разные числа, включая отрицательное',[['4\n','14\n'],['-10\n','0\n'],['0\n','10\n']])], '4\n');
  add('flow-1','Решения и повторения','Выбираем действие','if / else',
    'if выполняет блок, когда условие истинно, else — в другом случае. После условия ставится двоеточие. Отступы обозначают принадлежность строк к блоку; используйте четыре пробела.',
    'Прочитайте возраст. Для 18 лет и старше выведите «Можно», иначе «Рано».',
    'Сравнение age >= 18 включает саму границу 18.',
    'age = int(input())\n# Добавьте условие\n',
    'age = int(input())\nif age >= 18:\n    print("Можно")\nelse:\n    print("Рано")\n',
    'age = int(input())\nif age < 18:\n    print("Рано")\nelse:\n    print("Можно")\n',
    [program('Условие и граничный возраст',[['18\n','Можно\n'],['17\n','Рано\n'],['25\n','Можно\n']])],'18\n');
  add('flow-2','Решения и повторения','Несколько вариантов','elif',
    'elif проверяет следующее условие, если предыдущие не подошли. Порядок проверок важен: в цепочке срабатывает только первая подходящая ветка.',
    'Прочитайте балл от 0 до 100. От 80 включительно — «Отлично», от 50 до 79 — «Хорошо», ниже 50 — «Продолжай».',
    'Начните с score >= 80, затем elif score >= 50.',
    'score = int(input())\n# Выберите сообщение\n',
    'score = int(input())\nif score >= 80:\n    print("Отлично")\nelif score >= 50:\n    print("Хорошо")\nelse:\n    print("Продолжай")\n',
    'score = int(input())\nif score < 50:\n    print("Продолжай")\nelif score < 80:\n    print("Хорошо")\nelse:\n    print("Отлично")\n',
    [program('Три диапазона и их границы',[['80\n','Отлично\n'],['79\n','Хорошо\n'],['50\n','Хорошо\n'],['49\n','Продолжай\n']])],'80\n');
  add('flow-3','Решения и повторения','Объединяем условия','and / or / not',
    'and требует истинности обоих условий, or — хотя бы одного, not меняет истину на ложь. Для сравнения значений используют ==, а не знак присваивания =.',
    'Прочитайте две строки: возраст, затем наличие билета («да» или «нет»). Выведите «Вход открыт», только если возраст от 18 и билет есть. Иначе — «Вход закрыт».',
    'if age >= 18 and ticket == "да": ...',
    'age = int(input())\nticket = input()\n# Проверьте оба условия\n',
    'age = int(input())\nticket = input()\nif age >= 18 and ticket == "да":\n    print("Вход открыт")\nelse:\n    print("Вход закрыт")\n',
    'age = int(input())\nticket = input()\nif age < 18 or ticket != "да":\n    print("Вход закрыт")\nelse:\n    print("Вход открыт")\n',
    [program('Нужны и возраст, и билет',[['18\nда\n','Вход открыт\n'],['17\nда\n','Вход закрыт\n'],['22\nнет\n','Вход закрыт\n']])],'18\nда\n');
  add('flow-4','Решения и повторения','Повторяем по порядку','for и range()',
    'Цикл for перебирает значения. range(1, 6) даёт числа от 1 до 5: правая граница не включается. Тело цикла имеет отступ.',
    'Выведите числа от 1 до 5, каждое на отдельной строке.',
    'for number in range(1, 6):\n    print(number)',
    '# Напишите цикл\n',
    'for number in range(1, 6):\n    print(number)\n',
    'for index in range(5):\n    print(index + 1)\n',
    [output('Пять чисел в правильном порядке','1\n2\n3\n4\n5\n')]);
  add('flow-5','Решения и повторения','Пока условие верно','while',
    'while повторяет блок, пока условие истинно. Внутри нужно изменять данные так, чтобы цикл когда-нибудь закончился. Зависший код можно остановить кнопкой «Остановить».',
    'Сделайте обратный отсчёт от 3 до 1, по числу на строке. После цикла переменная count должна стать 0.',
    'Начните count = 3; условие count > 0, после печати count -= 1.',
    'count = 3\n# Добавьте цикл с изменением count\n',
    'count = 3\nwhile count > 0:\n    print(count)\n    count -= 1\n',
    'count = 3\nwhile count != 0:\n    print(count)\n    count = count - 1\n',
    [output('Обратный отсчёт','3\n2\n1\n'),value('Цикл довёл count до нуля','count',0)]);
  add('flow-6','Решения и повторения','Копим результат','Сумма в цикле',
    'Для накопления суммы заведите total = 0, затем добавляйте каждое значение. Запись total += number означает total = total + number.',
    'Прочитайте целое n от 0 до 20. Посчитайте и выведите сумму чисел от 1 до n включительно. Для 0 результат равен 0.',
    'for number in range(1, n + 1): total += number.',
    'n = int(input())\ntotal = 0\n# Посчитайте сумму\n',
    'n = int(input())\ntotal = 0\nfor number in range(1, n + 1):\n    total += number\nprint(total)\n',
    'n = int(input())\ntotal = sum(range(1, n + 1))\nprint(total)\n',
    [program('Суммы для разных n и пустого диапазона',[['5\n','15\n'],['0\n','0\n'],['1\n','1\n'],['10\n','55\n']])],'5\n');
  add('data-1','Данные и функции','Список ваших идей','list · append()',
    'Список хранит упорядоченные элементы. Индексы начинаются с 0. append добавляет элемент в конец, len возвращает число элементов.',
    'Создайте topics = ["Python", "Практика"], добавьте "Проект". Выведите первый элемент, затем длину списка, каждый на отдельной строке.',
    'topics.append("Проект"); print(topics[0]); print(len(topics)).',
    'topics = ["Python", "Практика"]\n# Добавьте тему и выведите результат\n',
    'topics = ["Python", "Практика"]\ntopics.append("Проект")\nprint(topics[0])\nprint(len(topics))\n',
    'topics = ["Python", "Практика"]\ntopics += ["Проект"]\nprint(topics[0], len(topics), sep="\\n")\n',
    [value('Три темы в правильном порядке','topics',['Python','Практика','Проект']),output('Первый элемент и размер','Python\n3\n')]);
  add('data-2','Данные и функции','Значения по ключам','dict',
    'Словарь связывает ключи со значениями. Доступ через profile["name"] получает значение по ключу. Словари удобны для описания объектов: имени, возраста и других свойств.',
    'Создайте profile с ключами name: "Анна", level: 1. Измените level на 2 и выведите «Анна: 2».',
    'profile["level"] = 2, затем сформируйте строку из значений словаря.',
    '# Создайте словарь profile\n',
    'profile = {"name": "Анна", "level": 1}\nprofile["level"] = 2\nprint(f"{profile[\"name\"]}: {profile[\"level\"]}")\n',
    'profile = dict(name="Анна", level=1)\nprofile.update(level=2)\nprint(profile["name"] + ": " + str(profile["level"]))\n',
    [value('Профиль обновлён','profile',{name:'Анна',level:2}),output('Профиль выведен','Анна: 2\n')]);
  add('data-3','Данные и функции','Своя функция','def и return',
    'Функция объединяет повторяемое действие. def задаёт имя и параметры, return возвращает результат. Печать и возврат отличаются: print показывает, return передаёт значение вызывающему коду.',
    'Определите square(number), которая возвращает квадрат числа. Функция должна работать с положительными, отрицательными числами и нулём.',
    'def square(number):\n    return number * number',
    'def square(number):\n    pass\n',
    'def square(number):\n    return number * number\n\nprint(square(4))\n',
    'def square(number):\n    return number ** 2\n\nprint(square(4))\n',
    [call('Квадрат для разных чисел','square',[[[4],16],[[-3],9],[[0],0],[[2.5],6.25]])]);
  add('data-4','Данные и функции','Несколько параметров','Аргументы функций',
    'Функция может получать несколько параметров. Значение параметра по умолчанию используется, когда аргумент не передан. Вычисление внутри функции должно зависеть от аргументов.',
    'Напишите cost(price, count=1), возвращающую цену покупки: price * count. Поддержите нулевое количество.',
    'Укажите count=1 в определении функции.',
    'def cost(price, count=1):\n    pass\n',
    'def cost(price, count=1):\n    return price * count\n\nprint(cost(120, 3))\n',
    'def cost(price, count=1):\n    return count * price\n\nprint(cost(120, 3))\n',
    [call('Параметры, значение по умолчанию и ноль','cost',[[[120,3],360],[[7],7],[[9,0],0],[[2.5,2],5]])]);
  add('data-5','Данные и функции','Отбираем нужные данные','Фильтрация списка',
    'Условие внутри цикла позволяет отобрать элементы. Можно создавать новый список через append или использовать включение списка: [x for x in numbers if условие]. Остаток от деления % помогает узнать чётность.',
    'Напишите even_numbers(numbers): верните новый список чётных чисел в исходном порядке, включая 0 и отрицательные чётные. Не изменяйте входной список.',
    'Число чётное, когда number % 2 == 0.',
    'def even_numbers(numbers):\n    pass\n',
    'def even_numbers(numbers):\n    result = []\n    for number in numbers:\n        if number % 2 == 0:\n            result.append(number)\n    return result\n\nprint(even_numbers([1, 2, 3, 4]))\n',
    'def even_numbers(numbers):\n    return [n for n in numbers if n % 2 == 0]\n\nprint(even_numbers([1, 2, 3, 4]))\n',
    [call('Отбор с сохранением порядка','even_numbers',[[[[1,2,3,4]],[2,4]],[[[]],[]],[[[-4,0,3,2]],[-4,0,2]]]),expr('Входной список не изменяется','(lambda a: (even_numbers(a), a)[1] == [3, 2, 1])([3, 2, 1])')]);
  add('data-6','Данные и функции','Обрабатываем ошибку','try / except',
    'Преобразование некорректного текста в число вызывает ValueError. try выполняет действие, except ValueError обрабатывает именно эту ошибку. Не скрывайте все ошибки без разбора.',
    'Напишите safe_int(text): верните целое число, если преобразование возможно; для некорректной строки верните None. Не печатайте ошибку вместо возврата.',
    'В try используйте return int(text), в except ValueError — return None.',
    'def safe_int(text):\n    pass\n',
    'def safe_int(text):\n    try:\n        return int(text)\n    except ValueError:\n        return None\n\nprint(safe_int("42"))\n',
    'def safe_int(text):\n    try:\n        value = int(text)\n    except ValueError:\n        value = None\n    return value\n\nprint(safe_int("42"))\n',
    [call('Числа, пробелы и ошибочный ввод','safe_int',[[['42'],42],[[' -7 '],-7],[['abc'],null],[[''],null],[['2.5'],null]])]);
  const sample=[{name:'Книга',category:'Учёба',amount:500},{name:'Чай',category:'Еда',amount:150},{name:'Тетрадь',category:'Учёба',amount:100}];
  const projectCases=[[[sample],{total:750,largest:'Книга',by_category:{'Учёба':600,'Еда':150}}],[[[]],{total:0,largest:null,by_category:{}}],[[[{name:'Вода',category:'Еда',amount:50},{name:'Яблоко',category:'Еда',amount:50}]],{total:100,largest:'Вода',by_category:{'Еда':100}}],[[[{name:'Билет',category:'Транспорт',amount:80}]],{total:80,largest:'Билет',by_category:{'Транспорт':80}}]];
  add('project','Итоговый проект','Куда ушли деньги?','Анализатор расходов',
    'Объедините словари, списки, циклы и функции. Каждая покупка — словарь name, category, amount. Для сумм используйте накопление, для самой дорогой покупки — сравнение. В первой версии суммы — неотрицательные целые числа.',
    'Напишите analyze_expenses(items). Верните словарь total (общая сумма), largest (имя самой дорогой покупки, при равенстве первая), by_category (суммы по категориям). Для пустого списка: 0, None, {}. Не изменяйте входные данные.',
    'Начните total = 0, largest = None и by_category = {}. Для каждой покупки добавляйте amount к total и к категории через .get(category, 0). Самую дорогую обновляйте только при строгом >.',
    'def analyze_expenses(items):\n    # Верните словарь с total, largest и by_category\n    pass\n\npurchases = [\n    {"name": "Книга", "category": "Учёба", "amount": 500},\n    {"name": "Чай", "category": "Еда", "amount": 150},\n    {"name": "Тетрадь", "category": "Учёба", "amount": 100},\n]\nprint(analyze_expenses(purchases))\n',
    'def analyze_expenses(items):\n    total = 0\n    largest = None\n    largest_amount = -1\n    by_category = {}\n    for item in items:\n        amount = item["amount"]\n        total += amount\n        category = item["category"]\n        by_category[category] = by_category.get(category, 0) + amount\n        if amount > largest_amount:\n            largest_amount = amount\n            largest = item["name"]\n    return {"total": total, "largest": largest, "by_category": by_category}\n\nprint(analyze_expenses([\n    {"name": "Книга", "category": "Учёба", "amount": 500},\n    {"name": "Чай", "category": "Еда", "amount": 150},\n    {"name": "Тетрадь", "category": "Учёба", "amount": 100},\n]))\n',
    'def analyze_expenses(items):\n    groups = {}\n    for item in items:\n        key = item["category"]\n        groups[key] = groups.get(key, 0) + item["amount"]\n    largest = max(items, key=lambda x: x["amount"]) if items else None\n    return {"total": sum(x["amount"] for x in items),\n            "largest": largest["name"] if largest else None,\n            "by_category": groups}\n\nprint(analyze_expenses([]))\n',
    [call('Обычные покупки и группировка','analyze_expenses',projectCases.slice(0,1)),call('Пустой список, равные суммы и одна покупка','analyze_expenses',projectCases.slice(1)),expr('Входные данные не изменяются','(lambda a: (analyze_expenses(a), a)[1] == [{"name":"Тест","category":"Другое","amount":0}])([{"name":"Тест","category":"Другое","amount":0}])')], '',
    'Вы написали функцию с контрактом и проверили несколько сценариев. В настоящих денежных расчётах отдельно выбирают представление сумм и правила округления. Здесь используем целые условные единицы, без финансовых рекомендаций.');
  const api={lessons};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PythonCourse=api;
})(typeof globalThis!=='undefined'?globalThis:this);
