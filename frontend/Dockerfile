FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV VITE_API_URL=https://backend-production-5a9a.up.railway.app
RUN npm run build
RUN npm install -g serve
CMD ["sh", "-c", "serve -s dist -l $PORT"]
