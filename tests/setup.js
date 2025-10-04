// Jest 테스트 설정 파일

// 환경변수 설정
process.env.NODE_ENV = 'test';
process.env.AWS_REGION = 'ap-northeast-2';
process.env.DYNAMODB_TABLE_NAME = 'QuizNox_Questions';

// 로그 레벨 설정 (테스트 중 로그 최소화)
process.env.LOG_LEVEL = 'error';

// 전역 테스트 설정
beforeAll(() => {
  // 모든 테스트 실행 전 설정
  console.log('🧪 QuizNox 테스트 환경 설정 완료');
});

afterAll(() => {
  // 모든 테스트 완료 후 정리
  console.log('✅ 모든 QuizNox 테스트 완료');
});

// 각 테스트 후 정리
afterEach(() => {
  // 모킹된 함수들 복원
  jest.clearAllMocks();
});