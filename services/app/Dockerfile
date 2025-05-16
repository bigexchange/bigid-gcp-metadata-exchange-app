FROM node:17-alpine as build

# Set the default port
ARG PORT=8085

# Optimize the nodejs app for production
ENV PORT=$PORT

# Set working directory for quickstart app
WORKDIR /usr/src/app/
# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json .

# Install dependencies and add custom user & group
RUN \
  set -ex \
  && npm install \
  && deluser --remove-home node \
  && addgroup -S bigid -g 1111 \
  && adduser -S -G bigid -u 1111 bigid \
  && chmod -R 0755 /usr/src/app \
  && chown -R bigid:bigid /usr/src/app

# Bundle app source
COPY ./build/ .

FROM node:17-alpine
ARG PORT=$PORT

RUN \
  set -ex \
  && deluser --remove-home node \
  && addgroup -S bigid -g 1111 \
  && adduser -S -G bigid -u 1111 bigid

COPY --from=build --chown=bigid:bigid /usr/src/app /usr/src/app

# Run as non-root user
USER bigid
WORKDIR /usr/src/app/

EXPOSE $PORT

CMD [ "node", "app.js" ]