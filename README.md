# 📚 QuizNox API (Fastify + AWS Lambda)

서버리스 환경에서 동작하는 Fastify 기반 퀴즈 API 서버입니다.  
DynamoDB를 백엔드 DB로 사용하며, AWS API Gateway + Lambda에 배포됩니다.

---

## 🛠️ 기술 스택

- **Fastify** (`^4.21.0`) – 고성능 Node.js 웹 프레임워크  
- **AWS Lambda + API Gateway** – 완전한 서버리스 인프라  
- **DynamoDB** – 무중단 NoSQL 데이터베이스  
- **@aws-sdk v3** – 최신 AWS SDK (DynamoDB client)  
- **serverless-http** – Lambda에 Fastify 핸들러 연결  
