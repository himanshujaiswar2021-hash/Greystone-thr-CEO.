FROM node:24-alpine

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --production

# Copy product-service source
COPY product-service/ ./product-service/

EXPOSE 5001

CMD ["node", "product-service/src/server.js"]
