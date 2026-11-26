"""Сопоставляет авторские сценарии с установленным Vim. Создаёт только
временные файлы в /tmp; не читает vimrc, viminfo и пользовательские файлы.
Временные данные оставляются на месте, удаления файлов нет.
"""
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
CASES = json.loads(subprocess.check_output(["node", str(ROOT / "tests/export-cases.cjs")], text=True))
work = Path(tempfile.mkdtemp(prefix="vim-trainer-compare-", dir="/tmp"))
rows = []
for case in CASES:
    source = work / (case["id"] + ".txt")
    result = work / (case["id"] + ".json")
    script = work / (case["id"] + ".vim")
    source.write_text(case["text"] + "\n")
    keys = case["sequence"].replace("\\", "\\\\").replace('"', '\\"')
    for token, vim in [("<Esc>", r"\<Esc>"), ("<CR>", r"\<CR>"), ("<C-r>", r"\<C-r>")]:
        keys = keys.replace(token, vim)
    script.write_text(
        "set nocompatible noautoindent nosmartindent backspace=indent,eol,start\n"
        "set encoding=utf-8\n"
        "edit " + str(source) + "\ncall cursor(1, 1)\n"
        'execute "normal! ' + keys + '"\n'
        "let result = {'lines': getline(1, '$'), 'row': line('.') - 1, 'col': col('.') - 1}\n"
        "call writefile([json_encode(result)], '" + str(result) + "')\nqa!\n"
    )
    subprocess.run(["vim", "-Nu", "NONE", "-U", "NONE", "-i", "NONE", "-n", "-es", "-S", str(script)], timeout=5, check=True, capture_output=True)
    native = json.loads(result.read_text())
    rows.append({"id": case["id"], "match": native == case["expected"], "native": native, "model": case["expected"]})
report = {"vim": subprocess.check_output(["vim", "--version"], text=True).splitlines()[0], "temporary_directory": str(work), "cases": rows}
(ROOT / "tests/native-results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
failed = [r for r in rows if not r["match"]]
print(json.dumps({"cases": len(rows), "matched": len(rows) - len(failed), "mismatches": failed}, ensure_ascii=False, indent=2))
assert not failed, "Обнаружены расхождения с Vim"
