module.exports = {
  // 테스트 환경
  testEnvironment: 'node',
  
  // 환경 변수 설정
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // 테스트 파일 패턴 (통합 테스트만)
  testMatch: [
    '**/tests/integration/**/*.test.js',
    '**/tests/integration/**/*.spec.js'
  ],
  
  // 커버리지 설정
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  
  // 커버리지 수집 대상
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js', // 메인 진입점 제외
    '!**/node_modules/**'
  ],
  
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 20,
      lines: 20,
      statements: 20
    }
  },
  
  // 비동기 테스트 타임아웃
  testTimeout: 10000,
  
  // 모킹 설정
  clearMocks: true,
  restoreMocks: true,
  
  // ES 모듈 변환 설정
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)'
  ]
};
