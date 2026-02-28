#!/usr/bin/env python3
"""
Podman으로 이미지를 빌드하고 ECR에 푸시하는 스크립트
"""

import os
import subprocess
import sys
import boto3

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

def run_command(cmd, check=True, cwd=None):
    try:
        result = subprocess.run(cmd, shell=True, check=check, capture_output=True, text=True, cwd=cwd)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print_error(f"Command failed: {cmd}")
        if e.stderr:
            print_error(e.stderr)
        sys.exit(1)

def main():
    print("🚀 Building and pushing image with Podman...")

    aws_region = os.getenv('AWS_REGION', 'ap-northeast-2')
    environment = os.getenv('ENVIRONMENT', 'prod')
    image_tag = os.getenv('IMAGE_TAG', 'latest')
    ecr_repo_name = f"quiznox-{environment}"

    sts = boto3.client('sts')
    aws_account_id = sts.get_caller_identity()['Account']
    repository_uri = f"{aws_account_id}.dkr.ecr.{aws_region}.amazonaws.com/{ecr_repo_name}"

    print_info(f"ECR Repository: {ecr_repo_name}")
    print_info(f"Image Tag: {image_tag}")
    print_info(f"Repository URI: {repository_uri}")

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)

    if not os.path.exists(os.path.join(project_root, 'Dockerfile')):
        print_error("Dockerfile not found")
        sys.exit(1)

    print_info("Logging in to ECR...")
    run_command(f"aws ecr get-login-password --region {aws_region} | podman login --username AWS --password-stdin {repository_uri}")

    print_info("Building image...")
    run_command(f"podman build --platform linux/amd64 -t {ecr_repo_name}:{image_tag} .", cwd=project_root)
    print_success("Image built successfully")

    run_command(f"podman tag {ecr_repo_name}:{image_tag} {repository_uri}:{image_tag}")

    print_info("Pushing image to ECR...")
    run_command(f"podman push {repository_uri}:{image_tag}")

    print_success(f"Image URI: {repository_uri}:{image_tag}")

    try:
        with open(os.path.join(project_root, '.image_uri'), 'w') as f:
            f.write(f"export IMAGE_URI={repository_uri}:{image_tag}\n")
    except Exception:
        pass

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrupted")
        sys.exit(1)
    except Exception as e:
        print_error(f"Error: {e}")
        sys.exit(1)
