# QuizNox API

Fastify 기반 퀴즈 API 서버. DynamoDB를 백엔드 DB로 사용하며, k3s(Kubernetes) 위에 컨테이너로 배포됩니다.

## 기술 스택

- **Fastify** – Node.js 웹 프레임워크
- **DynamoDB** – NoSQL 데이터베이스 (QuizNox_Questions)
- **k3s** – 경량 Kubernetes (EC2 위에서 동작)
- **ECR** – Docker 이미지 레지스트리
- **API Gateway V2** – HTTP API 엔드포인트

## 로컬 개발

```bash
npm install
npm run dev
```

필요 시 `.env` 파일을 생성하여 환경변수를 설정합니다:

```env
PORT=4000
AWS_REGION=ap-northeast-2
DYNAMODB_TABLE_NAME=QuizNox_Questions
JWT_SECRET=your-jwt-secret
```

서버: `http://localhost:4000`

## API

```bash
# 퀴즈 조회
curl -X GET "http://localhost:4000/questions?topicId=AWS_DVA" \
  -H "Authorization: Bearer your_token"

# 헬스체크
curl http://localhost:4000/health
```

## 테스트

```bash
npm test                 # 전체 테스트
npm run test:coverage    # 커버리지
npm run test:integration # 통합 테스트
```

## 배포

인프라는 [cluster-infra](../cluster-infra) 프로젝트에서 관리됩니다.

### CI/CD 파이프라인 (GitHub Actions)

| 변경 범위 | 실행 단계 |
|-----------|----------|
| 앱 소스 (`src/`, `Dockerfile`, `package.json`) | test → build → deploy |
| 배포 설정 (`scripts/`, `k8s/`) | deploy only |
| 문서 (`docs/`, `*.md`) | 미실행 |

### 필요한 GitHub Secrets

- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
- `SSH_PRIVATE_KEY` (EC2 접근용)

### 수동 배포

```bash
pip install -r requirements.txt
python scripts/build_and_push.py    # 이미지 빌드/푸시
python scripts/setup_k8s.py         # kubeconfig 설정
python scripts/deploy_to_k8s.py     # K8s 배포
python scripts/update_apigateway_backend.py  # API Gateway 연결
```

## 프로젝트 구조

```
├── src/
│   ├── index.js              # 서버 엔트리포인트
│   ├── plugins/auth.js       # JWT 인증 플러그인
│   ├── routes/
│   │   ├── index.js          # 라우트 등록
│   │   └── questions.js      # 퀴즈 API
│   └── services/
│       └── dynamodbService.js
├── k8s/                      # Kubernetes 매니페스트
├── scripts/                  # 배포 스크립트
├── tests/                    # 테스트
├── Dockerfile
└── .github/workflows/ci-cd.yml
```
