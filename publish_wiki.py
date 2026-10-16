#!/usr/bin/env python3
"""Заливает wiki.html в репозиторий GitHub (замена файла в ветке main).
Запуск после каждой пересборки базы знаний:
    GITHUB_TOKEN=... python3 publish_wiki.py путь/к/wiki.html
Токен: GitHub → Settings → Developer settings → Fine-grained tokens,
доступ только к репозиторию askonalifegroup/alg-ai-obuchenie, право Contents: Read and write.
Токен хранить в переменной окружения / секретах, не в коде и не в чатах."""
import base64, json, os, sys, urllib.request, datetime

REPO, BRANCH, PATH = 'askonalifegroup/alg-ai-obuchenie', 'main', 'wiki.html'
token = os.environ.get('GITHUB_TOKEN')
if not token or len(sys.argv) < 2:
    sys.exit('Нужны переменная GITHUB_TOKEN и путь к wiki.html аргументом')
data = open(sys.argv[1], 'rb').read()
if b'ALL_POSTS' not in data or b'tracker.js' not in data:
    sys.exit('Файл не похож на базу знаний (нет ALL_POSTS или тега tracker.js) – не заливаю')

def call(method, url, body=None):
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body else None,
        headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'User-Agent': 'alg-wiki-publisher'})
    return json.load(urllib.request.urlopen(req, timeout=60))

api = f'https://api.github.com/repos/{REPO}/contents/{PATH}'
try:
    sha = call('GET', api + '?ref=' + BRANCH)['sha']
except urllib.error.HTTPError as e:
    if e.code != 404: raise
    sha = None
body = {'message': 'Обновление базы знаний ' + datetime.date.today().isoformat(),
        'content': base64.b64encode(data).decode(), 'branch': BRANCH}
if sha: body['sha'] = sha
call('PUT', api, body)
print('Готово: wiki.html обновлён')
