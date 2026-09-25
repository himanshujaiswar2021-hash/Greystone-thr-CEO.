FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production

COPY order-service/ ./order-service/

EXPOSE 5002

ENV PRODUCT_SERVICE_URL=http://product-service:5001
ENV CUSTOMER_SERVICE_URL=http://customer-service:5003
ENV PAYMENT_SERVICE_URL=http://payment-service:5004

CMD ["node", "order-service/src/server.js"]
