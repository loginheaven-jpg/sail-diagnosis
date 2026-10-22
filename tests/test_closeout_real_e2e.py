"""Real local Auth/PostgREST + SAIL Next + Catalyst browser closeout tests.

No Auth/REST fixture responses are used. Browser requests to non-loopback
destinations are denied. One public-home case aborts a local public read to test
transport failure/retry, then restores the actual backend. Credentials/cookies/response payloads stay in memory;
stdout contains only case names, status, safe assertion descriptions and counts.
Requires the disposable local runtime and its matching private apps-env.json. Never point this runner at a deployed project.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import html
import hmac
import json
import os
import re
import secrets
import subprocess
import time
import traceback
import uuid
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import parse_qs, quote, urlparse
from urllib.request import Request, build_opener, ProxyHandler, HTTPRedirectHandler

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
SAIL = os.environ.get('SAIL_TEST_APP_URL', 'http://127.0.0.1:3040').rstrip('/')
CATALYST = os.environ.get('CATALYST_TEST_APP_URL', 'http://127.0.0.1:3041').rstrip('/')
PRIVATE = Path(os.environ.get('SAIL_TEST_ENV_FILE', '/tmp/phase1-closeout-private/apps-env.json'))
ANSWERS = {**{f'Q{i}': 'a' for i in range(1, 11)}, **{f'Q{i}': 'cardA' for i in range(11, 21)}, **{f'Q{i}': 51 for i in range(21, 31)}}
RESULTS = []
SCREENSHOTS = Path(os.environ.get('SAIL_TEST_SCREENSHOTS', '/tmp/phase1-closeout-artifacts'))
SCREENSHOTS.mkdir(parents=True, exist_ok=True)


class CheckFailed(Exception):
    """Messages must be static descriptions, never contain response bodies."""


def require(condition, message):
    if not condition:
        raise CheckFailed(message)


def safe_screenshot(page, filename):
    page.screenshot(path=str(SCREENSHOTS / filename), full_page=True, mask=[
        page.locator('input[type="password"],input[type="email"],input[type="tel"]'),
        page.locator('td').filter(has_text=re.compile(r'@example\.invalid')),
        page.locator('p').filter(has_text=re.compile(r'@example\.invalid')),
    ])


def local(url):
    parsed = urlparse(url)
    require(parsed.scheme == 'http' and parsed.hostname in ('127.0.0.1', 'localhost'), 'Non-local URL rejected')
    require('zdoytzmvcafcebytttrm' not in url, 'Operating project rejected')
    return url


class LocalRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        local(newurl)
        return super().redirect_request(request, fp, code, msg, headers, newurl)


OPENER = build_opener(ProxyHandler({}), LocalRedirect())


def raw(method, url, data=None, headers=None):
    local(url)
    payload = json.dumps(data).encode() if data is not None else None
    request = Request(url, data=payload, method=method, headers={'Content-Type': 'application/json', **(headers or {})})
    try:
        response = OPENER.open(request, timeout=30)
    except HTTPError as error:
        response = error
    body = response.read()
    try:
        value = json.loads(body) if body else None
    except (ValueError, UnicodeDecodeError):
        value = None
    return response.status, value


def sql_literal(value):
    return "'" + str(value).replace("'", "''") + "'"


class Runtime:
    def __init__(self):
        require(PRIVATE.is_file(), 'Private local runtime configuration missing')
        env = json.loads(PRIVATE.read_text())
        self.url = local(env.get('SAIL_TEST_SUPABASE_URL') or env['NEXT_PUBLIC_SUPABASE_URL']).rstrip('/')
        self.anon = env.get('SAIL_TEST_ANON_KEY') or env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
        self.service = env.get('SAIL_TEST_SERVICE_ROLE_KEY') or env['SUPABASE_SERVICE_ROLE_KEY']
        self.container = env.get('SAIL_TEST_DB_CONTAINER', 'phase1-closeout-db')
        require(self.container.startswith('phase1-closeout-'), 'Non-local DB container rejected')
        local(SAIL); local(CATALYST)
        config_path = PRIVATE.with_name('config.json')
        self.local_signing_key = json.loads(config_path.read_text())['jwt_secret'] if config_path.is_file() else None
        self.run = uuid.uuid4().hex[:10]
        self.actors = {}
        self.signup_count = 0
        self.contexts = {}
        self.browser = None
        self.external_denied = 0

    def headers(self, token=None, service=False):
        key = self.service if service else self.anon
        return {'apikey': key, 'Authorization': 'Bearer ' + (token or key)}

    def db(self, statement):
        process = subprocess.run(['docker', 'exec', '-i', self.container, 'psql', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'], input=statement, text=True, capture_output=True, timeout=30)
        require(process.returncode == 0, 'Local fixture SQL failed')
        return process.stdout.strip()

    def rest(self, method, path, payload=None, token=None, service=False):
        return raw(method, self.url + '/rest/v1/' + path, payload, self.headers(token, service))

    def auth(self, method, path, payload=None, service=False, token=None):
        return raw(method, self.url + '/auth/v1/' + path, payload, self.headers(token, service))

    def prepare(self):
        for label, role in [('a', 'user'), ('b', 'user'), ('coach_a', 'coach'), ('coach_b', 'coach'), ('admin', 'admin'), ('kcf_coach', 'user'), ('suspended', 'user')]:
            actor = {'email': f'closeout-{self.run}-{label}@example.invalid', 'password': 'LocalOnly-' + secrets.token_urlsafe(18), 'phone': '010' + str(secrets.randbelow(10**8)).zfill(8), 'name': '로컬검수 ' + label, 'role': role}
            status, user = self.auth('POST', 'admin/users', {'email': actor['email'], 'password': actor['password'], 'email_confirm': True, 'user_metadata': {'name': actor['name'], 'full_name': actor['name'], 'phone': actor['phone']}}, service=True)
            require(status in (200, 201) and isinstance(user, dict) and bool(user.get('id')), 'Synthetic local Auth fixture creation failed')
            actor['id'] = user['id']
            status, _ = self.rest('PATCH', 'users?id=eq.' + actor['id'], {'role': role, 'name': actor['name'], 'nickname': actor['name']}, service=True)
            require(status in (200, 204), 'Synthetic local SAIL role fixture failed')
            status, session = self.auth('POST', 'token?grant_type=password', {'email': actor['email'], 'password': actor['password']})
            require(status == 200 and session['user']['id'] == actor['id'], 'Actual local Auth password session failed')
            actor['session'] = session
            self.actors[label] = actor

    def context(self):
        context = self.browser.new_context(viewport={'width': 1280, 'height': 900}, reduced_motion='reduce')
        def guard(route):
            parsed = urlparse(route.request.url)
            if parsed.scheme in ('http', 'https') and parsed.hostname not in ('127.0.0.1', 'localhost'):
                self.external_denied += 1
                route.abort()
            else:
                route.continue_()
        context.route('**/*', guard)
        return context

    def sail_login(self, label):
        if label in self.contexts:
            return self.contexts[label]
        actor = self.actors[label]
        context = self.context(); page = context.new_page(); page.set_default_timeout(20000)
        page.goto(SAIL + '/login?redirect=%2Fguide', wait_until='domcontentloaded')
        page.get_by_label('전화번호', exact=True).fill(actor['phone'])
        page.get_by_label('암호', exact=True).fill(actor['password'])
        with page.expect_response(lambda response: urlparse(response.url).path == '/api/auth/phone-lookup') as login_response:
            page.get_by_role('button', name='로그인', exact=True).click()
        require(login_response.value.status == 200 and login_response.value.json() == {'ok': True}, 'Phone login exposes an identifier mapping or fails actual Auth verification')
        page.wait_for_url(lambda url: urlparse(str(url)).path == '/guide')
        response = self.api(context, 'GET', '/api/users/me')
        require(response.status == 200 and response.json()['user']['id'] == actor['id'], 'Actual SAIL login did not restore original Auth UUID (HTTP ' + str(response.status) + ')')
        self.contexts[label] = context
        return context

    def api(self, context, method, path, data=None, origin=True, headers=None):
        require(path.startswith('/') and not path.startswith('//'), 'Invalid local API path')
        merged = {**({'Origin': SAIL} if origin else {}), **(headers or {})}
        return context.request.fetch(SAIL + path, method=method, data=data, headers=merged, timeout=30000)

    def start_session(self, context):
        response = self.api(context, 'POST', '/api/diagnosis/session', {})
        require(response.status == 200 and response.json().get('ready') is True, 'Actual participation session was not issued (HTTP ' + str(response.status) + ')')
        cookies = context.cookies(SAIL)
        participation = [c for c in cookies if 'particip' in c['name'] or 'sail' in c['name']]
        require(bool(participation) and any(c['httpOnly'] and c['sameSite'] in ('Lax', 'Strict') for c in participation), 'Participation cookie is not HttpOnly/SameSite')
        return participation

    def diagnosis(self, context, **overrides):
        payload = {'nickname': '로컬 실제 진단', 'groupCode': None, 'answers': ANSWERS, 'requestId': str(uuid.uuid4()), **overrides}
        response = self.api(context, 'POST', '/api/diagnosis', payload)
        require(response.status in (200, 201) and bool(response.json().get('id')), 'Actual diagnosis submission failed (HTTP ' + str(response.status) + ')')
        return response.json()['id'], payload

    def clear(self):
        for context in self.contexts.values():
            context.close()


def run_case(name, function):
    try:
        function()
        RESULTS.append({'name': name, 'status': 'PASS'})
        print('PASS ' + name, flush=True)
    except Exception as error:
        frames = traceback.extract_tb(error.__traceback__)
        frame = next((f for f in reversed(frames) if f.filename.endswith('test_closeout_real_e2e.py') and f.name != 'require'), None)
        # Static assertion messages only. Playwright messages can include a secret URL.
        detail = str(error) if isinstance(error, CheckFailed) else type(error).__name__
        RESULTS.append({'name': name, 'status': 'FAIL', 'error': detail, 'line': frame.lineno if frame else None})
        print('FAIL ' + name + ': ' + detail + (' at line ' + str(frame.lineno) if frame else ''), flush=True)


def signup_case(rt):
    context = rt.context(); page = context.new_page(); page.set_default_timeout(30000)
    email = f'closeout-{rt.run}-signup@example.invalid'
    password = 'LocalOnly-' + secrets.token_urlsafe(18)
    phone = '010' + str(secrets.randbelow(10**8)).zfill(8)
    page.goto(SAIL + '/signup', wait_until='domcontentloaded')
    page.locator('input[autocomplete="name"]').fill('로컬 신규가입')
    page.locator('input[type="tel"]').fill(phone)
    page.locator('input[type="email"]').fill(email)
    page.locator('input[type="password"]').nth(0).fill(password)
    page.locator('input[type="password"]').nth(1).fill(password)
    page.get_by_role('checkbox').last.check()
    page.get_by_role('button', name='가입 완료', exact=True).click()
    page.wait_for_url(lambda url: urlparse(str(url)).path == '/')
    response = rt.api(context, 'GET', '/api/users/me')
    require(response.status == 200 and response.json()['user']['role'] == 'user', 'Actual signup did not create an ordinary SAIL user')
    user = response.json()['user']
    rt.signup_count += 1
    require(user.get('name', user.get('full_name')) == '로컬 신규가입', 'Actual signup did not persist canonical name')
    status, rows = rt.rest('GET', 'users?id=eq.' + user['id'] + '&select=id,name,role', service=True)
    require(status == 200 and rows[0]['name'] == '로컬 신규가입', 'Reviewed operating name column contract failed at signup')
    safe_screenshot(page, 'sail-real-signup-success.png')
    context.close()


def recovery_mail_case(rt):
    mailpit = 'http://127.0.0.1:54325'
    status, before = raw('GET', mailpit + '/api/v1/messages')
    require(status == 200, 'Actual local mail sink unavailable')
    old_ids = {row['ID'] for row in before.get('messages', [])}
    actor = rt.actors['b']
    context = rt.context(); page = context.new_page(); page.set_default_timeout(30000)
    page.goto(SAIL + '/reset-password', wait_until='domcontentloaded')
    page.locator('input[type="email"]').fill(actor['email'])
    page.get_by_role('button', name='재설정 메일 보내기', exact=True).click()
    expect(page.get_by_role('heading', name='메일이 발송되었습니다', exact=True)).to_be_visible()
    message = None
    for _ in range(40):
        status, after = raw('GET', mailpit + '/api/v1/messages')
        if status == 200:
            message = next((row for row in after.get('messages', []) if row['ID'] not in old_ids and any(address.get('Address') == actor['email'] for address in row.get('To', []))), None)
        if message: break
        time.sleep(0.2)
    require(bool(message), 'Local Auth did not deliver a recovery email into local mail sink')
    status, content = raw('GET', mailpit + '/api/v1/message/' + message['ID'])
    require(status == 200 and isinstance(content, dict), 'Local recovery mail could not be read from private local sink')
    links = re.findall(r'href=[\"\']([^\"\']+)', content.get('HTML', ''), flags=re.I)
    recovery_url = next((html.unescape(link) for link in links if 'type=recovery' in html.unescape(link)), None)
    require(bool(recovery_url), 'Actual recovery email does not contain a recovery link')
    local(recovery_url)
    require(urlparse(recovery_url).path == '/auth/v1/verify', 'Actual recovery URL has an invalid Auth endpoint path')
    page.goto(recovery_url, wait_until='domcontentloaded')
    page.wait_for_url(lambda url: urlparse(str(url)).path == '/reset-password/confirm')
    expect(page.locator('input[type="password"]').first).to_be_visible()
    new_password = 'LocalChanged-' + secrets.token_urlsafe(18)
    page.locator('input[type="password"]').nth(0).fill(new_password)
    page.locator('input[type="password"]').nth(1).fill(new_password)
    page.get_by_role('button', name='암호 변경', exact=True).click()
    page.wait_for_url(lambda url: urlparse(str(url)).path == '/' and parse_qs(urlparse(str(url)).query).get('reset') == ['ok'])
    require(rt.auth('POST', 'token?grant_type=password', {'email': actor['email'], 'password': actor['password']})[0] == 400, 'Password recovery did not revoke the old password')
    status, session = rt.auth('POST', 'token?grant_type=password', {'email': actor['email'], 'password': new_password})
    require(status == 200 and session['user']['id'] == actor['id'], 'Actual recovered password cannot authenticate the original Auth UUID')
    actor['password'] = new_password
    context.close()


def phone_privacy_case(rt):
    context = rt.context()
    expected = {'error': '전화번호 또는 암호를 확인해 주세요.'}
    known = rt.actors['a']
    # Failed login must preserve a valid anonymous capability.
    rt.start_session(context); result_id, _ = rt.diagnosis(context)
    for body in ({'phone': known['phone']}, {'phone': known['phone'], 'password': 'Incorrect-Local-Password'}, {'phone': '01000000000', 'password': 'Incorrect-Local-Password'}):
        response = rt.api(context, 'POST', '/api/auth/phone-lookup', body)
        require(response.status == 401 and response.json() == expected, 'Phone lookup reveals existence/email or returns distinguishable login errors')
        require(rt.api(context, 'GET', '/api/diagnosis?id=' + result_id).status == 200, 'Failed login destroyed anonymous participation')
    require(rt.api(context, 'POST', '/api/auth/phone-lookup', {'phone': known['phone'], 'password': known['password']}, headers={'Origin': 'https://outside.example.invalid'}).status == 403, 'Foreign-origin phone login accepted')
    signed_in = rt.api(context, 'POST', '/api/auth/phone-lookup', {'phone': known['phone'], 'password': known['password']})
    require(signed_in.status == 200 and signed_in.json() == {'ok': True}, 'Successful phone login exposes a mapping or fails actual Auth')
    require(rt.api(context, 'GET', '/api/diagnosis?id=' + result_id).status == 404, 'Successful login retained the old anonymous participation proof')
    require(rt.api(context, 'GET', '/api/users/me').json()['user']['id'] == known['id'], 'Successful phone login changed the original Auth UUID')
    context.close()


def auth_case(rt):
    actor = rt.actors['a']; session = actor['session']
    status, fresh = rt.auth('POST', 'token?grant_type=refresh_token', {'refresh_token': session['refresh_token']})
    require(status == 200 and fresh['user']['id'] == actor['id'] and fresh.get('access_token'), 'Actual Auth token refresh failed')
    actor['session'] = fresh
    for label in ('a', 'coach_a', 'admin'):
        context = rt.sail_login(label)
        response = rt.api(context, 'GET', '/api/users/me')
        require(response.status == 200 and response.json()['user']['role'] == rt.actors[label]['role'], 'SAIL role changed during actual login')
        page = context.new_page(); page.goto(SAIL + '/', wait_until='domcontentloaded'); page.reload()
        require(rt.api(context, 'GET', '/api/users/me').status == 200, 'Actual cookie session restoration failed')
        page.close()


def cancelled_ui_case(rt):
    context = rt.context(); page = context.new_page(); page.set_default_timeout(30000)
    before = rt.db('SELECT count(*) FROM public.results')
    page.goto(SAIL + '/test', wait_until='domcontentloaded')
    page.get_by_label(re.compile('닉네임')).fill('로컬 취소')
    page.get_by_role('button', name=re.compile('진단 시작')).last.click()
    for number in range(1, 4):
        expect(page.get_by_text(f'Q{number} · 상황 판단', exact=True)).to_be_visible()
        page.get_by_role('radio').first.click()
    page.goto(SAIL + '/', wait_until='domcontentloaded')
    require(rt.db('SELECT count(*) FROM public.results') == before, 'Cancelled incomplete browser diagnosis persisted a result')
    context.close()


def finish_questions(page, on_last=None):
    for number in range(1, 11):
        expect(page.get_by_text(f'Q{number} · 상황 판단', exact=True)).to_be_visible()
        page.get_by_role('radio').first.click()
    for number in range(11, 21):
        if number == 11:
            button = page.get_by_role('button', name=re.compile('계속하기'))
            if button.count(): button.click()
        expect(page.get_by_text(f'Q{number} · 가치 선택', exact=True)).to_be_visible()
        page.locator('main button.group').first.click()
    for number in range(21, 31):
        if number == 21:
            button = page.get_by_role('button', name=re.compile('계속하기'))
            if button.count(): button.click()
        expect(page.get_by_text(f'Q{number} · 성향 스펙트럼', exact=True)).to_be_visible()
        page.get_by_role('slider', name='스펙트럼 슬라이더').focus()
        page.get_by_role('slider', name='스펙트럼 슬라이더').press('ArrowRight')
        if number == 30 and on_last:
            on_last()
        page.get_by_role('button', name='결과 보기 →' if number == 30 else '다음 →', exact=True).click()


def anonymous_ui_case(rt):
    context = rt.context(); page = context.new_page(); page.set_default_timeout(30000)
    page.goto(SAIL + '/test', wait_until='domcontentloaded')
    page.get_by_label(re.compile('닉네임')).fill('로컬 비회원')
    page.get_by_role('button', name=re.compile('진단 시작')).last.click()
    finish_questions(page)
    page.wait_for_url(re.compile(r'.*/result/[0-9a-f-]{36}$'), timeout=60000)
    result_id = urlparse(page.url).path.rsplit('/', 1)[-1]
    response = rt.api(context, 'GET', '/api/diagnosis?id=' + result_id)
    require(response.status == 200, 'Anonymous browser cannot re-read own actual stored result')
    require('answers' not in response.json() and 'device' not in response.json() and 'user_id' not in response.json(), 'Result DTO exposes raw/private fields')
    page.reload(); expect(page.get_by_text('로컬 비회원', exact=False).first).to_be_visible()
    require(all('로컬 비회원' not in (node.get_attribute('content') or '') for node in page.locator('meta[property="og:title"],meta[property="og:description"]').all()), 'Result OG metadata contains nickname')
    safe_screenshot(page, 'sail-real-anonymous-result.png')
    rt.contexts['anonymous'] = context; rt.anonymous_id = result_id


def response_loss_ui_case(rt):
    coach = rt.sail_login('coach_a')
    created = rt.api(coach, 'POST', '/api/groups', {'name': '로컬 응답 유실 검수', 'maxMembers': 20})
    require(created.status == 201, 'Response-loss browser fixture group creation failed')
    group = created.json()['group']
    context = rt.context(); page = context.new_page(); page.set_default_timeout(30000)
    nickname = '응답 유실 ' + rt.run
    delivered = []; requests = []
    def lose_once(route):
        if route.request.method != 'POST':
            route.continue_(); return
        requests.append(route.request.post_data_json)
        if delivered:
            route.continue_(); return
        response = route.fetch()
        require(response.status in (200, 201), 'Actual server save failed before simulated response loss')
        delivered.append(response.json()['id'])
        route.abort()
    page.route('**/api/diagnosis', lose_once)
    page.goto(SAIL + '/test?group=' + group['code'], wait_until='domcontentloaded')
    page.get_by_label(re.compile('닉네임')).fill(nickname)
    page.get_by_role('button', name=re.compile('진단 시작')).last.click()
    finish_questions(page, lambda: page.get_by_role('checkbox').check())
    expect(page.get_by_text('결과 저장에 실패했어요', exact=True)).to_be_visible()
    require(len(delivered) == 1, 'Browser did not make the actual first diagnosis submission')
    require(rt.db('SELECT count(*) FROM public.results WHERE nickname=' + sql_literal(nickname)) == '1', 'Response-loss first submission did not persist exactly once')
    page.reload(wait_until='domcontentloaded')
    page.wait_for_url(re.compile(r'.*/result/[0-9a-f-]{36}$'), timeout=60000)
    require(urlparse(page.url).path.endswith('/' + delivered[0]), 'Reload after response loss created a new result UUID')
    require(len(requests) == 2 and requests[0]['requestId'] == requests[1]['requestId'], 'Reload did not preserve completion idempotency key')
    require(requests[0]['shareWithCoach'] is True and requests[1]['shareWithCoach'] is True, 'Reload did not preserve the explicit coach sharing choice')
    require(rt.db('SELECT count(*) FROM public.results WHERE nickname=' + sql_literal(nickname)) == '1', 'Reload after response loss stored duplicate diagnosis rows')
    require(rt.api(coach, 'GET', '/api/diagnosis?id=' + delivered[0]).status == 200, 'Persisted coach consent was lost across response-loss retry')
    context.close()


def anonymous_access_case(rt):
    require(hasattr(rt, 'anonymous_id'), 'Anonymous browser prerequisite failed')
    owner = rt.contexts['anonymous']; result_id = rt.anonymous_id
    stranger = rt.context()
    require(rt.api(stranger, 'GET', '/api/diagnosis?id=' + result_id).status == 404, 'Bare UUID opened an anonymous result')
    response = stranger.request.get(SAIL + '/result/' + result_id)
    require(response.status in (200, 404) and '로컬 비회원' not in response.text(), 'Bare UUID opened anonymous SSR result data')
    require(rt.api(owner, 'GET', '/api/diagnosis?id=' + str(uuid.uuid4())).status == 404, 'Anonymous session was not bound to one of its results')
    cookies = owner.cookies(SAIL)
    session_cookie = next(c for c in cookies if c['httpOnly'] and ('particip' in c['name'] or 'sail' in c['name']))
    forged = rt.context(); forged.add_cookies([{**session_cookie, 'value': secrets.token_urlsafe(32)}])
    require(rt.api(forged, 'GET', '/api/diagnosis?id=' + result_id).status == 404, 'Forged anonymous cookie opened result')
    forged.close(); stranger.close()
    response = rt.api(owner, 'DELETE', '/api/diagnosis/session', {})
    require(response.status in (200, 204), 'Anonymous participation revoke failed')
    require(rt.api(owner, 'GET', '/api/diagnosis?id=' + result_id).status == 404, 'Revoked anonymous participation can still read')


def owner_and_validation_case(rt):
    owner = rt.sail_login('a'); other = rt.sail_login('b')
    rt.start_session(owner)
    result_id, payload = rt.diagnosis(owner)
    rt.owner_id = result_id
    read = rt.api(owner, 'GET', '/api/diagnosis?id=' + result_id)
    require(read.status == 200, 'Authenticated result owner denied')
    dto = read.json()
    require('no-store' in read.headers.get('cache-control', '') and read.headers.get('referrer-policy') == 'no-referrer', 'Private result response is cacheable or leaks referrers')
    require(all(key not in dto for key in ('answers', 'user_id', 'group_id', 'device')), 'Owner result DTO exposes raw/private fields')
    require(rt.api(other, 'GET', '/api/diagnosis?id=' + result_id).status == 404, 'Other authenticated user opened owner result')
    require(rt.api(rt.sail_login('admin'), 'GET', '/api/diagnosis?id=' + result_id).status == 404, 'Admin obtained implicit global result access')
    duplicate = rt.api(owner, 'POST', '/api/diagnosis', payload)
    require(duplicate.status in (200, 201) and duplicate.json().get('id') == result_id, 'Repeated request generated a second result')
    changed_duplicate = rt.api(owner, 'POST', '/api/diagnosis', {**payload, 'nickname': '로컬 변경된 중복'})
    require(changed_duplicate.status == 409, 'Reusing the idempotency key with changed input was accepted')
    require(rt.db('SELECT count(*) FROM public.results WHERE id=' + sql_literal(result_id)) == '1', 'Duplicate result stored')
    row = json.loads(rt.db('SELECT row_to_json(r) FROM (SELECT dominant_type,assertiveness_norm,responsiveness_norm FROM public.results WHERE id=' + sql_literal(result_id) + ')r'))
    require(dto.get('dominant_type') == row['dominant_type'], 'Result DTO differs from stored server scoring')
    for changes in [ {'answers': {'Q1': 'a'}}, {'answers': {**ANSWERS, 'Q31': 'a'}}, {'answers': {**ANSWERS, 'Q21': 101}}, {'user_id': rt.actors['b']['id']}, {'group_id': str(uuid.uuid4())}, {'assertiveness_raw': 1000000} ]:
        response = rt.api(owner, 'POST', '/api/diagnosis', {**payload, 'requestId': str(uuid.uuid4()), **changes})
        require(response.status in (400, 422), 'Malformed answer or owner/group/score forgery was accepted')
    missing_origin = rt.api(owner, 'POST', '/api/diagnosis', payload, origin=False)
    wrong_origin = rt.api(owner, 'POST', '/api/diagnosis', payload, headers={'Origin': 'https://outside.example.invalid'})
    cross_site = rt.api(owner, 'POST', '/api/diagnosis/session', {}, headers={'Sec-Fetch-Site': 'cross-site'})
    require(missing_origin.status == wrong_origin.status == cross_site.status == 403, 'CSRF Origin/fetch-metadata checks failed')
    response = owner.request.post(SAIL + '/api/diagnosis', data='x' * 70000, headers={'Origin': SAIL, 'Content-Type': 'application/json'})
    require(response.status == 413, 'Oversized diagnosis body was not rejected')


def share_case(rt):
    require(hasattr(rt, 'owner_id'), 'Owner result prerequisite failed')
    owner = rt.sail_login('a'); result_id = rt.owner_id
    response = rt.api(owner, 'POST', '/api/diagnosis/share', {'resultId': result_id})
    require(response.status == 200 and bool(response.json().get('url')), 'Separate result share capability not created')
    parsed = urlparse(response.json()['url']); fragment = parse_qs(parsed.fragment)
    require(not parsed.query and bool(fragment.get('share')), 'Share token is exposed in URL query or missing')
    token = fragment['share'][0]
    share_url = response.json()['url']
    recipient = rt.context()
    require(rt.api(recipient, 'GET', '/api/diagnosis?id=' + result_id).status == 404, 'Share recipient can read without token exchange')
    require(rt.api(recipient, 'POST', '/api/diagnosis/share/exchange', {'resultId': str(uuid.uuid4()), 'token': token}).status in (400, 404), 'Share token accepted for another result')
    page = recipient.new_page(); page.set_default_timeout(30000)
    # Observe the browser's own location at the real fetch call. The Python
    # page.url navigation event may arrive after the request event.
    page.add_init_script("""(() => {
      const actualFetch = window.fetch;
      window.fetch = function(input, init) {
        if (typeof input === 'string' && input === '/api/diagnosis/share/exchange') {
          sessionStorage.setItem('__closeoutFragmentRemoved', String(window.location.hash === ''));
        }
        return actualFetch.apply(this, arguments);
      };
    })();""")
    with page.expect_response(lambda response: urlparse(response.url).path == '/api/diagnosis/share/exchange') as exchanged:
        page.goto(local(SAIL + share_url), wait_until='domcontentloaded')
    require(exchanged.value.status == 200, 'Actual browser fragment share exchange failed')
    expect(page.get_by_text('로컬 실제 진단', exact=False).first).to_be_visible()
    require(not urlparse(page.url).fragment and page.evaluate('sessionStorage.getItem("__closeoutFragmentRemoved")') == 'true', 'Browser did not remove share fragment before exchange or restored it after navigation')
    safe_screenshot(page, 'sail-real-shared-result.png')
    read = rt.api(recipient, 'GET', '/api/diagnosis?id=' + result_id)
    require(read.status == 200 and 'answers' not in read.json() and read.json().get('can_manage') is False, 'Share does not return a read-only minimal result')
    require(rt.api(recipient, 'POST', '/api/diagnosis/share', {'resultId': result_id}).status in (403, 404), 'Share recipient can mint transitive shares')
    require(rt.api(owner, 'DELETE', '/api/diagnosis/share', {'resultId': result_id}).status in (200, 204), 'Owner share revoke failed')
    require(rt.api(recipient, 'GET', '/api/diagnosis?id=' + result_id).status == 404, 'Revoked share remains readable')
    require(rt.api(recipient, 'POST', '/api/diagnosis/share/exchange', {'resultId': result_id, 'token': token}).status in (400, 404), 'Revoked share can be exchanged again')
    # Expiry is advanced only in the disposable DB fixture, never in an actual project.
    fresh = rt.api(owner, 'POST', '/api/diagnosis/share', {'resultId': result_id})
    require(fresh.status == 200, 'Owner could not issue a replacement share')
    fresh_token = parse_qs(urlparse(fresh.json()['url']).fragment)['share'][0]
    require(rt.api(recipient, 'POST', '/api/diagnosis/share/exchange', {'resultId': result_id, 'token': fresh_token}).status == 200, 'Replacement share exchange failed')
    token_hash = hashlib.sha256(fresh_token.encode()).hexdigest()
    rt.db("UPDATE public.sail_result_shares SET created_at=clock_timestamp()-interval '2 days',expires_at=clock_timestamp()-interval '1 day' WHERE token_hash=" + sql_literal(token_hash))
    require(rt.api(recipient, 'GET', '/api/diagnosis?id=' + result_id).status == 404, 'Expired shared capability remains readable')
    require(rt.api(recipient, 'POST', '/api/diagnosis/share/exchange', {'resultId': result_id, 'token': fresh_token}).status in (400, 404), 'Expired share can be exchanged')
    recipient.close()


def participation_expiry_case(rt):
    context = rt.context(); cookies = rt.start_session(context)
    result_id, _ = rt.diagnosis(context)
    require(rt.api(context, 'GET', '/api/diagnosis?id=' + result_id).status == 200, 'Fresh anonymous participation denied')
    cookie = next(c for c in cookies if 'particip' in c['name'])
    token_hash = hashlib.sha256(cookie['value'].encode()).hexdigest()
    rt.db("UPDATE public.sail_result_sessions SET created_at=clock_timestamp()-interval '2 days',expires_at=clock_timestamp()-interval '1 day' WHERE token_hash=" + sql_literal(token_hash))
    require(rt.api(context, 'GET', '/api/diagnosis?id=' + result_id).status == 404, 'Expired anonymous participation remains readable')
    response = rt.api(context, 'POST', '/api/diagnosis', {'nickname': '로컬 만료', 'answers': ANSWERS, 'requestId': str(uuid.uuid4())})
    require(response.status in (401, 404), 'Expired participation could create a diagnosis')
    fresh_cookies = rt.start_session(context)
    require(next(c['value'] for c in fresh_cookies if 'particip' in c['name']) != cookie['value'], 'Expired participation secret was reused')
    renewed_id, _ = rt.diagnosis(context)
    require(rt.api(context, 'GET', '/api/diagnosis?id=' + renewed_id).status == 200, 'New participation could not resume normal diagnosis after expiry')
    require(rt.api(context, 'GET', '/api/diagnosis?id=' + result_id).status == 404, 'New anonymous participation inherited expired result access')
    context.close()


def groups_case(rt):
    owner = rt.sail_login('a'); coach = rt.sail_login('coach_a'); different = rt.sail_login('coach_b'); member = rt.sail_login('b')
    created = rt.api(coach, 'POST', '/api/groups', {'name': '로컬 검수 그룹', 'maxMembers': 20})
    require(created.status == 201 and bool(created.json().get('group')), 'Actual coach group creation failed')
    group = created.json()['group']
    joined = rt.api(member, 'POST', '/api/groups/join', {'code': group['code']})
    require(joined.status == 200, 'Actual ordinary member group join failed')
    require(rt.api(member, 'POST', '/api/groups/join', {'code': group['code'], 'userId': rt.actors['a']['id']}).status == 400, 'Group join accepted a forged target user')
    rt.start_session(owner)
    hidden_id, _ = rt.diagnosis(owner, groupCode=group['code'], shareWithCoach=False)
    require(rt.api(coach, 'GET', '/api/diagnosis?id=' + hidden_id).status == 404, 'Group assignment implicitly granted coach access')
    result_id, _ = rt.diagnosis(owner, groupCode=group['code'], shareWithCoach=True)
    coach_read = rt.api(coach, 'GET', '/api/diagnosis?id=' + result_id)
    require(coach_read.status == 200, 'Consented active group coach denied')
    require(coach_read.json().get('can_manage') is False and all(key not in coach_read.json() for key in ('answers', 'device', 'user_id', 'group_id')), 'Coach result view exposes raw fields or owner management rights')
    require(rt.api(different, 'GET', '/api/diagnosis?id=' + result_id).status == 404, 'Other group coach opened result')
    require(rt.api(member, 'GET', '/api/diagnosis?id=' + result_id).status == 404, 'Ordinary group/member opened result')
    member_group = rt.api(member, 'GET', '/api/groups/' + group['id'])
    require(member_group.status == 200 and member_group.json().get('results') == [] and member_group.json().get('members') == [], 'Ordinary group access leaked customer results or roster identifiers')
    info = rt.api(coach, 'GET', '/api/groups/' + group['id'])
    require(info.status == 200, 'Coach group page API failed')
    result_rows = info.json().get('results', [])
    require(any(row['id'] == result_id for row in result_rows) and not any(row['id'] == hidden_id for row in result_rows), 'Group API bypasses explicit per-result consent')
    require(all(all(key not in row for key in ('answers', 'device', 'user_id', 'group_id')) and row.get('can_manage') is False for row in result_rows), 'Group DTO exposes raw fields or owner management rights')
    revoked = rt.api(owner, 'POST', '/api/diagnosis/consent', {'resultId': result_id, 'consent': False})
    require(revoked.status == 200 and rt.api(coach, 'GET', '/api/diagnosis?id=' + result_id).status == 404, 'Coach access survived explicit consent revocation')
    require(rt.api(owner, 'POST', '/api/diagnosis/consent', {'resultId': result_id, 'consent': True}).status == 200, 'Owner could not explicitly restore coach consent')
    invalid_patch = rt.api(coach, 'PATCH', '/api/groups/' + group['id'], {'status': 'archived', 'maxMembers': -1})
    require(invalid_patch.status == 400 and rt.api(coach, 'GET', '/api/diagnosis?id=' + result_id).status == 200, 'Invalid group mutation partially changed active coach authorization')
    require(rt.api(coach, 'PATCH', '/api/groups/' + group['id'], {'status': 'archived'}, origin=False).status == 403, 'Group authorization mutation accepted missing Origin')
    require(rt.api(coach, 'PATCH', '/api/groups/' + group['id'], {'status': 'archived'}).status == 200, 'Coach could not archive its local group')
    require(rt.api(coach, 'GET', '/api/diagnosis?id=' + result_id).status == 404, 'Archived group retained coach result access')
    require(rt.api(coach, 'PATCH', '/api/groups/' + group['id'], {'status': 'active', 'expiresAt': '2000-01-01T00:00:00Z'}).status == 200, 'Local expired group fixture update failed')
    require(rt.api(coach, 'GET', '/api/diagnosis?id=' + result_id).status == 404, 'Expired group retained coach result access')
    require(rt.api(owner, 'GET', '/api/diagnosis?id=' + result_id).status == 200, 'Group expiry removed the actual result owner access')
    rt.group = group


def direct_rest_case(rt):
    require(hasattr(rt, 'owner_id'), 'Owner result prerequisite failed')
    result_id = rt.owner_id
    status, _ = rt.rest('GET', 'results?select=*')
    require(status in (401, 403), 'Anon raw results SELECT still granted')
    for table in ('results', 'sail_result_sessions', 'sail_result_access', 'sail_result_shares'):
        status, _ = rt.rest('GET', table + '?select=*', service=True)
        require(status in (401, 403), 'Server service role still has raw result/capability table read privilege')
    for label in ('a', 'b', 'coach_a', 'admin'):
        token = rt.actors[label]['session']['access_token']
        require(rt.rest('GET', 'results?id=eq.' + result_id + '&select=*', token=token)[0] in (401, 403), 'Authenticated direct raw/private results columns still granted')
        status, data = rt.rest('GET', 'results?id=eq.' + result_id + '&select=id', token=token)
        require(status in (401, 403) or (status == 200 and (label == 'a' or data == [])), 'Raw REST exposed a foreign result')
        for method in ('POST', 'PATCH', 'DELETE'):
            path = 'results' + ('?id=eq.' + result_id if method != 'POST' else '')
            status, _ = rt.rest(method, path, {'user_id': rt.actors[label]['id']} if method != 'DELETE' else None, token=token)
            require(status in (401, 403), 'Client raw results mutation still granted')
        status, _ = rt.rest('PATCH', 'users?id=eq.' + rt.actors[label]['id'], {'role': 'admin'}, token=token)
        require(status in (401, 403), 'Authenticated direct users.role UPDATE still granted')
        status, _ = rt.rest('POST', 'rpc/sail_create_result', {}, token=token)
        require(status in (401, 403, 404), 'Client can invoke privileged result creation RPC')
        status, _ = rt.rest('POST', 'rpc/sail_read_result', {'p_result_id': result_id, 'p_user_id': rt.actors['a']['id'], 'p_session_hash': None, 'p_share_hash': None}, token=token)
        require(status in (401, 403), 'Client can invoke service-only result RPC with a forged actor UUID')
    status, _ = rt.rest('POST', 'rpc/sail_create_result', {})
    require(status in (401, 403, 404), 'Anon can invoke privileged result creation RPC')
    status, _ = rt.rest('POST', 'rpc/sail_read_result', {'p_result_id': result_id, 'p_user_id': rt.actors['a']['id'], 'p_session_hash': None, 'p_share_hash': None})
    require(status in (401, 403), 'Anon can invoke service-only read RPC with forged actor UUID')


def jwt_and_rate_case(rt):
    actor = rt.actors['b']; token = actor['session']['access_token']
    parts = token.split('.')
    claims = json.loads(base64.urlsafe_b64decode(parts[1] + '=' * (-len(parts[1]) % 4)))
    claims['role'] = 'service_role'
    forged_payload = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip('=')
    forged = parts[0] + '.' + forged_payload + '.' + parts[2]
    require(rt.rest('GET', 'results?select=id', token=forged)[0] == 401, 'Forged JWT role signature was accepted')
    require(bool(rt.local_signing_key), 'Local signing fixture unavailable for expired JWT test')
    claims['role'] = 'authenticated'; claims['exp'] = int(time.time()) - 120
    expired_payload = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip('=')
    signed = parts[0] + '.' + expired_payload
    signature = base64.urlsafe_b64encode(hmac.new(rt.local_signing_key.encode(), signed.encode(), hashlib.sha256).digest()).decode().rstrip('=')
    require(rt.rest('GET', 'results?select=id', token=signed + '.' + signature)[0] == 401, 'Expired correctly signed local JWT was accepted')
    context = rt.sail_login('kcf_coach')
    limited = False
    for _ in range(35):
        response = rt.api(context, 'POST', '/api/diagnosis/session', {})
        if response.status == 429:
            require(response.headers.get('retry-after') is not None, 'Rate-limit response omits retry guidance')
            limited = True
            break
        require(response.status == 200, 'Normal session request failed before configured rate bound')
    require(limited, 'Persistent session rate bound was not enforced')


def catalyst_public_case(rt):
    context = rt.context(); page = context.new_page(); page.set_default_timeout(30000)
    page.goto(CATALYST + '/', wait_until='domcontentloaded')
    expect(page.locator('.hero-stats .stat-number')).to_have_text(['11편', '10개', '6개', '64개'])
    expect(page.locator('#program-grid .program-card')).to_have_count(6)
    expect(page.locator('.quick-search a[href*="tags="]')).to_have_count(4)
    status, rows = rt.rest('GET', 'kcf_posts?select=id,title&status=eq.published&limit=1')
    require(status == 200 and bool(rows), 'Actual public forum baseline unavailable')
    post = rows[0]
    page.get_by_label('포럼 글 검색', exact=True).fill(post['title'])
    page.get_by_role('button', name='검색하기', exact=True).click()
    expect(page.get_by_role('heading', name=post['title'], exact=True)).to_be_visible()
    page.get_by_role('link', name=post['title'], exact=False).first.click()
    page.wait_for_url('**/forum/post/' + post['id'])
    expect(page.get_by_role('heading', name=post['title'], exact=True)).to_be_visible()
    page.goto(CATALYST + '/')
    page.get_by_label('포럼 글 검색', exact=True).fill('no-synthetic-match-' + rt.run)
    page.get_by_role('button', name='검색하기', exact=True).click()
    expect(page.get_by_role('heading', name='조건에 맞는 글이 없습니다.', exact=True)).to_be_visible()
    page.goto(CATALYST + '/')
    page.locator('.quick-search a[href*="tags="]').first.click()
    page.wait_for_url('**/forum?tags=*')
    require(parse_qs(urlparse(page.url).query).get('tags') == ['challenge.leadership'], 'Actual active stable tag navigation failed')
    # Real transport fault injection only; no fabricated API response or Auth mock.
    pattern = '**/rest/v1/kcf_posts?**'
    context.route(pattern, lambda route: route.abort())
    page.goto(CATALYST + '/')
    expect(page.get_by_role('button', name='통계 다시 불러오기', exact=True)).to_be_visible()
    require(page.locator('.hero-stats .stat-number').first.inner_text() == '—', 'Read failure was disguised as zero')
    context.unroute(pattern)
    page.get_by_role('button', name='통계 다시 불러오기', exact=True).click()
    expect(page.locator('.hero-stats .stat-number')).to_have_text(['11편', '10개', '6개', '64개'])
    before = rt.db('SELECT count(*) FROM public.results')
    calls = []; context.on('request', lambda request: calls.append(urlparse(request.url).path))
    page.goto(CATALYST + '/tools/love-languages')
    page.get_by_role('button', name='30문항 시작하기', exact=True).click()
    for number in range(1, 31):
        expect(page.get_by_role('radiogroup', name=f'{number}번 질문의 선택지', exact=True)).to_be_visible()
        page.get_by_role('radio').first.click()
        if number < 30: page.get_by_role('button', name='다음', exact=True).click()
    page.get_by_role('button', name='결과 보기', exact=True).click()
    expect(page.get_by_role('heading', name='응답에서 두드러진 표현의 단서입니다.', exact=True)).to_be_visible()
    require(not any(path.endswith('/results') or '/api/diagnosis' in path for path in calls), 'Public local tool sent diagnostic data to a server')
    require(rt.db('SELECT count(*) FROM public.results') == before, 'Public local tool persisted a SAIL result')
    safe_screenshot(page, 'catalyst-real-public-tool.png')
    context.close()


def catalyst_case(rt):
    actor = rt.actors['a']; context = rt.context(); page = context.new_page(); page.set_default_timeout(30000)
    page.goto(CATALYST + '/account/login?next=%2Fforum%2Fwrite', wait_until='domcontentloaded')
    page.get_by_label('이메일', exact=True).fill(actor['email']); page.get_by_label('비밀번호', exact=True).fill(actor['password'])
    page.get_by_role('button', name='로그인', exact=True).click()
    expect(page.get_by_role('heading', name='Catalyst 최초 이용 안내', exact=True)).to_be_visible()
    status, profile = rt.rest('GET', 'kcf_profiles?user_id=eq.' + actor['id'] + '&select=*', service=True)
    require(status == 200 and len(profile) == 1 and profile[0]['onboarding_state'] == 'pending' and profile[0]['consented_at'] is None, 'Actual Catalyst ensure fabricated acceptance or changed UUID')
    require(profile[0]['role'] == 'member' and profile[0]['tier'] == 'free', 'Actual Catalyst initial role/tier mapping failed')
    page.get_by_role('link', name='동의하지 않고 공개 글 보기', exact=True).click()
    page.wait_for_url('**/forum'); page.goto(CATALYST + '/forum/write')
    expect(page.get_by_role('link', name='회원 상태 확인', exact=True)).to_be_visible()
    page.get_by_role('link', name='회원 상태 확인', exact=True).click()
    page.get_by_role('checkbox').check()
    page.get_by_role('button', name='동의하고 Catalyst 시작하기', exact=True).click()
    page.wait_for_url('**/forum/write')
    expect(page.get_by_role('toolbar', name='본문 서식 도구')).to_be_visible()
    page.get_by_label('글 제목', exact=True).fill('로컬 실제 통합 검수 ' + rt.run)
    page.locator('[contenteditable="true"]').fill('실제 로컬 Auth와 DB를 사용하는 합성 검수 본문입니다.')
    page.get_by_role('button', name='초안 저장', exact=True).click()
    page.wait_for_url(re.compile(r'.*/forum/post/[0-9a-f-]{36}'))
    safe_screenshot(page, 'catalyst-real-draft-result.png')
    post_id = urlparse(page.url).path.rsplit('/', 1)[-1]
    status, rows = rt.rest('GET', 'kcf_posts?id=eq.' + post_id + '&select=id,author_id,status', service=True)
    require(status == 200 and rows[0]['author_id'] == actor['id'] and rows[0]['status'] == 'draft', 'Actual local Catalyst draft save failed')
    status, profile = rt.rest('GET', 'kcf_profiles?user_id=eq.' + actor['id'] + '&select=*', service=True)
    require(status == 200 and profile[0]['onboarding_state'] == 'accepted' and profile[0]['consent_version'] == '2026-10-19' and profile[0]['consented_at'], 'Actual Catalyst consent was not persisted with exact version/time')
    token = actor['session']['access_token']
    status, _ = rt.rest('POST', 'rpc/kcf_accept_terms', {'p_consent_version': '2026-10-19', 'p_display_name': actor['name']}, token=token)
    require(status == 200, 'Actual consent retry failed')
    status, again = rt.rest('GET', 'kcf_profiles?user_id=eq.' + actor['id'] + '&select=consented_at', service=True)
    require(status == 200 and again[0]['consented_at'] == profile[0]['consented_at'], 'Repeated consent overwrote original server time')
    page.goto(CATALYST + '/admin/members'); expect(page.get_by_role('heading', name='접근 권한이 없습니다.', exact=True)).to_be_visible()
    rt.contexts['catalyst_a'] = context


def catalyst_roles_case(rt):
    for label, expected_role in [('coach_a', 'coach'), ('admin', 'member'), ('suspended', 'member'), ('kcf_coach', 'member')]:
        actor = rt.actors[label]
        status, profile = rt.rest('POST', 'rpc/kcf_ensure_member', {}, token=actor['session']['access_token'])
        require(status == 200 and profile['user_id'] == actor['id'] and profile['role'] == expected_role, 'SAIL-to-KCF initial role mapping incorrect')
        if label == 'suspended':
            status, _ = rt.rest('PATCH', 'kcf_profiles?user_id=eq.' + actor['id'], {'status': 'suspended'}, service=True)
            require(status in (200, 204), 'Local suspension fixture failed')
        if label == 'kcf_coach':
            status, _ = rt.rest('PATCH', 'kcf_profiles?user_id=eq.' + actor['id'], {'role': 'coach', 'tier': 'pro', 'valid_until': '2099-01-01T00:00:00Z'}, service=True)
            require(status in (200, 204), 'Local KCF-only coach fixture failed')
        status, _ = rt.rest('POST', 'rpc/kcf_accept_terms', {'p_consent_version': '2026-10-19', 'p_display_name': actor['name']}, token=actor['session']['access_token'])
        require(status == 200, 'Actual role fixture explicit acceptance failed')
        if label == 'suspended':
            status, check = rt.rest('GET', 'kcf_profiles?user_id=eq.' + actor['id'] + '&select=status,onboarding_state', service=True)
            require(status == 200 and check[0]['status'] == 'suspended' and check[0]['onboarding_state'] == 'accepted', 'Consent lifted disciplinary suspension')
        if label == 'kcf_coach':
            require(rt.api(rt.sail_login(label), 'GET', '/api/diagnosis?id=' + rt.owner_id).status == 404, 'KCF coach/Pro improperly grants SAIL result access')
    for label in ('coach_a', 'suspended', 'admin'):
        actor = rt.actors[label]; context = rt.context(); page = context.new_page(); page.set_default_timeout(30000)
        page.goto(CATALYST + '/account/login?next=%2Fforum%2Fwrite', wait_until='domcontentloaded')
        page.get_by_label('이메일', exact=True).fill(actor['email']); page.get_by_label('비밀번호', exact=True).fill(actor['password'])
        page.get_by_role('button', name='로그인', exact=True).click()
        if label == 'suspended':
            expect(page.get_by_role('heading', name='나의 회원 공간', exact=True)).to_be_visible()
            expect(page.get_by_text('이용 정지', exact=True)).to_be_visible()
            page.goto(CATALYST + '/forum/write')
            expect(page.get_by_role('link', name='회원 상태 확인', exact=True)).to_be_visible()
            require(page.get_by_role('toolbar', name='본문 서식 도구').count() == 0, 'Suspended accepted member opened the actual editor')
        else:
            page.wait_for_url('**/forum/write')
            expect(page.get_by_role('toolbar', name='본문 서식 도구')).to_be_visible()
        page.goto(CATALYST + '/admin/members')
        expect(page.get_by_role('heading', name='접근 권한이 없습니다.', exact=True)).to_be_visible()
        context.close()


def catalyst_bootstrap_case(rt):
    accounts = json.loads(PRIVATE.with_name('accounts.json').read_text())
    actor = next(row for row in accounts if row['index'] == 28)
    actor_id = sql_literal(actor['user_id'])
    archived = rt.db("SELECT count(*) FROM public.kcf_consent_events WHERE user_id=" + actor_id + " AND event_type='legacy_consent_archived'")
    require(int(archived) >= 1, 'Synthetic KCF bootstrap consent evidence was not archived')
    archived_hash = rt.db("SELECT md5(string_agg(row_to_json(e)::text,'' ORDER BY id)) FROM public.kcf_consent_events e WHERE user_id=" + actor_id + " AND event_type='legacy_consent_archived'")
    # Reset only this disposable synthetic baseline member so repeated local runs
    # prove the pending gate without erasing any existing consent audit record.
    rt.db("UPDATE public.kcf_profiles SET onboarding_state='pending',consent_version=NULL,consented_at=NULL WHERE user_id=" + actor_id)
    context = rt.context(); page = context.new_page(); page.set_default_timeout(30000)
    page.goto(CATALYST + '/account/login?next=%2Fadmin%2Fmembers', wait_until='domcontentloaded')
    page.get_by_label('이메일', exact=True).fill(actor['email']); page.get_by_label('비밀번호', exact=True).fill(actor['password'])
    page.get_by_role('button', name='로그인', exact=True).click()
    expect(page.get_by_role('heading', name='Catalyst 최초 이용 안내', exact=True)).to_be_visible()
    page.goto(CATALYST + '/admin/members')
    expect(page.get_by_role('heading', name='접근 권한이 없습니다.', exact=True)).to_be_visible()
    page.get_by_role('link', name='회원 상태 확인', exact=True).click()
    expect(page.get_by_role('heading', name='Catalyst 최초 이용 안내', exact=True)).to_be_visible()
    page.get_by_role('checkbox').check()
    page.get_by_role('button', name='동의하고 Catalyst 시작하기', exact=True).click()
    page.wait_for_url('**/forum')
    page.goto(CATALYST + '/admin/members')
    expect(page.get_by_role('heading', name=re.compile('회원과 태그를'))).to_be_visible()
    status, profiles = rt.rest('GET', 'kcf_profiles?user_id=eq.' + actor['user_id'] + '&select=role,tier,status,onboarding_state,consent_version,consented_at', service=True)
    require(status == 200 and profiles[0]['role'] == 'super_admin' and profiles[0]['onboarding_state'] == 'accepted' and profiles[0]['consent_version'] == '2026-10-19' and profiles[0]['consented_at'], 'Synthetic KCF bootstrap lost its role or fabricated acceptance')
    require(rt.db("SELECT md5(string_agg(row_to_json(e)::text,'' ORDER BY id)) FROM public.kcf_consent_events e WHERE user_id=" + actor_id + " AND event_type='legacy_consent_archived'") == archived_hash, 'Explicit admin acceptance altered archived bootstrap evidence')
    safe_screenshot(page, 'catalyst-real-superadmin-consent.png')
    context.close()


def logout_case(rt):
    context = rt.sail_login('a'); page = context.new_page(); page.goto(SAIL + '/', wait_until='domcontentloaded')
    page.get_by_role('button', name='로그아웃', exact=True).click()
    page.wait_for_url(SAIL + '/')
    require(rt.api(context, 'GET', '/api/users/me').status == 401, 'SAIL actual logout preserved an authenticated cookie')
    require(rt.api(context, 'GET', '/api/diagnosis?id=' + rt.owner_id).status == 404, 'Logged-out context can read the former authenticated result')
    page.close()


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--only', choices=['all', 'auth', 'anon', 'owner', 'share', 'groups', 'rest', 'catalyst'], default='all'); args = parser.parse_args()
    rt = Runtime()
    with sync_playwright() as playwright:
        rt.browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        rt.prepare()
        if args.only in ('all', 'auth'): run_case('T18 actual SAIL signup form and GoTrue account creation', lambda: signup_case(rt))
        if args.only in ('all', 'auth'): run_case('T18 actual GoTrue password login/refresh/SAIL role UI/cookie restore', lambda: auth_case(rt))
        if args.only in ('all', 'anon'):
            run_case('T18 actual incomplete diagnosis cancellation leaves no saved result', lambda: cancelled_ui_case(rt))
            run_case('T18 actual anonymous 30-question UI/save/server result/reload', lambda: anonymous_ui_case(rt))
            run_case('S-T02/S-T06 anonymous bare UUID/forged token/revoke rejection', lambda: anonymous_access_case(rt))
            run_case('S-T06 actual anonymous participation expiration', lambda: participation_expiry_case(rt))
        if args.only in ('all', 'owner', 'share', 'groups', 'rest', 'catalyst'):
            run_case('T18/S-T04 actual authenticated owner/IDOR/idempotency/validation/CSRF/body bound', lambda: owner_and_validation_case(rt))
        if args.only in ('all', 'share'): run_case('S-T03/S-T06 separate scoped share exchange/DTO/nontransitive/revocation', lambda: share_case(rt))
        if args.only in ('all', 'groups'):
            run_case('T18/S-T07 actual group creation/explicit coach sharing/other coach/revoke', lambda: groups_case(rt))
            run_case('T18 actual browser response-loss/reload idempotency and coach choice persistence', lambda: response_loss_ui_case(rt))
        if args.only in ('all', 'rest'):
            run_case('S-T02/S-T05 actual JWT direct REST writes/role/privileged RPC denied', lambda: direct_rest_case(rt))
            run_case('S-T02/S-T06 forged/expired JWT and persistent server rate rejection', lambda: jwt_and_rate_case(rt))
        if args.only in ('all', 'catalyst'):
            run_case('H real public data/search/empty/tag/transport retry/local-only30tool', lambda: catalyst_public_case(rt))
            run_case('T18 same Auth UUID Catalyst pending/refusal/explicit consent/actual draft', lambda: catalyst_case(rt))
            run_case('T18 SAIL-to-KCF coach/admin mapping/suspension/KCF-only coach negative', lambda: catalyst_roles_case(rt))
            run_case('T18 actual synthetic KCF superadmin pending gate/acceptance/archive preservation', lambda: catalyst_bootstrap_case(rt))
        if args.only == 'all': run_case('S-T08 actual phone login anti-enumeration/CSRF/failed-login capability preservation', lambda: phone_privacy_case(rt))
        if args.only == 'all': run_case('T18 actual local recovery mail/link/password reset', lambda: recovery_mail_case(rt))
        if args.only == 'all': run_case('T18 actual SAIL logout and authenticated result denial', lambda: logout_case(rt))
        rt.clear(); rt.browser.close()
    result = {'scope': 'real local GoTrue + PostgREST + PostgreSQL + SAIL Next + Catalyst; no Auth/REST mocks', 'production_requests': 0, 'production_mutations': 0, 'fixture_accounts': len(rt.actors), 'signup_accounts': rt.signup_count, 'counts': {status: sum(r['status'] == status for r in RESULTS) for status in ('PASS', 'FAIL')}, 'results': RESULTS, 'external_browser_requests_aborted': rt.external_denied}
    result['sail_commit'] = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    result['catalyst_commit'] = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd='/workspace/catalyst-phase1-validation', text=True).strip()
    result['runner_sha256'] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    (SCREENSHOTS / 'real-e2e-results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result, ensure_ascii=False), flush=True)
    return 1 if result['counts']['FAIL'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
