# Docker Setup Guide

**English** | [Portuguese](../pt/DOCKER-SETUP.md)

---

## Table of Contents

1. [What is Docker](#what-is-docker)
2. [Why It's Needed](#why-its-needed)
3. [Installing Docker](#installing-docker)
4. [Verification](#verification)
5. [Permission Configuration](#permission-configuration)
6. [Container Management](#container-management)
7. [Common Issues](#common-issues)

---

## What is Docker

Docker is a containerization platform that allows running applications isolated from the operating system. Each container is like a lightweight virtual machine running its own application with all necessary dependencies.

### VM vs Container

| Characteristic | VM (Virtual Machine) | Docker Container |
|----------------|---------------------|------------------|
| Size | Gigabytes | Megabytes |
| Startup time | Minutes | Seconds |
| Isolation | Complete (operating system) | Process (shared kernel) |
| Resources | High consumption | Low consumption |
| Portability | Limited | High |

### How it works

```
+------------------+
|  Your Application|
+------------------+
|  Docker Container|
+------------------+
|  Docker Engine   |
+------------------+
|  Linux Kernel    |
+------------------+
```

The container runs on top of the Docker Engine, which in turn uses the operating system's kernel. This makes containers much more efficient than VMs.

---

## Why It's Needed

The Pentest MCP runs as a Docker container. This allows:

1. **Isolation** - Pentesting tools don't affect your system
2. **Portability** - The same container works on any operating system
3. **Security** - If something goes wrong, the container is destroyed without damage
4. **Consistency** - All dependencies are bundled in the container

### What runs inside the container

The Pentest MCP container includes:
- MCP server for communication with OpenCode
- Security tools (nmap, nikto, etc.)
- Python dependencies
- Default configurations

---

## Installing Docker

### Windows

**Requirements:**
- Windows 10/11 (64-bit)
- WSL2 (Windows Subsystem for Linux)
- 4GB of available RAM

**Step by step:**

1. Download Docker Desktop from: https://www.docker.com/products/docker-desktop/
2. Run `Docker Desktop Installer.exe`
3. Check "Use WSL 2 instead of Hyper-V"
4. Click "Ok" and wait for installation
5. Restart your computer
6. Open Docker Desktop and wait for initialization

**Verification:**

```bash
# Open PowerShell
docker --version
# Should display: Docker version 24.x.x

docker ps
# Should display an empty table (no running containers)
```

**WSL2 Configuration (if needed):**

```bash
# In PowerShell as Administrator
wsl --install
# Restart computer
wsl --set-default-version 2
```

### macOS

**Requirements:**
- macOS 12.0 or higher
- Intel or Apple Silicon chip

**Step by step:**

1. Download Docker Desktop from: https://www.docker.com/products/docker-desktop/
   - For Intel: `Docker Desktop for Mac - Intel Chip`
   - For Apple Silicon: `Docker Desktop for Mac - Apple Chip`
2. Open the downloaded `.dmg` file
3. Drag Docker to the Applications folder
4. Open Docker
5. Wait for initialization

**Verification:**

```bash
# Open Terminal
docker --version
docker ps
```

### Linux (Ubuntu/Debian)

**Step by step:**

```bash
# Update package index
sudo apt-get update

# Install dependencies
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify
docker --version
```

**For Linux (Fedora):**

```bash
sudo dnf -y install dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
```

---

## Verification

After installation, run these commands to verify everything is working:

```bash
# Check Docker version
docker --version
# Expected output: Docker version 24.x.x or higher

# Check if daemon is running
docker info | head -5
# Should display system information

# Run test container
docker run hello-world
# Should display: "Hello from Docker!"
```

### Complete Verification

```bash
# List containers (should be empty)
docker ps

# List all containers (including stopped)
docker ps -a

# List downloaded images
docker images
```

---

## Permission Configuration

### Linux

On Linux, you may need to add your user to the docker group to use Docker without sudo:

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Activate changes (logout and login again)
newgrp docker

# Verify
docker ps
# Now should work without sudo
```

### Windows/macOS

In Docker Desktop, go to Settings > Resources and check:
- CPU: at least 2 cores
- Memory: at least 2GB
- Disk image size: at least 20GB

---

## Container Management

### Starting Pentest MCP

```bash
# Pull the image
docker pull pentest-mcp/pentest-mcp:latest

# Create and start container
docker run -d --name pentest-mcp -p 8888:8888 pentest-mcp/pentest-mcp:latest

# Check if running
docker ps | grep pentest-mcp
```

### Stopping the Container

```bash
# Stop container
docker stop pentest-mcp

# Start again
docker start pentest-mcp
```

### Removing the Container

```bash
# Stop and remove
docker stop pentest-mcp
docker rm pentest-mcp

# Or in a single command
docker rm -f pentest-mcp
```

### Checking Logs

```bash
# View logs in real time
docker logs -f pentest-mcp

# View last 100 lines
docker logs --tail 100 pentest-mcp
```

### Accessing the Container

```bash
# Open shell inside container
docker exec -it pentest-mcp /bin/bash

# Run specific command
docker exec pentest-mcp ls /app
```

---

## Common Issues

### Docker doesn't start

**Windows:**
1. Check if WSL2 is installed: `wsl --status`
2. Restart Docker Desktop
3. Check if Hyper-V is disabled (if using WSL2)

**macOS:**
1. Open Docker Desktop
2. Go to Docker menu > Troubleshoot
3. Click "Reset to factory defaults"

**Linux:**
```bash
# Restart Docker service
sudo systemctl restart docker

# Check status
sudo systemctl status docker
```

### Permission denied (Linux)

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again
```

### Insufficient disk space

```bash
# Clean stopped containers
docker container prune

# Clean unused images
docker image prune -a

# Check space
docker system df
```

### Container doesn't start

```bash
# Check logs
docker logs pentest-mcp

# Check if port is already in use
netstat -an | grep 8888

# Try with different port
docker run -d --name pentest-mcp -p 8889:8888 pentest-mcp/pentest-mcp:latest
```

### Error "Cannot connect to the Docker daemon"

```bash
# Windows/macOS: Open Docker Desktop

# Linux:
sudo systemctl start docker
sudo systemctl enable docker
```

---

## Next Steps

After configuring Docker:

1. [Configure HexStrike](HEXSTRIKE-SETUP.md)
2. [Configure MCPs](MCP-GUIDE.md)
3. [Learn about Agents](AGENTS.md)
