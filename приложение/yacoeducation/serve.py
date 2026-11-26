#!/usr/bin/env python3
"""Локальная раздача YaCoEducation и разрешённых ресурсов из реестра.

Нет выполнения команд, записи файлов и публичного bind. Встроенный http.server
используется только для локальной учебной разработки, не как production-сервер.
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent
APPLICATIONS = ROOT.parent
PUBLIC = {"index.html", "app.js", "core.js", "style.css", "icon.svg"}
EXTENSIONS = {".html", ".css", ".js", ".mjs", ".svg", ".png", ".webp", ".jpg", ".jpeg", ".ico", ".wasm", ".data", ".zip", ".json"}
BLOCKED_PARTS = {"tests", "screenshots", "__pycache__", "node_modules"}
ID = re.compile(r"[a-z][a-z0-9-]{0,39}\Z")


def text(value, name, maximum=500):
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise ValueError(f"Некорректное поле {name}")
    return value


def load_registry(registry=ROOT / "workshops.json", applications=APPLICATIONS):
    """Проверить реестр целиком. Ошибки не превращаются в произвольные URL.

    source разрешён только внутри папки приложений, после раскрытия symlink.
    Публичный ответ не содержит локальных путей. Данные курсов не исполняются.
    """
    registry, applications = Path(registry).resolve(), Path(applications).resolve()
    if registry.stat().st_size > 1_000_000:
        raise ValueError("Слишком большой реестр")
    raw = json.loads(registry.read_text(encoding="utf-8"))
    if not isinstance(raw, dict) or raw.get("version") != 1 or raw.get("brand") != "YaCoEducation":
        raise ValueError("Нужен реестр version=1, brand=YaCoEducation")
    entries = raw.get("workshops")
    if not isinstance(entries, list) or not 1 <= len(entries) <= 60:
        raise ValueError("Реестр должен содержать от 1 до 60 мастерских")
    ids, storage_keys, sources, public = set(), set(), {}, []
    for item in entries:
        if not isinstance(item, dict):
            raise ValueError("Запись мастерской должна быть объектом")
        ident = text(item.get("id"), "id", 40)
        if not ID.fullmatch(ident) or ident in ids:
            raise ValueError("ID должен быть уникальным: " + ident)
        ids.add(ident)
        result = {"id": ident}
        for field, maximum in {"title": 80, "subtitle": 120, "category": 50, "badge": 5, "mode": 60, "description": 400, "level": 40}.items():
            result[field] = text(item.get(field), field, maximum)
        if item.get("accent") not in {"blue", "amber", "violet", "coral", "green", "teal", "slate"}:
            raise ValueError("Неизвестный accent: " + ident)
        result["accent"] = item["accent"]
        topics = item.get("topics")
        if not isinstance(topics, list) or not 1 <= len(topics) <= 5:
            raise ValueError("Нужны 1–5 тем: " + ident)
        result["topics"] = [text(topic, "topics", 40) for topic in topics]
        count = item.get("lessonCount")
        if type(count) is not int or not 1 <= count <= 1000:
            raise ValueError("lessonCount должен быть числом 1–1000")
        result["lessonCount"] = count
        source = text(item.get("source"), "source", 250)
        if Path(source).is_absolute() or "\\" in source:
            raise ValueError("source должен быть относительным путём")
        folder = (registry.parent / source).resolve()
        if folder == applications or not folder.is_relative_to(applications) or folder == ROOT or not (folder / "index.html").is_file():
            raise ValueError("source должен вести к папке мастерской внутри приложения: " + ident)
        sources[ident] = folder
        progress = item.get("progress")
        if progress is not None:
            if not isinstance(progress, dict) or progress.get("version") != 1:
                raise ValueError("Поддерживается progress.version=1")
            key = text(progress.get("storageKey"), "storageKey", 100)
            if not re.fullmatch(r"[a-z][a-z0-9-]{0,99}", key) or key in storage_keys or key == "yacoeducation-v1":
                raise ValueError("Ключ прогресса должен быть уникальным")
            storage_keys.add(key)
            lesson_ids = progress.get("lessonIds")
            if not isinstance(lesson_ids, list) or len(lesson_ids) != count or any(not isinstance(x, str) or not re.fullmatch(r"[a-zA-Z0-9_-]{1,80}", x) for x in lesson_ids) or len(set(lesson_ids)) != count:
                raise ValueError("lessonIds должны быть уникальными и соответствовать lessonCount")
            result["progress"] = {"storageKey": key, "version": 1, "lessonIds": lesson_ids}
        else:
            result["progress"] = None
        result["url"] = "/workshops/" + ident + "/"
        public.append(result)
    paths = raw.get("paths", [])
    if not isinstance(paths, list) or len(paths) > 12:
        raise ValueError("Слишком много маршрутов обучения")
    public_paths = []
    for item in paths:
        if not isinstance(item, dict):
            raise ValueError("Маршрут должен быть объектом")
        route = item.get("workshops")
        if not isinstance(route, list) or not 1 <= len(route) <= 10 or any(not isinstance(x, str) or x not in ids for x in route) or len(set(route)) != len(route):
            raise ValueError("Маршрут ссылается на неизвестную/повторную мастерскую")
        public_paths.append({"title": text(item.get("title"), "path.title", 100), "description": text(item.get("description"), "path.description", 250), "workshops": route})
    return {"version": 1, "brand": "YaCoEducation", "workshops": public, "paths": public_paths}, sources


def resource_path(url_path, sources, root=ROOT):
    """Разрешить только статические ресурсы. Нет listing и выхода по ../.

    Декодируем URL один раз; повторное кодирование с % также отвергается.
    resolve проверяет symlink для каждого ресурса, не только папки курса.
    """
    decoded = unquote(url_path, errors="strict")
    if not decoded.startswith("/") or any(c in decoded for c in ("\\", "\x00", "%")):
        raise ValueError("Некорректный путь")
    parts = decoded.strip("/").split("/")
    if any(part in {".", ".."} or part.startswith(".") or part in BLOCKED_PARTS for part in parts):
        raise ValueError("Путь запрещён")
    if decoded == "/":
        return Path(root) / "index.html"
    if len(parts) == 1 and parts[0] in PUBLIC:
        return Path(root) / parts[0]
    if len(parts) < 2 or parts[0] != "workshops" or parts[1] not in sources:
        raise FileNotFoundError("Не найдено")
    folder = sources[parts[1]]
    relative = "/".join(parts[2:]) or "index.html"
    target = (folder / relative).resolve()
    if not target.is_relative_to(folder):
        raise ValueError("Выход из каталога запрещён")
    if target.is_dir():
        target = (target / "index.html").resolve()
    if not target.is_relative_to(folder):
        raise ValueError("Выход из каталога запрещён")
    # Python-код в браузерной мастерской использует один текстовый harness.
    # Другие .py, документация, тесты и скрытые файлы с этого URL недоступны.
    if target.suffix.lower() not in EXTENSIONS and not (relative == "harness.py"):
        raise FileNotFoundError("Ресурс не предназначен для браузера")
    if not target.is_file():
        raise FileNotFoundError("Не найдено")
    return target


class Handler(BaseHTTPRequestHandler):
    server_version = "YaCoEducation/1.0"

    def do_GET(self):
        self.respond(False)

    def do_HEAD(self):
        self.respond(True)

    def do_POST(self):
        self.message(405, "Сервер только читает файлы. Измените реестр локально.")

    do_PUT = do_POST
    do_DELETE = do_POST
    do_PATCH = do_POST

    def message(self, status, message):
        self.send_data(status, message.encode("utf-8"), "text/plain; charset=utf-8", self.command == "HEAD")

    def send_data(self, status, data, mime, head=False):
        self.send_response(status)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        if mime.startswith("text/html"):
            self.send_header("Content-Security-Policy", "frame-ancestors 'self'")
        self.end_headers()
        if not head:
            try:
                self.wfile.write(data)
            except (BrokenPipeError, ConnectionResetError):
                pass  # Закрытый iframe отменяет запрос; сервер продолжает работу.

    def respond(self, head):
        path = urlsplit(self.path).path
        if path in {"/api/workshops", "/health"} or path.startswith("/workshops/"):
            try:
                public, sources = load_registry(self.server.registry, self.server.applications)
            except (ValueError, OSError, UnicodeError, TypeError, KeyError):
                self.message(503, "Ошибка реестра. Выполните serve.py --check и исправьте workshops.json.")
                return
        else:
            sources = {}
        if path == "/api/workshops":
            self.send_data(200, json.dumps(public, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8", head)
            return
        if path == "/health":
            self.send_data(200, b'{"status":"ok"}', "application/json", head)
            return
        try:
            # Для относительных ссылок Worker/модулей нужен завершающий слеш.
            if re.fullmatch(r"/workshops/[a-z][a-z0-9-]{0,39}", path) and path.split("/")[-1] in sources:
                self.send_response(308)
                self.send_header("Location", path + "/")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            target = resource_path(path, sources)
            data = target.read_bytes()
            mime = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
            if target.suffix == ".mjs":
                mime = "text/javascript"
            if target.suffix == ".wasm":
                mime = "application/wasm"
            if mime.startswith("text/"):
                mime += "; charset=utf-8"
            self.send_data(200, data, mime, head)
        except (ValueError, UnicodeError):
            self.message(403, "Путь запрещён.")
        except OSError:
            self.message(404, "Страница или мастерская не найдена.")

    def log_message(self, fmt, *args):
        # Не записываем query string: диагностике достаточно HTTP-кода.
        if args:
            print("HTTP", self.command, args[-1] if len(args) < 2 else args[1], flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8772)
    parser.add_argument("--check", action="store_true", help="Проверить реестр без запуска сервера")
    args = parser.parse_args()
    try:
        public, _ = load_registry()
    except (ValueError, OSError, UnicodeError, TypeError, KeyError) as error:
        parser.exit(1, "Ошибка реестра: " + str(error) + "\n")
    if args.check:
        print(f"Реестр корректен: {len(public['workshops'])} мастерских, {sum(w['lessonCount'] for w in public['workshops'])} занятий.")
        return
    if not 1024 <= args.port <= 65535:
        parser.error("Используйте порт от 1024 до 65535")
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    server.registry, server.applications = ROOT / "workshops.json", APPLICATIONS
    print(f"YaCoEducation: http://127.0.0.1:{args.port}/", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Сервер остановлен.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
