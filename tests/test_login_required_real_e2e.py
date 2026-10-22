"""Real B policy browser acceptance. Reuses verified real Auth/DB helpers, no mocked Auth/REST."""
import test_closeout_real_e2e as previous
from test_closeout_real_e2e import *


def login_existing(rt, context, label, destination='/test'):
    actor=rt.actors[label]
    page=context.new_page(); page.set_default_timeout(30000)
    page.goto(SAIL+'/login?redirect='+quote(destination,safe=''),wait_until='domcontentloaded')
    page.get_by_label('전화번호',exact=True).fill(actor['phone'])
    page.get_by_label('암호',exact=True).fill(actor['password'])
    page.get_by_role('button',name='로그인',exact=True).click()
    page.wait_for_url(lambda url:urlparse(str(url)).path==urlparse(destination).path)
    require(rt.api(context,'GET','/api/users/me').json()['user']['id']==actor['id'],'Login switched to wrong Auth identity')
    return page


def anonymous_denied_case(rt):
    context=rt.context(); page=context.new_page()
    page.goto(SAIL+'/test?group=ABCDE',wait_until='domcontentloaded')
    page.wait_for_url(re.compile('.*/login.*'))
    require(parse_qs(urlparse(page.url).query).get('redirect')==['/test?group=ABCDE'],'Login gate lost group destination')
    before=rt.db('SELECT count(*) FROM public.results')
    require(rt.api(context,'POST','/api/diagnosis/session',{}).status==401,'Anonymous session issued')
    payload=dict(nickname='차단 검수',answers=ANSWERS,groupCode=None,requestId=str(uuid.uuid4()))
    require(rt.api(context,'POST','/api/diagnosis',payload).status==401,'Anonymous diagnosis saved')
    require(rt.api(context,'GET','/api/diagnosis?id=50000000-0000-4000-8000-000000000001').status in (401,404),'Anonymous legacy result exposed')
    require(rt.api(context,'POST','/api/diagnosis/share/exchange',dict(resultId=str(uuid.uuid4()),token=secrets.token_urlsafe(32))).status==401,'Anonymous shared access issued')
    require(rt.db('SELECT count(*) FROM public.results')==before,'Anonymous requests changed result count')
    context.close()


def member_ui_case(rt):
    context=rt.context(); page=login_existing(rt,context,'a')
    nickname='B안 회원 '+rt.run
    page.get_by_label(re.compile('닉네임')).fill(nickname)
    page.get_by_role('button',name=re.compile('진단 시작')).last.click()
    finish_questions(page)
    page.wait_for_url(re.compile(r'.*/result/[0-9a-f-]{36}$'),timeout=60000)
    result_id=urlparse(page.url).path.rsplit('/',1)[-1]
    require(rt.db('SELECT user_id FROM public.results WHERE id='+sql_literal(result_id))==rt.actors['a']['id'],'Thirty-question result stored under wrong UUID')
    require(rt.db('SELECT count(*) FROM public.results WHERE nickname='+sql_literal(nickname))=='1','UI stored duplicate result')
    page.reload(); expect(page.get_by_text(nickname,exact=False).first).to_be_visible()
    safe_screenshot(page,'beta-member-result.png')
    page.goto(SAIL+'/'); page.get_by_role('button',name='로그아웃',exact=True).click(); page.wait_for_url(SAIL+'/')
    require(rt.api(context,'GET','/api/diagnosis?id='+result_id).status in (401,404),'Logout retained result access')
    page.close(); page=login_existing(rt,context,'a','/result/'+result_id)
    expect(page.get_by_text(nickname,exact=False).first).to_be_visible()
    require(rt.api(context,'GET','/api/diagnosis?id='+result_id).status==200,'Relogin lost owner result')
    context.close()


