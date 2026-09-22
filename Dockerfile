# syntax=docker/dockerfile:1
FROM node:22-alpine AS build

WORKDIR /app

COPY app/package*.json ./
RUN npm install

COPY app/ ./
RUN npm run build

FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache poppler-utils

COPY app/package*.json ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist
COPY app/server.js ./
COPY app/lib ./lib
COPY Voorbeelden ./examples

ENV NODE_ENV=production
ENV PORT=80
EXPOSE 80

CMD ["node", "server.js"]
