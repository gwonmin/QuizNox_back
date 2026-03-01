#!/usr/bin/env python3
"""
Kubernetes에 QuizNox API를 배포하는 스크립트
"""

import os
import re
import subprocess
import sys
import json
import boto3
from pathlib import Path

class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    NC = '\033[0m'

def print_success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.NC}")

def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.NC}")

def print_info(msg):
    print(f"{Colors.YELLOW}📋 {msg}{Colors.NC}")

def run_kubectl(cmd, check=True):
    kubeconfig = os.path.expanduser(os.getenv('KUBECONFIG', '~/.kube/config'))
    env = os.environ.copy()
    env['KUBECONFIG'] = kubeconfig
    try:
        result = subprocess.run(f"kubectl {cmd}", shell=True, check=check, capture_output=True, text=True, env=env)
        return True, result.stdout.strip(), result.stderr.strip()
    except subprocess.CalledProcessError as e:
        return False, getattr(e, 'stdout', '') or '', getattr(e, 'stderr', '') or ''

def create_namespace(namespace):
    success, _, stderr = run_kubectl(f"get namespace {namespace}", check=False)
    if not success or "NotFound" in stderr:
        import tempfile
        ns_yaml = f"apiVersion: v1\nkind: Namespace\nmetadata:\n  name: {namespace}\n"
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            f.write(ns_yaml)
            tmp = f.name
        try:
            run_kubectl(f"apply -f {tmp}")
            print_success(f"Namespace '{namespace}' created")
        finally:
            os.remove(tmp)
    else:
        print_info(f"Namespace '{namespace}' already exists")

