FROM node:18-bullseye-slim

# Install Chromium dan deps yang diperlukan
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libdrm2 \
    libgtk-3-0 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    xdg-utils \
    ca-certificates \
    procps \
    dumb-init \
  && rm -rf /var/lib/apt/lists/* \
  && apt-get clean

# Set environment variables
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    PORT=3001 \
    CHROME_BIN=/usr/bin/chromium \
    CHROME_PATH=/usr/bin/chromium

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev --no-audit --no-fund

# Copy source code
COPY . .

# Create directories and set proper permissions BEFORE switching to node user
RUN mkdir -p .wwebjs_auth .wwebjs_cache .wwebjs_auth/session \
    && chown -R node:node . \
    && chmod -R 755 . \
    && chmod -R 777 .wwebjs_auth .wwebjs_cache \
    && chmod +x start.sh

# Create a script to fix permissions on startup
RUN echo '#!/bin/bash\n\
if [ -d "/usr/src/app/.wwebjs_auth" ]; then\n\
    chmod -R 777 /usr/src/app/.wwebjs_auth\n\
fi\n\
if [ -d "/usr/src/app/.wwebjs_cache" ]; then\n\
    chmod -R 777 /usr/src/app/.wwebjs_cache\n\
fi\n\
exec "$@"' > /usr/local/bin/fix-permissions.sh \
    && chmod +x /usr/local/bin/fix-permissions.sh

# Switch to non-root user
USER node

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["./start.sh"]