def account_switch_case(rt):
    context=rt.context();page=login_existing(rt,context,'a','/guide')
    before=rt.db('SELECT count(*) FROM public.results')
    old=dict(phase=3,questionIndex=9,nickname='이전 계정 응답',groupCode=None,isStarted=True,isCompleted=True,requestId=str(uuid.uuid4()),shareWithCoach=False,answers=ANSWERS,result=None)
    page.evaluate('(state)=>localStorage.setItem("sail-test-progress",JSON.stringify({state,version:0}))',old)
    page.close();page=login_existing(rt,context,'b','/test')
    expect(page.get_by_label(re.compile('닉네임'))).to_be_visible()
    page.wait_for_timeout(700)
    persisted=page.evaluate('JSON.parse(localStorage.getItem("sail-test-progress")||"{}").state')
    require(not persisted or (not persisted.get('isCompleted') and not persisted.get('answers')),'Account switch preserved old completed responses')
    require(rt.db('SELECT count(*) FROM public.results')==before,'Account switch replayed another account diagnosis')
    context.close()


def member_share_case(rt):
    owner=rt.sail_login('a'); recipient=rt.sail_login('b'); result_id=rt.owner_id
    response=rt.api(owner,'POST','/api/diagnosis/share',{'resultId':result_id})
    require(response.status==200,'Owner cannot create explicit share')
    url=response.json()['url'];token=parse_qs(urlparse(url).fragment)['share'][0]
    anonymous=rt.context()
    require(rt.api(anonymous,'POST','/api/diagnosis/share/exchange',{'resultId':result_id,'token':token}).status==401,'Valid share bypassed login requirement')
    anonymous.close()
    require(rt.api(recipient,'POST','/api/diagnosis/share/exchange',{'resultId':str(uuid.uuid4()),'token':token}).status in (400,404),'Share opened another result')
    page=recipient.new_page(); page.goto(SAIL+url,wait_until='domcontentloaded')
    expect(page.get_by_text('로컬 실제 진단',exact=False).first).to_be_visible()
    require(not urlparse(page.url).fragment,'Share fragment remained in location')
    result=rt.api(recipient,'GET','/api/diagnosis?id='+result_id)
    require(result.status==200 and result.json().get('can_manage') is False and 'answers' not in result.json(),'Shared DTO exposes private fields or control')
    require(rt.api(recipient,'POST','/api/diagnosis/share',{'resultId':result_id}).status in (403,404),'Recipient can mint transitive share')
    require(rt.api(owner,'DELETE','/api/diagnosis/share',{'resultId':result_id}).status in (200,204),'Owner cannot revoke share')
    require(rt.api(recipient,'GET','/api/diagnosis?id='+result_id).status==404,'Revoked share still readable')
    page.close()


def member_phone_privacy_case(rt):
    context=rt.context();known=rt.actors['a']
    for phone in ('01099999999',known['phone']):
        r=rt.api(context,'POST','/api/auth/phone-lookup',{'phone':phone,'password':'Incorrect-fixture-only'})
        require(r.status==401 and r.json()=={'error':'전화번호 또는 암호를 확인해 주세요.'},'Phone authentication enumerates accounts')
    require(rt.api(context,'POST','/api/auth/phone-lookup',{'phone':known['phone'],'password':known['password']},headers={'Origin':'https://outside.example.invalid'}).status==403,'Cross-origin phone login accepted')
    context.close()


def member_logout_case(rt):
    context=rt.sail_login('a'); page=context.new_page(); page.goto(SAIL+'/',wait_until='domcontentloaded')
    page.get_by_role('button',name='로그아웃',exact=True).click()
    page.wait_for_url(SAIL+'/')
    require(rt.api(context,'GET','/api/users/me').status==401,'Logout retained authenticated cookies')
    require(rt.api(context,'GET','/api/diagnosis?id='+rt.owner_id).status in (401,404),'Logout retained owner result access')
    page.close()


def contact_profile_case(rt):
    context=rt.sail_login('a');actor=rt.actors['a']
    rt.db("UPDATE public.user_contacts SET address='synthetic private address',bank_account='synthetic private account' WHERE user_id="+sql_literal(actor['id']))
    phone='010'+str(secrets.randbelow(10**8)).zfill(8)
    r=rt.api(context,'PATCH','/api/users/me',{'phone':phone,'full_name':'연락처 검수'})
    require(r.status==200 and r.json()['user']['phone']==phone,'Profile phone update did not use contact relation')
    require(rt.db('SELECT phone FROM public.user_contacts WHERE user_id='+sql_literal(actor['id']))==phone,'Phone not stored in operating contact table')
    require(rt.db("SELECT address||'/'||bank_account FROM public.user_contacts WHERE user_id="+sql_literal(actor['id']))=='synthetic private address/synthetic private account','Contact update erased unrelated private fields')
    require(not {'address','bank_account','user_contacts'} & r.json()['user'].keys(),'Profile exposed unrelated contact fields')
    actor['phone']=phone
    admin=rt.sail_login('admin');r=rt.api(admin,'GET','/api/admin/users')
    require(r.status==200 and any(u['id']==actor['id'] and u['phone']==phone for u in r.json()['users']),'Administrator profile list failed operating contact join')
    require(rt.api(context,'GET','/api/admin/users').status==403,'Member can list all contact profiles')
    require(rt.db("SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='phone'")=='0','Fixture still contains obsolete users.phone')