def create_ecr_secret(namespace, aws_region, ecr_repo_url):
    import base64
    try:
        ecr_client = boto3.client('ecr', region_name=aws_region)
        token_resp = ecr_client.get_authorization_token()
        token = token_resp['authorizationData'][0]['authorizationToken']
        decoded = base64.b64decode(token).decode('utf-8')
        username, password = decoded.split(':')
        registry = ecr_repo_url.split('/')[0]

        docker_config = json.dumps({"auths": {registry: {"username": username, "password": password, "auth": token}}})
        config_b64 = base64.b64encode(docker_config.encode()).decode()

        run_kubectl(f"delete secret ecr-registry-secret -n {namespace} --ignore-not-found=true", check=False)

        import tempfile
        secret_yaml = f"""apiVersion: v1
kind: Secret
metadata:
  name: ecr-registry-secret
  namespace: {namespace}
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: {config_b64}
"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            f.write(secret_yaml)
            tmp = f.name
        try:
            run_kubectl(f"apply -f {tmp}")
            print_success("ECR imagePullSecret created")
        finally:
            os.remove(tmp)
    except Exception as e:
        print_error(f"Failed to create ECR secret: {e}")

def get_jwt_secret(environment, aws_region):
    """AuthCore의 Secrets Manager에서 JWT Secret 조회"""
    jwt = os.getenv('JWT_SECRET')
    if jwt:
        return jwt
    try:
        sm = boto3.client('secretsmanager', region_name=aws_region)
        resp = sm.get_secret_value(SecretId=f'authcore/jwt-secret-{environment}')
        secret = resp['SecretString']
        try:
            data = json.loads(secret)
            if isinstance(data, dict):
                return data.get('JWT_SECRET') or data.get('jwt_secret') or list(data.values())[0]
        except json.JSONDecodeError:
            pass
        return secret
    except Exception as e:
        print_info(f"Secrets Manager lookup failed: {e}")
        return None

def apply_manifest(file_path, env_vars=None):
    abs_path = os.path.abspath(file_path)
    if not os.path.exists(abs_path):
        print_error(f"Manifest not found: {abs_path}")
        sys.exit(1)

    if env_vars:
        with open(abs_path, 'r') as f:
            content = f.read()
        for key, value in env_vars.items():
            placeholder = f"${{{key}}}"
            if placeholder in content:
                content = content.replace(placeholder, str(value))
            else:
                pattern = re.compile(r'\$' + re.escape(key) + r'(?![a-zA-Z0-9_])')
                content = pattern.sub(str(value), content)

        tmp = f"{abs_path}.tmp"
        try:
            with open(tmp, 'w') as f:
                f.write(content)
            success, _, stderr = run_kubectl(f"apply -f {tmp}")
            if not success:
                print_error(f"Failed: {stderr}")
                sys.exit(1)
            print_success(f"Applied: {os.path.basename(file_path)}")
        finally:
            if os.path.exists(tmp):
                os.remove(tmp)
    else:
        success, _, stderr = run_kubectl(f"apply -f {abs_path}")
        if not success:
            print_error(f"Failed: {stderr}")
            sys.exit(1)
        print_success(f"Applied: {os.path.basename(file_path)}")

def main():
    print("🚀 Deploying QuizNox to Kubernetes...")

    kubeconfig = os.path.expanduser(os.getenv('KUBECONFIG', '~/.kube/config'))
    namespace = os.getenv('NAMESPACE', 'quiznox')
    environment = os.getenv('ENVIRONMENT', 'prod')
    aws_region = os.getenv('AWS_REGION', 'ap-northeast-2')

    questions_table = os.getenv('DYNAMODB_TABLE_NAME', 'QuizNox_Questions')

    jwt_secret = get_jwt_secret(environment, aws_region)
    if not jwt_secret:
        print_error("JWT_SECRET not found. Set JWT_SECRET env or configure Secrets Manager.")
        sys.exit(1)

    if not os.path.exists(kubeconfig):
        print_error(f"kubeconfig not found at {kubeconfig}")
        sys.exit(1)

    os.environ['KUBECONFIG'] = kubeconfig

    success, _, _ = run_kubectl("cluster-info", check=False)
    if not success:
        print_error("Cannot connect to Kubernetes cluster")
        sys.exit(1)
    print_success("Connected to cluster")

    create_namespace(namespace)

    ecr_repo_url = os.getenv('ECR_REPOSITORY_URI', '')
    if ecr_repo_url:
        create_ecr_secret(namespace, aws_region, ecr_repo_url)

    run_kubectl(f"delete secret quiznox-secrets -n {namespace} --ignore-not-found=true", check=False)
    escaped = str(jwt_secret).replace('"', '\\"').replace("'", "\\'").replace('$', '\\$')
    run_kubectl(f'create secret generic quiznox-secrets --from-literal=JWT_SECRET="{escaped}" --namespace={namespace}')
    print_success("Secret created")

    run_kubectl(f"delete configmap quiznox-config -n {namespace} --ignore-not-found=true", check=False)
    run_kubectl(
        f"create configmap quiznox-config --namespace={namespace}"
        f" --from-literal=AWS_REGION={aws_region}"
        f" --from-literal=NODE_ENV={environment}"
        f" --from-literal=DYNAMODB_TABLE_NAME={questions_table}"
        f" --from-literal=DYNAMODB_REVIEWS_TABLE_NAME=QuizNox_Reviews"
    )
    print_success("ConfigMap created")

    image_uri = os.getenv('IMAGE_URI')
    if not image_uri:
        script_dir = Path(__file__).parent
        image_uri_file = script_dir.parent / '.image_uri'
        if image_uri_file.exists():
            line = image_uri_file.read_text().strip()
            if '=' in line:
                image_uri = line.split('=', 1)[1].strip().strip('"').strip("'")
    if not image_uri:
        print_error("IMAGE_URI not found")
        sys.exit(1)

    print_info(f"Using image: {image_uri}")

    project_root = Path(__file__).parent.parent
    apply_manifest(str(project_root / 'k8s' / 'deployment.yaml'), {'IMAGE_URI': image_uri})
    apply_manifest(str(project_root / 'k8s' / 'service.yaml'))

    print_info("Waiting for deployment...")
    success, _, _ = run_kubectl(f"rollout status deployment/quiznox-api -n {namespace} --timeout=300s", check=False)
    if not success:
        print_error("Deployment not ready")
        run_kubectl(f"get pods -n {namespace} -l app=quiznox-api", check=False)
        sys.exit(1)

    print_success("Deployment completed!")
    run_kubectl(f"get pods -n {namespace}")
    run_kubectl(f"get svc -n {namespace}")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrupted")
        sys.exit(1)
    except Exception as e:
        print_error(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
