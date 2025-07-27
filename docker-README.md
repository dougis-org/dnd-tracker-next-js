# D&D Tracker Docker Setup

This guide helps you run the D&D Encounter Tracker using Docker on Windows (or any platform).

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [Git](https://git-scm.com/downloads) (to clone the repository)
- MongoDB Atlas account with a cluster set up

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/dougis-org/dnd-tracker-next-js.git
cd dnd-tracker-next-js
```

### 2. Set Up Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.docker.example .env.docker
```

Edit `.env.docker` with your configuration:

```env
# Required - Generate a secure secret (32+ characters)
NEXTAUTH_SECRET=your-very-long-secret-key-here-32-chars-minimum

# Required - Your MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=dnd-tracker

# Application URL (keep as localhost for local development)
NEXTAUTH_URL=http://localhost:3000
```

### 3. Start the Application

For development:
```bash
docker-compose --env-file .env.docker up -d
```

For production build:
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.docker up -d
```

### 4. Access the Application

Open your browser and navigate to: <http://localhost:3000>

## Environment Configurations

### Development Mode (Recommended for local development)
- Uses `Dockerfile-dev` for faster startup
- Includes hot reloading
- Mounts source code as volume
- Runs `npm run dev`

### Production Mode
- Uses main `Dockerfile` with multi-stage build
- Optimized for performance
- No source code mounting
- Runs `npm run start`

## MongoDB Atlas Setup

1. **Create MongoDB Atlas Account**: Visit [MongoDB Atlas](https://www.mongodb.com/atlas)
2. **Create a Cluster**: Follow the free tier setup
3. **Create Database User**: Add a user with read/write permissions
4. **Whitelist IP**: Add your IP address (or 0.0.0.0/0 for development)
5. **Get Connection String**: Copy the connection string and update `MONGODB_URI`

## Optional Configuration

### OAuth Providers

#### GitHub OAuth
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create new OAuth App with:
   - Homepage URL: `http://localhost:3000`
   - Callback URL: `http://localhost:3000/api/auth/callback/github`
3. Add to `.env.docker`:
   ```env
   GITHUB_ID=your_github_client_id
   GITHUB_SECRET=your_github_client_secret
   ```

#### Google OAuth
1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials with:
   - Authorized origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Add to `.env.docker`:
   ```env
   GOOGLE_ID=your_google_client_id
   GOOGLE_SECRET=your_google_client_secret
   ```

### Email Configuration
For password reset and verification emails:
```env
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=no-reply@yourdomain.com
```

## Docker Commands

### Start Services
```bash
# Development mode
docker-compose --env-file .env.docker up -d

# Production mode  
docker-compose -f docker-compose.prod.yml --env-file .env.docker up -d

# With build (if you made changes)
docker-compose --env-file .env.docker up -d --build
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f dnd-tracker
```

### Rebuild Container
```bash
# Force rebuild
docker-compose build --no-cache
docker-compose --env-file .env.docker up -d
```

## Troubleshooting

### Container Won't Start
1. Check Docker Desktop is running
2. Verify `.env.docker` file exists and has correct values
3. Check logs: `docker-compose logs dnd-tracker`

### Database Connection Issues
1. Verify MongoDB Atlas connection string
2. Ensure IP whitelist includes your address
3. Check database user permissions
4. Test connection with MongoDB Compass

### Port Already in Use
If port 3000 is occupied, change the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Maps host port 3001 to container port 3000
```

### Permission Issues (Windows)
1. Ensure Docker Desktop has proper permissions
2. Run PowerShell/Command Prompt as Administrator if needed

### Hot Reloading Not Working
Development mode includes volume mounting for hot reloading. If changes aren't reflected:
1. Stop containers: `docker-compose down`
2. Restart: `docker-compose --env-file .env.docker up -d`

## Health Checks

The container includes health checks that verify the application is running properly:
- Endpoint: `http://localhost:3000/api/health`
- Check interval: 30 seconds
- Timeout: 10 seconds
- Retries: 3

## Security Notes

- **Never commit `.env.docker` file** - it contains sensitive information
- Generate a strong `NEXTAUTH_SECRET` (32+ characters)
- Use environment-specific MongoDB databases
- Regularly rotate secrets and passwords

## Next Steps

Once the application is running:
1. Create your first user account
2. Set up your first party and characters
3. Build your first encounter
4. Start tracking combat!

For detailed application usage, see the main [README.md](./README.md) file.
