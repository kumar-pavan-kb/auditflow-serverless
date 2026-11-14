# AuditFlow - Serverless Document Auditing Backend

AuditFlow is an automated, serverless document auditing and compliance verification platform designed to ingest, parse, and validate legal and corporate documents at scale using AWS serverless infrastructure.

## 📐 Architecture Diagram

![AuditFlow Architecture](asstes/architecture.png)

## 🚀 Core Architecture & Workflow

The system is built entirely on asynchronous, event-driven serverless components to ensure high scalability and zero idle server costs:

1. **Document Ingestion & Storage:** 
   * The client application requests a presecured upload URL from **Amazon API Gateway**[cite: 7].
   * The file is uploaded directly to an **Amazon S3 Bucket**[cite: 7].
2. **Event-Driven Orchestration:**
   * S3 triggers an event notification upon successful upload, which initiates an **AWS Step Functions** state machine[cite: 7].
3. **Parallel Processing & Validation:**
   * **Step Functions** orchestrates three parallel serverless **AWS Lambda** workers[cite: 7]:
     * **Step A (Extract):** Document Parser Lambda extracts raw text and structural data[cite: 7].
     * **Step B (Validate):** Rules Engine Lambda runs compliance and validation checks against predefined policies[cite: 7].
     * **Step C (Persist):** DB Writer Lambda writes processing logs and metadata[cite: 7].
4. **Data Persistence & Retrieval:**
   * All execution metadata, parsing statuses, and validation results are durably stored in **Amazon DynamoDB**[cite: 7].
   * Clients query audit statuses and results through **Amazon API Gateway** backed by a Query Handler Lambda[cite: 7].

## 🛠️ Tech Stack & Services
* **Compute & Orchestration:** AWS Lambda, AWS Step Functions
* **Storage & Database:** Amazon S3, Amazon DynamoDB
* **API & Networking:** Amazon API Gateway
* **Infrastructure as Code:** AWS SAM (Serverless Application Model) / CloudFormation

## 📂 Project Structure
```
auditflow-serverless/
│
├── template.yaml         # AWS SAM infrastructure template (API Gateway, S3, Step Functions, Lambdas, DynamoDB)
├── src/                  # Lambda function source code handlers
│   ├── parser/           # Document extraction logic (Lambda)
│   ├── validator/        # Rules engine evaluation logic (Lambda)
│   └── handler/          # API query and persistence handlers (Lambda)
│
├── statemachine/         # Step Functions ASL (Amazon States Language) definition
├── tests/                # Unit and integration test suites
└── README.md             # Project documentation & architecture
```
Deployment (AWS SAM)
To deploy this serverless architecture to AWS:

1.Ensure AWS CLI and AWS SAM CLI are installed and configured.

2.Build the serverless application:
```
sam build
```
3.Deploy to your AWS account:
```
sam deploy --guided
```
