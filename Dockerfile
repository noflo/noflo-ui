FROM node:boron

# Install dependencies
WORKDIR /data
COPY package.json /data
RUN npm install

# Build from source
COPY . /data
RUN npm run build

EXPOSE 9999
CMD [ "npm", "start" ]
