FROM node:22 AS builder

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

RUN npm run build


FROM node:22-bullseye-slim

WORKDIR /app

RUN npm install serve

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["npx", "serve", "-s", "dist"]
