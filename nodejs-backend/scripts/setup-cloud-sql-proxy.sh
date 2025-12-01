#!/bin/bash

# Load environment variables from project root .env
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
fi

# Cloud SQL Proxy Setup Script
# This script sets up Cloud SQL Proxy for secure database connections

set -e

echo "🔧 Setting up Cloud SQL Proxy..."

# Configuration
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-"my-first-project"}
INSTANCE_NAME=${GOOGLE_CLOUD_SQL_INSTANCE:-"mooves-db"}
REGION=${GOOGLE_CLOUD_REGION:-"us-central1"}
INSTANCE_CONNECTION_NAME="${PROJECT_ID}:${REGION}:${INSTANCE_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "Google Cloud CLI is not installed. Please install it first:"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    print_error "Please authenticate with Google Cloud first:"
    echo "gcloud auth login"
    exit 1
fi

# Set project
print_status "Setting project to: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Download Cloud SQL Proxy
print_status "Downloading Cloud SQL Proxy..."
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud_sql_proxy
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    curl -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.darwin.amd64
else
    print_error "Unsupported operating system: $OSTYPE"
    exit 1
fi

# Make executable
chmod +x cloud_sql_proxy
print_status "Cloud SQL Proxy downloaded and made executable"

# Create service account for Cloud SQL Proxy (if it doesn't exist)
print_status "Setting up service account..."
SA_NAME="cloud-sql-proxy"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Check if service account exists
if ! gcloud iam service-accounts describe $SA_EMAIL &> /dev/null; then
    print_status "Creating service account: $SA_NAME"
    gcloud iam service-accounts create $SA_NAME \
        --display-name="Cloud SQL Proxy Service Account" \
        --project $PROJECT_ID
else
    print_warning "Service account $SA_NAME already exists"
fi

# Grant necessary permissions
print_status "Granting Cloud SQL Client role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/cloudsql.client" \
    --project $PROJECT_ID

# Create and download key file
print_status "Creating service account key..."
gcloud iam service-accounts keys create cloud-sql-proxy-key.json \
    --iam-account=$SA_EMAIL \
    --project $PROJECT_ID

print_status "Service account key created: cloud-sql-proxy-key.json"

# Create connection script
print_status "Creating connection script..."
cat > connect-cloud-sql.sh << EOF
#!/bin/bash

# Cloud SQL Proxy Connection Script
# This script connects to your Cloud SQL instance using the proxy

set -e

# Configuration
PROJECT_ID=${PROJECT_ID}
INSTANCE_NAME=${INSTANCE_NAME}
REGION=${REGION}
INSTANCE_CONNECTION_NAME="${INSTANCE_CONNECTION_NAME}"

echo "🔗 Connecting to Cloud SQL instance..."
echo "Instance: \$INSTANCE_CONNECTION_NAME"
echo "Local port: 5432"

# Set the service account key
export GOOGLE_APPLICATION_CREDENTIALS="\$(pwd)/cloud-sql-proxy-key.json"

# Start the proxy
./cloud_sql_proxy -instances=\$INSTANCE_CONNECTION_NAME=tcp:5432

echo "✅ Cloud SQL Proxy is running"
echo "📋 Connection string: postgresql://mooves_user:YOUR_PASSWORD@localhost:5432/mooves_db"
echo "🛑 Press Ctrl+C to stop the proxy"
EOF

chmod +x connect-cloud-sql.sh
print_status "Connection script created: connect-cloud-sql.sh"

# Create systemd service (for Linux)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    print_status "Creating systemd service..."
    sudo tee /etc/systemd/system/cloud-sql-proxy.service > /dev/null << EOF
[Unit]
Description=Cloud SQL Proxy
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
Environment=GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/cloud-sql-proxy-key.json
ExecStart=$(pwd)/cloud_sql_proxy -instances=${INSTANCE_CONNECTION_NAME}=tcp:5432
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    print_status "Systemd service created"
    echo "To enable and start the service:"
    echo "sudo systemctl enable cloud-sql-proxy"
    echo "sudo systemctl start cloud-sql-proxy"
fi

# Create environment file for local development
print_status "Creating local environment file..."
cat > .env.local << EOF
# Local Development with Cloud SQL Proxy
DATABASE_URL=postgresql://mooves_user:YOUR_PASSWORD@localhost:5432/mooves_db
GOOGLE_CLOUD_PROJECT=${PROJECT_ID}
GOOGLE_CLOUD_REGION=${REGION}
GOOGLE_CLOUD_SQL_INSTANCE=${INSTANCE_NAME}

# Other variables (copy from your .env)
NODE_ENV=development
JWT_SECRET=default_jwt_secret_for_development_only
JWT_EXPIRE=7d
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
OPENAI_API_KEY=your_openai_api_key_here
EMAIL_USER=mooves@klasholmgren.se
EMAIL_PASSWORD=your-app-password
FRONTEND_URL=https://your-app.com
EMAIL_SERVICE=gmail
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080,http://localhost:8000
EOF

print_status "Local environment file created: .env.local"

# Create .gitignore entries
print_status "Updating .gitignore..."
cat >> .gitignore << EOF

# Cloud SQL Proxy files
cloud_sql_proxy
cloud-sql-proxy-key.json
connect-cloud-sql.sh
.env.local
EOF

print_status "Updated .gitignore"

echo ""
print_status "Cloud SQL Proxy setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Update the password in .env.local with your actual database password"
echo "2. Run the connection script: ./connect-cloud-sql.sh"
echo "3. Test the connection: npm run test-db"
echo ""
echo "🔒 Security notes:"
echo "- Keep cloud-sql-proxy-key.json secure and never commit it to version control"
echo "- The proxy provides encrypted connections to your Cloud SQL instance"
echo "- Consider using the systemd service for production deployments"
echo ""
echo "🌐 For production deployment:"
echo "- Use the public IP connection string instead of the proxy"
echo "- Set up proper firewall rules and authorized networks"
echo "- Use connection pooling for better performance" 