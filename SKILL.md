## 스킬 이름

- **이름**: QuizNox API Helper
- **적용 범위**: `QuizNox_back` 레포 전체 (API 서버 코드, 테스트, k8s, 배포 스크립트)
- **우선순위**: 높음 (QuizNox API 관련 작업 요청 시 우선 적용)

---

## 이 스킬이 하는 일

- **목적**
  - Fastify 기반 QuizNox 퀴즈 API 서버에 대한 기능 추가, 버그 수정, 테스트, 배포 플로우를 이해하고 일관된 방식으로 지원한다.
- **언제 사용해야 하는지**
  - 사용자가 퀴즈 조회/헬스체크/인증 플러그인/라우트/테스트/배포(k3s, ECR, API Gateway, Lambda 등)와 관련된 변경을 요청할 때
- **하지 말아야 할 일**
  - 공유 인프라(VPC, EC2, ECR, DynamoDB, API Gateway 등)를 이 레포에서 새로 정의하려 하지 않는다(그 부분은 `cluster-infra`에서 관리).
  - `.env` 예시에서 실제 민감 값이나 실서비스용 시크릿을 쓰지 않는다.

---

## 프로젝트 개요

- **한 줄 요약**: QuizNox 서비스의 퀴즈 데이터 조회/헬스체크 등을 담당하는 Fastify + DynamoDB 기반 API 서버.
- **주요 기술 스택**
  - Backend: Node.js + Fastify, Fastify 플러그인(`fastify-plugin`), JWT 인증 플러그인(`src/plugins/auth.js`)
  - DB: DynamoDB (예: `QuizNox_Questions` 테이블)
  - Infra: k3s(또는 Lambda + API Gateway 조합) 상에 컨테이너/함수로 배포, ECR 사용
  - Test: Jest + Supertest
- **중요 디렉토리**
  - `src/`
    - `index.js` – 서버 엔트리 포인트
    - `plugins/auth.js` – JWT 기반 인증 플러그인
    - `routes/` – `reviews.js` 등 도메인별 라우트
  - `tests/` – 유닛/통합 테스트 (README에서 언급)
  - `k8s/` – Kubernetes 매니페스트(README 구조 예시에 따라 존재)
  - `scripts/` – 빌드/배포/셋업 관련 Python 스크립트(README 기준)
  - `.github/workflows/ci-cd.yml` – API 전용 CI/CD 파이프라인

---

## 작업 방식 가이드

- **코드 스타일 / 규칙**
  - Fastify 인스턴스 생성, 플러그인 등록, 라우트 등록 패턴을 기존 코드와 동일하게 유지한다.
  - 인증이 필요한 엔드포인트는 반드시 `auth` 플러그인을 통해 JWT 검증을 거치게 한다.
  - DynamoDB 접근은 서비스/헬퍼 레이어를 통해 수행하고, 라우트 핸들러 내부에서 SDK 호출을 직접 뒤섞지 않는다.
- **테스트**
  - Jest 기반으로 작성하며, 다음 스크립트 기준을 따른다.
    - 전체: `npm test`
    - 커버리지: `npm run test:coverage`
    - 통합 테스트: `npm run test:integration`
    - 실제 DB 기반 통합 테스트: `npm run test:real-db` (`USE_REAL_DB=true` 환경으로 실행)
  - 새로운 라우트나 비즈니스 로직 추가 시, happy path + 주요 에러 케이스를 최소한으로 커버하도록 테스트 예제를 함께 제안한다.
- **커밋 / 브랜치 규칙 (예시)**
  - 브랜치는 `feature/`, `fix/`, `refactor/` 등의 prefix를 권장한다.
  - 테스트/배포만 수정하는 경우 `chore:`, `ci:` 등 적절한 prefix를 사용해 의도를 명확히 한다.

---

## 도구 / 커맨드

- **로컬 개발**
  - 의존성 설치: `npm install`
  - 개발 서버: `npm run dev` (기본 포트는 README 예시 기준 `4000`)
  - `.env` 템플릿 예시:
    - `PORT=4000`
    - `AWS_REGION=ap-northeast-2`
    - `DYNAMODB_TABLE_NAME=QuizNox_Questions`
    - `JWT_SECRET=your-jwt-secret` (실값은 절대 코드/문서에 적지 않음)
- **테스트**
  - `npm test`
  - `npm run test:coverage`
  - `npm run test:integration`
  - `npm run test:real-db`
- **배포**
  - 인프라는 `cluster-infra`에서 관리되며, 이 레포는 주로 앱 빌드/테스트/이미지 푸시/k8s 배포/백엔드 연결을 담당한다.
  - 수동 배포 시 참고 흐름(README 기준):
    - `python scripts/build_and_push.py`
    - `python scripts/setup_k8s.py`
    - `python scripts/deploy_to_k8s.py`
    - `python scripts/update_apigateway_backend.py`

---

## 제약 사항 / 주의점

- **보안 / 비밀 정보**
  - `.env` 내용은 예시로만 보여 주되, 실제 값은 유출하지 않는다.
  - JWT 시크릿, AWS 자격 증명 등은 AWS Secrets Manager, GitHub Secrets 등 외부 비밀 스토어를 사용한다는 전제를 유지한다.
- **아키텍처 제약**
  - QuizNox API는 AuthCore 인증을 사용한다는 점을 전제로, 인증 로직을 중복 구현하거나 분리된 사용자 스토어를 만들지 않는다.
  - 인프라 변경(테이블 스키마 변경, API Gateway 구조 변경 등)은 `cluster-infra`와의 관계를 고려해서 설명한다.

---

## 답변 스타일

- **언어**: 한국어 중심, 리소스·함수·파일명은 원어(영어) 그대로 사용
- **톤**: 실무자에게 설명하듯 간결하지만, 함정을 짚어 주는 방향
- **길이**:
  - 단순 라우트/버그 수정: 코드와 변경 포인트 위주로 짧게
  - 설계/아키텍처/배포: README와 연관 레포(`cluster-infra`, `QuizNox_front`, `AuthCore`)까지 묶어서 개요 설명

---

## 예시 시나리오

- **예시 1 – 새 퀴즈 조회 API 추가**
  - 사용자가 “특정 난이도 필터를 추가한 퀴즈 조회 API 만들어줘”라고 하면:
    - 기존 `routes`와 DynamoDB 조회 로직을 참고하여, 동일한 패턴으로 쿼리 조건만 확장한다.
    - 최소한의 통합 테스트를 함께 제안하고, `.env`나 테이블 이름 등은 하드코딩하지 않는다.
- **예시 2 – JWT 인증 플러그인 수정**
  - 사용자가 “QuizNox API에서도 AuthCore 토큰을 검증하게 바꿔줘”라고 하면:
    - `src/plugins/auth.js` 위치를 기준으로, 토큰 검증 전략을 분석한다.
    - AuthCore와의 호환성을 유지하는 방향으로 검증 로직을 수정하고, 토큰 만료/리프레시 플로우에 미치는 영향을 설명한다.
- **예시 3 – 배포 장애 분석**
  - 사용자가 “CI/CD는 성공인데, 프로덕션에서 500이 난다”고 하면:
    - k8s Pod 로그, API Gateway 로그, DynamoDB 접근 권한 등 단계별 체크리스트를 제시한다.
    - CI/CD 워크플로(`.github/workflows/ci-cd.yml`)에서 어떤 단계가 무엇을 하는지 요약해 준다.

