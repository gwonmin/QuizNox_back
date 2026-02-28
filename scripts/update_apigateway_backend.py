#!/usr/bin/env python3
"""
Kubernetes Service 엔드포인트를 API Gateway 백엔드로 연결하는 스크립트
"""

import os
import sys
import boto3
import subprocess
import time

class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'

def print_success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.NC}")

def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.NC}")

def print_info(msg):
    print(f"{Colors.YELLOW}📋 {msg}{Colors.NC}")

def print_step(msg):
    print(f"{Colors.BLUE}🚀 {msg}{Colors.NC}")

def get_k8s_backend_url(namespace='quiznox', service_name='quiznox-api'):
    kubeconfig = os.path.expanduser(os.getenv('KUBECONFIG', '~/.kube/config'))
    env = {'KUBECONFIG': kubeconfig, **os.environ}

    start = time.time()
    while True:
        for field in ['hostname', 'ip']:
            cmd = f"kubectl get svc {service_name} -n {namespace} -o jsonpath='{{.status.loadBalancer.ingress[0].{field}}}'"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, env=env)
            val = result.stdout.strip()
            if val and val not in ['None', '<pending>', '']:
                url = val if val.startswith('http') else f"http://{val}"
                print_success(f"LoadBalancer URL: {url}")
                return url

        if int(time.time() - start) > 15:
            break
        time.sleep(3)

    cmd = f"kubectl get svc {service_name} -n {namespace} -o jsonpath='{{.spec.ports[0].nodePort}}'"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, env=env)
    nodeport = result.stdout.strip()

    if not nodeport or nodeport == 'None':
        cmd = f"kubectl get svc {service_name} -n {namespace} -o jsonpath='{{.spec.ports[0].port}}'"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, env=env)
        nodeport = result.stdout.strip()

    ec2_ip = os.getenv('EC2_PUBLIC_IP', '')
    if nodeport and nodeport != 'None' and ec2_ip:
        url = f"http://{ec2_ip}:{nodeport}"
        print_success(f"Backend URL: {url}")
        return url

    print_error("Could not determine backend URL")
    return ""

def main():
    print("=" * 60)
    print("🔗 QuizNox API Gateway Backend Update")
    print("=" * 60)

    aws_region = os.getenv('AWS_REGION', 'ap-northeast-2')

    api_gateway_id = os.getenv('API_GATEWAY_ID', '')
    if not api_gateway_id:
        print_error("API_GATEWAY_ID not set.")
        sys.exit(1)
    print_success(f"API Gateway ID: {api_gateway_id}")

    print_step("Getting Kubernetes backend URL...")
    backend_url = get_k8s_backend_url()
    if not backend_url:
        print_error("Failed to get backend URL")
        sys.exit(1)

    client = boto3.client('apigatewayv2', region_name=aws_region)

    print_step("Getting or creating Integration...")
    integrations = client.get_integrations(ApiId=api_gateway_id)
    integration_id = None
    for item in integrations.get('Items', []):
        if item.get('IntegrationType') == 'HTTP_PROXY':
            integration_id = item.get('IntegrationId')
            break

    if integration_id:
        integration = client.get_integration(ApiId=api_gateway_id, IntegrationId=integration_id)
        if integration.get('IntegrationUri') == backend_url:
            print_info("Backend URL unchanged, skipping")
        else:
            client.update_integration(
                ApiId=api_gateway_id, IntegrationId=integration_id,
                IntegrationUri=backend_url, IntegrationMethod='ANY',
                PayloadFormatVersion='1.0', ConnectionType='INTERNET',
                RequestParameters={'overwrite:path': '$request.path'}
            )
            print_success("Integration updated")
    else:
        resp = client.create_integration(
            ApiId=api_gateway_id, IntegrationType='HTTP_PROXY',
            IntegrationUri=backend_url, IntegrationMethod='ANY',
            PayloadFormatVersion='1.0', ConnectionType='INTERNET',
            RequestParameters={'overwrite:path': '$request.path'}
        )
        integration_id = resp['IntegrationId']
        print_success(f"Integration created: {integration_id}")

    print_step("Ensuring routes...")
    routes_resp = client.get_routes(ApiId=api_gateway_id)
    routes = routes_resp.get('Items', [])
    existing_by_key = {r['RouteKey']: r for r in routes}

    desired_keys = ['$default', 'ANY /{proxy+}', 'GET /health']
    target_integration = f"integrations/{integration_id}"

    for key in desired_keys:
        existing = existing_by_key.get(key)
        if existing:
            route_id = existing['RouteId']
            old_target = existing.get('Target')
            if old_target == target_integration:
                print_info(f"Route already points to new integration: {key}")
            else:
                client.update_route(
                    ApiId=api_gateway_id,
                    RouteId=route_id,
                    Target=target_integration,
                )
                print_success(f"Route updated: {key} -> {target_integration} (was: {old_target})")
        else:
            client.create_route(
                ApiId=api_gateway_id,
                RouteKey=key,
                Target=target_integration,
            )
            print_success(f"Route created: {key}")

    print_success("API Gateway backend configured!")
    print_info(f"Backend URL: {backend_url}")

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
