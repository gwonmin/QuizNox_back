// Jest 테스트 설정 파일

// 환경변수 (CI/로컬 공통)
process.env.NODE_ENV = "test";
process.env.AWS_REGION = process.env.AWS_REGION || "ap-northeast-2";
process.env.DYNAMODB_TABLE_NAME =
  process.env.DYNAMODB_TABLE_NAME || "QuizNox_Questions";
process.env.DYNAMODB_REVIEWS_TABLE_NAME =
  process.env.DYNAMODB_REVIEWS_TABLE_NAME || "QuizNox_Reviews";
process.env.LOG_LEVEL = "error";

// 전역 테스트 설정
beforeAll(() => {
  // 모든 테스트 실행 전 설정
});

afterAll(() => {
  // 모든 테스트 완료 후 정리
});

// 각 테스트 후 모킹 복원 (개별 테스트에서 beforeEach로 덮어쓸 수 있음)
afterEach(() => {
  jest.clearAllMocks();
});