FROM node:boron-alpine

RUN apk add --update git

# Install dependencies
WORKDIR /data
COPY package.json /data
RUN npm install && npm cache clean

# Build from source
COPY . /data
RUN npm run build

EXPOSE 9999
CMD [ "npm", "start" ]
