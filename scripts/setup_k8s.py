#!/usr/bin/env python3
"""
EC2에서 kubeconfig를 복사하여 로컬 Kubernetes 접근 설정
"""

import os
import re
import subprocess
import sys
import tempfile
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

def run_command(cmd, check=True, env=None):
    try:
        result = subprocess.run(cmd, shell=True, check=check, capture_output=True, text=True, env=env or os.environ)
        return result.returncode == 0, result.stdout.strip(), result.stderr.strip()
    except subprocess.CalledProcessError as e:
        return False, getattr(e, 'stdout', '') or '', getattr(e, 'stderr', '') or ''

def main():
    print("🚀 Setting up Kubernetes access...")

    ec2_ip = os.getenv('EC2_IP', '')
    ssh_key = os.getenv('SSH_KEY', os.path.expanduser('~/.ssh/id_rsa'))
    kubeconfig_path = os.path.expanduser(os.getenv('KUBECONFIG', '~/.kube/config'))

    if not ec2_ip:
        if not os.isatty(0):
            print_error("EC2_IP is required")
            sys.exit(1)
        print_info("EC2_IP not set")
        print_info("Get EC2 IP from AWS Console or cluster-infra terraform output")
        ec2_ip = input("\nEnter EC2 Public IP: ").strip()

    if not ec2_ip:
        print_error("EC2 IP is required")
        sys.exit(1)

    ssh_key_path = ssh_key
    temp_ssh_key = None
    ssh_key_expanded = os.path.expanduser(ssh_key) if not ssh_key.startswith('-----BEGIN') else ssh_key

    if ssh_key.startswith('-----BEGIN'):
        temp_ssh_key = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.pem')
        temp_ssh_key.write(ssh_key)
        temp_ssh_key.close()
        ssh_key_path = temp_ssh_key.name
        os.chmod(ssh_key_path, 0o600)
    elif os.path.exists(ssh_key_expanded):
        ssh_key_path = ssh_key_expanded
    else:
        if os.isatty(0):
            ssh_key = input("Enter SSH key path: ").strip()
            ssh_key_path = os.path.expanduser(ssh_key) if ssh_key else ""
            if not ssh_key_path or not os.path.exists(ssh_key_path):
                print_error(f"SSH key not found: {ssh_key_path or ssh_key}")
                sys.exit(1)
        else:
            print_error(f"SSH key not found at {ssh_key_expanded}")
            sys.exit(1)

    Path(kubeconfig_path).parent.mkdir(parents=True, exist_ok=True)

    print_info("Copying kubeconfig from EC2...")
    success, _, error = run_command(
        f"scp -o StrictHostKeyChecking=no -i {ssh_key_path} ubuntu@{ec2_ip}:/home/ubuntu/.kube/config {kubeconfig_path}"
    )

    if temp_ssh_key and os.path.exists(temp_ssh_key.name):
        os.unlink(temp_ssh_key.name)

    if not success:
        print_error(f"Failed to copy kubeconfig: {error}")
        sys.exit(1)

    os.chmod(kubeconfig_path, 0o600)

    with open(kubeconfig_path, 'r') as f:
        content = f.read()
    content = re.sub(r'server:\s*https://[^:\s]+:\d+', f'server: https://{ec2_ip}:6443', content)
    with open(kubeconfig_path, 'w') as f:
        f.write(content)
    print_info(f"Kubeconfig server set to https://{ec2_ip}:6443")

    env = os.environ.copy()
    env['KUBECONFIG'] = kubeconfig_path
    success, _, err = run_command("kubectl cluster-info", check=False, env=env)
    if success:
        print_success("Connected to cluster!")
        run_command("kubectl get nodes", check=False, env=env)
    else:
        print_error("Failed to connect to cluster")
        if err:
            print_error(err)
        sys.exit(1)

    print_success("Kubernetes setup completed!")
    print_info(f"kubeconfig: {kubeconfig_path}")

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
