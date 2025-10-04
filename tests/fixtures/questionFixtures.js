// QuizNox API 테스트용 픽스처 데이터 (실제 AWS_DVA 데이터 기반)

const mockQuestions = [
  {
    topic_id: "AWS_DVA",
    question_number: "0001",
    question_text: "A company is implementing an application on Amazon EC2 instances. The application needs to process incoming transactions. When the application detects a transaction that is not valid, the application must send a chat message to the company's support team. To send the message, the application needs to retrieve the access token to authenticate by using the chat API. A developer needs to implement a solution to store the access token. The access token must be encrypted at rest and in transit. The access token must also be accessible from other AWS accounts. Which solution will meet these requirements with the LEAST management overhead?",
    choices: [
      "A. Use an AWS Systems Manager Parameter Store SecureString parameter that uses an AWS Key Management Service (AWS KMS) AWS managed key to store the access token. Add a resource-based policy to the parameter to allow access from other accounts. Update the IAM role of the EC2 instances with permissions to access Parameter Store. Retrieve the token from Parameter Store with the decrypt flag enabled. Use the decrypted access token to send the message to the chat.",
      "B. Encrypt the access token by using an AWS Key Management Service (AWS KMS) customer managed key. Store the access token in an Amazon DynamoDB table. Update the IAM role of the EC2 instances with permissions to access DynamoDB and AWS KMS. Retrieve the token from DynamoDB. Decrypt the token by using AWS KMS on the EC2 instances. Use the decrypted access token to send the message to the chat.",
      "C. Use AWS Secrets Manager with an AWS Key Management Service (AWS KMS) customer managed key to store the access token. Add a resource-based policy to the secret to allow access from other accounts. Update the IAM role of the EC2 instances with permissions to access Secrets Manager. Retrieve the token from Secrets Manager. Use the decrypted access token to send the message to the chat.",
      "D. Encrypt the access token by using an AWS Key Management Service (AWS KMS) AWS managed key. Store the access token in an Amazon S3 bucket. Add a bucket policy to the S3 bucket to allow access from other accounts. Update the IAM role of the EC2 instances with permissions to access Amazon S3 and AWS KMS. Retrieve the token from the S3 bucket. Decrypt the token by using AWS KMS on the EC2 instances. Use the decrypted access token to send the massage to the chat."
    ],
    most_voted_answer: "C"
  },
  {
    topic_id: "AWS_DVA",
    question_number: "0002",
    question_text: "A company wants to implement a solution to store sensitive data in Amazon S3. The data must be encrypted at rest and in transit. The company also wants to ensure that only specific IAM users and roles can access the data. Which combination of actions will meet these requirements? (Choose two.)",
    choices: [
      "A. Enable server-side encryption with AWS KMS keys on the S3 bucket.",
      "B. Use AWS CloudTrail to monitor S3 API calls.",
      "C. Configure a bucket policy to restrict access to specific IAM users and roles.",
      "D. Enable versioning on the S3 bucket.",
      "E. Use AWS Config to track S3 bucket configuration changes."
    ],
    most_voted_answer: "A"
  },
  {
    topic_id: "AWS_DVA",
    question_number: "0003",
    question_text: "A company is using Amazon EC2 instances to run a web application. The application stores user session data in memory on the EC2 instances. The company wants to implement a solution that will allow the application to scale horizontally while maintaining session state. Which AWS service should the company use?",
    choices: [
      "A. Amazon ElastiCache for Redis",
      "B. Amazon RDS",
      "C. Amazon DynamoDB",
      "D. Amazon S3"
    ],
    most_voted_answer: "A"
  }
];

const mockEmptyQuestions = [];

const mockDynamoDBResponse = {
  Items: mockQuestions,
  Count: mockQuestions.length,
  ScannedCount: mockQuestions.length
};

const mockEmptyDynamoDBResponse = {
  Items: [],
  Count: 0,
  ScannedCount: 0
};

const mockDynamoDBError = new Error("DynamoDB connection failed");

// 실제 데이터 구조에 맞는 샘플 질문 (단일 질문)
const sampleQuestion = {
  topic_id: "AWS_DVA",
  question_number: "0001",
  question_text: "A company is implementing an application on Amazon EC2 instances...",
  choices: [
    "A. Use an AWS Systems Manager Parameter Store...",
    "B. Encrypt the access token by using an AWS KMS...",
    "C. Use AWS Secrets Manager with an AWS KMS...",
    "D. Encrypt the access token by using an AWS KMS..."
  ],
  most_voted_answer: "C"
};

module.exports = {
  mockQuestions,
  mockEmptyQuestions,
  mockDynamoDBResponse,
  mockEmptyDynamoDBResponse,
  mockDynamoDBError,
  sampleQuestion
};
