# Scalable Image Upload Server

A backend system built with Node.js and Express that securely uploads images to AWS S3. It demonstrates a scalable architecture by running multiple backend instances load-balanced by NGINX, and includes a GitHub Actions CI pipeline.

## Features

- **No Database:** Operates entirely statelessly, storing images directly in S3.
- **Image Validation:** Accepts only `multipart/form-data` with JPG/PNG files under 2MB.
- **Image Processing (Bonus):** Uses `sharp` to automatically resize uploaded images to a maximum width of 800px before uploading to S3, saving storage space and bandwidth.
- **Load Balancing:** Utilizes an NGINX reverse proxy to distribute incoming requests across multiple backend instances using round-robin.
- **Dockerized Setup (Bonus):** Easy to deploy and run multiple instances using Docker Compose.
- **CI/CD Pipeline:** Integrated GitHub Actions workflow to run tests and verify Docker builds on push/PR.

## Setup Steps

### Prerequisites
- An AWS Account with an S3 Bucket and programmatic access keys.
- Docker and Docker Compose installed.

**To install Docker and Docker Compose on Amazon Linux 2023:**
```bash
sudo dnf update -y
sudo dnf install docker -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user
# Log out and log back in for the group changes to take effect

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd image-upload-server
```

### 2. Environment Variables
Create a `.env` file in the root directory and add your AWS credentials:

```env
PORT=3000
AWS_REGION=ap-south-1
S3_BUCKET=your-s3-bucket-name
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
```

### 3. Running with Docker Compose (Recommended)

This method automatically starts NGINX and two backend Node.js instances.

```bash
docker-compose up --build
```
The server will be available at `http://localhost`. NGINX will automatically load balance between the two backend instances.

### Running Manually (Without Docker)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the first instance on port 3001:
   ```bash
   PORT=3001 npm start
   ```
3. Start the second instance on port 3002 in another terminal:
   ```bash
   PORT=3002 npm start
   ```

*(Note: If running manually, you will need to set up NGINX locally and use the provided `nginx.conf` file to route traffic to ports 3001 and 3002).*

## NGINX Configuration

The included `nginx.conf` acts as a load balancer and reverse proxy.
- It listens on port 80.
- It defines an `upstream` block pointing to `backend1:3000` and `backend2:3000` (Docker DNS resolves these to the respective containers).
- It uses the default **round-robin** algorithm to evenly distribute the requests between the two backend servers.
- `client_max_body_size 5M` is configured to ensure NGINX does not block the 2MB image uploads.

## GitHub Actions Explanation

The `.github/workflows/ci.yml` file defines a CI pipeline that runs on every `push` and `pull_request` to the `main` or `master` branches.
- **Install Dependencies:** Runs `npm install`.
- **Run Tests:** Executes Jest unit tests (`npm test`) to verify API validation logic. S3 interactions are mocked during tests.
- **Docker Build Verification:** Runs `docker-compose build` to ensure the application containerizes correctly without errors.

## Sample Request/Response

### Upload an Image

Use `curl` or Postman to test the endpoint.

**Request:**
```bash
curl -X POST http://localhost/upload \
  -F "image=@/path/to/your/image.jpg"
```

**Response (Success - 200 OK):**
```json
{
  "url": "https://your-s3-bucket-name.s3.us-east-1.amazonaws.com/123e4567-e89b-12d3-a456-426614174000-image.jpg"
}
```

**Response (Error - File too large - 400 Bad Request):**
```json
{
  "error": "File too large"
}
```
