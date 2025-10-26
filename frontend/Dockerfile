# Frontend Dockerfile - Ultra simple approach
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Build argument for API URL
ARG REACT_APP_API_URL=https://backend-ictxdwcqsq.dcdeploy.cloud
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

# Use a simple http server instead of nginx
FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/build .
EXPOSE 3000
CMD ["serve", "-s", ".", "-l", "3000"]