def main():
    rt=Runtime()
    baseline=rt.db("SELECT md5(string_agg(to_jsonb(r)::text,',' ORDER BY id)) FROM public.results r WHERE user_id IS NULL")
    with sync_playwright() as p:
        rt.browser=p.chromium.launch()
        rt.prepare()
        cases=[('B01 anonymous UI, session, diagnosis and sharing denied',anonymous_denied_case),('B02 actual signup and canonical profile',signup_case),('B03 actual Auth refresh, role and cookies',auth_case),('B04 member thirty-question save, refresh and relogin',member_ui_case),('B05 owner IDOR, idempotency, validation and CSRF',owner_and_validation_case),('B06 login-required share exchange and revocation',member_share_case),('B07 coach sharing, group IDOR and revocation',groups_case),('B08 response-loss retry preserves UUID and consent',member_response_loss_ui_case),('B09 direct REST raw data and privilege denials',direct_rest_case),('B10 forged JWT and persistent rate enforcement',jwt_and_rate_case),('B11 account switch cannot replay old completed draft',account_switch_case),('B12 actual Catalyst public home, search and local tool',catalyst_public_case),('B13 same UUID Catalyst explicit consent and actual draft',catalyst_case),('B14 Catalyst role mapping and suspension',catalyst_roles_case),('B15 Catalyst superadmin consent and audit preservation',catalyst_bootstrap_case),('B16 phone anti-enumeration and CSRF',member_phone_privacy_case),('B17 real local recovery mail and password change',recovery_mail_case),('B18 logout removes authenticated result access',member_logout_case),('B19 actual operating contact profile schema and privacy',contact_profile_case)]
        for name,case in cases:
            # Reset test-only rate fixture between independent cases. B10 itself
            # runs the complete configured bound without clearing within the case.
            rt.clear(); rt.contexts.clear()
            rt.db('TRUNCATE public.sail_security_rate_events')
            run_case(name,lambda case=case:case(rt))
        require(rt.db("SELECT md5(string_agg(to_jsonb(r)::text,',' ORDER BY id)) FROM public.results r WHERE user_id IS NULL")==baseline,'Original six ownerless results changed')
        require(rt.db('SELECT count(*) FROM public.results WHERE user_id IS NULL')=='6','New ownerless result created')
        rt.clear();rt.browser.close()
    result=dict(scope='actual local GoTrue + PostgREST + PostgreSQL17 + two production apps; policy B; no Auth/REST mocks',counts={s:sum(x['status']==s for x in RESULTS) for s in ('PASS','FAIL')},results=RESULTS,ownerless_six_preserved=True,production_requests=0,production_mutations=0,sail_commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),catalyst_commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=os.environ['PHASE1_CATALYST_REPO'],text=True).strip(),runner_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest())
    (SCREENSHOTS/'beta-real-e2e-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False),flush=True)
    return int(result['counts']['FAIL']>0)


# Existing response-loss acceptance is kept byte-for-byte except that this
# policy B runner logs the actual member in before opening the questionnaire.

def member_response_loss_ui_case(rt):
    coach = rt.sail_login('coach_a')
    created = rt.api(coach, 'POST', '/api/groups', {'name': '로컬 응답 유실 검수', 'maxMembers': 20})
    require(created.status == 201, 'Response-loss browser fixture group creation failed')
    group = created.json()['group']
    context = rt.context(); page = login_existing(rt, context, 'a', '/guide'); page.set_default_timeout(30000)
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


if __name__ == "__main__":
    raise SystemExit(main())
