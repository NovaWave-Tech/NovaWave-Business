FROM node:22.12.0-alpine3.21 AS build

WORKDIR /usr/src/app

COPY . .

ARG VITE_API_BASE_URL=http://localhost:8085
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN yarn install
RUN yarn build

FROM node:22.12.0-alpine3.21

RUN yarn global add serve --silent

WORKDIR /usr/src/app

COPY --from=build /usr/src/app/dist .

EXPOSE 3000

USER node

CMD ["serve", "-p", "3000", "-s", "."]
