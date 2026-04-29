FROM node:20-alpine
WORKDIR /home/node/app
RUN npm install y-websocket @y/websocket-server
EXPOSE 1234
CMD ["npx", "y-websocket-server", "--port", "1234"]