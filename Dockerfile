FROM node:20-alpine

WORKDIR /app

# Zero runtime dependencies — no npm install needed.
COPY server.js package.json ./
COPY public ./public

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "server.js"]
