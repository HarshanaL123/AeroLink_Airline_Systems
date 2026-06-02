FROM node:20-alpine
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --production

COPY server.js .
# The api-docs folder will be copied in from the build context (root dir)
COPY api-docs/ ./api-docs/

EXPOSE 80
CMD ["node", "server.js"]
