FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production

COPY payment-service/ ./payment-service/

EXPOSE 5004

CMD ["node", "payment-service/src/server.js"]
