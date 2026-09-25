FROM node:20-bookworm AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run prisma:generate
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
