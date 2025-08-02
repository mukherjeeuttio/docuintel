# DocuIntel

DocuIntel is an intelligent document management system that leverages AI to automatically categorize and process your files. It provides a web-based interface to upload, manage, and view documents, with a powerful backend that handles file storage, metadata, and AI-powered analysis.

## Architecture

The project is built with a microservices-oriented architecture, consisting of three main components:

-   **`docuintel-frontend`**: A modern React application that provides the user interface for interacting with the system.
-   **`docuintel-core`**: A Spring Boot-based backend that serves as the core API, handling business logic, data persistence, and communication with other services.
-   **`docuintel-ai`**: A Python-based AI service that provides intelligent document processing capabilities.

## Technologies Used

### Frontend (`docuintel-frontend`)

-   **React**: A JavaScript library for building user interfaces.
-   **Vite**: A fast build tool for modern web development.
-   **Mantine**: A full-featured React component library.
-   **Axios**: A promise-based HTTP client for the browser and Node.js.

### Backend (`docuintel-core`)

-   **Java & Spring Boot**: A framework for creating stand-alone, production-grade Spring-based applications.
-   **Spring Data JPA & PostgreSQL**: For data persistence and database management.
-   **AWS S3**: For scalable object storage.
-   **Apache Tika**: For text extraction from various file formats.
-   **Maven**: For dependency management.

### AI Service (`docuintel-ai`)

-   **Python & FastAPI**: A modern, fast (high-performance) web framework for building APIs with Python.
-   **Google Generative AI**: For advanced AI and content generation capabilities.

## Getting Started

DocuIntel can be run in two ways: using Docker (recommended) or running each service individually.

### Option 1: Quick Start with Docker (Recommended)

The easiest way to get DocuIntel running is with Docker Compose, which will start all three services automatically.

#### Prerequisites
- Docker and Docker Compose installed
- An AWS account with S3 bucket configured
- A Google AI API key

#### Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mukherjeeuttio/docuintel.git
   cd docuintel
   ```

2. **Set up environment variables**:
   Create a `.env` file in the root directory with the following:
   ```env
   # AWS Credentials
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   
   # Google AI API Key
   GOOGLE_API_KEY=your_google_api_key
   ```

3. **Start the application**:
   ```bash
   docker-compose up --build
   ```

4. **Access the application**:
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:8080`
   - AI Service: Internal service (not directly accessible)

5. **Stop the application**:
   ```bash
   docker-compose down
   ```

### Option 2: Manual Setup (Development)

To get the full DocuIntel application running locally for development, you'll need to start each of the three services individually.

#### Prerequisites

-   Java 17 or later
-   Maven
-   Node.js and npm
-   Python 3.10 or later
-   PostgreSQL database
-   An AWS account with S3 bucket configured
-   A Google AI API key

### 1. Backend (`docuintel-core`)

1.  Navigate to the `docuintel-core` directory.
2.  Configure your `application.properties` file in `src/main/resources` with your PostgreSQL and AWS S3 credentials.
3.  Run the application using Maven:
    ```bash
    mvn spring-boot:run
    ```
    The backend will be running on `http://localhost:8080`.

### 2. AI Service (`docuintel-ai`)

1.  Navigate to the `docuintel-ai` directory.
2.  Install the required Python packages:
    ```bash
    pip install -r requirements.txt
    ```
3.  Create a `.env` file and add your Google AI API key:
    ```
    GOOGLE_API_KEY=your_api_key
    ```
4.  Start the FastAPI server:
    ```bash
    uvicorn main:app --reload
    ```
    The AI service will be running on `http://localhost:8000`.

### 3. Frontend (`docuintel-frontend`)

1.  Navigate to the `docuintel-frontend` directory.
2.  Install the necessary npm packages:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    The frontend will be accessible at `http://localhost:5173`.

## Docker Services

The application includes Docker containerization for easy deployment:

- **Backend**: Containerized Spring Boot application
- **AI Service**: Containerized Python FastAPI service  
- **Frontend**: Containerized React application served with Nginx

Each service has its own Dockerfile optimized for production deployment.

## API Endpoints

The `docuintel-core` service exposes a RESTful API for managing files and folders. Key endpoints include:

-   `POST /api/files/upload`: Upload a new file.
-   `GET /api/folders`: Retrieve all folders.
-   `GET /api/folders/{folderId}/files`: Get all files within a specific folder.
-   `DELETE /api/files/{fileId}`: Delete a file.

For more details, refer to the controller classes in the `docuintel-core` source code.
