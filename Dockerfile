FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app .

RUN npm prune --production

EXPOSE 8080

CMD ["node", "dist/main.js"]
