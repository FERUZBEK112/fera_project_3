FROM node:24-alpine
WORKDIR /app
COPY package.json server.mjs index.html app.js style.css icon.svg share.svg ./
ENV NODE_ENV=production
ENV DATA_DIR=/data
RUN mkdir -p /data && chown node:node /data
EXPOSE 3000
CMD ["node", "server.mjs"]

