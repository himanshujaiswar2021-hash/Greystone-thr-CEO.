FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production

COPY customer-service/ ./customer-service/

EXPOSE 5003

CMD ["node", "customer-service/src/server.js"]
