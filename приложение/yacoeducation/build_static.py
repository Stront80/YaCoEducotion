#!/usr/bin/env python3
"""Собрать статический сайт без зависимостей и без изменения исходных курсов."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import shutil

from serve import ROOT, PUBLIC, load_registry, resource_path


def build(output, registry=ROOT / "workshops.json", applications=ROOT.parent):
    """Скопировать только ресурсы, доступные через локальный сервер.

    Реестр проверяется тем же кодом, что используется при локальном запуске.
    Относительные URL позволяют разместить результат в любой подпапке сайта.
    Непустой каталог никогда не очищаем: ошибочный --output не удалит данные.
    """
    public, sources = load_registry(registry, applications)
    output = Path(output).absolute()
    if output.is_symlink():
        raise ValueError("Каталог сборки не должен быть символической ссылкой")
    output = output.resolve()
    if output == ROOT or output.is_relative_to(Path(applications).resolve()):
        raise ValueError("Создавайте сборку вне папки исходников приложений")
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        raise ValueError("Для сборки нужен новый или пустой каталог; файлы не удаляются")

    # Сначала составляем полный список: ошибки путей обнаруживаются до записи.
    resources = []
    for ident, folder in sources.items():
        for source in sorted(folder.rglob("*")):
            if not source.is_file():
                continue
            relative = source.relative_to(folder)
            if source.is_symlink() or any(part.startswith(".") for part in relative.parts):
                continue
            try:
                permitted = resource_path("/workshops/" + ident + "/" + relative.as_posix(), sources)
            except (ValueError, FileNotFoundError):
                continue
            resources.append((permitted, Path("workshops") / ident / relative))
        # Лицензии поставляем рядом с Python runtime; произвольные документы
        # и Python-скрипты сервера в публичную сборку не попадают.
        for name in ("PYTHON-LICENSE", "PYODIDE-LICENSE"):
            license_path = folder / "vendor" / name
            if license_path.is_file() and not license_path.is_symlink():
                if not license_path.resolve().is_relative_to(folder):
                    raise ValueError("Лицензия находится вне папки мастерской")
                resources.append((license_path, Path("workshops") / ident / "vendor" / name))

    output.mkdir(parents=True, exist_ok=True)
    for name in sorted(PUBLIC):
        shutil.copyfile(ROOT / name, output / name)
    for source, relative in resources:
        target = output / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    for workshop in public["workshops"]:
        workshop["url"] = "./workshops/" + workshop["id"] + "/"
    (output / "workshops-public.json").write_text(
        json.dumps(public, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    page = (output / "index.html").read_text(encoding="utf-8")
    page = page.replace('<html lang="ru">', '<html lang="ru" data-registry="./workshops-public.json">')
    page = page.replace("Локально · без аккаунта", "В браузере · без аккаунта")
    page = page.replace("Загружаем локальный каталог.", "Загружаем каталог мастерских.")
    (output / "index.html").write_text(page, encoding="utf-8")
    (output / ".nojekyll").touch()
    return public


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True, help="Новый или пустой каталог вне приложение/")
    args = parser.parse_args()
    try:
        public = build(args.output)
    except (ValueError, OSError) as error:
        parser.exit(1, "Ошибка сборки: " + str(error) + "\n")
    print(f"Сборка готова: {args.output} — {len(public['workshops'])} мастерских, "
          f"{sum(w['lessonCount'] for w in public['workshops'])} занятий.")


if __name__ == "__main__":
    main()
