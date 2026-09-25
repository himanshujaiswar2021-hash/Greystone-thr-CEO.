FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production

COPY frontend/ ./frontend/

EXPOSE 3000

CMD ["node", "frontend/server.js"]
