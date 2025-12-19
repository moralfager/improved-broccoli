# Mock Data Sender Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install requests
RUN pip install --no-cache-dir requests

# Copy script
COPY send_mock_data.py .

# Environment variables
ENV API_URL=http://backend:8000/api/data
ENV SEND_INTERVAL=30

# Run the script in loop mode
CMD ["python", "-u", "send_mock_data.py", "--loop"]

