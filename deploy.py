import os
import json
import base64
import winreg
import urllib.request
import urllib.error
import subprocess
from datetime import date

DEPLOY_COUNT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.deploy_count')
VERCEL_DAILY_LIMIT = 100

def get_bw_env() -> dict:
    env = os.environ.copy()
    try:
        ukey = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r'Environment')
        upath, _ = winreg.QueryValueEx(ukey, 'Path')
        winreg.CloseKey(ukey)
    except OSError:
        upath = ''
    try:
        mkey = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r'SYSTEM\CurrentControlSet\Control\Session Manager\Environment')
        mpath, _ = winreg.QueryValueEx(mkey, 'Path')
        winreg.CloseKey(mkey)
    except OSError:
        mpath = ''
    env['PATH'] = f"{upath};{mpath};{env.get('PATH', '')}"
    return env

def get_secret_from_bitwarden(item_name: str) -> str | None:
    try:
        import keyring
        client_id     = keyring.get_password("bitwarden_agent", "BW_CLIENTID")
        client_secret = keyring.get_password("bitwarden_agent", "BW_CLIENTSECRET")
        bw_password   = keyring.get_password("bitwarden_agent", "BW_PASSWORD")
    except Exception:
        return None

    if not all([client_id, client_secret, bw_password]):
        return None

    env = get_bw_env()
    env['BW_CLIENTID']     = client_id
    env['BW_CLIENTSECRET'] = client_secret
    env['BW_PASSWORD']     = bw_password

    status = subprocess.run(['bw', 'status'], capture_output=True, text=True, env=env, shell=True)
    if 'unauthenticated' in status.stdout:
        subprocess.run(['bw', 'login', '--apikey'], capture_output=True, text=True, env=env, shell=True, check=True)

    unlock = subprocess.run(['bw', 'unlock', '--passwordenv', 'BW_PASSWORD', '--raw'], capture_output=True, text=True, env=env, shell=True, check=True)
    session = unlock.stdout.strip()
    if not session:
        return None

    result = subprocess.run(['bw', 'get', 'password', item_name, '--session', session], capture_output=True, text=True, env=env, shell=True, check=True)
    return result.stdout.strip() or None

def _from_credential_manager(key_name: str) -> str | None:
    try:
        import keyring
        return keyring.get_password("bitwarden_agent", key_name) or None
    except Exception:
        return None

def _from_registry(var_name: str) -> str | None:
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r'Environment')
        val, _ = winreg.QueryValueEx(key, var_name)
        winreg.CloseKey(key)
        return val or None
    except Exception:
        return None

def get_vercel_token() -> str:
    # 1. Fast path: Windows Credential Manager
    token = _from_credential_manager("VERCEL_TOKEN")
    if token:
        return token
    # 2. Bitwarden Vault
    try:
        token = get_secret_from_bitwarden("Vercel Deploy Token")
        if token:
            return token
    except Exception:
        pass
    # 3. Registry
    token = _from_registry("VERCEL_TOKEN")
    if token:
        return token
    # 4. Environment variable
    return os.environ.get("VERCEL_TOKEN", "")

def check_deploy_limit():
    today = str(date.today())
    count = 0
    if os.path.exists(DEPLOY_COUNT_FILE):
        try:
            with open(DEPLOY_COUNT_FILE, 'r') as f:
                data = json.load(f)
            if data.get('date') == today:
                count = data.get('count', 0)
        except Exception:
            pass
    count += 1
    if count >= VERCEL_DAILY_LIMIT:
        raise RuntimeError("Daily deploy limit reached")
    with open(DEPLOY_COUNT_FILE, 'w') as f:
        json.dump({'date': today, 'count': count}, f)

def deploy_project(project_name: str, directory: str):
    token = get_vercel_token()
    if not token:
        raise ValueError("VERCEL_TOKEN not found in Credential Manager, Bitwarden, or Registry.")
    check_deploy_limit()

    files_to_deploy = ['index.html']
    files_payload = []
    for fname in files_to_deploy:
        fpath = os.path.join(directory, fname)
        if os.path.exists(fpath):
            norm_name = fname.replace('\\', '/')
            with open(fpath, 'r', encoding='utf-8') as f:
                content = f.read()
            files_payload.append({'file': norm_name, 'data': content, 'encoding': 'utf-8'})

    print(f"Deploying {len(files_payload)} file(s) for project '{project_name}' to Vercel...")

    payload = {
        'name': project_name,
        'files': files_payload,
        'target': 'production',
        'projectSettings': {'framework': None}
    }

    req = urllib.request.Request(
        'https://api.vercel.com/v13/deployments',
        data=json.dumps(payload).encode('utf-8'),
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        method='POST'
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print("Deployment created successfully!")
            print(f"Deployment ID: {data.get('id')}")
            print(f"Live URL: https://{data.get('url')}")
            
            # Ensure custom alias is assigned
            dep_id = data.get('id')
            if dep_id:
                try:
                    alias_req = urllib.request.Request(
                        f'https://api.vercel.com/v2/deployments/{dep_id}/aliases',
                        data=json.dumps({'alias': f'{project_name}.vercel.app'}).encode('utf-8'),
                        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
                        method='POST'
                    )
                    with urllib.request.urlopen(alias_req, timeout=10) as a_resp:
                        print(f"Canonical URL: https://{project_name}.vercel.app")
                except Exception as ae:
                    print(f"Note on alias: {ae}")
            return data
    except urllib.error.HTTPError as e:
        print(f"HTTPError {e.code}: {e.read().decode('utf-8')}")
        raise
    except Exception as e:
        print(f"Deployment failed: {e}")
        raise

if __name__ == '__main__':
    current_dir = os.path.dirname(os.path.abspath(__file__))
    deploy_project('dimension-constructions', current_dir)

